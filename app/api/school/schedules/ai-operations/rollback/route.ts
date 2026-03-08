import { createLearningRoute } from "@/lib/api/domains";
import { badRequest, forbidden } from "@/lib/api/http";
import { rollbackSchoolAiScheduleOperation } from "@/lib/school-schedule-ai-operations";
import { v } from "@/lib/api/validation";

const bodySchema = v.object<{ schoolId?: string; operationId?: string }>({
  schoolId: v.optional(v.string({ minLength: 1 })),
  operationId: v.optional(v.string({ minLength: 1 }))
}, { allowUnknown: false });

export const POST = createLearningRoute({
  role: ["admin", "school_admin"],
  body: bodySchema,
  cache: "private-realtime",
  handler: async ({ user, body }) => {
    if (!user) {
      forbidden("unauthorized");
    }

    const requestedSchoolId = body.schoolId?.trim();
    const targetSchoolId = user.role === "school_admin" ? user.schoolId : requestedSchoolId;

    if (user.role === "school_admin") {
      if (!user.schoolId) {
        forbidden("school not bound");
      }
      if (requestedSchoolId && requestedSchoolId !== user.schoolId) {
        forbidden("cross school access denied");
      }
    }

    if (!body.operationId && !targetSchoolId) {
      badRequest("schoolId required for platform admin");
    }

    return {
      data: await rollbackSchoolAiScheduleOperation({
        schoolId: targetSchoolId,
        operationId: body.operationId
      })
    };
  }
});
