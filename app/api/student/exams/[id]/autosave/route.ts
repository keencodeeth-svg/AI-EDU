import { getCurrentUser } from "@/lib/auth";
import { getClassesByStudent } from "@/lib/classes";
import {
  ensureExamAssignment,
  getExamPaperById,
  getExamSubmission,
  markExamAssignmentInProgress,
  upsertExamAnswerDraft
} from "@/lib/exams";
import { badRequest, notFound, unauthorized, withApi } from "@/lib/api/http";
import { parseJson, v } from "@/lib/api/validation";

export const dynamic = "force-dynamic";

const passthrough = (value: unknown) => value;

const autosaveBodySchema = v.object<{ answers: unknown }>(
  {
    answers: passthrough
  },
  { allowUnknown: false }
);

function normalizeAnswers(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
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

function assertExamTimeNotExceeded(input: {
  endAt: string;
  durationMinutes?: number;
  startedAt?: string;
}) {
  const now = Date.now();
  const endDeadline = new Date(input.endAt).getTime();
  const durationDeadline =
    input.durationMinutes && input.startedAt
      ? new Date(input.startedAt).getTime() + input.durationMinutes * 60 * 1000
      : Number.POSITIVE_INFINITY;
  const effectiveDeadline = Math.min(endDeadline, durationDeadline);
  if (Number.isFinite(effectiveDeadline) && now > effectiveDeadline) {
    badRequest("考试作答时间已结束");
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

  const assignmentBeforeSave = await ensureExamAssignment(paper.id, user.id);
  assertExamTimeNotExceeded({
    endAt: paper.endAt,
    durationMinutes: paper.durationMinutes,
    startedAt: assignmentBeforeSave.startedAt
  });

  const submitted = await getExamSubmission(paper.id, user.id);
  if (submitted) {
    badRequest("考试已提交");
  }

  const body = await parseJson(request, autosaveBodySchema);
  const answers = normalizeAnswers(body.answers);
  const draft = await upsertExamAnswerDraft({
    paperId: paper.id,
    studentId: user.id,
    answers
  });
  const assignment = await markExamAssignmentInProgress({
    paperId: paper.id,
    studentId: user.id
  });

  return {
    savedAt: draft.updatedAt,
    status: assignment.status,
    startedAt: assignment.startedAt ?? null
  };
});
