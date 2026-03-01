import fs from "fs";
import path from "path";
import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const dataDir = path.join(process.cwd(), "data");
const readJson = (file) => {
  const filePath = path.join(dataDir, file);
  if (!fs.existsSync(filePath)) return [];
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
};

const users = readJson("users.json");
const schools = readJson("schools.json");
const profiles = readJson("student-profiles.json");
const knowledgePoints = readJson("knowledge-points.json");
const questions = readJson("questions.json");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined
});

const client = await pool.connect();

try {
  await client.query("BEGIN");

  for (const school of schools) {
    await client.query(
      `INSERT INTO schools (id, name, code, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        code = EXCLUDED.code,
        status = EXCLUDED.status,
        updated_at = EXCLUDED.updated_at`,
      [
        school.id,
        school.name,
        school.code,
        school.status ?? "active",
        school.createdAt ?? new Date().toISOString(),
        school.updatedAt ?? new Date().toISOString()
      ]
    );
  }

  for (const user of users) {
    await client.query(
      `INSERT INTO users (id, email, name, role, password, grade, school_id, student_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        password = EXCLUDED.password,
        grade = EXCLUDED.grade,
        school_id = EXCLUDED.school_id,
        student_id = EXCLUDED.student_id`,
      [
        user.id,
        user.email,
        user.name,
        user.role,
        user.password,
        user.grade ?? null,
        user.schoolId ?? null,
        user.studentId ?? null
      ]
    );
  }

  for (const profile of profiles) {
    await client.query(
      `INSERT INTO student_profiles (id, user_id, grade, subjects, target, school, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (user_id) DO UPDATE SET
        grade = EXCLUDED.grade,
        subjects = EXCLUDED.subjects,
        target = EXCLUDED.target,
        school = EXCLUDED.school,
        updated_at = EXCLUDED.updated_at`,
      [profile.id, profile.userId, profile.grade, profile.subjects, profile.target ?? "", profile.school ?? "", profile.updatedAt]
    );
  }

  for (const kp of knowledgePoints) {
    await client.query(
      `INSERT INTO knowledge_points (id, subject, grade, title, chapter, unit)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET
        subject = EXCLUDED.subject,
        grade = EXCLUDED.grade,
        title = EXCLUDED.title,
        chapter = EXCLUDED.chapter,
        unit = EXCLUDED.unit`,
      [kp.id, kp.subject, kp.grade, kp.title, kp.chapter, kp.unit ?? "未分单元"]
    );
  }

  for (const question of questions) {
    await client.query(
      `INSERT INTO questions (id, subject, grade, knowledge_point_id, stem, options, answer, explanation, difficulty, question_type, tags, abilities)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (id) DO UPDATE SET
        subject = EXCLUDED.subject,
        grade = EXCLUDED.grade,
        knowledge_point_id = EXCLUDED.knowledge_point_id,
        stem = EXCLUDED.stem,
        options = EXCLUDED.options,
        answer = EXCLUDED.answer,
        explanation = EXCLUDED.explanation,
        difficulty = EXCLUDED.difficulty,
        question_type = EXCLUDED.question_type,
        tags = EXCLUDED.tags,
        abilities = EXCLUDED.abilities`,
      [
        question.id,
        question.subject,
        question.grade,
        question.knowledgePointId,
        question.stem,
        question.options,
        question.answer,
        question.explanation ?? "",
        question.difficulty ?? "medium",
        question.questionType ?? "choice",
        question.tags ?? [],
        question.abilities ?? []
      ]
    );
  }

  await client.query("COMMIT");
  console.log("Seed completed.");
} catch (err) {
  await client.query("ROLLBACK");
  console.error(err);
  process.exit(1);
} finally {
  client.release();
  await pool.end();
}
