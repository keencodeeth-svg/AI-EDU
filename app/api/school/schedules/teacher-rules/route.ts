import { createLearningRoute } from "@/lib/api/domains";
import { badRequest, forbidden } from "@/lib/api/http";
import { listTeacherScheduleRules, saveTeacherScheduleRule } from "@/lib/teacher-schedule-rules";
import { v } from "@/lib/api/validation";

const querySchema = v.object<{ schoolId?: string; teacherId?: string }>({
  schoolId: v.optional(v.string({ minLength: 1 })),
  teacherId: v.optional(v.string({ minLength: 1 }))
}, { allowUnknown: false });

const bodySchema = v.object<{
  id?: string;
  schoolId?: string;
  teacherId: string;
  weeklyMaxLessons?: number;
  maxConsecutiveLessons?: number;
  minCampusGapMinutes?: number;
}>({
  id: v.optional(v.string({ minLength: 1 })),
  schoolId: v.optional(v.string({ minLength: 1 })),
  teacherId: v.string({ minLength: 1 }),
  weeklyMaxLessons: v.optional(v.number({ coerce: true, integer: true, min: 1, max: 60 })),
  maxConsecutiveLessons: v.optional(v.number({ coerce: true, integer: true, min: 1, max: 12 })),
  minCampusGapMinutes: v.optional(v.number({ coerce: true, integer: true, min: 1, max: 240 }))
}, { allowUnknown: false });

export const GET = createLearningRoute({
  role: ["admin", "school_admin"],
  query: querySchema,
  cache: "private-short",
  handler: async ({ user, query }) => {
    if (!user) forbidden("unauthorized");
    const requestedSchoolId = query.schoolId?.trim();
    const targetSchoolId = user.role === "school_admin" ? user.schoolId : requestedSchoolId;
    if (user.role === "school_admin") {
      if (!user.schoolId) forbidden("school not bound");
      if (requestedSchoolId && requestedSchoolId !== user.schoolId) forbidden("cross school access denied");
    }
    if (!targetSchoolId) badRequest("schoolId required for platform admin");
    return { data: await listTeacherScheduleRules({ schoolId: targetSchoolId, teacherId: query.teacherId }) };
  }
});

export const POST = createLearningRoute({
  role: ["admin", "school_admin"],
  body: bodySchema,
  cache: "private-realtime",
  handler: async ({ user, body }) => {
    if (!user) forbidden("unauthorized");
    const requestedSchoolId = body.schoolId?.trim();
    const targetSchoolId = user.role === "school_admin" ? user.schoolId : requestedSchoolId;
    if (user.role === "school_admin") {
      if (!user.schoolId) forbidden("school not bound");
      if (requestedSchoolId && requestedSchoolId !== user.schoolId) forbidden("cross school access denied");
    }
    if (!targetSchoolId) badRequest("schoolId required for platform admin");
    return { data: await saveTeacherScheduleRule({ ...body, schoolId: targetSchoolId }) };
  }
});
