import { getCurrentUser } from "@/lib/auth";
import { getClassById } from "@/lib/classes";
import { addModuleResource, deleteModuleResource, getModuleById, getModuleResources } from "@/lib/modules";
import { badRequest, notFound, unauthorized, withApi } from "@/lib/api/http";
import { parseJson, v } from "@/lib/api/validation";

export const dynamic = "force-dynamic";

const moduleResourceBodySchema = v.object<{
  title: string;
  resourceType: "file" | "link";
  fileName?: string;
  mimeType?: string;
  size?: number;
  contentBase64?: string;
  linkUrl?: string;
}>(
  {
    title: v.string({ minLength: 1 }),
    resourceType: v.enum(["file", "link"] as const),
    fileName: v.optional(v.string({ minLength: 1 })),
    mimeType: v.optional(v.string({ minLength: 1 })),
    size: v.optional(v.number({ coerce: true, integer: true, min: 0 })),
    contentBase64: v.optional(v.string({ minLength: 1 })),
    linkUrl: v.optional(v.string({ minLength: 1 }))
  },
  { allowUnknown: false }
);

const deleteResourceBodySchema = v.object<{ resourceId: string }>(
  {
    resourceId: v.string({ minLength: 1 })
  },
  { allowUnknown: false }
);

export const GET = withApi(async (_request, context) => {
  const user = await getCurrentUser();
  if (!user || user.role !== "teacher") {
    unauthorized();
  }
  const moduleId = context.params.id;
  const moduleRecord = await getModuleById(moduleId);
  if (!moduleRecord) {
    notFound("not found");
  }
  const klass = await getClassById(moduleRecord.classId);
  if (!klass || klass.teacherId !== user.id) {
    notFound("not found");
  }
  const resources = await getModuleResources(moduleId);
  return { data: resources };
});

export const POST = withApi(async (request, context) => {
  const user = await getCurrentUser();
  if (!user || user.role !== "teacher") {
    unauthorized();
  }
  const moduleId = context.params.id;
  const moduleRecord = await getModuleById(moduleId);
  if (!moduleRecord) {
    notFound("not found");
  }
  const klass = await getClassById(moduleRecord.classId);
  if (!klass || klass.teacherId !== user.id) {
    notFound("not found");
  }

  const body = await parseJson(request, moduleResourceBodySchema);
  if (body.resourceType === "file" && !body.contentBase64) {
    badRequest("missing file");
  }
  if (body.resourceType === "link" && !body.linkUrl) {
    badRequest("missing link");
  }

  const created = await addModuleResource({
    moduleId,
    title: body.title,
    resourceType: body.resourceType,
    fileName: body.fileName,
    mimeType: body.mimeType,
    size: body.size,
    contentBase64: body.contentBase64,
    linkUrl: body.linkUrl
  });
  return { data: created };
});

export const DELETE = withApi(async (request, context) => {
  const user = await getCurrentUser();
  if (!user || user.role !== "teacher") {
    unauthorized();
  }
  const moduleId = context.params.id;
  const moduleRecord = await getModuleById(moduleId);
  if (!moduleRecord) {
    notFound("not found");
  }
  const klass = await getClassById(moduleRecord.classId);
  if (!klass || klass.teacherId !== user.id) {
    notFound("not found");
  }
  const body = await parseJson(request, deleteResourceBodySchema);
  await deleteModuleResource(body.resourceId);
  return { ok: true };
});
