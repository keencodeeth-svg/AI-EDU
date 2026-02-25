import { getCurrentUser } from "@/lib/auth";
import { getClassesByStudent } from "@/lib/classes";
import { getAssignmentById } from "@/lib/assignments";
import { addAssignmentUpload, deleteAssignmentUpload, getAssignmentUploads } from "@/lib/assignment-uploads";
import { badRequest, notFound, unauthorized, withApi } from "@/lib/api/http";

export const dynamic = "force-dynamic";

const MAX_SIZE_MB = 3;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "application/pdf"];

export const GET = withApi(async (_request, context) => {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") {
    unauthorized();
  }

  const assignment = await getAssignmentById(context.params.id);
  if (!assignment) {
    notFound("not found");
  }
  if (assignment.submissionType !== "upload" && assignment.submissionType !== "essay") {
    badRequest("该作业不支持上传");
  }

  const classes = await getClassesByStudent(user.id);
  if (!classes.find((item) => item.id === assignment.classId)) {
    notFound("not found");
  }

  const uploads = await getAssignmentUploads(assignment.id, user.id);
  return { data: uploads };
});

export const POST = withApi(async (request, context) => {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") {
    unauthorized();
  }

  const assignment = await getAssignmentById(context.params.id);
  if (!assignment) {
    notFound("not found");
  }
  if (assignment.submissionType !== "upload" && assignment.submissionType !== "essay") {
    badRequest("该作业不支持上传");
  }

  const classes = await getClassesByStudent(user.id);
  if (!classes.find((item) => item.id === assignment.classId)) {
    notFound("not found");
  }

  const formData = await request.formData();
  const files = formData.getAll("files");
  const picked = files.length ? files : [formData.get("file")].filter(Boolean);
  const uploaded = await getAssignmentUploads(assignment.id, user.id);
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
      studentId: user.id,
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
  const user = await getCurrentUser();
  if (!user || user.role !== "student") {
    unauthorized();
  }

  const { searchParams } = new URL(request.url);
  const uploadId = searchParams.get("uploadId");
  if (!uploadId) {
    badRequest("missing uploadId");
  }

  const assignment = await getAssignmentById(context.params.id);
  if (!assignment) {
    notFound("not found");
  }
  if (assignment.submissionType !== "upload" && assignment.submissionType !== "essay") {
    badRequest("该作业不支持上传");
  }

  const classes = await getClassesByStudent(user.id);
  if (!classes.find((item) => item.id === assignment.classId)) {
    notFound("not found");
  }

  const removed = await deleteAssignmentUpload(uploadId, user.id);
  return { removed };
});
