import type {
  ReportProfileData,
  ReportProfileKnowledgeItem,
  ReportProfileSubjectGroup,
  ReportSortMode
} from "./types";

export function isErrorResponse(value: unknown): value is { error: string } {
  return typeof value === "object" && value !== null && "error" in value && typeof value.error === "string";
}

export function getRatioColor(ratio: number) {
  const hue = Math.min(120, Math.max(0, Math.round((ratio / 100) * 120)));
  return `hsl(${hue}, 70%, 88%)`;
}

export function getDisplaySubjectGroups(
  profile: ReportProfileData | null,
  subjectFilter: string
): ReportProfileSubjectGroup[] {
  if (!profile?.subjects.length) {
    return [];
  }

  if (subjectFilter === "all") {
    return profile.subjects;
  }

  return profile.subjects.filter((group) => group.subject === subjectFilter);
}

export function getChapterOptions(groups: ReportProfileSubjectGroup[]): string[] {
  const chapters = groups
    .flatMap((group) => group.items.map((item) => item.chapter))
    .filter((item): item is string => typeof item === "string" && item.length > 0);

  return Array.from(new Set(chapters));
}

export function getVisibleKnowledgeItems(
  items: ReportProfileKnowledgeItem[],
  chapterFilter: string,
  sortMode: ReportSortMode
): ReportProfileKnowledgeItem[] {
  const filteredItems = items.filter((item) => (chapterFilter === "all" ? true : item.chapter === chapterFilter));

  return [...filteredItems].sort((left, right) => {
    if (sortMode === "ratio-desc") {
      return right.ratio - left.ratio;
    }
    if (sortMode === "total-desc") {
      return right.total - left.total;
    }
    return left.ratio - right.ratio;
  });
}
