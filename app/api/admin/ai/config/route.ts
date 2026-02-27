import { requireRole } from "@/lib/guard";
import { addAdminLog } from "@/lib/admin-log";
import { badRequest, unauthorized, withApi } from "@/lib/api/http";
import { parseJson, v } from "@/lib/api/validation";
import {
  getEffectiveAiProviderChain,
  getEnvAiProviderChain,
  getRuntimeAiProviderConfig,
  listAiProviderOptions,
  saveRuntimeAiProviderConfig
} from "@/lib/ai-config";

export const dynamic = "force-dynamic";

const updateBodySchema = v.object<{
  providerChain?: string[];
  reset?: boolean;
}>(
  {
    providerChain: v.optional(v.array(v.string({ allowEmpty: true, trim: false }))),
    reset: v.optional(v.boolean())
  },
  { allowUnknown: false }
);

function buildPayload() {
  const runtime = getRuntimeAiProviderConfig();
  return {
    availableProviders: listAiProviderOptions(),
    runtimeProviderChain: runtime.providerChain,
    envProviderChain: getEnvAiProviderChain(),
    effectiveProviderChain: getEffectiveAiProviderChain(),
    updatedAt: runtime.updatedAt,
    updatedBy: runtime.updatedBy
  };
}

export const GET = withApi(async () => {
  const user = await requireRole("admin");
  if (!user) {
    unauthorized();
  }
  return { data: buildPayload() };
});

export const POST = withApi(async (request) => {
  const user = await requireRole("admin");
  if (!user) {
    unauthorized();
  }

  const body = await parseJson(request, updateBodySchema);
  if (!body.reset && body.providerChain === undefined) {
    badRequest("missing providerChain");
  }

  const next = saveRuntimeAiProviderConfig({
    providerChain: body.reset ? [] : body.providerChain ?? [],
    updatedBy: user.id
  });

  await addAdminLog({
    adminId: user.id,
    action: "update_ai_provider_chain",
    entityType: "ai_config",
    entityId: "provider_chain",
    detail: next.providerChain.join(",") || "env_fallback"
  });

  return { data: buildPayload() };
});
