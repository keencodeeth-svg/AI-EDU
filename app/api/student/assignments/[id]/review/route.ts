import { getCurrentUser } from "@/lib/auth";
import { getClassesByStudent } from "@/lib/classes";
import { getAssignmentById, getAssignmentItems, getAssignmentSubmission } from "@/lib/assignments";
import { getQuestions } from "@/lib/content";
import { getReview } from "@/lib/reviews";
import { getAssignmentAIReview } from "@/lib/assignment-ai";
import { getAssignmentRubrics, getReviewRubrics } from "@/lib/rubrics";
import { notFound, unauthorized, withApi } from "@/lib/api/http";

export const dynamic = "force-dynamic";

export const GET = withApi(async (_request, context) => {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") {
    unauthorized();
  }

  const assignmentId = context.params.id;
  const assignment = await getAssignmentById(assignmentId);
  if (!assignment) {
    notFound("not found");
  }

  const classes = await getClassesByStudent(user.id);
  const classIds = new Set(classes.map((item) => item.id));
  if (!classIds.has(assignment.classId)) {
    notFound("not found");
  }

  const submission = await getAssignmentSubmission(assignment.id, user.id);
  const items = await getAssignmentItems(assignment.id);
  const questions = await getQuestions();
  const questionMap = new Map(questions.map((item) => [item.id, item]));

  const details = items
    .map((item) => {
      const question = questionMap.get(item.questionId);
      if (!question) return null;
      const answer = submission?.answers?.[question.id] ?? "";
      const correct = answer === question.answer;
      return {
        id: question.id,
        stem: question.stem,
        correct,
        answer,
        correctAnswer: question.answer,
        explanation: question.explanation
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  const reviewResult = await getReview(assignment.id, user.id);
  const aiReview = await getAssignmentAIReview(assignment.id, user.id);
  const rubrics = await getAssignmentRubrics(assignment.id);
  const reviewRubrics = reviewResult.review ? await getReviewRubrics(reviewResult.review.id) : [];
  return {
    assignment,
    submission,
    questions: details,
    review: reviewResult.review,
    reviewItems: reviewResult.items,
    aiReview,
    rubrics,
    reviewRubrics
  };
});
