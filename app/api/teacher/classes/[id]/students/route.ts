import { getCurrentUser, getUserByEmail } from "@/lib/auth";
import { addStudentToClass, getClassById, getClassStudents } from "@/lib/classes";
import { createAssignmentProgress, getAssignmentsByClass } from "@/lib/assignments";
import { createNotification } from "@/lib/notifications";
import { notFound, unauthorized, withApi } from "@/lib/api/http";
import { parseJson, v } from "@/lib/api/validation";

export const dynamic = "force-dynamic";

const addStudentBodySchema = v.object<{ email: string }>(
  {
    email: v.string({ minLength: 1 })
  },
  { allowUnknown: false }
);

export const GET = withApi(async (_request, context) => {
  const user = await getCurrentUser();
  if (!user || user.role !== "teacher") {
    unauthorized();
  }

  const classId = context.params.id;
  const klass = await getClassById(classId);
  if (!klass || klass.teacherId !== user.id) {
    notFound("not found");
  }

  const students = await getClassStudents(classId);
  return { data: students };
});

export const POST = withApi(async (request, context) => {
  const user = await getCurrentUser();
  if (!user || user.role !== "teacher") {
    unauthorized();
  }

  const classId = context.params.id;
  const klass = await getClassById(classId);
  if (!klass || klass.teacherId !== user.id) {
    notFound("not found");
  }

  const body = await parseJson(request, addStudentBodySchema);

  const student = await getUserByEmail(body.email);
  if (!student || student.role !== "student") {
    notFound("student not found");
  }

  const added = await addStudentToClass(classId, student.id);
  if (added) {
    const assignments = await getAssignmentsByClass(classId);
    for (const assignment of assignments) {
      await createAssignmentProgress(assignment.id, student.id);
    }
    await createNotification({
      userId: student.id,
      title: "加入班级",
      content: `你已加入班级「${klass.name}」`,
      type: "class"
    });
  }

  return { added };
});
