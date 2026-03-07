import type {
  StudentExamGroupedItems,
  StudentExamItem,
  StudentSelfAssessmentSummary,
  StudentSelfAssessmentTask
} from "./types";

const SELF_ASSESSMENT_HIGH_PRIORITY_THRESHOLD = 80;

export function groupStudentExams(list: StudentExamItem[]): StudentExamGroupedItems {
  const all = [...list].sort((a, b) => {
    if (a.availabilityStage === "open" && b.availabilityStage !== "open") return -1;
    if (a.availabilityStage !== "open" && b.availabilityStage === "open") return 1;
    return new Date(a.endAt).getTime() - new Date(b.endAt).getTime();
  });

  return {
    ongoing: all.filter((item) => item.status !== "submitted" && item.availabilityStage === "open"),
    upcoming: all.filter((item) => item.status !== "submitted" && item.availabilityStage === "upcoming"),
    finished: all.filter((item) => item.status === "submitted"),
    locked: all.filter(
      (item) => item.status !== "submitted" && (item.availabilityStage === "ended" || item.availabilityStage === "closed")
    )
  };
}

export function getExamStageLabel(item: StudentExamItem) {
  if (item.availabilityStage === "upcoming") return "待开始";
  if (item.availabilityStage === "open") return "开放中";
  if (item.availabilityStage === "ended") return "已截止";
  return "已关闭";
}

export function getExamSubmissionLabel(status: StudentExamItem["status"]) {
  if (status === "submitted") return "已提交";
  if (status === "in_progress") return "进行中";
  return "未提交";
}

export function getExamCtaLabel(item: StudentExamItem) {
  if (item.status === "submitted") return "查看结果";
  return item.canEnter ? "进入考试" : "查看详情";
}

export function filterSelfAssessmentTasks(tasks: StudentSelfAssessmentTask[]) {
  return [...tasks]
    .filter((item) => item.source !== "exam" && item.href)
    .sort((a, b) => b.priority - a.priority);
}

export function buildSelfAssessmentSummary(tasks: StudentSelfAssessmentTask[]): StudentSelfAssessmentSummary {
  return {
    total: tasks.length,
    mustDo: tasks.filter((item) => item.group === "must_do").length,
    highPriority: tasks.filter((item) => item.priority >= SELF_ASSESSMENT_HIGH_PRIORITY_THRESHOLD).length
  };
}
