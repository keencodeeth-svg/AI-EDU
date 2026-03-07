export type WeeklyReportStats = {
  total: number;
  accuracy: number;
};

export type WeeklyReportTrendItem = {
  date: string;
  accuracy: number;
};

export type WeeklyReportWeakPoint = {
  id: string;
  title: string;
  ratio: number;
  total: number;
  subject: string;
};

export type WeeklyReportData = {
  student: {
    id: string;
    name: string;
    grade?: string;
  };
  stats: WeeklyReportStats;
  previousStats: WeeklyReportStats;
  trend: WeeklyReportTrendItem[];
  weakPoints: WeeklyReportWeakPoint[];
  suggestions: string[];
};

export type WeeklyReportError = {
  error: string;
};

export type WeeklyReportResponse = WeeklyReportData | WeeklyReportError;

export type ReportProfileKnowledgeItem = {
  id: string;
  title: string;
  chapter: string;
  unit: string;
  grade?: string;
  correct: number;
  total: number;
  ratio: number;
  lastAttemptAt?: string | null;
};

export type ReportProfileSubjectGroup = {
  subject: string;
  label: string;
  practiced: number;
  total: number;
  avgRatio: number;
  items: ReportProfileKnowledgeItem[];
};

export type ReportProfileData = {
  student: {
    id: string;
    name: string;
    grade?: string;
  };
  subjects: ReportProfileSubjectGroup[];
};

export type ReportProfileError = {
  error: string;
};

export type ReportProfileResponse = ReportProfileData | ReportProfileError;

export type ReportSortMode = "ratio-asc" | "ratio-desc" | "total-desc";
