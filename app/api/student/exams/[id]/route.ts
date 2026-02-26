import { getCurrentUser } from "@/lib/auth";
import { getClassesByStudent } from "@/lib/classes";
import { getQuestions } from "@/lib/content";
import {
  ensureExamAssignment,
  getExamAnswerDraft,
  getExamPaperById,
  getExamPaperItems,
  getExamSubmission
} from "@/lib/exams";
import { notFound, unauthorized, withApi } from "@/lib/api/http";

export const dynamic = "force-dynamic";

export const GET = withApi(async (_request, context) => {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") {
    unauthorized();
  }

  const paperId = context.params.id;
  const paper = await getExamPaperById(paperId);
  if (!paper) {
    notFound("not found");
  }

  const classes = await getClassesByStudent(user.id);
  const classMap = new Map(classes.map((item) => [item.id, item]));
  const klass = classMap.get(paper.classId);
  if (!klass) {
    notFound("not found");
  }

  const assignment = await ensureExamAssignment(paper.id, user.id);
  const draft = await getExamAnswerDraft(paper.id, user.id);
  const submission = await getExamSubmission(paper.id, user.id);

  const items = await getExamPaperItems(paper.id);
  const questionMap = new Map((await getQuestions()).map((item) => [item.id, item]));
  const questions = items
    .map((item) => {
      const question = questionMap.get(item.questionId);
      if (!question) return null;
      return {
        id: question.id,
        stem: question.stem,
        options: question.options,
        score: item.score,
        orderIndex: item.orderIndex
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  return {
    exam: paper,
    class: {
      id: klass.id,
      name: klass.name,
      subject: klass.subject,
      grade: klass.grade
    },
    assignment: submission ? { ...assignment, status: "submitted" } : assignment,
    questions,
    draftAnswers: draft?.answers ?? {},
    submission: submission
      ? {
          score: submission.score,
          total: submission.total,
          submittedAt: submission.submittedAt,
          answers: submission.answers
        }
      : null
  };
});
