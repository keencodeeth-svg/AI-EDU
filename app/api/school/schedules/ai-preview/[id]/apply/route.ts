import { createLearningRoute } from "@/lib/api/domains";
import { forbidden } from "@/lib/api/http";
import { applySchoolAiSchedulePreview } from "@/lib/school-schedule-ai-operations";
import { v } from "@/lib/api/validation";

const paramsSchema = v.object<{ id: string }>({
  id: v.string({ minLength: 1 })
}, { allowUnknown: false });

export const POST = createLearningRoute({
  role: ["admin", "school_admin"],
  params: paramsSchema,
  cache: "private-realtime",
  handler: async ({ user, params }) => {
    if (!user) {
      forbidden("unauthorized");
    }

    return {
      data: await applySchoolAiSchedulePreview(
        params.id,
        user.role === "school_admin" ? { schoolId: user.schoolId } : undefined
      )
    };
  }
});
