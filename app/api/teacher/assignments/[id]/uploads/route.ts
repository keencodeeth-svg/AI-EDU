import { getClassStudentIds } from "@/lib/classes";
import { getAssignmentUploads } from "@/lib/assignment-uploads";
import { notFound, withApi } from "@/lib/api/http";
import { requireTeacherAssignment } from "@/lib/guard";
import { parseSearchParams, v } from "@/lib/api/validation";

export const dynamic = "force-dynamic";

const assignmentUploadsQuerySchema = v.object<{ studentId: string }>(
  {
    studentId: v.string({ minLength: 1 })
  },
  { allowUnknown: true }
);

export const GET = withApi(async (request, context) => {
  const query = parseSearchParams(request, assignmentUploadsQuerySchema);
  const studentId = query.studentId;

  const { assignment, klass } = await requireTeacherAssignment(context.params.id);
  const studentIds = await getClassStudentIds(klass.id);
  if (!studentIds.includes(studentId)) {
    notFound("student not in class");
  }

  const uploads = await getAssignmentUploads(assignment.id, studentId);
  return { data: uploads };
});
