export type PracticeMode = "normal" | "challenge" | "timed" | "wrong" | "adaptive" | "review";

export type PracticeQuickFixAction = "clear_filters" | "switch_normal" | "switch_adaptive";

export type Question = {
  id: string;
  stem: string;
  options: string[];
  knowledgePointId: string;
  recommendation?: {
    reason?: string;
    weaknessRank?: number | null;
  };
};

export type KnowledgePoint = {
  id: string;
  subject: string;
  grade: string;
  title: string;
  chapter?: string;
  unit?: string;
};

export type Variant = {
  stem: string;
  options: string[];
  answer: string;
  explanation: string;
};

export type VariantPack = {
  analysis: string;
  hints: string[];
  variants: Variant[];
};

export type PracticeResult = {
  correct: boolean;
  explanation: string;
  answer: string;
  masteryScore?: number;
  masteryDelta?: number;
  confidenceScore?: number;
  recencyWeight?: number;
  masteryTrend7d?: number;
  weaknessRank?: number | null;
};

export type KnowledgePointGroup = {
  unit: string;
  chapter: string;
  items: KnowledgePoint[];
};

export type ExplainPack = {
  text: string;
  visual: string;
  analogy: string;
  provider?: string;
  manualReviewRule?: string;
  citationGovernance?: {
    total: number;
    averageConfidence: number;
    highTrustCount: number;
    mediumTrustCount: number;
    lowTrustCount: number;
    riskLevel: "low" | "medium" | "high";
    needsManualReview: boolean;
    manualReviewReason: string;
  };
  citations?: Array<{
    itemId: string;
    itemTitle: string;
    snippet: string;
    score: number;
    confidence: number;
    trustLevel: "high" | "medium" | "low";
    riskLevel: "low" | "medium" | "high";
    matchRatio: number;
    reason: string[];
  }>;
};
