import crypto from "crypto";
import { readJson, writeJson } from "./storage";
import { isDbEnabled, query, queryOne } from "./db";

export type Exam = {
  id: string;
  classId: string;
  title: string;
  description?: string;
  startAt?: string;
  endAt: string;
  durationMinutes?: number;
  createdBy?: string;
  createdAt: string;
};

export type ExamItem = {
  id: string;
  examId: string;
  questionId: string;
  score: number;
  orderIndex: number;
};

export type ExamSubmission = {
  id: string;
  examId: string;
  studentId: string;
  answers: Record<string, string>;
  score: number;
  total: number;
  submittedAt: string;
};

const EXAM_FILE = "exams.json";
const EXAM_ITEM_FILE = "exam-items.json";
const EXAM_SUBMISSION_FILE = "exam-submissions.json";

type DbExam = {
  id: string;
  class_id: string;
  title: string;
  description: string | null;
  start_at: string | null;
  end_at: string;
  duration_minutes: number | null;
  created_by: string | null;
  created_at: string;
};

type DbExamItem = {
  id: string;
  exam_id: string;
  question_id: string;
  score: number;
  order_index: number;
};

type DbExamSubmission = {
  id: string;
  exam_id: string;
  student_id: string;
  answers: any;
  score: number;
  total: number;
  submitted_at: string;
};

function mapExam(row: DbExam): Exam {
  return {
    id: row.id,
    classId: row.class_id,
    title: row.title,
    description: row.description ?? undefined,
    startAt: row.start_at ?? undefined,
    endAt: row.end_at,
    durationMinutes: row.duration_minutes ?? undefined,
    createdBy: row.created_by ?? undefined,
    createdAt: row.created_at
  };
}

function mapExamItem(row: DbExamItem): ExamItem {
  return {
    id: row.id,
    examId: row.exam_id,
    questionId: row.question_id,
    score: row.score ?? 1,
    orderIndex: row.order_index ?? 0
  };
}

function mapExamSubmission(row: DbExamSubmission): ExamSubmission {
  let answers: Record<string, string> = {};
  if (row.answers && typeof row.answers === "object") {
    answers = row.answers as Record<string, string>;
  } else if (typeof row.answers === "string") {
    try {
      answers = JSON.parse(row.answers) as Record<string, string>;
    } catch {
      answers = {};
    }
  }
  return {
    id: row.id,
    examId: row.exam_id,
    studentId: row.student_id,
    answers,
    score: row.score,
    total: row.total,
    submittedAt: row.submitted_at
  };
}

export async function getExams(): Promise<Exam[]> {
  if (!isDbEnabled()) {
    return readJson<Exam[]>(EXAM_FILE, []);
  }
  const rows = await query<DbExam>("SELECT * FROM exams ORDER BY created_at DESC");
  return rows.map(mapExam);
}

export async function getExamById(id: string): Promise<Exam | null> {
  if (!isDbEnabled()) {
    const list = await getExams();
    return list.find((item) => item.id === id) ?? null;
  }
  const row = await queryOne<DbExam>("SELECT * FROM exams WHERE id = $1", [id]);
  return row ? mapExam(row) : null;
}

export async function getExamsByClass(classId: string): Promise<Exam[]> {
  if (!isDbEnabled()) {
    return (await getExams()).filter((item) => item.classId === classId);
  }
  const rows = await query<DbExam>("SELECT * FROM exams WHERE class_id = $1 ORDER BY created_at DESC", [classId]);
  return rows.map(mapExam);
}

export async function getExamsByClassIds(classIds: string[]): Promise<Exam[]> {
  if (!classIds.length) return [];
  if (!isDbEnabled()) {
    return (await getExams()).filter((item) => classIds.includes(item.classId));
  }
  const rows = await query<DbExam>(
    "SELECT * FROM exams WHERE class_id = ANY($1) ORDER BY created_at DESC",
    [classIds]
  );
  return rows.map(mapExam);
}

export async function getExamItems(examId: string): Promise<ExamItem[]> {
  if (!isDbEnabled()) {
    const list = readJson<ExamItem[]>(EXAM_ITEM_FILE, []);
    return list.filter((item) => item.examId === examId).sort((a, b) => a.orderIndex - b.orderIndex);
  }
  const rows = await query<DbExamItem>(
    "SELECT * FROM exam_items WHERE exam_id = $1 ORDER BY order_index ASC",
    [examId]
  );
  return rows.map(mapExamItem);
}

export async function getExamSubmissionsByExam(examId: string): Promise<ExamSubmission[]> {
  if (!isDbEnabled()) {
    const list = readJson<ExamSubmission[]>(EXAM_SUBMISSION_FILE, []);
    return list.filter((item) => item.examId === examId);
  }
  const rows = await query<DbExamSubmission>(
    "SELECT * FROM exam_submissions WHERE exam_id = $1 ORDER BY submitted_at DESC",
    [examId]
  );
  return rows.map(mapExamSubmission);
}

export async function getExamSubmission(examId: string, studentId: string): Promise<ExamSubmission | null> {
  if (!isDbEnabled()) {
    const list = readJson<ExamSubmission[]>(EXAM_SUBMISSION_FILE, []);
    return list.find((item) => item.examId === examId && item.studentId === studentId) ?? null;
  }
  const row = await queryOne<DbExamSubmission>(
    "SELECT * FROM exam_submissions WHERE exam_id = $1 AND student_id = $2",
    [examId, studentId]
  );
  return row ? mapExamSubmission(row) : null;
}

export async function getExamSubmissionsByStudent(studentId: string): Promise<ExamSubmission[]> {
  if (!isDbEnabled()) {
    const list = readJson<ExamSubmission[]>(EXAM_SUBMISSION_FILE, []);
    return list.filter((item) => item.studentId === studentId);
  }
  const rows = await query<DbExamSubmission>(
    "SELECT * FROM exam_submissions WHERE student_id = $1 ORDER BY submitted_at DESC",
    [studentId]
  );
  return rows.map(mapExamSubmission);
}

export async function createExam(input: {
  classId: string;
  title: string;
  description?: string;
  startAt?: string;
  endAt: string;
  durationMinutes?: number;
  createdBy?: string;
  questionIds: string[];
  scorePerQuestion?: number;
}): Promise<Exam> {
  const id = `exam-${crypto.randomBytes(6).toString("hex")}`;
  const createdAt = new Date().toISOString();
  const scorePerQuestion = input.scorePerQuestion ?? 1;

  if (!isDbEnabled()) {
    const exams = await getExams();
    const next: Exam = {
      id,
      classId: input.classId,
      title: input.title,
      description: input.description,
      startAt: input.startAt,
      endAt: input.endAt,
      durationMinutes: input.durationMinutes,
      createdBy: input.createdBy,
      createdAt
    };
    exams.push(next);
    writeJson(EXAM_FILE, exams);

    const items = readJson<ExamItem[]>(EXAM_ITEM_FILE, []);
    input.questionIds.forEach((questionId, index) => {
      items.push({
        id: `exam-item-${crypto.randomBytes(6).toString("hex")}`,
        examId: id,
        questionId,
        score: scorePerQuestion,
        orderIndex: index + 1
      });
    });
    writeJson(EXAM_ITEM_FILE, items);
    return next;
  }

  const row = await queryOne<DbExam>(
    `INSERT INTO exams (id, class_id, title, description, start_at, end_at, duration_minutes, created_by, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      id,
      input.classId,
      input.title,
      input.description ?? null,
      input.startAt ?? null,
      input.endAt,
      input.durationMinutes ?? null,
      input.createdBy ?? null,
      createdAt
    ]
  );

  for (let index = 0; index < input.questionIds.length; index += 1) {
    const questionId = input.questionIds[index];
    await query(
      `INSERT INTO exam_items (id, exam_id, question_id, score, order_index)
       VALUES ($1, $2, $3, $4, $5)`,
      [`exam-item-${crypto.randomBytes(6).toString("hex")}`, id, questionId, scorePerQuestion, index + 1]
    );
  }

  return row
    ? mapExam(row)
    : {
        id,
        classId: input.classId,
        title: input.title,
        description: input.description,
        startAt: input.startAt,
        endAt: input.endAt,
        durationMinutes: input.durationMinutes,
        createdBy: input.createdBy,
        createdAt
      };
}

export async function upsertExamSubmission(input: {
  examId: string;
  studentId: string;
  answers: Record<string, string>;
  score: number;
  total: number;
}): Promise<ExamSubmission> {
  const submittedAt = new Date().toISOString();

  if (!isDbEnabled()) {
    const list = readJson<ExamSubmission[]>(EXAM_SUBMISSION_FILE, []);
    const index = list.findIndex((item) => item.examId === input.examId && item.studentId === input.studentId);
    const next: ExamSubmission = {
      id: index >= 0 ? list[index].id : `exam-sub-${crypto.randomBytes(6).toString("hex")}`,
      examId: input.examId,
      studentId: input.studentId,
      answers: input.answers,
      score: input.score,
      total: input.total,
      submittedAt
    };
    if (index >= 0) {
      list[index] = next;
    } else {
      list.push(next);
    }
    writeJson(EXAM_SUBMISSION_FILE, list);
    return next;
  }

  const id = `exam-sub-${crypto.randomBytes(6).toString("hex")}`;
  const row = await queryOne<DbExamSubmission>(
    `INSERT INTO exam_submissions (id, exam_id, student_id, answers, score, total, submitted_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (exam_id, student_id) DO UPDATE SET
       answers = EXCLUDED.answers,
       score = EXCLUDED.score,
       total = EXCLUDED.total,
       submitted_at = EXCLUDED.submitted_at
     RETURNING *`,
    [id, input.examId, input.studentId, input.answers, input.score, input.total, submittedAt]
  );
  return row
    ? mapExamSubmission(row)
    : {
        id,
        examId: input.examId,
        studentId: input.studentId,
        answers: input.answers,
        score: input.score,
        total: input.total,
        submittedAt
      };
}

