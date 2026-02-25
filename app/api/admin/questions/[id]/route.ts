import { deleteQuestion, updateQuestion } from "@/lib/content";
import { requireRole } from "@/lib/guard";
import { addAdminLog } from "@/lib/admin-log";
import type { Question } from "@/lib/types";
import { badRequest, notFound, unauthorized, withApi } from "@/lib/api/http";
import {
  adminIdParamsSchema,
  isAllowedSubject,
  trimStringArray,
  updateQuestionBodySchema
} from "@/lib/api/schemas/admin";
import { parseJson, parseParams } from "@/lib/api/validation";
export const dynamic = "force-dynamic";

export const PATCH = withApi(async (request, context) => {
  const user = await requireRole("admin");
  if (!user) {
    unauthorized();
  }
  const params = parseParams(context.params, adminIdParamsSchema);
  const body = await parseJson(request, updateQuestionBodySchema);

  const updates: Partial<Question> = {};

  if (body.subject !== undefined) {
    const subject = body.subject.trim();
    if (!subject || !isAllowedSubject(subject)) {
      badRequest("invalid subject");
    }
    updates.subject = subject;
  }

  if (body.grade !== undefined) {
    const grade = body.grade.trim();
    if (!grade) {
      badRequest("grade cannot be empty");
    }
    updates.grade = grade;
  }

  if (body.knowledgePointId !== undefined) {
    const knowledgePointId = body.knowledgePointId.trim();
    if (!knowledgePointId) {
      badRequest("knowledgePointId cannot be empty");
    }
    updates.knowledgePointId = knowledgePointId;
  }

  if (body.stem !== undefined) {
    const stem = body.stem.trim();
    if (!stem) {
      badRequest("stem cannot be empty");
    }
    updates.stem = stem;
  }

  if (body.options !== undefined) {
    const options = trimStringArray(body.options);
    if (!options.length) {
      badRequest("options cannot be empty");
    }
    updates.options = options;
  }

  if (body.answer !== undefined) {
    const answer = body.answer.trim();
    if (!answer) {
      badRequest("answer cannot be empty");
    }
    updates.answer = answer;
  }

  if (body.explanation !== undefined) {
    updates.explanation = body.explanation.trim();
  }

  if (body.difficulty !== undefined) {
    updates.difficulty = body.difficulty;
  }

  if (body.questionType !== undefined) {
    const questionType = body.questionType.trim();
    if (!questionType) {
      badRequest("questionType cannot be empty");
    }
    updates.questionType = questionType;
  }

  if (body.tags !== undefined) {
    updates.tags = trimStringArray(body.tags);
  }

  if (body.abilities !== undefined) {
    updates.abilities = trimStringArray(body.abilities);
  }

  const next = await updateQuestion(params.id, updates);
  if (!next) {
    notFound("not found");
  }

  await addAdminLog({
    adminId: user.id,
    action: "update_question",
    entityType: "question",
    entityId: next.id,
    detail: `${next.subject} ${next.grade} ${next.knowledgePointId}`
  });

  return { data: next };
});

export const DELETE = withApi(async (_request, context) => {
  const user = await requireRole("admin");
  if (!user) {
    unauthorized();
  }
  const params = parseParams(context.params, adminIdParamsSchema);

  const ok = await deleteQuestion(params.id);
  if (!ok) {
    notFound("not found");
  }

  await addAdminLog({
    adminId: user.id,
    action: "delete_question",
    entityType: "question",
    entityId: params.id,
    detail: ""
  });

  return { ok: true };
});
