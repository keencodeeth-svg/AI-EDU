import type { Dispatch, SetStateAction } from "react";
import Card from "@/components/Card";
import { EVAL_DATASET_OPTIONS } from "../utils";
import type {
  CalibrationDraft,
  EvalDatasetName,
  EvalReport,
  QualityCalibrationConfig,
  QualityCalibrationSnapshot
} from "../types";

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
const rowCardStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 8,
  padding: 10,
  borderRadius: 10,
  border: "1px solid var(--stroke)"
} as const;

type CalibrationPanelProps = {
  selectedEvalDatasets: EvalDatasetName[];
  evalLoading: boolean;
  saving: boolean;
  calibrationLoading: boolean;
  calibrationConfig: QualityCalibrationConfig | null;
  calibrationSnapshots: QualityCalibrationSnapshot[];
  calibrationDraft: CalibrationDraft;
  setCalibrationDraft: Dispatch<SetStateAction<CalibrationDraft>>;
  evalReport: EvalReport | null;
  onToggleEvalDataset: (dataset: EvalDatasetName) => void;
  onRunOfflineEval: () => void;
  onApplyEvalCalibrationSuggestion: () => void;
  onLoadCalibration: () => void;
  onSaveCalibrationRollout: () => void;
  onRollbackCalibration: (snapshotId: string) => void;
};

export default function CalibrationPanel({
  selectedEvalDatasets,
  evalLoading,
  saving,
  calibrationLoading,
  calibrationConfig,
  calibrationSnapshots,
  calibrationDraft,
  setCalibrationDraft,
  evalReport,
  onToggleEvalDataset,
  onRunOfflineEval,
  onApplyEvalCalibrationSuggestion,
  onLoadCalibration,
  onSaveCalibrationRollout,
  onRollbackCalibration
}: CalibrationPanelProps) {
  return (
    <Card title="离线评测与质量校准" tag="Eval">
      <div className="grid" style={{ gap: 10 }}>
        <div style={{ fontSize: 12, color: "var(--ink-1)" }}>选择数据集运行离线评测，系统会输出质量校准建议，可直接一键应用。</div>
        <div className="grid grid-3">
          {EVAL_DATASET_OPTIONS.map((dataset) => (
            <label key={dataset.key} style={datasetTileStyle}>
              <input type="checkbox" checked={selectedEvalDatasets.includes(dataset.key)} onChange={() => onToggleEvalDataset(dataset.key)} />
              <span>{dataset.label}</span>
            </label>
          ))}
        </div>
        <div className="cta-row">
          <button className="button secondary" type="button" onClick={onRunOfflineEval} disabled={evalLoading}>
            {evalLoading ? "评测中..." : "运行离线评测"}
          </button>
          <button className="button primary" type="button" onClick={onApplyEvalCalibrationSuggestion} disabled={saving || !evalReport}>
            应用评测校准建议
          </button>
          <button className="button ghost" type="button" onClick={onLoadCalibration} disabled={calibrationLoading}>
            {calibrationLoading ? "加载中..." : "刷新校准配置"}
          </button>
        </div>

        {calibrationConfig ? (
          <div className="grid" style={{ gap: 8 }}>
            <div className="card">
              <div className="section-title">当前质量校准</div>
              <div style={{ fontSize: 12, color: "var(--ink-1)", marginTop: 6 }}>
                全局偏置 {calibrationConfig.globalBias} · 开关 {calibrationConfig.enabled ? "开启" : "关闭"} · 灰度 {calibrationConfig.rolloutPercent}%
                · 更新时间 {calibrationConfig.updatedAt ? new Date(calibrationConfig.updatedAt).toLocaleString("zh-CN") : "-"}
              </div>
              <div className="pill-list" style={{ marginTop: 8 }}>
                {Object.entries(calibrationConfig.providerAdjustments ?? {}).map(([provider, bias]) => (
                  <span className="pill" key={`provider-${provider}`}>
                    {provider}: {bias}
                  </span>
                ))}
                {!Object.keys(calibrationConfig.providerAdjustments ?? {}).length ? <span className="pill">provider 无额外校准</span> : null}
              </div>
              <div className="pill-list" style={{ marginTop: 8 }}>
                {Object.entries(calibrationConfig.kindAdjustments ?? {}).map(([kind, bias]) => (
                  <span className="pill" key={`kind-${kind}`}>
                    {kind}: {bias}
                  </span>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="section-title">灰度开关与回滚保护</div>
              <div className="grid grid-3" style={{ marginTop: 8 }}>
                <label style={{ fontSize: 12 }}>
                  <div className="section-title">校准开关</div>
                  <select
                    value={calibrationDraft.enabled ? "enabled" : "disabled"}
                    onChange={(event) => setCalibrationDraft((prev) => ({ ...prev, enabled: event.target.value === "enabled" }))}
                    style={fieldStyle}
                  >
                    <option value="enabled">开启</option>
                    <option value="disabled">关闭</option>
                  </select>
                </label>
                <label style={{ fontSize: 12 }}>
                  <div className="section-title">灰度比例（%）</div>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={calibrationDraft.rolloutPercent}
                    onChange={(event) =>
                      setCalibrationDraft((prev) => ({
                        ...prev,
                        rolloutPercent: Number(event.target.value || 0)
                      }))
                    }
                    style={fieldStyle}
                  />
                </label>
                <label style={{ fontSize: 12 }}>
                  <div className="section-title">灰度盐值</div>
                  <input
                    value={calibrationDraft.rolloutSalt}
                    onChange={(event) => setCalibrationDraft((prev) => ({ ...prev, rolloutSalt: event.target.value }))}
                    placeholder="default"
                    style={fieldStyle}
                  />
                </label>
              </div>
              <div className="cta-row" style={{ marginTop: 10 }}>
                <button className="button secondary" type="button" onClick={onSaveCalibrationRollout} disabled={saving}>
                  保存灰度配置
                </button>
              </div>
            </div>

            <div className="card">
              <div className="section-title">最近快照（可回滚）</div>
              {calibrationSnapshots.length ? (
                <div className="grid" style={{ gap: 8, marginTop: 8 }}>
                  {calibrationSnapshots.slice(0, 6).map((item) => (
                    <div key={item.id} style={rowCardStyle}>
                      <div style={{ fontSize: 12, color: "var(--ink-1)" }}>
                        {new Date(item.createdAt).toLocaleString("zh-CN")} · {item.reason} · 偏置 {item.config.globalBias} · 灰度 {item.config.rolloutPercent}%
                      </div>
                      <button className="button ghost" type="button" onClick={() => onRollbackCalibration(item.id)} disabled={saving}>
                        回滚到此版本
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: "var(--ink-1)", marginTop: 8 }}>暂无快照记录。</div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 12, color: "var(--ink-1)" }}>尚未加载校准配置。</div>
        )}

        {evalReport ? (
          <div className="grid" style={{ gap: 8 }}>
            <div className="pill-list">
              <span className="pill">样本 {evalReport.summary.totalCases}</span>
              <span className="pill">通过率 {evalReport.summary.passRate}%</span>
              <span className="pill">均分 {evalReport.summary.averageScore}</span>
              <span className="pill">高风险 {evalReport.summary.highRiskCount}</span>
              <span className="pill">建议偏置 {evalReport.summary.calibrationSuggestion.recommendedGlobalBias}</span>
            </div>
            <div style={{ fontSize: 12, color: "var(--ink-1)" }}>
              评测时间：{new Date(evalReport.generatedAt).toLocaleString("zh-CN")} · 建议说明：{evalReport.summary.calibrationSuggestion.note}
            </div>
            <div className="grid" style={{ gap: 8 }}>
              {evalReport.datasets.map((dataset) => (
                <div className="card" key={dataset.dataset}>
                  <div className="section-title">{dataset.dataset}</div>
                  <div style={{ fontSize: 12, color: "var(--ink-1)" }}>
                    样本 {dataset.total} · 通过 {dataset.passed} · 通过率 {dataset.passRate}% · 均分 {dataset.averageScore} · 高风险 {dataset.highRiskCount}
                  </div>
                </div>
              ))}
            </div>
            <div className="card" style={{ fontSize: 12, color: "var(--ink-1)" }}>
              <div>建议 provider 校准：{JSON.stringify(evalReport.summary.calibrationSuggestion.providerAdjustments)}</div>
              <div style={{ marginTop: 4 }}>建议 kind 校准：{JSON.stringify(evalReport.summary.calibrationSuggestion.kindAdjustments)}</div>
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 12, color: "var(--ink-1)" }}>尚未运行离线评测。</div>
        )}
      </div>
    </Card>
  );
}
