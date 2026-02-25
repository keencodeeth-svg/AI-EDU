import crypto from "crypto";
import { isDbEnabled, query, queryOne } from "./db";
import { readJson, writeJson } from "./storage";
import type { Question } from "./types";

const QUALITY_FILE = "question-quality-metrics.json";

export type QualityRiskLevel = "low" | "medium" | "high";

export type QuestionQualitySnapshot = {
  qualityScore: number;
  duplicateRisk: QualityRiskLevel;
  ambiguityRisk: QualityRiskLevel;
  answerConsistency: number;
  issues: string[];
};

export type QuestionQualityMetric = QuestionQualitySnapshot & {
  id: string;
  questionId: string;
  checkedAt: string;
};

export type QuestionQualityInput = {
  questionId?: string;
  subject?: string;
  grade?: string;
  knowledgePointId?: string;
  stem: string;
  options: string[];
  answer: string;
  explanation?: string;
};

export type QuestionQualityCandidate = Pick<
  Question,
  "id" | "subject" | "grade" | "knowledgePointId" | "stem"
>;

type DbQuestionQualityMetric = {
  id: string;
  question_id: string;
  quality_score: number;
  duplicate_risk: string;
  ambiguity_risk: string;
  answer_consistency: number;
  issues: string[] | null;
  checked_at: string;
};

function clampInt(value: number, min = 0, max = 100) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.round(value)));
}

function normalizeText(text: string) {
  return text
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[，。！？,.!?;:；：、"'`~\-()（）【】\[\]{}]/g, "");
}

function normalizeRisk(value: string | null | undefined): QualityRiskLevel {
  if (value === "low" || value === "medium" || value === "high") {
    return value;
  }
  return "low";
}

function mapDbMetric(row: DbQuestionQualityMetric): QuestionQualityMetric {
  return {
    id: row.id,
    questionId: row.question_id,
    qualityScore: clampInt(row.quality_score),
    duplicateRisk: normalizeRisk(row.duplicate_risk),
    ambiguityRisk: normalizeRisk(row.ambiguity_risk),
    answerConsistency: clampInt(row.answer_consistency),
    issues: row.issues ?? [],
    checkedAt: row.checked_at
  };
}

function buildCharSet(text: string) {
  const normalized = normalizeText(text);
  const set = new Set<string>();
  for (const char of normalized) {
    set.add(char);
  }
  return set;
}

function calcSimilarity(a: string, b: string) {
  const setA = buildCharSet(a);
  const setB = buildCharSet(b);
  if (!setA.size || !setB.size) return 0;

  let common = 0;
  setA.forEach((char) => {
    if (setB.has(char)) {
      common += 1;
    }
  });
  return common / Math.max(setA.size, setB.size);
}

function evaluateDuplicateRisk(
  input: Pick<QuestionQualityInput, "questionId" | "knowledgePointId" | "stem">,
  candidates: QuestionQualityCandidate[]
) {
  const normalized = normalizeText(input.stem);
  if (!normalized) {
    return {
      risk: "high" as QualityRiskLevel,
      issues: ["题干为空，无法进行有效去重。"]
    };
  }

  let exactMatches = 0;
  let maxSimilarity = 0;
  let sameKnowledgePointSimilarity = 0;

  candidates.forEach((candidate) => {
    if (input.questionId && candidate.id === input.questionId) {
      return;
    }
    const candidateNormalized = normalizeText(candidate.stem);
    if (!candidateNormalized) {
      return;
    }
    if (candidateNormalized === normalized) {
      exactMatches += 1;
      return;
    }
    const similarity = calcSimilarity(normalized, candidateNormalized);
    if (similarity > maxSimilarity) {
      maxSimilarity = similarity;
    }
    if (input.knowledgePointId && candidate.knowledgePointId === input.knowledgePointId) {
      sameKnowledgePointSimilarity = Math.max(sameKnowledgePointSimilarity, similarity);
    }
  });

  if (exactMatches > 0 || maxSimilarity >= 0.92) {
    return {
      risk: "high" as QualityRiskLevel,
      issues: ["题干与题库已有题目重复或高度相似。"]
    };
  }

  if (maxSimilarity >= 0.78 || sameKnowledgePointSimilarity >= 0.72) {
    return {
      risk: "medium" as QualityRiskLevel,
      issues: ["题干与已有题目相似度较高，建议改写。"]
    };
  }

  return { risk: "low" as QualityRiskLevel, issues: [] };
}

function toAmbiguityRisk(score: number): QualityRiskLevel {
  if (score >= 60) return "high";
  if (score >= 25) return "medium";
  return "low";
}

export function evaluateQuestionQuality(
  input: QuestionQualityInput,
  candidates: QuestionQualityCandidate[] = []
): QuestionQualitySnapshot {
  const stem = input.stem.trim();
  const options = input.options.map((item) => item.trim()).filter(Boolean);
  const answer = input.answer.trim();
  const explanation = input.explanation?.trim() ?? "";

  const issues: string[] = [];
  let ambiguityScore = 0;

  if (options.length < 4) {
    issues.push("选项数量不足 4 个。");
    ambiguityScore += 35;
  }

  const normalizedOptions = options.map(normalizeText);
  const uniqueOptions = new Set(normalizedOptions);
  if (uniqueOptions.size !== normalizedOptions.length) {
    issues.push("存在重复选项，可能导致歧义。");
    ambiguityScore += 25;
  }

  const normalizedAnswer = normalizeText(answer);
  const answerMatchCount = normalizedOptions.filter((item) => item === normalizedAnswer).length;
  const answerInOptions = answerMatchCount > 0;
  if (!answerInOptions) {
    issues.push("答案不在选项中。");
    ambiguityScore += 45;
  }

  if (stem.length < 8) {
    issues.push("题干过短，建议补充关键条件。");
    ambiguityScore += 15;
  }

  if (explanation.length < 8) {
    issues.push("解析过短，建议补充解题步骤。");
    ambiguityScore += 10;
  }

  let answerConsistency = 100;
  if (!answerInOptions) {
    answerConsistency -= 70;
  }
  if (answerMatchCount > 1) {
    answerConsistency -= 20;
  }
  if (explanation.length < 8) {
    answerConsistency -= 10;
  }
  answerConsistency = clampInt(answerConsistency);

  const comparableCandidates = candidates.filter((candidate) => {
    if (input.subject && candidate.subject !== input.subject) return false;
    if (input.grade && candidate.grade !== input.grade) return false;
    return true;
  });

  const duplicate = evaluateDuplicateRisk(
    {
      questionId: input.questionId,
      knowledgePointId: input.knowledgePointId,
      stem
    },
    comparableCandidates
  );

  issues.push(...duplicate.issues);
  const ambiguityRisk = toAmbiguityRisk(ambiguityScore);

  let penalty = 0;
  penalty += duplicate.risk === "high" ? 30 : duplicate.risk === "medium" ? 15 : 0;
  penalty += ambiguityRisk === "high" ? 30 : ambiguityRisk === "medium" ? 15 : 0;
  penalty += Math.round((100 - answerConsistency) * 0.4);

  const qualityScore = clampInt(100 - penalty);

  return {
    qualityScore,
    duplicateRisk: duplicate.risk,
    ambiguityRisk,
    answerConsistency,
    issues: Array.from(new Set(issues))
  };
}

export async function getQuestionQualityMetric(questionId: string) {
  if (!isDbEnabled()) {
    const list = readJson<QuestionQualityMetric[]>(QUALITY_FILE, []);
    return list.find((item) => item.questionId === questionId) ?? null;
  }

  const row = await queryOne<DbQuestionQualityMetric>(
    "SELECT * FROM question_quality_metrics WHERE question_id = $1",
    [questionId]
  );
  return row ? mapDbMetric(row) : null;
}

export async function listQuestionQualityMetrics(params: { questionIds?: string[] } = {}) {
  const ids = params.questionIds;
  if (ids && ids.length === 0) {
    return [] as QuestionQualityMetric[];
  }

  if (!isDbEnabled()) {
    const list = readJson<QuestionQualityMetric[]>(QUALITY_FILE, []);
    const filtered = ids ? list.filter((item) => ids.includes(item.questionId)) : list;
    return filtered.sort((a, b) => b.checkedAt.localeCompare(a.checkedAt));
  }

  const rows = ids
    ? await query<DbQuestionQualityMetric>(
        "SELECT * FROM question_quality_metrics WHERE question_id = ANY($1::text[]) ORDER BY checked_at DESC",
        [ids]
      )
    : await query<DbQuestionQualityMetric>(
        "SELECT * FROM question_quality_metrics ORDER BY checked_at DESC"
      );
  return rows.map(mapDbMetric);
}

export async function upsertQuestionQualityMetric(
  input: { questionId: string } & QuestionQualitySnapshot & { checkedAt?: string }
) {
  const checkedAt = input.checkedAt ?? new Date().toISOString();

  if (!isDbEnabled()) {
    const list = readJson<QuestionQualityMetric[]>(QUALITY_FILE, []);
    const index = list.findIndex((item) => item.questionId === input.questionId);
    const next: QuestionQualityMetric = {
      id: index >= 0 ? list[index].id : `qqm-${crypto.randomBytes(6).toString("hex")}`,
      questionId: input.questionId,
      qualityScore: clampInt(input.qualityScore),
      duplicateRisk: normalizeRisk(input.duplicateRisk),
      ambiguityRisk: normalizeRisk(input.ambiguityRisk),
      answerConsistency: clampInt(input.answerConsistency),
      issues: Array.from(new Set(input.issues)),
      checkedAt
    };

    if (index >= 0) {
      list[index] = next;
    } else {
      list.push(next);
    }
    writeJson(QUALITY_FILE, list);
    return next;
  }

  const existing = await queryOne<DbQuestionQualityMetric>(
    "SELECT * FROM question_quality_metrics WHERE question_id = $1",
    [input.questionId]
  );

  const row = await queryOne<DbQuestionQualityMetric>(
    `INSERT INTO question_quality_metrics
      (id, question_id, quality_score, duplicate_risk, ambiguity_risk, answer_consistency, issues, checked_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (question_id) DO UPDATE SET
       quality_score = EXCLUDED.quality_score,
       duplicate_risk = EXCLUDED.duplicate_risk,
       ambiguity_risk = EXCLUDED.ambiguity_risk,
       answer_consistency = EXCLUDED.answer_consistency,
       issues = EXCLUDED.issues,
       checked_at = EXCLUDED.checked_at
     RETURNING *`,
    [
      existing?.id ?? `qqm-${crypto.randomBytes(6).toString("hex")}`,
      input.questionId,
      clampInt(input.qualityScore),
      normalizeRisk(input.duplicateRisk),
      normalizeRisk(input.ambiguityRisk),
      clampInt(input.answerConsistency),
      Array.from(new Set(input.issues)),
      checkedAt
    ]
  );
  return row ? mapDbMetric(row) : null;
}

export async function evaluateAndUpsertQuestionQuality(params: {
  question: Question;
  candidates?: QuestionQualityCandidate[];
}) {
  const snapshot = evaluateQuestionQuality(
    {
      questionId: params.question.id,
      subject: params.question.subject,
      grade: params.question.grade,
      knowledgePointId: params.question.knowledgePointId,
      stem: params.question.stem,
      options: params.question.options,
      answer: params.question.answer,
      explanation: params.question.explanation
    },
    params.candidates ?? []
  );
  return upsertQuestionQualityMetric({
    questionId: params.question.id,
    ...snapshot
  });
}

export async function deleteQuestionQualityMetric(questionId: string) {
  if (!isDbEnabled()) {
    const list = readJson<QuestionQualityMetric[]>(QUALITY_FILE, []);
    const next = list.filter((item) => item.questionId !== questionId);
    writeJson(QUALITY_FILE, next);
    return list.length !== next.length;
  }

  const rows = await query<{ id: string }>(
    "DELETE FROM question_quality_metrics WHERE question_id = $1 RETURNING id",
    [questionId]
  );
  return rows.length > 0;
}

export function attachQualityFields<T extends { id: string }>(
  item: T,
  metric: QuestionQualityMetric | null
) {
  return {
    ...item,
    qualityScore: metric?.qualityScore ?? null,
    duplicateRisk: metric?.duplicateRisk ?? null,
    ambiguityRisk: metric?.ambiguityRisk ?? null,
    answerConsistency: metric?.answerConsistency ?? null,
    qualityIssues: metric?.issues ?? [],
    qualityCheckedAt: metric?.checkedAt ?? null
  };
}
