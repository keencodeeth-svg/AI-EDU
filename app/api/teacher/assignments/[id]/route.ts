import { getCurrentUser } from "@/lib/auth";
import { getAssignmentById, getAssignmentProgress } from "@/lib/assignments";
import { getClassById, getClassStudents } from "@/lib/classes";
import { getModuleById } from "@/lib/modules";
import { notFound, unauthorized, withApi } from "@/lib/api/http";

export const dynamic = "force-dynamic";

export const GET = withApi(async (_request, context) => {
  const user = await getCurrentUser();
  if (!user || user.role !== "teacher") {
    unauthorized();
  }

  const assignmentId = context.params.id;
  const assignment = await getAssignmentById(assignmentId);
  if (!assignment) {
    notFound();
  }

  const klass = await getClassById(assignment.classId);
  if (!klass || klass.teacherId !== user.id) {
    notFound();
  }

  const students = await getClassStudents(assignment.classId);
  const progress = await getAssignmentProgress(assignment.id);
  const progressMap = new Map(progress.map((item) => [item.studentId, item]));

  const roster = students.map((student) => {
    const record = progressMap.get(student.id);
    return {
      ...student,
      status: record?.status ?? "pending",
      score: record?.score ?? null,
      total: record?.total ?? null,
      completedAt: record?.completedAt ?? null
    };
  });

  return {
    assignment,
    module: assignment.moduleId ? await getModuleById(assignment.moduleId) : null,
    class: klass,
    students: roster
  };
});
