import { getAssignmentsByClassIds, getAssignmentProgressByStudent } from "@/lib/assignments";
import { getModuleResources } from "@/lib/modules";
import { withApi } from "@/lib/api/http";
import { requireStudentModule } from "@/lib/guard";
import { parseParams, v } from "@/lib/api/validation";

export const dynamic = "force-dynamic";

const moduleParamsSchema = v.object<{ id: string }>(
  {
    id: v.string({ minLength: 1 })
  },
  { allowUnknown: true }
);

export const GET = withApi(async (_request, context) => {
  const params = parseParams(context.params, moduleParamsSchema);
  const moduleId = params.id;
  const { student, moduleRecord } = await requireStudentModule(moduleId);

  const resources = await getModuleResources(moduleId);
  const assignments = await getAssignmentsByClassIds([moduleRecord.classId]);
  const moduleAssignments = assignments.filter((assignment) => assignment.moduleId === moduleId);
  const progress = await getAssignmentProgressByStudent(student.id);
  const progressMap = new Map(progress.map((item) => [item.assignmentId, item]));

  const assignmentData = moduleAssignments.map((assignment) => ({
    ...assignment,
    status: progressMap.get(assignment.id)?.status ?? "pending"
  }));

  return { data: { module: moduleRecord, resources, assignments: assignmentData } };
});
