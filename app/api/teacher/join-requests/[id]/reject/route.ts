import { getCurrentUser } from "@/lib/auth";
import { decideJoinRequest, getClassById, getJoinRequestsByTeacher } from "@/lib/classes";
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

  await decideJoinRequest(record.id, "rejected");
  await createNotification({
    userId: record.studentId,
    title: "加入班级被拒绝",
    content: `班级「${klass.name}」拒绝了你的加入申请，如有疑问请联系老师。`,
    type: "class"
  });

  return { ok: true };
});
