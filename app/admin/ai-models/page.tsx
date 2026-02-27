"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Card from "@/components/Card";

type ProviderOption = {
  key: string;
  label: string;
  description: string;
};

type ConfigData = {
  availableProviders: ProviderOption[];
  runtimeProviderChain: string[];
  envProviderChain: string[];
  effectiveProviderChain: string[];
  updatedAt?: string;
  updatedBy?: string;
};

type ProbeResult = {
  provider: string;
  ok: boolean;
  latencyMs: number;
  message: string;
};

type ProbeResponse = {
  capability: "chat" | "vision";
  testedAt: string;
  results: ProbeResult[];
};

export default function AdminAiModelsPage() {
  const [config, setConfig] = useState<ConfigData | null>(null);
  const [draftChain, setDraftChain] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [testCapability, setTestCapability] = useState<"chat" | "vision">("chat");
  const [probe, setProbe] = useState<ProbeResponse | null>(null);

  async function loadConfig() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/ai/config", { cache: "no-store" });
      const payload = await res.json();
      if (!res.ok) {
        setError(payload?.error ?? "加载模型配置失败");
        return;
      }
      const data: ConfigData = payload?.data ?? null;
      setConfig(data);
      setDraftChain(data?.runtimeProviderChain ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadConfig();
  }, []);

  const effectivePreview = useMemo(() => {
    if (draftChain.length) return draftChain;
    return config?.envProviderChain ?? ["mock"];
  }, [config?.envProviderChain, draftChain]);

  function addProvider(provider: string) {
    setDraftChain((prev) => (prev.includes(provider) ? prev : [...prev, provider]));
  }

  function removeProvider(provider: string) {
    setDraftChain((prev) => prev.filter((item) => item !== provider));
  }

  function moveProvider(provider: string, offset: -1 | 1) {
    setDraftChain((prev) => {
      const index = prev.findIndex((item) => item === provider);
      if (index < 0) return prev;
      const nextIndex = index + offset;
      if (nextIndex < 0 || nextIndex >= prev.length) return prev;
      const next = [...prev];
      const [picked] = next.splice(index, 1);
      next.splice(nextIndex, 0, picked);
      return next;
    });
  }

  async function saveChain() {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/ai/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerChain: draftChain })
      });
      const payload = await res.json();
      if (!res.ok) {
        setError(payload?.error ?? "保存失败");
        return;
      }
      const data: ConfigData = payload?.data ?? null;
      setConfig(data);
      setDraftChain(data?.runtimeProviderChain ?? []);
      setMessage("AI 模型链已保存");
    } finally {
      setSaving(false);
    }
  }

  async function resetToEnv() {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/ai/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reset: true })
      });
      const payload = await res.json();
      if (!res.ok) {
        setError(payload?.error ?? "重置失败");
        return;
      }
      const data: ConfigData = payload?.data ?? null;
      setConfig(data);
      setDraftChain(data?.runtimeProviderChain ?? []);
      setMessage("已切回环境变量配置");
    } finally {
      setSaving(false);
    }
  }

  async function runProbe(providers?: string[]) {
    setTesting(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/ai/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providers: providers ?? effectivePreview,
          capability: testCapability
        })
      });
      const payload = await res.json();
      if (!res.ok) {
        setError(payload?.error ?? "连通性测试失败");
        return;
      }
      setProbe(payload?.data ?? null);
      setMessage("连通性测试完成");
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="grid" style={{ gap: 18 }}>
      <div className="section-head">
        <div>
          <h2>AI 模型路由中心</h2>
          <div className="section-sub">统一配置全站 AI 功能的模型顺序、回退链与连通性检查。</div>
        </div>
        <span className="chip">管理端</span>
      </div>

      <Card title="当前配置" tag="模型">
        {loading ? <p>加载中...</p> : null}
        {error ? <div style={{ color: "#b42318", fontSize: 13 }}>{error}</div> : null}
        {message ? <div style={{ color: "#027a48", fontSize: 13 }}>{message}</div> : null}
        {!loading && config ? (
          <div className="grid" style={{ gap: 10, marginTop: 8 }}>
            <div className="card" style={{ fontSize: 12, color: "var(--ink-1)" }}>
              环境链：{config.envProviderChain.join(" -> ")}
            </div>
            <div className="card" style={{ fontSize: 12, color: "var(--ink-1)" }}>
              运行链：{config.runtimeProviderChain.length ? config.runtimeProviderChain.join(" -> ") : "未覆盖（跟随环境链）"}
            </div>
            <div className="card" style={{ fontSize: 12, color: "var(--ink-1)" }}>
              生效链：{config.effectiveProviderChain.join(" -> ")}
            </div>
            <div style={{ fontSize: 12, color: "var(--ink-1)" }}>
              更新时间：{config.updatedAt ? new Date(config.updatedAt).toLocaleString("zh-CN") : "-"} · 操作人：
              {config.updatedBy ?? "-"}
            </div>
          </div>
        ) : null}
      </Card>

      <Card title="模型链编辑" tag="切换">
        <div className="grid" style={{ gap: 10 }}>
          <div style={{ fontSize: 12, color: "var(--ink-1)" }}>
            选择并排序模型。系统会按顺序尝试调用，当前模型失败时自动降级到下一个模型。
          </div>
          <div className="grid" style={{ gap: 8 }}>
            {(config?.availableProviders ?? []).map((provider) => {
              const selected = draftChain.includes(provider.key);
              return (
                <div className="card" key={provider.key}>
                  <div className="section-title">{provider.label}</div>
                  <div style={{ fontSize: 12, color: "var(--ink-1)", marginTop: 4 }}>{provider.description}</div>
                  <div className="cta-row" style={{ marginTop: 8 }}>
                    {!selected ? (
                      <button className="button secondary" type="button" onClick={() => addProvider(provider.key)}>
                        加入链路
                      </button>
                    ) : (
                      <button className="button ghost" type="button" onClick={() => removeProvider(provider.key)}>
                        移除
                      </button>
                    )}
                    <button className="button ghost" type="button" onClick={() => runProbe([provider.key])} disabled={testing}>
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
                <div
                  key={`${provider}-${index}`}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 8,
                    padding: 10,
                    borderRadius: 10,
                    border: "1px solid var(--stroke)"
                  }}
                >
                  <div style={{ fontSize: 13 }}>
                    #{index + 1} · {provider}
                  </div>
                  <div className="cta-row">
                    <button className="button ghost" type="button" onClick={() => moveProvider(provider, -1)}>
                      上移
                    </button>
                    <button className="button ghost" type="button" onClick={() => moveProvider(provider, 1)}>
                      下移
                    </button>
                    <button className="button ghost" type="button" onClick={() => removeProvider(provider)}>
                      移除
                    </button>
                  </div>
                </div>
              ))}
              {!effectivePreview.length ? <div style={{ fontSize: 12, color: "var(--ink-1)" }}>当前为空，将回退到 mock。</div> : null}
            </div>
          </div>
          <div className="cta-row">
            <button className="button primary" type="button" onClick={saveChain} disabled={saving}>
              {saving ? "保存中..." : "保存模型链"}
            </button>
            <button className="button ghost" type="button" onClick={resetToEnv} disabled={saving}>
              切回环境变量
            </button>
            <Link className="button secondary" href="/admin">
              返回管理首页
            </Link>
          </div>
        </div>
      </Card>

      <Card title="连通性测试" tag="诊断">
        <div className="cta-row" style={{ marginBottom: 10 }}>
          <label>
            <div className="section-title">测试能力</div>
            <select
              value={testCapability}
              onChange={(event) => setTestCapability(event.target.value as "chat" | "vision")}
              style={{ width: 180, padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
            >
              <option value="chat">文本模型</option>
              <option value="vision">视觉模型</option>
            </select>
          </label>
          <button className="button secondary" type="button" onClick={() => runProbe()} disabled={testing}>
            {testing ? "测试中..." : "测试当前生效链"}
          </button>
        </div>
        {probe ? (
          <div className="grid" style={{ gap: 8 }}>
            <div style={{ fontSize: 12, color: "var(--ink-1)" }}>
              测试时间：{new Date(probe.testedAt).toLocaleString("zh-CN")} · 能力：{probe.capability}
            </div>
            {probe.results.map((item) => (
              <div className="card" key={`${item.provider}-${item.latencyMs}`}>
                <div className="section-title">
                  {item.provider} · {item.ok ? "成功" : "失败"}
                </div>
                <div style={{ fontSize: 12, color: "var(--ink-1)" }}>
                  延迟 {item.latencyMs}ms · {item.message}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: "var(--ink-1)" }}>尚未执行连通性测试。</p>
        )}
      </Card>
    </div>
  );
}
