import { createKnowledgePoint, getKnowledgePoints } from "@/lib/content";
import { requireRole } from "@/lib/guard";
import { addAdminLog } from "@/lib/admin-log";
import { badRequest, unauthorized, withApi } from "@/lib/api/http";
import { createKnowledgePointBodySchema, isAllowedSubject } from "@/lib/api/schemas/admin";
import { parseJson } from "@/lib/api/validation";
export const dynamic = "force-dynamic";

export const GET = withApi(async () => {
  const user = await requireRole("admin");
  if (!user) {
    unauthorized();
  }
  const data = await getKnowledgePoints();
  return { data };
});

export const POST = withApi(async (request) => {
  const user = await requireRole("admin");
  if (!user) {
    unauthorized();
  }

  const body = await parseJson(request, createKnowledgePointBodySchema);
  const subject = body.subject?.trim();
  const grade = body.grade?.trim();
  const title = body.title?.trim();
  const chapter = body.chapter?.trim();

  if (!subject || !grade || !title || !chapter) {
    badRequest("missing fields");
  }
  if (!isAllowedSubject(subject)) {
    badRequest("invalid subject");
  }

  const unit = body.unit?.trim();
  const next = await createKnowledgePoint({
    subject,
    grade,
    title,
    chapter,
    unit: unit ? unit : "未分单元"
  });

  if (next) {
    await addAdminLog({
      adminId: user.id,
      action: "create_knowledge_point",
      entityType: "knowledge_point",
      entityId: next.id,
      detail: `${next.subject} ${next.grade} ${next.unit ?? "未分单元"} ${next.title}`
    });
  }

  return { data: next };
});
