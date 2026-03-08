import {
  deleteClassScheduleSession,
  getClassScheduleSessionById,
  updateClassScheduleSession
} from "@/lib/class-schedules";
import { createLearningRoute } from "@/lib/api/domains";
import { forbidden, notFound } from "@/lib/api/http";
import { assertSameSchool } from "@/lib/guard";
import { DEFAULT_SCHOOL_ID } from "@/lib/schools";
import { v } from "@/lib/api/validation";

const paramsSchema = v.object<{ id: string }>(
  {
    id: v.string({ minLength: 1 })
  },
  { allowUnknown: true }
);

const updateBodySchema = v.object<{
  weekday?: number;
  startTime?: string;
  endTime?: string;
  slotLabel?: string;
  room?: string;
  campus?: string;
  note?: string;
  focusSummary?: string;
}>(
  {
    weekday: v.optional(v.number({ coerce: true, integer: true, min: 1, max: 7 })),
    startTime: v.optional(v.string({ minLength: 1 })),
    endTime: v.optional(v.string({ minLength: 1 })),
    slotLabel: v.optional(v.string({ allowEmpty: true, trim: false })),
    room: v.optional(v.string({ allowEmpty: true, trim: false })),
    campus: v.optional(v.string({ allowEmpty: true, trim: false })),
    note: v.optional(v.string({ allowEmpty: true, trim: false })),
    focusSummary: v.optional(v.string({ allowEmpty: true, trim: false }))
  },
  { allowUnknown: false }
);

export const PATCH = createLearningRoute({
  role: ["admin", "school_admin"],
  params: paramsSchema,
  body: updateBodySchema,
  cache: "private-realtime",
  handler: async ({ user, params, body }) => {
    if (!user) {
      forbidden("unauthorized");
    }

    const current = await getClassScheduleSessionById(params.id);
    if (!current) {
      notFound("schedule not found");
    }

    assertSameSchool(user, current.schoolId ?? DEFAULT_SCHOOL_ID);
    const updated = await updateClassScheduleSession(params.id, body);
    if (!updated) {
      notFound("schedule not found");
    }
    return { data: updated };
  }
});

export const DELETE = createLearningRoute({
  role: ["admin", "school_admin"],
  params: paramsSchema,
  cache: "private-realtime",
  handler: async ({ user, params }) => {
    if (!user) {
      forbidden("unauthorized");
    }

    const current = await getClassScheduleSessionById(params.id);
    if (!current) {
      notFound("schedule not found");
    }

    assertSameSchool(user, current.schoolId ?? DEFAULT_SCHOOL_ID);
    await deleteClassScheduleSession(params.id, { schoolId: current.schoolId });
    return { ok: true };
  }
});
