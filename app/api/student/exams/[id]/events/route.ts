import { getCurrentUser } from "@/lib/auth";
import { getClassesByStudent } from "@/lib/classes";
import { incrementExamEventCounters } from "@/lib/exam-events";
import { ensureExamAssignment, getExamAssignment, getExamPaperById } from "@/lib/exams";
import { badRequest, notFound, unauthorized, withApi } from "@/lib/api/http";
import { parseJson, v } from "@/lib/api/validation";

export const dynamic = "force-dynamic";

const reportBodySchema = v.object<{
  blurCountDelta?: number;
  visibilityHiddenCountDelta?: number;
}>(
  {
    blurCountDelta: v.optional(v.number({ coerce: true, integer: true, min: 0, max: 20 })),
    visibilityHiddenCountDelta: v.optional(v.number({ coerce: true, integer: true, min: 0, max: 20 }))
  },
  { allowUnknown: false }
);

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

  const assignment =
    paper.publishMode === "targeted"
      ? await getExamAssignment(paper.id, user.id)
      : await ensureExamAssignment(paper.id, user.id);
  if (!assignment) {
    notFound("not found");
  }

  const body = await parseJson(request, reportBodySchema);
  const blurCountDelta = Number(body.blurCountDelta ?? 0);
  const visibilityHiddenCountDelta = Number(body.visibilityHiddenCountDelta ?? 0);
  if (blurCountDelta <= 0 && visibilityHiddenCountDelta <= 0) {
    badRequest("at least one delta must be positive");
  }

  const aggregate = await incrementExamEventCounters({
    paperId: paper.id,
    studentId: user.id,
    blurCountDelta,
    visibilityHiddenCountDelta
  });

  return {
    data: aggregate
  };
});
