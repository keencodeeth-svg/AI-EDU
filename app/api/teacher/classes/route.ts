import { getCurrentUser } from "@/lib/auth";
import { createClass, getClassesByTeacher, getClassStudentIds } from "@/lib/classes";
import type { Subject } from "@/lib/types";
import { getAssignmentsByClass } from "@/lib/assignments";
import { SUBJECT_OPTIONS } from "@/lib/constants";
import { badRequest, unauthorized, withApi } from "@/lib/api/http";
import { parseJson, v } from "@/lib/api/validation";

export const dynamic = "force-dynamic";

const createClassBodySchema = v.object<{
  name: string;
  subject: string;
  grade: string;
}>(
  {
    name: v.string({ minLength: 1 }),
    subject: v.string({ minLength: 1 }),
    grade: v.string({ minLength: 1 })
  },
  { allowUnknown: false }
);

export const GET = withApi(async () => {
  const user = await getCurrentUser();
  if (!user || user.role !== "teacher") {
    unauthorized();
  }

  const classes = await getClassesByTeacher(user.id);
  const data = await Promise.all(
    classes.map(async (item) => {
      const studentIds = await getClassStudentIds(item.id);
      const assignments = await getAssignmentsByClass(item.id);
      return {
        ...item,
        studentCount: studentIds.length,
        assignmentCount: assignments.length
      };
    })
  );

  return { data };
});

export const POST = withApi(async (request) => {
  const user = await getCurrentUser();
  if (!user || user.role !== "teacher") {
    unauthorized();
  }

  const body = await parseJson(request, createClassBodySchema);
  const allowedSubjects: Subject[] = SUBJECT_OPTIONS.map((item) => item.value as Subject);
  if (!allowedSubjects.includes(body.subject as Subject)) {
    badRequest("invalid subject");
  }

  const created = await createClass({
    name: body.name,
    subject: body.subject as Subject,
    grade: body.grade,
    teacherId: user.id
  });

  return { data: created };
});
