import { getCurrentUser } from "@/lib/auth";
import { getClassesByStudent } from "@/lib/classes";
import { getAssignmentsByClassIds, getAssignmentProgressByStudent } from "@/lib/assignments";
import { getModuleById, getModuleResources } from "@/lib/modules";
import { notFound, unauthorized, withApi } from "@/lib/api/http";
import { parseParams, v } from "@/lib/api/validation";

export const dynamic = "force-dynamic";

const moduleParamsSchema = v.object<{ id: string }>(
  {
    id: v.string({ minLength: 1 })
  },
  { allowUnknown: true }
);

export const GET = withApi(async (_request, context) => {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") {
    unauthorized();
  }

  const params = parseParams(context.params, moduleParamsSchema);
  const moduleId = params.id;
  const moduleRecord = await getModuleById(moduleId);
  if (!moduleRecord) {
    notFound("not found");
  }

  const classes = await getClassesByStudent(user.id);
  const classIds = new Set(classes.map((item) => item.id));
  if (!classIds.has(moduleRecord.classId)) {
    notFound("not found");
  }

  const resources = await getModuleResources(moduleId);
  const assignments = await getAssignmentsByClassIds([moduleRecord.classId]);
  const moduleAssignments = assignments.filter((assignment) => assignment.moduleId === moduleId);
  const progress = await getAssignmentProgressByStudent(user.id);
  const progressMap = new Map(progress.map((item) => [item.assignmentId, item]));

  const assignmentData = moduleAssignments.map((assignment) => ({
    ...assignment,
    status: progressMap.get(assignment.id)?.status ?? "pending"
  }));

  return { data: { module: moduleRecord, resources, assignments: assignmentData } };
});
