import { getCurrentUser } from "@/lib/auth";
import { getClassById, getClassesByTeacher } from "@/lib/classes";
import { createModule, getModulesByClass } from "@/lib/modules";
import { notFound, unauthorized, withApi } from "@/lib/api/http";
import { parseJson, parseSearchParams, v } from "@/lib/api/validation";

export const dynamic = "force-dynamic";

const modulesQuerySchema = v.object<{ classId?: string }>(
  {
    classId: v.optional(v.string({ minLength: 1 }))
  },
  { allowUnknown: true }
);

const createModuleBodySchema = v.object<{
  classId: string;
  title: string;
  description?: string;
  parentId?: string;
  orderIndex?: number;
}>(
  {
    classId: v.string({ minLength: 1 }),
    title: v.string({ minLength: 1 }),
    description: v.optional(v.string({ allowEmpty: true, trim: false })),
    parentId: v.optional(v.string({ minLength: 1 })),
    orderIndex: v.optional(v.number({ coerce: true, integer: true, min: 0 }))
  },
  { allowUnknown: false }
);

export const GET = withApi(async (request) => {
  const user = await getCurrentUser();
  if (!user || user.role !== "teacher") {
    unauthorized();
  }
  const query = parseSearchParams(request, modulesQuerySchema);
  const classId = query.classId ?? "";
  if (!classId) {
    const classes = await getClassesByTeacher(user.id);
    return { data: [], classes };
  }
  const klass = await getClassById(classId);
  if (!klass || klass.teacherId !== user.id) {
    notFound("class not found");
  }
  const modules = await getModulesByClass(classId);
  return { data: modules };
});

export const POST = withApi(async (request) => {
  const user = await getCurrentUser();
  if (!user || user.role !== "teacher") {
    unauthorized();
  }
  const body = await parseJson(request, createModuleBodySchema);
  const klass = await getClassById(body.classId);
  if (!klass || klass.teacherId !== user.id) {
    notFound("class not found");
  }
  const created = await createModule({
    classId: body.classId,
    title: body.title,
    description: body.description,
    parentId: body.parentId,
    orderIndex: body.orderIndex
  });
  return { data: created };
});
