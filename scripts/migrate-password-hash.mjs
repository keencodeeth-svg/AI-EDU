import crypto from "crypto";
import fs from "fs";
import path from "path";
import pg from "pg";

const { Pool } = pg;

function isPlainPassword(value) {
  return typeof value === "string" && value.startsWith("plain:");
}

function hashFromPlain(rawPassword) {
  const plain = rawPassword.slice("plain:".length);
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(plain, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

async function migrateDatabase() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined
  });
  const client = await pool.connect();

  try {
    const result = await client.query(
      "SELECT id, password FROM users WHERE password IS NOT NULL AND password LIKE 'plain:%'"
    );
    const rows = result.rows ?? [];
    if (!rows.length) {
      console.log("No plain passwords found in database.");
      return 0;
    }

    await client.query("BEGIN");
    for (const row of rows) {
      await client.query("UPDATE users SET password = $2 WHERE id = $1", [row.id, hashFromPlain(row.password)]);
    }
    await client.query("COMMIT");
    console.log(`Migrated ${rows.length} user password(s) in database.`);
    return rows.length;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

function migrateJson() {
  const filePath = path.join(process.cwd(), "data", "users.json");
  if (!fs.existsSync(filePath)) {
    throw new Error("data/users.json not found, and DATABASE_URL is not set");
  }

  const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  if (!Array.isArray(raw)) {
    throw new Error("data/users.json format invalid");
  }

  let migrated = 0;
  const next = raw.map((user) => {
    if (!isPlainPassword(user?.password)) {
      return user;
    }
    migrated += 1;
    return {
      ...user,
      password: hashFromPlain(user.password)
    };
  });

  if (migrated > 0) {
    fs.writeFileSync(filePath, JSON.stringify(next, null, 2), "utf-8");
  }

  console.log(
    migrated > 0 ? `Migrated ${migrated} user password(s) in data/users.json.` : "No plain passwords found in data/users.json."
  );
  return migrated;
}

async function main() {
  const migrated = process.env.DATABASE_URL ? await migrateDatabase() : migrateJson();
  if (migrated > 0) {
    console.log("Done.");
  }
}

main().catch((error) => {
  console.error(error?.message ?? error);
  process.exit(1);
});
