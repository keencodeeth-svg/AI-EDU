export type ReceiptStatus = "done" | "skipped";
export type ReceiptSource = "weekly_report" | "assignment_plan";

export type ActionItemReceipt = {
  status?: ReceiptStatus;
  completedAt?: string;
  effectScore?: number;
  note?: string;
};

export type ParentActionItem = {
  id: string;
  title: string;
  description: string;
  estimatedMinutes?: number;
  parentTip?: string;
  receipt?: ActionItemReceipt;
};

export type ExecutionSummary = {
  suggestedCount?: number;
  completedCount?: number;
  skippedCount?: number;
  pendingCount?: number;
  completionRate?: number;
  streakDays?: number;
  doneMinutes?: number;
};

export type EffectSummary = {
  receiptEffectScore?: number;
  last7dEffectScore?: number;
  avgEffectScore?: number;
  doneEffectScore?: number;
  skippedPenaltyScore?: number;
};

export type WeeklyReport = {
  error?: string;
  stats: {
    total: number;
    accuracy: number;
  };
  previousStats?: {
    total?: number;
    accuracy?: number;
  };
  estimatedMinutes?: number;
  actionItems?: ParentActionItem[];
  execution?: ExecutionSummary;
  effect?: EffectSummary;
  weakPoints?: Array<{
    id: string;
    title: string;
    ratio: number;
  }>;
  suggestions?: string[];
  parentTips?: string[];
};

export type CorrectionTask = {
  id: string;
  status: string;
  dueDate: string;
  question?: {
    stem?: string;
  };
};

export type CorrectionSummary = {
  pending?: number;
  overdue?: number;
  dueSoon?: number;
  completed?: number;
};

export type AssignmentListItem = {
  id: string;
  title: string;
  className: string;
  dueDate: string;
  status: string;
};

export type AssignmentSummary = {
  pending?: number;
  overdue?: number;
  dueSoon?: number;
  completed?: number;
};

export type FavoriteItem = {
  id: string;
  tags?: string[];
  question?: {
    stem?: string;
    knowledgePointTitle?: string;
    grade?: string | number;
  };
};
