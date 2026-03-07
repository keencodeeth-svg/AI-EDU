export type ClassItem = {
  id: string;
  name: string;
  subject: string;
  grade: string;
};

export type KnowledgePoint = {
  id: string;
  subject: string;
  grade: string;
  title: string;
  chapter: string;
  unit?: string;
};

export type PaperQuestion = {
  id: string;
  stem: string;
  options: string[];
  answer: string;
  explanation: string;
  knowledgePointTitle: string;
  chapter: string;
  unit: string;
  source: "bank" | "ai";
};

export type PaperFormState = {
  classId: string;
  knowledgePointIds: string[];
  difficulty: "all" | "easy" | "medium" | "hard";
  questionType: "all" | "choice" | "application" | "calculation";
  durationMinutes: number;
  questionCount: number;
  mode: "bank" | "ai";
  includeIsolated: boolean;
};

export type PaperQuickFixAction = "clear_filters" | "switch_ai" | "reduce_count" | "allow_isolated";

export type PaperGenerationStage = {
  stage: string;
  label: string;
  totalPoolCount: number;
  activePoolCount: number;
  isolatedExcludedCount: number;
};

export type PaperGenerationDiagnostics = {
  reasonCodes?: string[];
  selectedStage?: string;
  selectedStageLabel?: string;
  stageTrail?: PaperGenerationStage[];
  generation?: {
    bankSelectedCount: number;
    aiAttemptedCount: number;
    aiGeneratedCount: number;
    ruleFallbackCount: number;
  };
  suggestions?: string[];
};

export type PaperQualityGovernance = {
  includeIsolated: boolean;
  isolatedExcludedCount: number;
  isolatedPoolCount: number;
  activePoolCount: number;
  totalPoolCount?: number;
  shortfallCount?: number;
  qualityGovernanceDegraded?: boolean;
};

export type PaperGenerationResult = {
  questions: PaperQuestion[];
  count: number;
  requestedCount?: number;
  diagnostics?: PaperGenerationDiagnostics | null;
  qualityGovernance?: PaperQualityGovernance | null;
};

export type OutlineFormState = {
  classId: string;
  topic: string;
  knowledgePointIds: string[];
};

export type TeacherAiQualityPayload = {
  quality?: {
    confidenceScore?: number;
    riskLevel?: string;
    needsHumanReview?: boolean;
    fallbackAction?: string;
    reasons?: string[];
  } | null;
  manualReviewRule?: string | null;
};

export type OutlineResult = TeacherAiQualityPayload & {
  outline?: {
    objectives?: string[];
    keyPoints?: string[];
    slides?: Array<{
      title: string;
      bullets?: string[];
    }>;
    blackboardSteps?: string[];
  } | null;
};

export type WrongReviewFormState = {
  classId: string;
  rangeDays: number;
};

export type WrongReviewResult = TeacherAiQualityPayload & {
  wrongPoints?: Array<{
    kpId: string;
    title: string;
    count: number;
  }>;
  script?: {
    agenda?: string[];
    script?: string[];
    reminders?: string[];
  } | null;
};

export type ReviewPackDispatchQuality = {
  includeIsolated: boolean;
  isolatedPoolCount: number;
  isolatedExcludedCount: number;
  selectedIsolatedCount: number;
};

export type ReviewPackCommonCauseItem = {
  causeKey: string;
  causeTitle: string;
  level: string;
  count: number;
  ratio: number;
  linkedKnowledgePoints?: Array<{
    title: string;
  }>;
  remediationTip: string;
  classAction: string;
};

export type ReviewPackOrderItem = {
  order: number;
  knowledgePointId: string;
  title: string;
  wrongRatio: number;
  teachFocus: string;
};

export type ReviewPackExemplarQuestion = {
  knowledgePointId: string;
  questionId?: string;
  title: string;
  stem: string;
  qualityRiskLevel?: string;
  isolated?: boolean;
};

export type ReviewPackTask = {
  id: string;
  title: string;
  instruction: string;
  target: string;
};

export type ReviewPackReviewSheetItem = {
  id: string;
  title: string;
  suggestedCount: number;
  dueInDays: number;
};

export type ReviewPackResult = TeacherAiQualityPayload & {
  qualityGovernance?: {
    trackedWrongQuestionCount: number;
    totalWrongQuestionCount: number;
    highRiskWrongCount: number;
    isolatedWrongCount: number;
    recommendedAction?: string;
  } | null;
  commonCauseStats?: ReviewPackCommonCauseItem[];
  reviewOrder?: ReviewPackOrderItem[];
  exemplarQuestions?: ReviewPackExemplarQuestion[];
  classTasks?: ReviewPackTask[];
  afterClassReviewSheet?: ReviewPackReviewSheetItem[];
};

export type ReviewPackFailedItem = {
  itemId?: string;
  title?: string;
  reason?: string;
  item?: ReviewPackReviewSheetItem;
};

export type ReviewPackRelaxedItem = {
  itemId?: string;
  title?: string;
  reason?: string;
};

export type ReviewPackDispatchSummary = {
  created: number;
  requested: number;
  studentsNotified: number;
  parentsNotified: number;
  relaxed?: ReviewPackRelaxedItem[];
  relaxedCount?: number;
  qualityGovernance?: ReviewPackDispatchQuality | null;
};

export type ReviewPackDispatchPayload = {
  summary?: ReviewPackDispatchSummary | null;
  failed?: ReviewPackFailedItem[];
};

export type ReviewPackDispatchOptions = {
  autoRelaxOnInsufficient?: boolean;
  includeIsolated?: boolean;
};

export type ReviewPackDispatchResult =
  | {
      ok: false;
      error: string;
    }
  | {
      ok: true;
      data: ReviewPackDispatchPayload | null;
    };

export type QuestionCheckFormState = {
  questionId: string;
  stem: string;
  options: string[];
  answer: string;
  explanation: string;
};

export type QuestionCheckResult = {
  risk?: string;
  issues?: string[];
  suggestedAnswer?: string;
  notes?: string;
};
