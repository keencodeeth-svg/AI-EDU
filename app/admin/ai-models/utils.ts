import type { EvalDatasetName, PolicyDraft } from "./types";

export const EMPTY_DRAFT: PolicyDraft = {
  providerChain: "",
  timeoutMs: 8000,
  maxRetries: 1,
  budgetLimit: 1800,
  minQualityScore: 70
};

export const EVAL_DATASET_OPTIONS: Array<{ key: EvalDatasetName; label: string }> = [
  { key: "explanation", label: "题目讲解" },
  { key: "homework_review", label: "作业评语" },
  { key: "knowledge_points_generate", label: "知识点生成" },
  { key: "writing_feedback", label: "写作反馈" },
  { key: "lesson_outline", label: "教案提纲" },
  { key: "question_check", label: "题目质检" }
];

export const EVAL_DATASET_LABELS = new Map(EVAL_DATASET_OPTIONS.map((item) => [item.key, item.label]));

export function toChainInput(value: string[]) {
  return value.join(", ");
}

export function parseChainInput(value: string) {
  return value
    .split(/[\s,，|]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}
