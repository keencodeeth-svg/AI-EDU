import crypto from "crypto";
import { readJson, writeJson } from "./storage";
import { isDbEnabled, query, queryOne } from "./db";
import type { QuestionAttempt } from "./progress";
import { getAttemptsByUser, getStreak } from "./progress";
import { getKnowledgePoints } from "./content";
import { getMasteryRecordsByUser } from "./mastery";

export type ChallengeTask = {
  id: string;
  title: string;
  description: string;
  goal: number;
  points: number;
  type: "count" | "streak" | "accuracy" | "mastery";
  linkedKnowledgePoints: Array<{
    id: string;
    title: string;
    subject: string;
    grade: string;
  }>;
  unlockRule: string;
  learningProof: ChallengeLearningProof;
};

export type ChallengeLearningProof = {
  checkedAt: string;
  windowDays: number;
  linkedKnowledgePointIds: string[];
  linkedAttempts: number;
  linkedCorrect: number;
  linkedAccuracy: number;
  linkedReviewCorrect: number;
  streak: number;
  masteryAverage: number;
  weakKnowledgePointCount: number;
  missingActions: string[];
};

export type ChallengeStatus = ChallengeTask & {
  progress: number;
  completed: boolean;
  claimed: boolean;
};

const CLAIM_FILE = "challenge-claims.json";
const WINDOW_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;
const LINKED_KP_LIMIT = 3;

type ChallengeTaskDefinition = Omit<
  ChallengeTask,
  "linkedKnowledgePoints" | "learningProof"
>;

const TASKS: ChallengeTaskDefinition[] = [
  {
    id: "practice-10",
    title: "薄弱点闯关",
    description: "围绕薄弱知识点完成 10 次练习，并保持基础正确率。",
    goal: 10,
    points: 10,
    type: "count",
    unlockRule: "近 7 天在关联薄弱知识点完成至少 10 次练习，且正确率达到 60%"
  },
  {
    id: "streak-3",
    title: "连续学习闭环",
    description: "连续学习并完成错题复练，形成学习闭环。",
    goal: 3,
    points: 15,
    type: "streak",
    unlockRule: "连续学习至少 3 天，且近 7 天关联薄弱点完成至少 1 次错题复练答对"
  },
  {
    id: "accuracy-80",
    title: "薄弱点提分",
    description: "薄弱点专项训练达到高正确率。",
    goal: 80,
    points: 20,
    type: "accuracy",
    unlockRule: "近 7 天关联薄弱知识点练习至少 8 题，正确率达到 80%"
  },
  {
    id: "assignment-1",
    title: "修复成效",
    description: "薄弱知识点平均掌握度达到修复阈值。",
    goal: 65,
    points: 12,
    type: "mastery",
    unlockRule: "关联薄弱点近 7 天至少答对 3 题，且平均掌握度达到 65 分"
  }
];

type DbClaim = {
  id: string;
  user_id: string;
  task_id: string;
  points: number;
  claimed_at: string;
  linked_knowledge_points: string[] | null;
  learning_proof: unknown;
  unlock_rule: string | null;
};

type Claim = {
  id: string;
  userId: string;
  taskId: string;
  points: number;
  claimedAt: string;
  linkedKnowledgePoints: string[];
  learningProof?: ChallengeLearningProof | null;
  unlockRule?: string | null;
};

type ChallengeContext = {
  checkedAt: string;
  linkedKnowledgePoints: ChallengeTask["linkedKnowledgePoints"];
  linkedAttempts: number;
  linkedCorrect: number;
  linkedAccuracy: number;
  linkedReviewCorrect: number;
  streak: number;
  masteryAverage: number;
  weakKnowledgePointCount: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function average(values: number[]) {
  if (!values.length) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function parseLearningProof(value: unknown): ChallengeLearningProof | null {
  if (!value) return null;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as ChallengeLearningProof;
      return parsed;
    } catch {
      return null;
    }
  }
  if (typeof value === "object") {
    return value as ChallengeLearningProof;
  }
  return null;
}

function mapClaim(row: DbClaim): Claim {
  return {
    id: row.id,
    userId: row.user_id,
    taskId: row.task_id,
    points: row.points,
    claimedAt: row.claimed_at,
    linkedKnowledgePoints: row.linked_knowledge_points ?? [],
    learningProof: parseLearningProof(row.learning_proof),
    unlockRule: row.unlock_rule
  };
}

async function getClaims(userId: string) {
  if (!isDbEnabled()) {
    const list = readJson<Claim[]>(CLAIM_FILE, []);
    return list
      .filter((item) => item.userId === userId)
      .map((item) => ({
        ...item,
        linkedKnowledgePoints: item.linkedKnowledgePoints ?? [],
        learningProof: item.learningProof ?? null,
        unlockRule: item.unlockRule ?? null
      }));
  }
  const rows = await query<DbClaim>("SELECT * FROM challenge_claims WHERE user_id = $1", [userId]);
  return rows.map(mapClaim);
}

function getAttemptTs(attempt: Pick<QuestionAttempt, "createdAt">) {
  return new Date(attempt.createdAt).getTime();
}

async function resolveLinkedKnowledgePoints(userId: string, attempts: QuestionAttempt[]) {
  const allKnowledgePoints = await getKnowledgePoints();
  const kpMap = new Map(
    allKnowledgePoints.map((item) => [
      item.id,
      {
        id: item.id,
        title: item.title,
        subject: item.subject,
        grade: item.grade
      }
    ])
  );
  const selectedIds: string[] = [];

  const pushIfNeeded = (knowledgePointId: string) => {
    if (!kpMap.has(knowledgePointId)) return;
    if (selectedIds.includes(knowledgePointId)) return;
    if (selectedIds.length >= LINKED_KP_LIMIT) return;
    selectedIds.push(knowledgePointId);
  };

  const masteryRecords = await getMasteryRecordsByUser(userId);
  masteryRecords
    .sort((a, b) => {
      if (a.masteryScore === b.masteryScore) {
        return a.total - b.total;
      }
      return a.masteryScore - b.masteryScore;
    })
    .forEach((record) => {
      pushIfNeeded(record.knowledgePointId);
    });

  if (selectedIds.length < LINKED_KP_LIMIT) {
    const attemptStats = new Map<string, { total: number; correct: number; lastTs: number }>();
    attempts.forEach((attempt) => {
      const current = attemptStats.get(attempt.knowledgePointId) ?? {
        total: 0,
        correct: 0,
        lastTs: 0
      };
      current.total += 1;
      current.correct += attempt.correct ? 1 : 0;
      current.lastTs = Math.max(current.lastTs, getAttemptTs(attempt));
      attemptStats.set(attempt.knowledgePointId, current);
    });

    Array.from(attemptStats.entries())
      .sort((a, b) => {
        const ratioA = a[1].total === 0 ? 0 : a[1].correct / a[1].total;
        const ratioB = b[1].total === 0 ? 0 : b[1].correct / b[1].total;
        if (ratioA === ratioB) return b[1].lastTs - a[1].lastTs;
        return ratioA - ratioB;
      })
      .forEach(([knowledgePointId]) => {
        pushIfNeeded(knowledgePointId);
      });
  }

  if (selectedIds.length < LINKED_KP_LIMIT) {
    const fallback = allKnowledgePoints
      .slice()
      .sort((a, b) => {
        if (a.subject === b.subject) {
          return a.id.localeCompare(b.id);
        }
        if (a.subject === "math") return -1;
        if (b.subject === "math") return 1;
        return a.subject.localeCompare(b.subject);
      });
    fallback.forEach((item) => pushIfNeeded(item.id));
  }

  return selectedIds
    .map((id) => kpMap.get(id))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
}

function buildLearningProof(
  context: ChallengeContext,
  missingActions: string[]
): ChallengeLearningProof {
  return {
    checkedAt: context.checkedAt,
    windowDays: WINDOW_DAYS,
    linkedKnowledgePointIds: context.linkedKnowledgePoints.map((item) => item.id),
    linkedAttempts: context.linkedAttempts,
    linkedCorrect: context.linkedCorrect,
    linkedAccuracy: context.linkedAccuracy,
    linkedReviewCorrect: context.linkedReviewCorrect,
    streak: context.streak,
    masteryAverage: context.masteryAverage,
    weakKnowledgePointCount: context.weakKnowledgePointCount,
    missingActions
  };
}

function evaluateTask(task: ChallengeTaskDefinition, context: ChallengeContext): ChallengeStatus {
  const missingActions: string[] = [];
  let progress = 0;

  if (!context.linkedKnowledgePoints.length) {
    missingActions.push("暂无可绑定的薄弱知识点，请先完成至少一次练习。");
  }

  if (task.id === "practice-10") {
    progress = context.linkedAttempts;
    if (context.linkedAttempts < 10) {
      missingActions.push(`关联薄弱点练习不足 10 题（当前 ${context.linkedAttempts}）。`);
    }
    if (context.linkedAccuracy < 60) {
      missingActions.push(`关联薄弱点正确率需达到 60%（当前 ${context.linkedAccuracy}%）。`);
    }
  } else if (task.id === "streak-3") {
    progress = context.streak;
    if (context.streak < 3) {
      missingActions.push(`连续学习不足 3 天（当前 ${context.streak} 天）。`);
    }
    if (context.linkedReviewCorrect < 1) {
      missingActions.push("需完成至少 1 次关联薄弱点错题复练并答对。");
    }
  } else if (task.id === "accuracy-80") {
    progress = context.linkedAccuracy;
    if (context.linkedAttempts < 8) {
      missingActions.push(`关联薄弱点练习不足 8 题（当前 ${context.linkedAttempts}）。`);
    }
    if (context.linkedAccuracy < 80) {
      missingActions.push(`关联薄弱点正确率需达到 80%（当前 ${context.linkedAccuracy}%）。`);
    }
  } else if (task.id === "assignment-1") {
    progress = context.masteryAverage;
    if (context.linkedCorrect < 3) {
      missingActions.push(`关联薄弱点答对题数不足 3 题（当前 ${context.linkedCorrect}）。`);
    }
    if (context.masteryAverage < 65) {
      missingActions.push(`关联薄弱点平均掌握度需达到 65 分（当前 ${context.masteryAverage} 分）。`);
    }
  }

  const completed = missingActions.length === 0;
  const normalizedProgress =
    task.type === "accuracy" || task.type === "mastery"
      ? clamp(progress, 0, 100)
      : Math.max(0, Math.round(progress));

  return {
    ...task,
    progress: normalizedProgress,
    completed,
    claimed: false,
    linkedKnowledgePoints: context.linkedKnowledgePoints,
    unlockRule: task.unlockRule,
    learningProof: buildLearningProof(context, missingActions)
  };
}

export async function getChallengeStatus(userId: string) {
  const attempts = await getAttemptsByUser(userId);
  const streak = await getStreak(userId);
  const linkedKnowledgePoints = await resolveLinkedKnowledgePoints(userId, attempts);
  const linkedKnowledgePointIds = new Set(linkedKnowledgePoints.map((item) => item.id));
  const masteryRecords = await getMasteryRecordsByUser(userId);
  const masteryMap = new Map(masteryRecords.map((item) => [item.knowledgePointId, item]));
  const masteryScores = linkedKnowledgePoints.map((item) => masteryMap.get(item.id)?.masteryScore ?? 0);
  const masteryAverage = masteryScores.length ? average(masteryScores) : 0;
  const weakKnowledgePointCount = masteryScores.filter((score) => score < 60).length;

  const nowTs = Date.now();
  const sinceTs = nowTs - WINDOW_DAYS * DAY_MS;
  const linkedAttemptsRecent = attempts.filter((attempt) => {
    if (!linkedKnowledgePointIds.has(attempt.knowledgePointId)) return false;
    return getAttemptTs(attempt) >= sinceTs;
  });
  const linkedCorrectRecent = linkedAttemptsRecent.filter((attempt) => attempt.correct).length;
  const linkedReviewCorrectRecent = linkedAttemptsRecent.filter(
    (attempt) => attempt.reason === "wrong-book-review" && attempt.correct
  ).length;
  const linkedAttempts = linkedAttemptsRecent.length;
  const linkedAccuracy = linkedAttempts === 0 ? 0 : Math.round((linkedCorrectRecent / linkedAttempts) * 100);

  const checkedAt = new Date().toISOString();
  const context: ChallengeContext = {
    checkedAt,
    linkedKnowledgePoints,
    linkedAttempts,
    linkedCorrect: linkedCorrectRecent,
    linkedAccuracy,
    linkedReviewCorrect: linkedReviewCorrectRecent,
    streak,
    masteryAverage,
    weakKnowledgePointCount
  };

  const claims = await getClaims(userId);
  const claimedSet = new Set(claims.map((item) => item.taskId));

  return TASKS.map((task) => {
    const next = evaluateTask(task, context);
    const claimed = claimedSet.has(task.id);
    return {
      ...next,
      completed: next.completed || claimed,
      claimed
    };
  });
}

export async function getChallengePoints(userId: string) {
  const claims = await getClaims(userId);
  return claims.reduce((sum, item) => sum + item.points, 0);
}

export async function claimChallenge(userId: string, taskId: string) {
  const tasks = await getChallengeStatus(userId);
  const task = tasks.find((item) => item.id === taskId);
  if (!task) {
    return { ok: false, message: "任务不存在" };
  }
  if (!task.completed) {
    const reason = task.learningProof.missingActions[0];
    if (reason) {
      return { ok: false, message: `任务未完成：${reason}` };
    }
    return { ok: false, message: "任务未完成" };
  }
  if (task.claimed) {
    return { ok: false, message: "已领取" };
  }

  const claim: Claim = {
    id: `claim-${crypto.randomBytes(6).toString("hex")}`,
    userId,
    taskId,
    points: task.points,
    claimedAt: new Date().toISOString(),
    linkedKnowledgePoints: task.linkedKnowledgePoints.map((item) => item.id),
    learningProof: task.learningProof,
    unlockRule: task.unlockRule
  };

  if (!isDbEnabled()) {
    const list = readJson<Claim[]>(CLAIM_FILE, []);
    list.push(claim);
    writeJson(CLAIM_FILE, list);
    return { ok: true, claim };
  }

  const row = await queryOne<DbClaim>(
    `INSERT INTO challenge_claims
      (id, user_id, task_id, points, claimed_at, linked_knowledge_points, learning_proof, unlock_rule)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (user_id, task_id) DO NOTHING
     RETURNING *`,
    [
      claim.id,
      claim.userId,
      claim.taskId,
      claim.points,
      claim.claimedAt,
      claim.linkedKnowledgePoints,
      claim.learningProof ?? null,
      claim.unlockRule ?? null
    ]
  );

  if (!row) {
    return { ok: false, message: "已领取" };
  }

  return { ok: true, claim: mapClaim(row) };
}
