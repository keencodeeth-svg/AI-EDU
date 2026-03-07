export type StudentAssignmentItem = {
  id: string;
  title: string;
  dueDate: string;
  className: string;
  classSubject: string;
  classGrade: string;
  moduleTitle?: string;
  status: string;
  score: number | null;
  total: number | null;
  completedAt: string | null;
  submissionType?: "quiz" | "upload" | "essay";
};

export type StudentAssignmentStatusFilter = "all" | "pending" | "completed" | "overdue";
export type StudentAssignmentViewMode = "compact" | "detailed";
