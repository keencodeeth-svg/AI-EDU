import { createLearningRoute } from "@/lib/api/domains";
import { badRequest, forbidden } from "@/lib/api/http";
import { getLatestAppliedSchoolAiScheduleOperation } from "@/lib/school-schedule-ai-operations";
import { v } from "@/lib/api/validation";

const querySchema = v.object<{ schoolId?: string }>({
  schoolId: v.optional(v.string({ minLength: 1 }))
}, { allowUnknown: false });

export const GET = createLearningRoute({
  role: ["admin", "school_admin"],
  query: querySchema,
  cache: "private-short",
  handler: async ({ user, query }) => {
    if (!user) {
      forbidden("unauthorized");
    }

    const requestedSchoolId = query.schoolId?.trim();
    const targetSchoolId = user.role === "school_admin" ? user.schoolId : requestedSchoolId;

    if (user.role === "school_admin") {
      if (!user.schoolId) {
        forbidden("school not bound");
      }
      if (requestedSchoolId && requestedSchoolId !== user.schoolId) {
        forbidden("cross school access denied");
      }
    }

    if (!targetSchoolId) {
      badRequest("schoolId required for platform admin");
    }

    return {
      data: await getLatestAppliedSchoolAiScheduleOperation({ schoolId: targetSchoolId })
    };
  }
});
