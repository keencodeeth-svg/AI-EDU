import { getCurrentUser } from "@/lib/auth";
import { getClassesByTeacher } from "@/lib/classes";
import { listTeacherNotificationHistory } from "@/lib/teacher-notification-history";
import { notFound, unauthorized } from "@/lib/api/http";
import { parseSearchParams, v } from "@/lib/api/validation";
import { createLearningRoute } from "@/lib/api/domains";

const historyQuerySchema = v.object<{ classId?: string; limit?: number }>(
  {
    classId: v.optional(v.string({ minLength: 1 })),
    limit: v.optional(v.number({ coerce: true, integer: true, min: 1, max: 50 }))
  },
  { allowUnknown: true }
);

export const GET = createLearningRoute({
  cache: "private-short",
  handler: async ({ request }) => {
    const user = await getCurrentUser();
    if (!user || user.role !== "teacher") {
      unauthorized();
    }

    const query = parseSearchParams(request, historyQuerySchema);
    const classes = await getClassesByTeacher(user.id);
    if (query.classId && !classes.some((item) => item.id === query.classId)) {
      notFound("class not found");
    }

    const data = listTeacherNotificationHistory({
      teacherId: user.id,
      classId: query.classId,
      limit: query.limit ?? 12
    });

    return {
      data,
      summary: {
        totalRuns: data.length,
        lastRunAt: data[0]?.executedAt ?? null,
        studentTargets: data.reduce((sum, item) => sum + item.totals.studentTargets, 0),
        parentTargets: data.reduce((sum, item) => sum + item.totals.parentTargets, 0),
        assignmentTargets: data.reduce((sum, item) => sum + item.totals.assignmentTargets, 0)
      }
    };
  }
});
