export type GradebookClass = {
  id: string;
  name: string;
  subject: string;
  grade: string;
};

export type GradebookAssignment = {
  id: string;
  title: string;
  dueDate: string;
  submissionType?: "quiz" | "upload" | "essay";
};

export type GradebookAssignmentStat = {
  assignmentId: string;
  completed: number;
  total: number;
  overdue: number;
};

export type GradebookDistributionItem = {
  label: string;
  count: number;
};

export type GradebookTrendItem = {
  assignmentId: string;
  title: string;
  dueDate: string;
  avgScore: number;
  completionRate: number;
};

export type GradebookStudentProgress = {
  status: string;
  score: number | null;
  total: number | null;
  completedAt: string | null;
};

export type GradebookStudent = {
  id: string;
  name: string;
  email: string;
  stats: {
    completed: number;
    pending: number;
    overdue: number;
    late: number;
    avgScore: number;
  };
  progress: Record<string, GradebookStudentProgress>;
};

export type GradebookSummary = {
  students: number;
  assignments: number;
  completionRate: number;
  avgScore: number;
};

export type GradebookPayload = {
  classes: GradebookClass[];
  class: GradebookClass | null;
  assignments: GradebookAssignment[];
  assignmentStats: GradebookAssignmentStat[];
  distribution?: GradebookDistributionItem[];
  trend?: GradebookTrendItem[];
  students: GradebookStudent[];
  summary: GradebookSummary | null;
};

export type GradebookViewMode = "student" | "assignment";
export type GradebookStatusFilter = "all" | "overdue" | "pending" | "completed";
export type GradebookProgressState = "done" | "pending" | "overdue";

export type GradebookProgressCell = {
  label: string;
  state: GradebookProgressState;
};
