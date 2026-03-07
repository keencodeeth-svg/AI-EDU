export type ExamDetail = {
  exam: {
    id: string;
    title: string;
    description?: string;
    publishMode: "teacher_assigned" | "targeted";
    antiCheatLevel: "off" | "basic";
    status: "published" | "closed";
    startAt?: string;
    endAt: string;
    durationMinutes?: number;
    createdAt: string;
  };
  class: {
    id: string;
    name: string;
    subject: string;
    grade: string;
  };
  summary: {
    assigned: number;
    submitted: number;
    pending: number;
    avgScore: number;
    totalBlurCount: number;
    totalVisibilityHiddenCount: number;
    highRiskCount: number;
    mediumRiskCount: number;
  };
  questions: Array<{
    id: string;
    stem: string;
    score: number;
    orderIndex: number;
  }>;
  students: Array<{
    id: string;
    name: string;
    email: string;
    grade?: string;
    status: string;
    score: number | null;
    total: number | null;
    submittedAt: string | null;
    blurCount: number;
    visibilityHiddenCount: number;
    lastExamEventAt: string | null;
    riskScore: number;
    riskLevel: "low" | "medium" | "high";
    riskReasons: string[];
    recommendedAction: string;
  }>;
};

export type ExamQuestion = ExamDetail["questions"][number];
export type ExamStudent = ExamDetail["students"][number];
export type ExamRiskLevel = ExamStudent["riskLevel"];
