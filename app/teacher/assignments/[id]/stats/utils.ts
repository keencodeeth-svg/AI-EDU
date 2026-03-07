import type { AssignmentStatsDistributionItem } from "./types";

export function getDistributionMaxCount(items: AssignmentStatsDistributionItem[]) {
  if (!items.length) return 1;
  return Math.max(...items.map((item) => item.count), 1);
}
