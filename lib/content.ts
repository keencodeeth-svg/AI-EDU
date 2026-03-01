import crypto from "crypto";
import { readJson, writeJson } from "./storage";
import type { KnowledgePoint, Question, Difficulty } from "./types";
import { isDbEnabled, query, queryOne } from "./db";

const KP_FILE = "knowledge-points.json";
const Q_FILE = "questions.json";

type DbKnowledgePoint = {
  id: string;
  subject: string;
  grade: string;
  title: string;
  chapter: string;
  unit: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type DbQuestion = {
  id: string;
  subject: string;
  grade: string;
  knowledge_point_id: string;
  stem: string;
  options: string[];
  answer: string;
  explanation: string;
  difficulty: string | null;
  question_type: string | null;
  tags: string[] | null;
  abilities: string[] | null;
  created_at?: string | null;
  updated_at?: string | null;
};

function mapKnowledgePoint(row: DbKnowledgePoint): KnowledgePoint {
  return {
    id: row.id,
    subject: row.subject as KnowledgePoint["subject"],
    grade: row.grade,
    title: row.title,
    chapter: row.chapter,
    unit: row.unit ?? "未分单元"
  };
}

function mapQuestion(row: DbQuestion): Question {
  return {
    id: row.id,
    subject: row.subject as Question["subject"],
    grade: row.grade,
    knowledgePointId: row.knowledge_point_id,
    stem: row.stem,
    options: row.options,
    answer: row.answer,
    explanation: row.explanation,
    difficulty: (row.difficulty as Difficulty | null) ?? undefined,
    questionType: row.question_type ?? undefined,
    tags: row.tags ?? [],
    abilities: row.abilities ?? []
  };
}

export async function getKnowledgePoints(): Promise<KnowledgePoint[]> {
  if (!isDbEnabled()) {
    return readJson<KnowledgePoint[]>(KP_FILE, []);
  }
  const rows = await query<DbKnowledgePoint>("SELECT * FROM knowledge_points");
  return rows.map(mapKnowledgePoint);
}

export async function saveKnowledgePoints(list: KnowledgePoint[]) {
  if (!isDbEnabled()) {
    writeJson(KP_FILE, list);
  }
}

export async function getQuestions(): Promise<Question[]> {
  if (!isDbEnabled()) {
    return readJson<Question[]>(Q_FILE, []);
  }
  const rows = await query<DbQuestion>("SELECT * FROM questions");
  return rows.map(mapQuestion);
}

export async function saveQuestions(list: Question[]) {
  if (!isDbEnabled()) {
    writeJson(Q_FILE, list);
  }
}

export async function createKnowledgePoint(input: Omit<KnowledgePoint, "id">) {
  if (!isDbEnabled()) {
    const list = await getKnowledgePoints();
    const next: KnowledgePoint = {
      id: `kp-${crypto.randomBytes(6).toString("hex")}`,
      unit: input.unit ?? "未分单元",
      ...input
    };
    list.push(next);
    await saveKnowledgePoints(list);
    return next;
  }
  const id = `kp-${crypto.randomBytes(6).toString("hex")}`;
  const row = await queryOne<DbKnowledgePoint>(
    `INSERT INTO knowledge_points (id, subject, grade, title, chapter, unit)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [id, input.subject, input.grade, input.title, input.chapter, input.unit ?? "未分单元"]
  );
  return row ? mapKnowledgePoint(row) : null;
}

export async function updateKnowledgePoint(id: string, input: Partial<KnowledgePoint>) {
  if (!isDbEnabled()) {
    const list = await getKnowledgePoints();
    const index = list.findIndex((item) => item.id === id);
    if (index === -1) return null;
    const next = { ...list[index], ...input, id } as KnowledgePoint;
    list[index] = next;
    await saveKnowledgePoints(list);
    return next;
  }
  const row = await queryOne<DbKnowledgePoint>(
    `UPDATE knowledge_points
     SET subject = COALESCE($2, subject),
         grade = COALESCE($3, grade),
         title = COALESCE($4, title),
         chapter = COALESCE($5, chapter),
         unit = COALESCE($6, unit),
         updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [id, input.subject ?? null, input.grade ?? null, input.title ?? null, input.chapter ?? null, input.unit ?? null]
  );
  return row ? mapKnowledgePoint(row) : null;
}

export async function deleteKnowledgePoint(id: string) {
  if (!isDbEnabled()) {
    const list = await getKnowledgePoints();
    const next = list.filter((item) => item.id !== id);
    await saveKnowledgePoints(next);
    return list.length !== next.length;
  }
  const rows = await query<{ id: string }>("DELETE FROM knowledge_points WHERE id = $1 RETURNING id", [id]);
  return rows.length > 0;
}

export async function createQuestion(input: Omit<Question, "id">) {
  if (!isDbEnabled()) {
    const list = await getQuestions();
    const next: Question = {
      id: `q-${crypto.randomBytes(6).toString("hex")}`,
      difficulty: input.difficulty ?? "medium",
      questionType: input.questionType ?? "choice",
      tags: input.tags ?? [],
      abilities: input.abilities ?? [],
      ...input
    };
    list.push(next);
    await saveQuestions(list);
    return next;
  }
  const id = `q-${crypto.randomBytes(6).toString("hex")}`;
  const row = await queryOne<DbQuestion>(
    `INSERT INTO questions (id, subject, grade, knowledge_point_id, stem, options, answer, explanation, difficulty, question_type, tags, abilities)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING *`,
    [
      id,
      input.subject,
      input.grade,
      input.knowledgePointId,
      input.stem,
      input.options,
      input.answer,
      input.explanation,
      input.difficulty ?? "medium",
      input.questionType ?? "choice",
      input.tags ?? [],
      input.abilities ?? []
    ]
  );
  return row ? mapQuestion(row) : null;
}

export async function updateQuestion(id: string, input: Partial<Question>) {
  if (!isDbEnabled()) {
    const list = await getQuestions();
    const index = list.findIndex((item) => item.id === id);
    if (index === -1) return null;
    const next = { ...list[index], ...input, id } as Question;
    list[index] = next;
    await saveQuestions(list);
    return next;
  }
  const row = await queryOne<DbQuestion>(
    `UPDATE questions
     SET subject = COALESCE($2, subject),
         grade = COALESCE($3, grade),
         knowledge_point_id = COALESCE($4, knowledge_point_id),
         stem = COALESCE($5, stem),
         options = COALESCE($6, options),
         answer = COALESCE($7, answer),
         explanation = COALESCE($8, explanation),
         difficulty = COALESCE($9, difficulty),
         question_type = COALESCE($10, question_type),
         tags = COALESCE($11, tags),
         abilities = COALESCE($12, abilities),
         updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [
      id,
      input.subject ?? null,
      input.grade ?? null,
      input.knowledgePointId ?? null,
      input.stem ?? null,
      input.options ?? null,
      input.answer ?? null,
      input.explanation ?? null,
      input.difficulty ?? null,
      input.questionType ?? null,
      input.tags ?? null,
      input.abilities ?? null
    ]
  );
  return row ? mapQuestion(row) : null;
}

export async function deleteQuestion(id: string) {
  if (!isDbEnabled()) {
    const list = await getQuestions();
    const next = list.filter((item) => item.id !== id);
    await saveQuestions(next);
    return list.length !== next.length;
  }
  const rows = await query<{ id: string }>("DELETE FROM questions WHERE id = $1 RETURNING id", [id]);
  return rows.length > 0;
}
