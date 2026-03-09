import { createLearningRoute } from "@/lib/api/domains";
import { v } from "@/lib/api/validation";
import { sendTeacherSeatingProfileReminders } from "@/lib/teacher-seating";

export const dynamic = "force-dynamic";

const followUpBodySchema = v.object<{
  classId: string;
  action?: "remind_incomplete_profiles";
  includeParents?: boolean;
  limit?: number;
}>(
  {
    classId: v.string({ minLength: 1 }),
    action: v.optional(v.enum(["remind_incomplete_profiles"] as const)),
    includeParents: v.optional(v.boolean()),
    limit: v.optional(v.number({ integer: true, min: 1, max: 60 }))
  },
  { allowUnknown: false }
);

export const POST = createLearningRoute({
  role: "teacher",
  body: followUpBodySchema,
  cache: "private-realtime",
  handler: async ({ body, user }) => {
    const teacherUser = user!;
    const action = body.action ?? "remind_incomplete_profiles";

    if (action === "remind_incomplete_profiles") {
      return await sendTeacherSeatingProfileReminders({
        teacherId: teacherUser.id,
        classId: body.classId,
        includeParents: body.includeParents ?? false,
        limit: body.limit ?? 30
      });
    }

    return {
      students: 0,
      parents: 0,
      recipients: []
    };
  }
});
