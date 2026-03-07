export type ProviderOption = {
  key: string;
  label: string;
  description: string;
};

export type ProviderCapabilityHealth = {
  configured: boolean;
  missingEnv: string[];
  model?: string;
  baseUrl?: string;
  chatPath?: string;
};

export type ProviderHealth = {
  provider: string;
  chat: ProviderCapabilityHealth;
  vision: ProviderCapabilityHealth;
};

export type ConfigData = {
  availableProviders: ProviderOption[];
  runtimeProviderChain: string[];
  envProviderChain: string[];
  effectiveProviderChain: string[];
  providerHealth?: ProviderHealth[];
  updatedAt?: string;
  updatedBy?: string;
};

export type ProbeCapability = "chat" | "vision";

export type ProbeResult = {
  provider: string;
  ok: boolean;
  latencyMs: number;
  message: string;
};

export type ProbeResponse = {
  capability: ProbeCapability;
  testedAt: string;
  results: ProbeResult[];
};

export type TaskOption = {
  taskType: string;
  label: string;
  description: string;
};

export type TaskPolicy = {
  taskType: string;
  label: string;
  description: string;
  providerChain: string[];
  timeoutMs: number;
  maxRetries: number;
  budgetLimit: number;
  minQualityScore: number;
  source: "default" | "runtime";
  updatedAt?: string;
  updatedBy?: string;
};

export type PoliciesPayload = {
  tasks: TaskOption[];
  policies: TaskPolicy[];
};

export type MetricsRow = {
  key: string;
  taskType: string;
  provider: string;
  calls: number;
  successRate: number;
  timeoutRate: number;
  avgFallback: number;
  qualityRejectRate: number;
  budgetRejectRate: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
};

export type AiMetrics = {
  generatedAt: string;
  totalCalls: number;
  successRate: number;
  fallbackRate: number;
  timeoutRate: number;
  qualityRejectRate: number;
  budgetRejectRate: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  rows: MetricsRow[];
};

export type EvalDatasetName =
  | "explanation"
  | "homework_review"
  | "knowledge_points_generate"
  | "writing_feedback"
  | "lesson_outline"
  | "question_check";

export type EvalKind = "assist" | "coach" | "explanation" | "writing" | "assignment_review";

export type CalibrationSuggestion = {
  sampleCount: number;
  recommendedGlobalBias: number;
  providerAdjustments: Record<string, number>;
  kindAdjustments: Record<EvalKind, number>;
  note: string;
};

export type EvalDatasetReport = {
  dataset: EvalDatasetName;
  total: number;
  passed: number;
  passRate: number;
  averageScore: number;
  highRiskCount: number;
};

export type EvalReport = {
  generatedAt: string;
  datasets: EvalDatasetReport[];
  summary: {
    totalCases: number;
    passedCases: number;
    passRate: number;
    averageScore: number;
    highRiskCount: number;
    calibrationSuggestion: CalibrationSuggestion;
  };
};

export type QualityCalibrationConfig = {
  globalBias: number;
  providerAdjustments: Record<string, number>;
  kindAdjustments: Record<EvalKind, number>;
  enabled: boolean;
  rolloutPercent: number;
  rolloutSalt: string;
  updatedAt: string;
  updatedBy?: string;
};

export type QualityCalibrationSnapshot = {
  id: string;
  reason: string;
  createdAt: string;
  createdBy?: string;
  config: QualityCalibrationConfig;
};

export type QualityCalibrationPayload = QualityCalibrationConfig & {
  snapshots?: QualityCalibrationSnapshot[];
};

export type CalibrationDraft = {
  enabled: boolean;
  rolloutPercent: number;
  rolloutSalt: string;
};

export type EvalGateConfig = {
  enabled: boolean;
  datasets: EvalDatasetName[];
  minPassRate: number;
  minAverageScore: number;
  maxHighRiskCount: number;
  autoRollbackOnFail: boolean;
  updatedAt: string;
  updatedBy?: string;
};

export type EvalGateRun = {
  id: string;
  executedAt: string;
  config: EvalGateConfig;
  reportSummary: {
    totalCases: number;
    passRate: number;
    averageScore: number;
    highRiskCount: number;
  };
  passed: boolean;
  failedRules: string[];
  rollback: {
    attempted: boolean;
    snapshotId: string | null;
    success: boolean;
    message: string;
  };
};

export type EvalGatePayload = {
  config: EvalGateConfig;
  recentRuns: EvalGateRun[];
  lastRun?: EvalGateRun;
};

export type EvalGateDraft = {
  enabled: boolean;
  datasets: EvalDatasetName[];
  minPassRate: number;
  minAverageScore: number;
  maxHighRiskCount: number;
  autoRollbackOnFail: boolean;
};

export type PolicyDraft = {
  providerChain: string;
  timeoutMs: number;
  maxRetries: number;
  budgetLimit: number;
  minQualityScore: number;
};
