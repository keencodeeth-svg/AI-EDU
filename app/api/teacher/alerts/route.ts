import { getCurrentUser } from "@/lib/auth";
import { getClassById } from "@/lib/classes";
import { getTeacherAlerts } from "@/lib/teacher-alerts";
import { notFound, unauthorized, withApi } from "@/lib/api/http";
import { parseSearchParams, v } from "@/lib/api/validation";

export const dynamic = "force-dynamic";

const teacherAlertsQuerySchema = v.object<{ classId?: string; includeAcknowledged?: string }>(
  {
    classId: v.optional(v.string({ minLength: 1 })),
    includeAcknowledged: v.optional(v.string({ minLength: 1 }))
  },
  { allowUnknown: true }
);

export const GET = withApi(async (request) => {
  const user = await getCurrentUser();
  if (!user || user.role !== "teacher") {
    unauthorized();
  }

  const query = parseSearchParams(request, teacherAlertsQuerySchema);
  const classId = query.classId;
  if (classId) {
    const klass = await getClassById(classId);
    if (!klass || klass.teacherId !== user.id) {
      notFound("not found");
    }
  }

  const includeAcknowledged = query.includeAcknowledged !== "false";
  const overview = await getTeacherAlerts({
    teacherId: user.id,
    classId,
    includeAcknowledged
  });

  return { data: overview };
});

