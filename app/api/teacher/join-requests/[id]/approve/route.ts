import { getCurrentUser, getParentsByStudentId } from "@/lib/auth";
import {
  addStudentToClass,
  decideJoinRequest,
  getClassById,
  getJoinRequestsByTeacher
} from "@/lib/classes";
import { createAssignmentProgress, getAssignmentsByClass } from "@/lib/assignments";
import { createNotification } from "@/lib/notifications";
import { notFound, unauthorized, withApi } from "@/lib/api/http";

export const dynamic = "force-dynamic";

export const POST = withApi(async (_request, context) => {
  const user = await getCurrentUser();
  if (!user || user.role !== "teacher") {
    unauthorized();
  }

  const requestId = context.params.id;
  const requests = await getJoinRequestsByTeacher(user.id);
  const record = requests.find((item) => item.id === requestId);
  if (!record) {
    notFound("not found");
  }

  const klass = await getClassById(record.classId);
  if (!klass || klass.teacherId !== user.id) {
    notFound("not found");
  }

  await decideJoinRequest(record.id, "approved");
  await addStudentToClass(record.classId, record.studentId);

  const assignments = await getAssignmentsByClass(record.classId);
  for (const assignment of assignments) {
    await createAssignmentProgress(assignment.id, record.studentId);
  }

  await createNotification({
    userId: record.studentId,
    title: "加入班级成功",
    content: `老师已通过你的申请，欢迎加入班级「${klass.name}」。`,
    type: "class"
  });

  const parents = await getParentsByStudentId(record.studentId);
  for (const parent of parents) {
    await createNotification({
      userId: parent.id,
      title: "孩子加入班级",
      content: `孩子已加入班级「${klass.name}」。`,
      type: "class"
    });
  }

  return { ok: true };
});
