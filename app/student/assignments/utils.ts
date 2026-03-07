import { SUBJECT_LABELS } from "@/lib/constants";
import type {
  StudentAssignmentItem,
  StudentAssignmentStatusFilter,
  StudentAssignmentViewMode
} from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;

export function isStudentAssignmentOverdue(item: StudentAssignmentItem, nowTs = Date.now()) {
  return item.status !== "completed" && new Date(item.dueDate).getTime() < nowTs;
}

export function buildStudentAssignmentSubjectOptions(assignments: StudentAssignmentItem[]) {
  const subjects = Array.from(new Set(assignments.map((item) => item.classSubject)));
  return subjects.sort((a, b) => (SUBJECT_LABELS[a] ?? a).localeCompare(SUBJECT_LABELS[b] ?? b, "zh-CN"));
}

export function filterStudentAssignments(
  assignments: StudentAssignmentItem[],
  filters: {
    statusFilter: StudentAssignmentStatusFilter;
    subjectFilter: string;
    keyword: string;
  },
  nowTs = Date.now()
) {
  const keywordLower = filters.keyword.trim().toLowerCase();

  return assignments
    .filter((item) => {
      const overdue = isStudentAssignmentOverdue(item, nowTs);
      if (filters.statusFilter === "pending" && item.status === "completed") return false;
      if (filters.statusFilter === "completed" && item.status !== "completed") return false;
      if (filters.statusFilter === "overdue" && !overdue) return false;
      if (filters.subjectFilter !== "all" && item.classSubject !== filters.subjectFilter) return false;
      if (!keywordLower) return true;

      return [
        item.title,
        item.className,
        item.moduleTitle ?? "",
        SUBJECT_LABELS[item.classSubject] ?? item.classSubject,
        item.classGrade
      ]
        .join(" ")
        .toLowerCase()
        .includes(keywordLower);
    })
    .sort((a, b) => {
      const aCompleted = a.status === "completed";
      const bCompleted = b.status === "completed";
      if (aCompleted !== bCompleted) return aCompleted ? 1 : -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
}

export function buildStudentAssignmentActiveFilterSummary(input: {
  statusFilter: StudentAssignmentStatusFilter;
  subjectFilter: string;
  viewMode: StudentAssignmentViewMode;
  keyword: string;
}) {
  const labels: string[] = [];
  if (input.statusFilter === "pending") labels.push("待完成");
  if (input.statusFilter === "completed") labels.push("已完成");
  if (input.statusFilter === "overdue") labels.push("已逾期");
  if (input.subjectFilter !== "all") labels.push(SUBJECT_LABELS[input.subjectFilter] ?? input.subjectFilter);
  if (input.keyword.trim()) labels.push(`搜索“${input.keyword.trim()}”`);
  labels.push(input.viewMode === "compact" ? "紧凑视图" : "详细视图");
  return labels.join(" · ");
}

export function countPendingAssignments(assignments: StudentAssignmentItem[]) {
  return assignments.filter((item) => item.status !== "completed").length;
}

export function countCompletedAssignments(assignments: StudentAssignmentItem[]) {
  return assignments.filter((item) => item.status === "completed").length;
}

export function countOverdueAssignments(assignments: StudentAssignmentItem[], nowTs = Date.now()) {
  return assignments.filter((item) => isStudentAssignmentOverdue(item, nowTs)).length;
}

export function countDueSoonAssignments(assignments: StudentAssignmentItem[], nowTs = Date.now()) {
  return assignments.filter((item) => {
    if (item.status === "completed") return false;
    const diff = new Date(item.dueDate).getTime() - nowTs;
    return diff >= 0 && diff <= 2 * DAY_MS;
  }).length;
}

export function findPriorityAssignment(assignments: StudentAssignmentItem[]) {
  return assignments
    .filter((item) => item.status !== "completed")
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0] ?? null;
}

export function getStudentAssignmentStatusLabel(status: StudentAssignmentItem["status"]) {
  return status === "completed" ? "已完成" : "待完成";
}

export function getStudentAssignmentCompletionText(item: StudentAssignmentItem) {
  if (item.status !== "completed") {
    return "等待提交";
  }
  if (item.submissionType && item.submissionType !== "quiz") {
    return "已提交待批改";
  }
  return `得分 ${item.score ?? 0}/${item.total ?? 0}`;
}

export function getStudentAssignmentCtaLabel(status: StudentAssignmentItem["status"]) {
  return status === "completed" ? "查看详情" : "开始作业";
}

export function getStudentAssignmentCompactCtaLabel(status: StudentAssignmentItem["status"]) {
  return status === "completed" ? "查看" : "开始";
}

export function getStudentAssignmentUrgencyLabel(item: StudentAssignmentItem, nowTs = Date.now()) {
  if (item.status === "completed") return null;
  const diff = new Date(item.dueDate).getTime() - nowTs;
  if (diff < 0) return "已逾期";
  if (diff <= DAY_MS) return "今日截止";
  if (diff <= 2 * DAY_MS) return "2 天内截止";
  return null;
}
