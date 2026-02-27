import { addAssignmentUpload, deleteAssignmentUpload, getAssignmentUploads } from "@/lib/assignment-uploads";
import { badRequest, withApi } from "@/lib/api/http";
import { requireStudentAssignment } from "@/lib/guard";

export const dynamic = "force-dynamic";

const MAX_SIZE_MB = 3;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "application/pdf"];

export const GET = withApi(async (_request, context) => {
  const { student, assignment } = await requireStudentAssignment(context.params.id);
  if (assignment.submissionType !== "upload" && assignment.submissionType !== "essay") {
    badRequest("该作业不支持上传");
  }

  const uploads = await getAssignmentUploads(assignment.id, student.id);
  return { data: uploads };
});

export const POST = withApi(async (request, context) => {
  const { student, assignment } = await requireStudentAssignment(context.params.id);
  if (assignment.submissionType !== "upload" && assignment.submissionType !== "essay") {
    badRequest("该作业不支持上传");
  }

  const formData = await request.formData();
  const files = formData.getAll("files");
  const picked = files.length ? files : [formData.get("file")].filter(Boolean);
  const uploaded = await getAssignmentUploads(assignment.id, student.id);
  const maxUploads = assignment.maxUploads ?? 3;
  if (uploaded.length + picked.length > maxUploads) {
    badRequest(`最多上传 ${maxUploads} 份文件`);
  }

  const saved = [];
  for (const entry of picked) {
    if (!(entry instanceof File)) {
      continue;
    }
    if (!ALLOWED_TYPES.includes(entry.type)) {
      badRequest(`不支持的文件类型：${entry.type}`);
    }
    const sizeMb = entry.size / (1024 * 1024);
    if (sizeMb > MAX_SIZE_MB) {
      badRequest(`单个文件不能超过 ${MAX_SIZE_MB}MB`);
    }
    const buffer = Buffer.from(await entry.arrayBuffer());
    const base64 = buffer.toString("base64");
    const record = await addAssignmentUpload({
      assignmentId: assignment.id,
      studentId: student.id,
      fileName: entry.name,
      mimeType: entry.type,
      size: entry.size,
      contentBase64: base64
    });
    if (record) saved.push(record);
  }

  return { data: saved };
});

export const DELETE = withApi(async (request, context) => {
  const { student, assignment } = await requireStudentAssignment(context.params.id);

  const { searchParams } = new URL(request.url);
  const uploadId = searchParams.get("uploadId");
  if (!uploadId) {
    badRequest("missing uploadId");
  }

  if (assignment.submissionType !== "upload" && assignment.submissionType !== "essay") {
    badRequest("该作业不支持上传");
  }

  const removed = await deleteAssignmentUpload(uploadId, student.id);
  return { removed };
});
