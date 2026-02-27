import { readJson, writeJson } from "./storage";

export type AiProviderKey =
  | "mock"
  | "custom"
  | "compatible"
  | "zhipu"
  | "deepseek"
  | "kimi"
  | "minimax"
  | "seedance";

type AiProviderConfigRecord = {
  providerChain?: string[];
  updatedAt?: string;
  updatedBy?: string;
};

export type AiProviderRuntimeConfig = {
  providerChain: AiProviderKey[];
  updatedAt?: string;
  updatedBy?: string;
};

export type AiProviderOption = {
  key: AiProviderKey;
  label: string;
  description: string;
};

const AI_PROVIDER_CONFIG_FILE = "ai-provider-config.json";

const PROVIDER_ALIAS: Record<string, AiProviderKey> = {
  mock: "mock",
  custom: "custom",
  compatible: "compatible",
  openai_compatible: "compatible",
  zhipu: "zhipu",
  glm: "zhipu",
  bigmodel: "zhipu",
  deepseek: "deepseek",
  kimi: "kimi",
  moonshot: "kimi",
  minimax: "minimax",
  seedance: "seedance",
  seed: "seedance"
};

const PROVIDER_OPTIONS: AiProviderOption[] = [
  {
    key: "zhipu",
    label: "智谱",
    description: "GLM 系列模型，支持中文教育场景。"
  },
  {
    key: "deepseek",
    label: "DeepSeek",
    description: "通用推理与代码能力较强。"
  },
  {
    key: "kimi",
    label: "Kimi",
    description: "Moonshot 模型，长文本能力较好。"
  },
  {
    key: "minimax",
    label: "MiniMax",
    description: "通用对话模型，可作为备份链路。"
  },
  {
    key: "seedance",
    label: "Seedance",
    description: "火山方舟链路，可用于多模型备援。"
  },
  {
    key: "compatible",
    label: "兼容接口",
    description: "OpenAI 协议兼容服务。"
  },
  {
    key: "custom",
    label: "自定义接口",
    description: "你的内部 Prompt 接口。"
  },
  {
    key: "mock",
    label: "Mock",
    description: "本地回退，不调用外部模型。"
  }
];

function normalizeProviderToken(value: string) {
  const key = value.trim().toLowerCase();
  if (!key) return null;
  return PROVIDER_ALIAS[key] ?? null;
}

function normalizeProviderChain(values: string[] | undefined) {
  if (!Array.isArray(values)) return [] as AiProviderKey[];
  const deduped = new Set<AiProviderKey>();
  values.forEach((value) => {
    const normalized = normalizeProviderToken(String(value));
    if (normalized) {
      deduped.add(normalized);
    }
  });
  return Array.from(deduped);
}

function parseProviderChain(raw: string | undefined) {
  if (!raw?.trim()) return [] as AiProviderKey[];
  return normalizeProviderChain(raw.split(/[\s,，|]+/).filter(Boolean));
}

export function listAiProviderOptions() {
  return PROVIDER_OPTIONS;
}

export function getRuntimeAiProviderConfig(): AiProviderRuntimeConfig {
  const saved = readJson<AiProviderConfigRecord | null>(AI_PROVIDER_CONFIG_FILE, null);
  if (!saved || typeof saved !== "object") {
    return { providerChain: [] };
  }
  return {
    providerChain: normalizeProviderChain(saved.providerChain),
    updatedAt: typeof saved.updatedAt === "string" ? saved.updatedAt : undefined,
    updatedBy: typeof saved.updatedBy === "string" ? saved.updatedBy : undefined
  };
}

export function getEnvAiProviderChain() {
  const fromChain = parseProviderChain(process.env.LLM_PROVIDER_CHAIN);
  if (fromChain.length) return fromChain;
  const fromProvider = parseProviderChain(process.env.LLM_PROVIDER);
  if (fromProvider.length) return fromProvider;
  return ["mock"] as AiProviderKey[];
}

export function getEffectiveAiProviderChain() {
  const runtime = getRuntimeAiProviderConfig();
  if (runtime.providerChain.length) {
    return runtime.providerChain;
  }
  return getEnvAiProviderChain();
}

export function saveRuntimeAiProviderConfig(input: {
  providerChain?: string[];
  updatedBy?: string;
}) {
  const providerChain = normalizeProviderChain(input.providerChain);
  const next: AiProviderConfigRecord = {
    providerChain,
    updatedAt: new Date().toISOString(),
    updatedBy: input.updatedBy?.trim() || undefined
  };
  writeJson(AI_PROVIDER_CONFIG_FILE, next);
  return {
    providerChain,
    updatedAt: next.updatedAt,
    updatedBy: next.updatedBy
  } as AiProviderRuntimeConfig;
}
