import { createClassScheduleSession, listClassScheduleSessions } from "@/lib/class-schedules";
import { getClassById } from "@/lib/classes";
import { createLearningRoute } from "@/lib/api/domains";
import { badRequest, forbidden, notFound } from "@/lib/api/http";
import { assertSameSchool } from "@/lib/guard";
import { listSchoolClasses } from "@/lib/school-admin";
import { DEFAULT_SCHOOL_ID } from "@/lib/schools";
import { v } from "@/lib/api/validation";

const querySchema = v.object<{ schoolId?: string; classId?: string }>(
  {
    schoolId: v.optional(v.string({ minLength: 1 })),
    classId: v.optional(v.string({ minLength: 1 }))
  },
  { allowUnknown: false }
);

const createBodySchema = v.object<{
  classId: string;
  weekday: number;
  startTime: string;
  endTime: string;
  slotLabel?: string;
  room?: string;
  campus?: string;
  note?: string;
  focusSummary?: string;
}>(
  {
    classId: v.string({ minLength: 1 }),
    weekday: v.number({ coerce: true, integer: true, min: 1, max: 7 }),
    startTime: v.string({ minLength: 1 }),
    endTime: v.string({ minLength: 1 }),
    slotLabel: v.optional(v.string({ allowEmpty: true, trim: false })),
    room: v.optional(v.string({ allowEmpty: true, trim: false })),
    campus: v.optional(v.string({ allowEmpty: true, trim: false })),
    note: v.optional(v.string({ allowEmpty: true, trim: false })),
    focusSummary: v.optional(v.string({ allowEmpty: true, trim: false }))
  },
  { allowUnknown: false }
);

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
    if (!targetSchoolId) {
      badRequest("schoolId required");
    }
    if (user.role === "school_admin" && requestedSchoolId && requestedSchoolId !== user.schoolId) {
      forbidden("cross school access denied");
    }

    const classes = await listSchoolClasses(targetSchoolId);
    const classMap = new Map(classes.map((item) => [item.id, item]));
    if (query.classId && !classMap.has(query.classId)) {
      notFound("class not found");
    }

    const sessions = (await listClassScheduleSessions({ schoolId: targetSchoolId, classId: query.classId }))
      .filter((item) => classMap.has(item.classId))
      .map((item) => {
        const klass = classMap.get(item.classId)!;
        return {
          ...item,
          className: klass.name,
          subject: klass.subject,
          grade: klass.grade,
          teacherName: klass.teacherName,
          teacherId: klass.teacherId
        };
      });

    const activeClasses = new Set(sessions.map((item) => item.classId)).size;

    return {
      data: {
        summary: {
          totalSessions: sessions.length,
          activeClasses,
          classesWithoutScheduleCount: Math.max(classes.length - activeClasses, 0),
          averageLessonsPerWeek: classes.length ? Math.round((sessions.length / classes.length) * 10) / 10 : 0
        },
        classes,
        sessions
      }
    };
  }
});

export const POST = createLearningRoute({
  role: ["admin", "school_admin"],
  body: createBodySchema,
  cache: "private-realtime",
  handler: async ({ user, body }) => {
    if (!user) {
      forbidden("unauthorized");
    }

    const klass = await getClassById(body.classId);
    if (!klass) {
      notFound("class not found");
    }

    assertSameSchool(user, klass.schoolId ?? DEFAULT_SCHOOL_ID);
    const created = await createClassScheduleSession(body);
    return { data: created };
  }
});
