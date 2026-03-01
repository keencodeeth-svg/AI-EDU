import explanationDataset from "@/eval/ai/datasets/explanation.json";
import homeworkReviewDataset from "@/eval/ai/datasets/homework_review.json";
import knowledgePointsDataset from "@/eval/ai/datasets/knowledge_points_generate.json";
import lessonOutlineDataset from "@/eval/ai/datasets/lesson_outline.json";
import questionCheckDataset from "@/eval/ai/datasets/question_check.json";
import writingFeedbackDataset from "@/eval/ai/datasets/writing_feedback.json";
import { assessAiQuality, type AiQualityRiskLevel } from "./ai-quality-control";
import type { AiTaskType } from "./ai-task-policies";
import type { AiQualityKind } from "./ai-quality-calibration";

type EvalCaseInput = {
  kind: "assist" | "coach" | "explanation" | "writing" | "assignment_review";
  provider?: string;
  taskType?: AiTaskType;
  textBlocks: string[];
  listCountHint?: number;
};

type EvalCaseExpected = {
  minScore?: number;
  maxScore?: number;
  riskLevel?: AiQualityRiskLevel;
};

type EvalCase = {
  id: string;
  input: EvalCaseInput;
  expected: EvalCaseExpected;
};

export type AiEvalDatasetName =
  | "explanation"
  | "homework_review"
  | "knowledge_points_generate"
  | "writing_feedback"
  | "lesson_outline"
  | "question_check";

export type AiEvalCaseResult = {
  id: string;
  kind: EvalCaseInput["kind"];
  provider: string;
  taskType?: AiTaskType;
  passed: boolean;
  score: number;
  riskLevel: AiQualityRiskLevel;
  reasons: string[];
  expected: EvalCaseExpected;
  mismatches: string[];
};

export type AiEvalCalibrationSuggestion = {
  sampleCount: number;
  recommendedGlobalBias: number;
  providerAdjustments: Record<string, number>;
  kindAdjustments: Record<AiQualityKind, number>;
  note: string;
};

export type AiEvalDatasetReport = {
  dataset: AiEvalDatasetName;
  total: number;
  passed: number;
  passRate: number;
  averageScore: number;
  highRiskCount: number;
  cases: AiEvalCaseResult[];
};

export type AiEvalReport = {
  generatedAt: string;
  datasets: AiEvalDatasetReport[];
  summary: {
    totalCases: number;
    passedCases: number;
    passRate: number;
    averageScore: number;
    highRiskCount: number;
    calibrationSuggestion: AiEvalCalibrationSuggestion;
  };
};

const DATASETS: Record<AiEvalDatasetName, EvalCase[]> = {
  explanation: explanationDataset as EvalCase[],
  homework_review: homeworkReviewDataset as EvalCase[],
  knowledge_points_generate: knowledgePointsDataset as EvalCase[],
  writing_feedback: writingFeedbackDataset as EvalCase[],
  lesson_outline: lessonOutlineDataset as EvalCase[],
  question_check: questionCheckDataset as EvalCase[]
};

const KIND_KEYS: AiQualityKind[] = ["assist", "coach", "explanation", "writing", "assignment_review"];

function round(value: number, digits = 2) {
  const scale = Math.pow(10, digits);
  return Math.round(value * scale) / scale;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function evaluateCase(testCase: EvalCase): AiEvalCaseResult {
  const quality = assessAiQuality({
    kind: testCase.input.kind,
    provider: testCase.input.provider,
    taskType: testCase.input.taskType,
    textBlocks: testCase.input.textBlocks,
    listCountHint: testCase.input.listCountHint
  });

  const mismatches: string[] = [];
  const expectedMin = testCase.expected.minScore;
  const expectedMax = testCase.expected.maxScore;
  const expectedRisk = testCase.expected.riskLevel;

  if (typeof expectedMin === "number" && quality.confidenceScore < expectedMin) {
    mismatches.push(`score ${quality.confidenceScore} < min ${expectedMin}`);
  }
  if (typeof expectedMax === "number" && quality.confidenceScore > expectedMax) {
    mismatches.push(`score ${quality.confidenceScore} > max ${expectedMax}`);
  }
  if (expectedRisk && quality.riskLevel !== expectedRisk) {
    mismatches.push(`risk ${quality.riskLevel} != ${expectedRisk}`);
  }

  return {
    id: testCase.id,
    kind: testCase.input.kind,
    provider: String(testCase.input.provider ?? "unknown").trim().toLowerCase() || "unknown",
    taskType: testCase.input.taskType,
    passed: mismatches.length === 0,
    score: quality.confidenceScore,
    riskLevel: quality.riskLevel,
    reasons: quality.reasons,
    expected: testCase.expected,
    mismatches
  };
}

function buildCalibrationSuggestion(reports: AiEvalDatasetReport[]): AiEvalCalibrationSuggestion {
  type Bucket = { sum: number; count: number };
  const global: Bucket = { sum: 0, count: 0 };
  const providerBuckets = new Map<string, Bucket>();
  const kindBuckets = new Map<AiQualityKind, Bucket>();

  reports.forEach((report) => {
    report.cases.forEach((item) => {
      let scoreDelta = 0;
      if (typeof item.expected.minScore === "number" && item.score < item.expected.minScore) {
        scoreDelta += item.expected.minScore - item.score;
      }
      if (typeof item.expected.maxScore === "number" && item.score > item.expected.maxScore) {
        scoreDelta -= item.score - item.expected.maxScore;
      }
      if (scoreDelta === 0) return;

      global.sum += scoreDelta;
      global.count += 1;

      const providerBucket = providerBuckets.get(item.provider) ?? { sum: 0, count: 0 };
      providerBucket.sum += scoreDelta;
      providerBucket.count += 1;
      providerBuckets.set(item.provider, providerBucket);

      const kindBucket = kindBuckets.get(item.kind) ?? { sum: 0, count: 0 };
      kindBucket.sum += scoreDelta;
      kindBucket.count += 1;
      kindBuckets.set(item.kind, kindBucket);
    });
  });

  const damp = (bucket: Bucket) => round(clamp((bucket.sum / bucket.count) * 0.6, -10, 10), 2);
  const globalBias = global.count ? damp(global) : 0;
  const providerAdjustments = Array.from(providerBuckets.entries()).reduce(
    (acc, [provider, bucket]) => {
      const value = damp(bucket);
      if (Math.abs(value) >= 0.5) {
        acc[provider] = value;
      }
      return acc;
    },
    {} as Record<string, number>
  );
  const kindAdjustments = KIND_KEYS.reduce(
    (acc, kind) => {
      const bucket = kindBuckets.get(kind);
      acc[kind] = bucket ? damp(bucket) : 0;
      return acc;
    },
    {} as Record<AiQualityKind, number>
  );

  return {
    sampleCount: global.count,
    recommendedGlobalBias: globalBias,
    providerAdjustments,
    kindAdjustments,
    note:
      global.count > 0
        ? "基于离线样本边界偏差生成建议；请先灰度调参后再全量应用。"
        : "当前样本未出现越界偏差，建议保持现有校准参数。"
  };
}

function buildDatasetReport(dataset: AiEvalDatasetName, cases: EvalCase[]): AiEvalDatasetReport {
  const results = cases.map((item) => evaluateCase(item));
  const passed = results.filter((item) => item.passed).length;
  const total = results.length;
  return {
    dataset,
    total,
    passed,
    passRate: total ? round((passed / total) * 100, 2) : 0,
    averageScore: total ? round(results.reduce((sum, item) => sum + item.score, 0) / total, 2) : 0,
    highRiskCount: results.filter((item) => item.riskLevel === "high").length,
    cases: results
  };
}

export function runAiOfflineEval(params: { datasets?: AiEvalDatasetName[] } = {}): AiEvalReport {
  const datasetNames = (params.datasets?.length ? params.datasets : Object.keys(DATASETS)) as AiEvalDatasetName[];
  const reports = datasetNames.map((name) => buildDatasetReport(name, DATASETS[name] ?? []));
  const totalCases = reports.reduce((sum, item) => sum + item.total, 0);
  const passedCases = reports.reduce((sum, item) => sum + item.passed, 0);
  const scoreCount = reports.reduce((sum, item) => sum + item.total, 0);
  const scoreSum = reports.reduce((sum, item) => sum + item.averageScore * item.total, 0);
  const highRiskCount = reports.reduce((sum, item) => sum + item.highRiskCount, 0);

  return {
    generatedAt: new Date().toISOString(),
    datasets: reports,
    summary: {
      totalCases,
      passedCases,
      passRate: totalCases ? round((passedCases / totalCases) * 100, 2) : 0,
      averageScore: scoreCount ? round(scoreSum / scoreCount, 2) : 0,
      highRiskCount,
      calibrationSuggestion: buildCalibrationSuggestion(reports)
    }
  };
}
