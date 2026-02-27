import { updateModule } from "@/lib/modules";
import { withApi } from "@/lib/api/http";
import { requireTeacherModule } from "@/lib/guard";
import { parseJson, v } from "@/lib/api/validation";

export const dynamic = "force-dynamic";

const updateModuleBodySchema = v.object<{
  title?: string;
  description?: string;
  parentId?: string;
  orderIndex?: number;
}>(
  {
    title: v.optional(v.string({ minLength: 1 })),
    description: v.optional(v.string({ allowEmpty: true, trim: false })),
    parentId: v.optional(v.string({ minLength: 1 })),
    orderIndex: v.optional(v.number({ coerce: true, integer: true, min: 0 }))
  },
  { allowUnknown: false }
);

export const PUT = withApi(async (request, context) => {
  const moduleId = context.params.id;
  await requireTeacherModule(moduleId);

  const body = await parseJson(request, updateModuleBodySchema);

  const updated = await updateModule({
    id: moduleId,
    title: body.title,
    description: body.description,
    parentId: body.parentId,
    orderIndex: body.orderIndex
  });
  return { data: updated };
});
