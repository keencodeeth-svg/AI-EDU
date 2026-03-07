import type {
  TeacherAssignmentReviewItem,
  TeacherAssignmentReviewItemState,
  TeacherAssignmentReviewRubric,
  TeacherAssignmentReviewRubricState,
  TeacherAssignmentRubric
} from "./types";

export const ASSIGNMENT_REVIEW_TAGS = ["审题错误", "计算错误", "概念混淆", "步骤遗漏", "粗心", "其他"];

export function buildReviewItemState(items: TeacherAssignmentReviewItem[]): TeacherAssignmentReviewItemState {
  const nextState: TeacherAssignmentReviewItemState = {};

  items.forEach((item) => {
    nextState[item.questionId] = {
      wrongTag: item.wrongTag ?? "",
      comment: item.comment ?? ""
    };
  });

  return nextState;
}

export function buildReviewRubricState(
  reviewRubrics: TeacherAssignmentReviewRubric[],
  rubrics: TeacherAssignmentRubric[]
): TeacherAssignmentReviewRubricState {
  const nextState: TeacherAssignmentReviewRubricState = {};

  reviewRubrics.forEach((item) => {
    nextState[item.rubricId] = {
      score: Number(item.score ?? 0),
      comment: item.comment ?? ""
    };
  });

  rubrics.forEach((rubric) => {
    if (!nextState[rubric.id]) {
      nextState[rubric.id] = {
        score: 0,
        comment: ""
      };
    }
  });

  return nextState;
}
