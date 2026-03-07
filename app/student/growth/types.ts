export type StudentGrowthSummary = {
  totalAttempts: number;
  accuracy: number;
  last7Total: number;
  last7Accuracy: number;
  assignmentsCompleted: number;
};

export type StudentGrowthSubjectStat = {
  subject: string;
  accuracy: number;
  total: number;
};

export type StudentGrowthWeakPoint = {
  id: string;
  title: string;
  subject: string;
  grade: string;
  ratio: number;
  total: number;
};

export type StudentGrowthAssignmentSummary = {
  assignmentId: string;
  score: number;
  total: number;
  submittedAt: string;
};

export type StudentGrowthData = {
  summary: StudentGrowthSummary;
  subjects: StudentGrowthSubjectStat[];
  weakPoints: StudentGrowthWeakPoint[];
  assignments: StudentGrowthAssignmentSummary[];
};
