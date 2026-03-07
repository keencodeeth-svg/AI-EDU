import type { Dispatch, SetStateAction } from "react";
import Card from "@/components/Card";
import { EVAL_DATASET_LABELS, EVAL_DATASET_OPTIONS } from "../utils";
import type { EvalDatasetName, EvalGateConfig, EvalGateDraft, EvalGateRun } from "../types";

const fieldStyle = {
  width: "100%",
  padding: 10,
  borderRadius: 10,
  border: "1px solid var(--stroke)"
} as const;
const datasetTileStyle = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: 10,
  borderRadius: 10,
  border: "1px solid var(--stroke)",
  fontSize: 12
} as const;
const runRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 8,
  padding: 10,
  borderRadius: 10,
  border: "1px solid var(--stroke)"
} as const;

type EvalGatePanelProps = {
  evalGateLoading: boolean;
  evalGateSaving: boolean;
  evalGateRunning: boolean;
  evalGateDraft: EvalGateDraft;
  setEvalGateDraft: Dispatch<SetStateAction<EvalGateDraft>>;
  evalGateConfig: EvalGateConfig | null;
  evalGateLastRun: EvalGateRun | null;
  evalGateRuns: EvalGateRun[];
  onToggleEvalGateDataset: (dataset: EvalDatasetName) => void;
  onSaveEvalGateConfig: () => void;
  onRunEvalGate: () => void;
  onLoadEvalGate: () => void;
};

export default function EvalGatePanel({
  evalGateLoading,
  evalGateSaving,
  evalGateRunning,
  evalGateDraft,
  setEvalGateDraft,
  evalGateConfig,
  evalGateLastRun,
  evalGateRuns,
  onToggleEvalGateDataset,
  onSaveEvalGateConfig,
  onRunEvalGate,
  onLoadEvalGate
}: EvalGatePanelProps) {
  return (
    <Card title="离线评测门禁" tag="Gate">
      <div className="grid" style={{ gap: 10 }}>
        <div style={{ fontSize: 12, color: "var(--ink-1)" }}>用于发布前自动判断 AI 质量是否达标。未达标时可自动回滚到最近稳定校准快照。</div>

        {evalGateLoading ? <div style={{ fontSize: 12, color: "var(--ink-1)" }}>加载门禁配置中...</div> : null}

        <div className="grid grid-3">
          <label style={{ fontSize: 12 }}>
            <div className="section-title">门禁开关</div>
            <select
              value={evalGateDraft.enabled ? "enabled" : "disabled"}
              onChange={(event) => setEvalGateDraft((prev) => ({ ...prev, enabled: event.target.value === "enabled" }))}
              style={fieldStyle}
            >
              <option value="enabled">开启</option>
              <option value="disabled">关闭</option>
            </select>
          </label>
          <label style={{ fontSize: 12 }}>
            <div className="section-title">最低通过率（%）</div>
            <input
              type="number"
              min={0}
              max={100}
              value={evalGateDraft.minPassRate}
              onChange={(event) => setEvalGateDraft((prev) => ({ ...prev, minPassRate: Number(event.target.value || 0) }))}
              style={fieldStyle}
            />
          </label>
          <label style={{ fontSize: 12 }}>
            <div className="section-title">最低均分</div>
            <input
              type="number"
              min={0}
              max={100}
              value={evalGateDraft.minAverageScore}
              onChange={(event) => setEvalGateDraft((prev) => ({ ...prev, minAverageScore: Number(event.target.value || 0) }))}
              style={fieldStyle}
            />
          </label>
        </div>

        <div className="grid grid-2">
          <label style={{ fontSize: 12 }}>
            <div className="section-title">最高高风险样本数</div>
            <input
              type="number"
              min={0}
              max={9999}
              value={evalGateDraft.maxHighRiskCount}
              onChange={(event) => setEvalGateDraft((prev) => ({ ...prev, maxHighRiskCount: Number(event.target.value || 0) }))}
              style={fieldStyle}
            />
          </label>
          <label style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 8, marginTop: 22 }}>
            <input
              type="checkbox"
              checked={evalGateDraft.autoRollbackOnFail}
              onChange={(event) => setEvalGateDraft((prev) => ({ ...prev, autoRollbackOnFail: event.target.checked }))}
            />
            <span>门禁失败自动回滚校准快照</span>
          </label>
        </div>

        <div className="grid grid-3">
          {EVAL_DATASET_OPTIONS.map((dataset) => (
            <label key={`gate-dataset-${dataset.key}`} style={datasetTileStyle}>
              <input type="checkbox" checked={evalGateDraft.datasets.includes(dataset.key)} onChange={() => onToggleEvalGateDataset(dataset.key)} />
              <span>{dataset.label}</span>
            </label>
          ))}
        </div>

        <div className="cta-row">
          <button className="button secondary" type="button" onClick={onSaveEvalGateConfig} disabled={evalGateSaving}>
            {evalGateSaving ? "保存中..." : "保存门禁配置"}
          </button>
          <button className="button primary" type="button" onClick={onRunEvalGate} disabled={evalGateRunning}>
            {evalGateRunning ? "执行中..." : "立即执行门禁"}
          </button>
          <button className="button ghost" type="button" onClick={onLoadEvalGate} disabled={evalGateLoading}>
            刷新门禁状态
          </button>
        </div>

        {evalGateConfig ? (
          <div className="card" style={{ fontSize: 12, color: "var(--ink-1)" }}>
            当前配置：{evalGateConfig.enabled ? "启用" : "停用"} · 数据集 {(evalGateConfig.datasets ?? []).map((item) => EVAL_DATASET_LABELS.get(item) ?? item).join("、") || "-"} · 更新时间 {evalGateConfig.updatedAt ? new Date(evalGateConfig.updatedAt).toLocaleString("zh-CN") : "-"} · 操作人 {evalGateConfig.updatedBy ?? "-"}
          </div>
        ) : null}

        {evalGateLastRun ? (
          <div className="card">
            <div className="section-title">
              最近执行：{evalGateLastRun.passed ? "通过" : "未通过"} · {new Date(evalGateLastRun.executedAt).toLocaleString("zh-CN")}
            </div>
            <div className="pill-list" style={{ marginTop: 8 }}>
              <span className="pill">样本 {evalGateLastRun.reportSummary.totalCases}</span>
              <span className="pill">通过率 {evalGateLastRun.reportSummary.passRate}%</span>
              <span className="pill">均分 {evalGateLastRun.reportSummary.averageScore}</span>
              <span className="pill">高风险 {evalGateLastRun.reportSummary.highRiskCount}</span>
            </div>
            {evalGateLastRun.failedRules?.length ? (
              <ul style={{ margin: "8px 0 0 16px", fontSize: 12 }}>
                {evalGateLastRun.failedRules.map((rule) => (
                  <li key={rule}>{rule}</li>
                ))}
              </ul>
            ) : (
              <div style={{ marginTop: 8, fontSize: 12, color: "var(--ink-1)" }}>本次门禁无失败规则。</div>
            )}
            {evalGateLastRun.rollback.attempted ? (
              <div style={{ marginTop: 8, fontSize: 12, color: "var(--ink-1)" }}>
                自动回滚：{evalGateLastRun.rollback.success ? "成功" : "失败"} · 快照 {evalGateLastRun.rollback.snapshotId ?? "-"} · {evalGateLastRun.rollback.message}
              </div>
            ) : null}
          </div>
        ) : (
          <div style={{ fontSize: 12, color: "var(--ink-1)" }}>尚未执行过门禁。</div>
        )}

        {evalGateRuns.length ? (
          <div className="card">
            <div className="section-title">最近门禁记录</div>
            <div className="grid" style={{ gap: 8, marginTop: 8 }}>
              {evalGateRuns.slice(0, 6).map((run) => (
                <div key={run.id} style={runRowStyle}>
                  <div style={{ fontSize: 12, color: "var(--ink-1)" }}>
                    {new Date(run.executedAt).toLocaleString("zh-CN")} · {run.passed ? "通过" : "未通过"} · 通过率 {run.reportSummary.passRate}% · 高风险 {run.reportSummary.highRiskCount}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--ink-1)" }}>
                    {(run.config.datasets ?? []).map((dataset) => EVAL_DATASET_LABELS.get(dataset) ?? dataset).join("、")}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </Card>
  );
}
