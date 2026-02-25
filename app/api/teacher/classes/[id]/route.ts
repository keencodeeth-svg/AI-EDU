import { getCurrentUser } from "@/lib/auth";
import { getClassById, updateClassSettings } from "@/lib/classes";
import { notFound, unauthorized, withApi } from "@/lib/api/http";
import { parseJson, v } from "@/lib/api/validation";

export const dynamic = "force-dynamic";

const updateClassBodySchema = v.object<{
  joinMode?: "approval" | "auto";
}>(
  {
    joinMode: v.optional(v.enum(["approval", "auto"] as const))
  },
  { allowUnknown: false }
);

export const PATCH = withApi(async (request, context) => {
  const user = await getCurrentUser();
  if (!user || user.role !== "teacher") {
    unauthorized();
  }

  const classId = context.params.id;
  const klass = await getClassById(classId);
  if (!klass || klass.teacherId !== user.id) {
    notFound("not found");
  }

  const body = await parseJson(request, updateClassBodySchema);
  const updated = await updateClassSettings(classId, { joinMode: body.joinMode });
  return { data: updated };
});
