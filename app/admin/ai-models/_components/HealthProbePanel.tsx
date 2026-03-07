import type { Dispatch, SetStateAction } from "react";
import Card from "@/components/Card";
import type { ProbeCapability, ProbeResponse } from "../types";

const fieldStyle = {
  width: 180,
  padding: 10,
  borderRadius: 10,
  border: "1px solid var(--stroke)"
} as const;

type HealthProbePanelProps = {
  testCapability: ProbeCapability;
  setTestCapability: Dispatch<SetStateAction<ProbeCapability>>;
  testing: boolean;
  probe: ProbeResponse | null;
  onRunProbe: (providers?: string[]) => void;
};

export default function HealthProbePanel({
  testCapability,
  setTestCapability,
  testing,
  probe,
  onRunProbe
}: HealthProbePanelProps) {
  return (
    <Card title="连通性测试" tag="诊断">
      <div className="cta-row" style={{ marginBottom: 10 }}>
        <label>
          <div className="section-title">测试能力</div>
          <select value={testCapability} onChange={(event) => setTestCapability(event.target.value as ProbeCapability)} style={fieldStyle}>
            <option value="chat">文本模型</option>
            <option value="vision">视觉模型</option>
          </select>
        </label>
        <button className="button secondary" type="button" onClick={() => onRunProbe()} disabled={testing}>
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
              <div style={{ fontSize: 12, color: "var(--ink-1)" }}>延迟 {item.latencyMs}ms · {item.message}</div>
            </div>
          ))}
        </div>
      ) : (
        <p style={{ color: "var(--ink-1)" }}>尚未执行连通性测试。</p>
      )}
    </Card>
  );
}
