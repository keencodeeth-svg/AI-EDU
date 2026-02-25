import crypto from "crypto";
import { readJson, writeJson } from "./storage";
import { isDbEnabled, query, queryOne } from "./db";

export type ReviewIntervalLevel = 1 | 2 | 3;
export type ReviewResult = "correct" | "wrong" | null;
export type WrongReviewStatus = "active" | "completed";

export type WrongReviewItem = {
  id: string;
  userId: string;
  questionId: string;
  subject: string;
  knowledgePointId: string;
  intervalLevel: ReviewIntervalLevel;
  nextReviewAt: string | null;
  lastReviewResult: ReviewResult;
  lastReviewAt: string | null;
  reviewCount: number;
  status: WrongReviewStatus;
  firstWrongAt: string;
  createdAt: string;
  updatedAt: string;
};

const WRONG_REVIEW_FILE = "wrong-review-items.json";
const INTERVAL_HOURS: Record<ReviewIntervalLevel, number> = {
  1: 24,
  2: 72,
  3: 7 * 24
};

type DbWrongReviewItem = {
  id: string;
  user_id: string;
  question_id: string;
  subject: string;
  knowledge_point_id: string;
  interval_level: number;
  next_review_at: string | null;
  last_review_result: string | null;
  last_review_at: string | null;
  review_count: number;
  status: string;
  first_wrong_at: string;
  created_at: string;
  updated_at: string;
};

function toIntervalLevel(input: number): ReviewIntervalLevel {
  if (input <= 1) return 1;
  if (input >= 3) return 3;
  return 2;
}

function mapDbItem(row: DbWrongReviewItem): WrongReviewItem {
  const lastResult = row.last_review_result === "correct" || row.last_review_result === "wrong"
    ? row.last_review_result
    : null;
  return {
    id: row.id,
    userId: row.user_id,
    questionId: row.question_id,
    subject: row.subject,
    knowledgePointId: row.knowledge_point_id,
    intervalLevel: toIntervalLevel(row.interval_level),
    nextReviewAt: row.next_review_at,
    lastReviewResult: lastResult,
    lastReviewAt: row.last_review_at,
    reviewCount: row.review_count,
    status: row.status === "completed" ? "completed" : "active",
    firstWrongAt: row.first_wrong_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function calcNextReviewAt(level: ReviewIntervalLevel, baseTime = Date.now()) {
  return new Date(baseTime + INTERVAL_HOURS[level] * 60 * 60 * 1000).toISOString();
}

function isSameItem(item: WrongReviewItem, userId: string, questionId: string) {
  return item.userId === userId && item.questionId === questionId;
}

function endOfToday() {
  const now = new Date();
  now.setHours(23, 59, 59, 999);
  return now.getTime();
}

export async function getWrongReviewItemsByUser(userId: string, includeCompleted = false) {
  if (!isDbEnabled()) {
    const list = readJson<WrongReviewItem[]>(WRONG_REVIEW_FILE, []);
    return list
      .filter((item) => item.userId === userId && (includeCompleted || item.status === "active"))
      .sort((a, b) => {
        const aTs = a.nextReviewAt ? new Date(a.nextReviewAt).getTime() : Number.MAX_SAFE_INTEGER;
        const bTs = b.nextReviewAt ? new Date(b.nextReviewAt).getTime() : Number.MAX_SAFE_INTEGER;
        return aTs - bTs;
      });
  }

  const rows = includeCompleted
    ? await query<DbWrongReviewItem>(
        "SELECT * FROM wrong_review_items WHERE user_id = $1 ORDER BY next_review_at ASC NULLS LAST, updated_at DESC",
        [userId]
      )
    : await query<DbWrongReviewItem>(
        "SELECT * FROM wrong_review_items WHERE user_id = $1 AND status = 'active' ORDER BY next_review_at ASC NULLS LAST, updated_at DESC",
        [userId]
      );
  return rows.map(mapDbItem);
}

export async function getWrongReviewItem(userId: string, questionId: string) {
  if (!isDbEnabled()) {
    const list = readJson<WrongReviewItem[]>(WRONG_REVIEW_FILE, []);
    return list.find((item) => isSameItem(item, userId, questionId)) ?? null;
  }
  const row = await queryOne<DbWrongReviewItem>(
    "SELECT * FROM wrong_review_items WHERE user_id = $1 AND question_id = $2",
    [userId, questionId]
  );
  return row ? mapDbItem(row) : null;
}

export async function enqueueWrongReview(params: {
  userId: string;
  questionId: string;
  subject: string;
  knowledgePointId: string;
}) {
  const now = new Date().toISOString();
  const nextReviewAt = calcNextReviewAt(1);

  if (!isDbEnabled()) {
    const list = readJson<WrongReviewItem[]>(WRONG_REVIEW_FILE, []);
    const index = list.findIndex((item) => isSameItem(item, params.userId, params.questionId));
    const current = index >= 0 ? list[index] : null;

    const next: WrongReviewItem = {
      id: current?.id ?? `wr-${crypto.randomBytes(6).toString("hex")}`,
      userId: params.userId,
      questionId: params.questionId,
      subject: params.subject,
      knowledgePointId: params.knowledgePointId,
      intervalLevel: 1,
      nextReviewAt,
      lastReviewResult: "wrong",
      lastReviewAt: now,
      reviewCount: current?.reviewCount ?? 0,
      status: "active",
      firstWrongAt: current?.firstWrongAt ?? now,
      createdAt: current?.createdAt ?? now,
      updatedAt: now
    };

    if (index >= 0) {
      list[index] = next;
    } else {
      list.push(next);
    }
    writeJson(WRONG_REVIEW_FILE, list);
    return next;
  }

  const existing = await queryOne<DbWrongReviewItem>(
    "SELECT * FROM wrong_review_items WHERE user_id = $1 AND question_id = $2",
    [params.userId, params.questionId]
  );
  const row = await queryOne<DbWrongReviewItem>(
    `INSERT INTO wrong_review_items
     (id, user_id, question_id, subject, knowledge_point_id, interval_level, next_review_at, last_review_result, last_review_at, review_count, status, first_wrong_at, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, 1, $6, 'wrong', $7, $8, 'active', $9, $10, $11)
     ON CONFLICT (user_id, question_id) DO UPDATE SET
       subject = EXCLUDED.subject,
       knowledge_point_id = EXCLUDED.knowledge_point_id,
       interval_level = 1,
       next_review_at = EXCLUDED.next_review_at,
       last_review_result = 'wrong',
       last_review_at = EXCLUDED.last_review_at,
       status = 'active',
       updated_at = EXCLUDED.updated_at
     RETURNING *`,
    [
      existing?.id ?? `wr-${crypto.randomBytes(6).toString("hex")}`,
      params.userId,
      params.questionId,
      params.subject,
      params.knowledgePointId,
      nextReviewAt,
      now,
      existing?.review_count ?? 0,
      existing?.first_wrong_at ?? now,
      existing?.created_at ?? now,
      now
    ]
  );
  return row ? mapDbItem(row) : null;
}

export async function submitWrongReviewResult(params: {
  userId: string;
  questionId: string;
  correct: boolean;
}) {
  const now = new Date().toISOString();

  if (!isDbEnabled()) {
    const list = readJson<WrongReviewItem[]>(WRONG_REVIEW_FILE, []);
    const index = list.findIndex((item) => isSameItem(item, params.userId, params.questionId));
    if (index === -1) return null;
    const current = list[index];

    let nextLevel: ReviewIntervalLevel = current.intervalLevel;
    let status: WrongReviewStatus = "active";
    let nextReviewAt: string | null = current.nextReviewAt;

    if (params.correct) {
      if (current.intervalLevel === 3) {
        nextLevel = 3;
        status = "completed";
        nextReviewAt = null;
      } else {
        nextLevel = toIntervalLevel(current.intervalLevel + 1);
        nextReviewAt = calcNextReviewAt(nextLevel);
      }
    } else {
      nextLevel = 1;
      status = "active";
      nextReviewAt = calcNextReviewAt(1);
    }

    const next: WrongReviewItem = {
      ...current,
      intervalLevel: nextLevel,
      nextReviewAt,
      lastReviewResult: params.correct ? "correct" : "wrong",
      lastReviewAt: now,
      reviewCount: current.reviewCount + 1,
      status,
      updatedAt: now
    };
    list[index] = next;
    writeJson(WRONG_REVIEW_FILE, list);
    return next;
  }

  const existing = await queryOne<DbWrongReviewItem>(
    "SELECT * FROM wrong_review_items WHERE user_id = $1 AND question_id = $2",
    [params.userId, params.questionId]
  );
  if (!existing) return null;

  const current = mapDbItem(existing);
  let nextLevel: ReviewIntervalLevel = current.intervalLevel;
  let status: WrongReviewStatus = "active";
  let nextReviewAt: string | null = current.nextReviewAt;

  if (params.correct) {
    if (current.intervalLevel === 3) {
      nextLevel = 3;
      status = "completed";
      nextReviewAt = null;
    } else {
      nextLevel = toIntervalLevel(current.intervalLevel + 1);
      nextReviewAt = calcNextReviewAt(nextLevel);
    }
  } else {
    nextLevel = 1;
    status = "active";
    nextReviewAt = calcNextReviewAt(1);
  }

  const row = await queryOne<DbWrongReviewItem>(
    `UPDATE wrong_review_items
     SET interval_level = $3,
         next_review_at = $4,
         last_review_result = $5,
         last_review_at = $6,
         review_count = review_count + 1,
         status = $7,
         updated_at = $8
     WHERE user_id = $1 AND question_id = $2
     RETURNING *`,
    [
      params.userId,
      params.questionId,
      nextLevel,
      nextReviewAt,
      params.correct ? "correct" : "wrong",
      now,
      status,
      now
    ]
  );
  return row ? mapDbItem(row) : null;
}

export async function getWrongReviewQueue(userId: string) {
  const activeItems = await getWrongReviewItemsByUser(userId, false);
  const now = Date.now();
  const todayEndTs = endOfToday();

  const dueToday = activeItems.filter((item) => {
    if (!item.nextReviewAt) return false;
    return new Date(item.nextReviewAt).getTime() <= todayEndTs;
  });
  const overdue = dueToday.filter((item) => {
    if (!item.nextReviewAt) return false;
    return new Date(item.nextReviewAt).getTime() < now;
  });
  const upcoming = activeItems.filter((item) => {
    if (!item.nextReviewAt) return false;
    return new Date(item.nextReviewAt).getTime() > todayEndTs;
  });

  return {
    summary: {
      totalActive: activeItems.length,
      dueToday: dueToday.length,
      overdue: overdue.length,
      upcoming: upcoming.length
    },
    dueToday,
    upcoming
  };
}

export function getIntervalLabel(level: ReviewIntervalLevel) {
  if (level === 1) return "24h";
  if (level === 2) return "72h";
  return "7d";
}

