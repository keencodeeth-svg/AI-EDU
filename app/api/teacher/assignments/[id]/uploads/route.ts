import { getCurrentUser } from "@/lib/auth";
import { getClassById, getClassStudentIds } from "@/lib/classes";
import { getAssignmentById } from "@/lib/assignments";
import { getAssignmentUploads } from "@/lib/assignment-uploads";
import { notFound, unauthorized, withApi } from "@/lib/api/http";
import { parseSearchParams, v } from "@/lib/api/validation";

export const dynamic = "force-dynamic";

const assignmentUploadsQuerySchema = v.object<{ studentId: string }>(
  {
    studentId: v.string({ minLength: 1 })
  },
  { allowUnknown: true }
);

export const GET = withApi(async (request, context) => {
  const user = await getCurrentUser();
  if (!user || user.role !== "teacher") {
    unauthorized();
  }

  const query = parseSearchParams(request, assignmentUploadsQuerySchema);
  const studentId = query.studentId;

  const assignment = await getAssignmentById(context.params.id);
  if (!assignment) {
    notFound("not found");
  }

  const klass = await getClassById(assignment.classId);
  if (!klass || klass.teacherId !== user.id) {
    notFound("not found");
  }
  const studentIds = await getClassStudentIds(klass.id);
  if (!studentIds.includes(studentId)) {
    notFound("student not in class");
  }

  const uploads = await getAssignmentUploads(assignment.id, studentId);
  return { data: uploads };
});
