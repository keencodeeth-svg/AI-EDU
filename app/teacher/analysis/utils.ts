import type { AnalysisActionType, AnalysisAlertItem } from "./types";

export const ACTION_TYPE_LABEL: Record<AnalysisActionType, string> = {
  assign_review: "布置修复",
  notify_student: "提醒学生/班级",
  auto_chain: "一键闭环",
  mark_done: "确认完成"
};

export function ratioColor(ratio: number) {
  const hue = Math.round((ratio / 100) * 120);
  return `hsl(${hue}, 70%, 35%)`;
}

export function getAlertTypeLabel(type: AnalysisAlertItem["type"]) {
  return type === "student-risk" ? "学生风险" : "知识点风险";
}

export function getAlertNotificationLabel(type: AnalysisAlertItem["type"]) {
  return type === "student-risk" ? "提醒学生" : "提醒全班";
}

export function formatDateTime(value?: string | null) {
  return value ? new Date(value).toLocaleString("zh-CN") : "-";
}
