import type { ExamRiskLevel } from "./types";

export function getRiskTone(level: ExamRiskLevel) {
  if (level === "high") {
    return { label: "高风险", color: "#b42318", bg: "#fee4e2" };
  }
  if (level === "medium") {
    return { label: "中风险", color: "#b54708", bg: "#fffaeb" };
  }
  return { label: "低风险", color: "#027a48", bg: "#ecfdf3" };
}
