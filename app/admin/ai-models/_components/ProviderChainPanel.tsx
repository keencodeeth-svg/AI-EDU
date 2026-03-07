import Link from "next/link";
import Card from "@/components/Card";
import type { ConfigData, ProviderHealth } from "../types";

const metaTextStyle = { fontSize: 12, color: "var(--ink-1)" } as const;
const sortableItemStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 8,
  padding: 10,
  borderRadius: 10,
  border: "1px solid var(--stroke)"
} as const;

type ProviderChainIssue = {
  provider: string;
  health?: ProviderHealth;
};

type ProviderChainPanelProps = {
  loading: boolean;
  error: string | null;
  message: string | null;
  config: ConfigData | null;
  draftChain: string[];
  effectivePreview: string[];
  providerHealthMap: Map<string, ProviderHealth>;
  chainChatHealthIssues: ProviderChainIssue[];
  testing: boolean;
  saving: boolean;
  onAddProvider: (provider: string) => void;
  onRemoveProvider: (provider: string) => void;
  onMoveProvider: (provider: string, offset: -1 | 1) => void;
  onRunProbe: (providers?: string[]) => void;
  onSaveChain: () => void;
  onResetToEnv: () => void;
};

export default function ProviderChainPanel({
  loading,
  error,
  message,
  config,
  draftChain,
  effectivePreview,
  providerHealthMap,
  chainChatHealthIssues,
  testing,
  saving,
  onAddProvider,
  onRemoveProvider,
  onMoveProvider,
  onRunProbe,
  onSaveChain,
  onResetToEnv
}: ProviderChainPanelProps) {
  return (
    <>
      <Card title="当前配置" tag="模型">
        {loading ? <p>加载中...</p> : null}
        {error ? <div style={{ color: "#b42318", fontSize: 13 }}>{error}</div> : null}
        {message ? <div style={{ color: "#027a48", fontSize: 13 }}>{message}</div> : null}
        {!loading && config ? (
          <div className="grid" style={{ gap: 10, marginTop: 8 }}>
            <div className="card" style={metaTextStyle}>
              环境链：{config.envProviderChain.join(" -> ")}
            </div>
            <div className="card" style={metaTextStyle}>
              运行链：{config.runtimeProviderChain.length ? config.runtimeProviderChain.join(" -> ") : "未覆盖（跟随环境链）"}
            </div>
            <div className="card" style={metaTextStyle}>
              生效链：{config.effectiveProviderChain.join(" -> ")}
            </div>
            {chainChatHealthIssues.length ? (
              <div className="card" style={{ fontSize: 12, color: "#b42318" }}>
                当前生效链存在未完成配置的模型：
                {chainChatHealthIssues
                  .map((item) =>
                    `${item.provider}${item.health?.chat.missingEnv?.length ? `（缺少 ${item.health.chat.missingEnv.join(" / ")}）` : ""}`
                  )
                  .join("、")}
              </div>
            ) : null}
            <div style={metaTextStyle}>
              更新时间：{config.updatedAt ? new Date(config.updatedAt).toLocaleString("zh-CN") : "-"} · 操作人：
              {config.updatedBy ?? "-"}
            </div>
          </div>
        ) : null}
      </Card>

      <Card title="模型链编辑" tag="切换">
        <div className="grid" style={{ gap: 10 }}>
          <div style={metaTextStyle}>选择并排序模型。系统会按顺序调用，失败后自动降级。</div>
          <div className="grid" style={{ gap: 8 }}>
            {(config?.availableProviders ?? []).map((provider) => {
              const selected = draftChain.includes(provider.key);
              const health = providerHealthMap.get(provider.key);
              return (
                <div className="card" key={provider.key}>
                  <div className="section-title">{provider.label}</div>
                  <div style={{ ...metaTextStyle, marginTop: 4 }}>{provider.description}</div>
                  {health ? (
                    <div style={{ ...metaTextStyle, marginTop: 6 }}>
                      文本能力：{health.chat.configured ? "已配置" : "未配置"} · 视觉能力：
                      {health.vision.configured ? "已配置" : "未配置"}
                      {health.chat.model ? ` · chat模型 ${health.chat.model}` : ""}
                    </div>
                  ) : null}
                  {health && !health.chat.configured && health.chat.missingEnv.length ? (
                    <div style={{ fontSize: 12, color: "#b42318", marginTop: 4 }}>缺少：{health.chat.missingEnv.join(" / ")}</div>
                  ) : null}
                  <div className="cta-row" style={{ marginTop: 8 }}>
                    {!selected ? (
                      <button className="button secondary" type="button" onClick={() => onAddProvider(provider.key)}>
                        加入链路
                      </button>
                    ) : (
                      <button className="button ghost" type="button" onClick={() => onRemoveProvider(provider.key)}>
                        移除
                      </button>
                    )}
                    <button className="button ghost" type="button" onClick={() => onRunProbe([provider.key])} disabled={testing}>
                      测试该模型
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="card">
            <div className="section-title">链路顺序预览</div>
            <div className="grid" style={{ gap: 8, marginTop: 8 }}>
              {effectivePreview.map((provider, index) => (
                <div key={`${provider}-${index}`} style={sortableItemStyle}>
                  <div style={{ fontSize: 13 }}>
                    #{index + 1} · {provider}
                  </div>
                  <div className="cta-row">
                    <button className="button ghost" type="button" onClick={() => onMoveProvider(provider, -1)}>
                      上移
                    </button>
                    <button className="button ghost" type="button" onClick={() => onMoveProvider(provider, 1)}>
                      下移
                    </button>
                    <button className="button ghost" type="button" onClick={() => onRemoveProvider(provider)}>
                      移除
                    </button>
                  </div>
                </div>
              ))}
              {!effectivePreview.length ? <div style={metaTextStyle}>当前为空，将回退到 mock。</div> : null}
            </div>
          </div>
          <div className="cta-row">
            <button className="button primary" type="button" onClick={onSaveChain} disabled={saving}>
              {saving ? "保存中..." : "保存模型链"}
            </button>
            <button className="button ghost" type="button" onClick={onResetToEnv} disabled={saving}>
              切回环境变量
            </button>
            <Link className="button secondary" href="/admin">
              返回管理首页
            </Link>
          </div>
        </div>
      </Card>
    </>
  );
}
