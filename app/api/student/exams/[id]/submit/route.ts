import { getCurrentUser } from "@/lib/auth";
import { getClassesByStudent } from "@/lib/classes";
import { getQuestions } from "@/lib/content";
import {
  getExamAnswerDraft,
  getExamPaperById,
  getExamPaperItems,
  getExamSubmission,
  markExamAssignmentSubmitted,
  upsertExamAnswerDraft,
  upsertExamSubmission
} from "@/lib/exams";
import { badRequest, notFound, unauthorized, withApi } from "@/lib/api/http";
import { parseJson, v } from "@/lib/api/validation";

export const dynamic = "force-dynamic";

const passthrough = (value: unknown) => value;

const submitBodySchema = v.object<{ answers?: unknown }>(
  {
    answers: v.optional(passthrough)
  },
  { allowUnknown: false }
);

function normalizeAnswers(input: unknown) {
  if (input === undefined || input === null) return null;
  if (typeof input !== "object" || Array.isArray(input)) {
    badRequest("answers must be an object");
  }
  const answers: Record<string, string> = {};
  for (const [questionId, value] of Object.entries(input as Record<string, unknown>)) {
    if (typeof value !== "string") {
      badRequest(`answers.${questionId} must be a string`);
    }
    answers[questionId] = value;
  }
  return answers;
}

function assertExamOpen(startAt?: string, endAt?: string) {
  const now = Date.now();
  if (startAt && new Date(startAt).getTime() > now) {
    badRequest("考试尚未开始");
  }
  if (endAt && new Date(endAt).getTime() < now) {
    badRequest("考试已截止");
  }
}

export const POST = withApi(async (request, context) => {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") {
    unauthorized();
  }

  const paperId = context.params.id;
  const paper = await getExamPaperById(paperId);
  if (!paper) {
    notFound("not found");
  }

  const classIds = new Set((await getClassesByStudent(user.id)).map((item) => item.id));
  if (!classIds.has(paper.classId)) {
    notFound("not found");
  }

  if (paper.status === "closed") {
    badRequest("考试已关闭");
  }
  assertExamOpen(paper.startAt, paper.endAt);

  const existingSubmission = await getExamSubmission(paper.id, user.id);
  if (existingSubmission) {
    badRequest("考试已提交");
  }

  const body = await parseJson(request, submitBodySchema);
  const inputAnswers = normalizeAnswers(body.answers);
  const draft = await getExamAnswerDraft(paper.id, user.id);
  const answers = inputAnswers ?? draft?.answers ?? {};

  const items = await getExamPaperItems(paper.id);
  if (!items.length) {
    badRequest("考试题目为空");
  }

  const questionMap = new Map((await getQuestions()).map((item) => [item.id, item]));
  let score = 0;
  let total = 0;
  const details: Array<{
    questionId: string;
    correct: boolean;
    answer: string;
    correctAnswer: string;
    score: number;
  }> = [];

  items.forEach((item) => {
    const question = questionMap.get(item.questionId);
    if (!question) return;
    const answer = answers[question.id] ?? "";
    const correct = answer === question.answer;
    const questionScore = Math.max(1, item.score);
    total += questionScore;
    if (correct) {
      score += questionScore;
    }
    details.push({
      questionId: question.id,
      correct,
      answer,
      correctAnswer: question.answer,
      score: questionScore
    });
  });

  await upsertExamAnswerDraft({
    paperId: paper.id,
    studentId: user.id,
    answers
  });

  const submission = await upsertExamSubmission({
    paperId: paper.id,
    studentId: user.id,
    answers,
    score,
    total
  });

  await markExamAssignmentSubmitted({
    paperId: paper.id,
    studentId: user.id,
    score,
    total
  });

  return {
    score: submission.score,
    total: submission.total,
    submittedAt: submission.submittedAt,
    details
  };
});
