import { getCurrentUser } from "@/lib/auth";
import { getClassById, updateClassSettings } from "@/lib/classes";
import crypto from "crypto";
import { notFound, unauthorized, withApi } from "@/lib/api/http";

export const dynamic = "force-dynamic";

function generateJoinCode() {
  return crypto.randomBytes(4).toString("hex").slice(0, 6).toUpperCase();
}

export const POST = withApi(async (_request, context) => {
  const user = await getCurrentUser();
  if (!user || user.role !== "teacher") {
    unauthorized();
  }

  const classId = context.params.id;
  const klass = await getClassById(classId);
  if (!klass || klass.teacherId !== user.id) {
    notFound("not found");
  }

  const updated = await updateClassSettings(classId, { joinCode: generateJoinCode() });
  return { data: updated };
});
