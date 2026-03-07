export function aiRiskLabel(level?: string) {
  if (level === "high") return "高";
  if (level === "medium") return "中";
  return "低";
}
