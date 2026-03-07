import type { Dispatch, SetStateAction } from "react";
import Card from "@/components/Card";
import type { PolicyDraft, TaskOption, TaskPolicy } from "../types";

const fieldStyle = {
  width: "100%",
  padding: 10,
  borderRadius: 10,
  border: "1px solid var(--stroke)"
} as const;

type TaskPoliciesPanelProps = {
  taskOptions: TaskOption[];
  selectedTaskType: string;
  setSelectedTaskType: Dispatch<SetStateAction<string>>;
  policyDraft: PolicyDraft;
  setPolicyDraft: Dispatch<SetStateAction<PolicyDraft>>;
  selectedTaskPolicy: TaskPolicy | null;
  saving: boolean;
  onSaveTaskPolicy: () => void;
  onResetTaskPolicy: () => void;
};

export default function TaskPoliciesPanel({
  taskOptions,
  selectedTaskType,
  setSelectedTaskType,
  policyDraft,
  setPolicyDraft,
  selectedTaskPolicy,
  saving,
  onSaveTaskPolicy,
  onResetTaskPolicy
}: TaskPoliciesPanelProps) {
  return (
    <Card title="任务策略" tag="Policy">
      <div className="grid" style={{ gap: 10 }}>
        <div className="grid grid-3">
          <label>
            <div className="section-title">任务类型</div>
            <select value={selectedTaskType} onChange={(event) => setSelectedTaskType(event.target.value)} style={fieldStyle}>
              {taskOptions.map((item) => (
                <option key={item.taskType} value={item.taskType}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <div className="section-title">超时(ms)</div>
            <input
              type="number"
              min={500}
              max={30000}
              value={policyDraft.timeoutMs}
              onChange={(event) => setPolicyDraft((prev) => ({ ...prev, timeoutMs: Number(event.target.value || 0) }))}
              style={fieldStyle}
            />
          </label>
          <label>
            <div className="section-title">重试次数</div>
            <input
              type="number"
              min={0}
              max={5}
              value={policyDraft.maxRetries}
              onChange={(event) => setPolicyDraft((prev) => ({ ...prev, maxRetries: Number(event.target.value || 0) }))}
              style={fieldStyle}
            />
          </label>
        </div>
        <div className="grid grid-2">
          <label>
            <div className="section-title">预算阈值（字符）</div>
            <input
              type="number"
              min={100}
              max={100000}
              value={policyDraft.budgetLimit}
              onChange={(event) => setPolicyDraft((prev) => ({ ...prev, budgetLimit: Number(event.target.value || 0) }))}
              style={fieldStyle}
            />
          </label>
          <label>
            <div className="section-title">最低质量分</div>
            <input
              type="number"
              min={0}
              max={100}
              value={policyDraft.minQualityScore}
              onChange={(event) => setPolicyDraft((prev) => ({ ...prev, minQualityScore: Number(event.target.value || 0) }))}
              style={fieldStyle}
            />
          </label>
        </div>
        <label>
          <div className="section-title">任务模型链（逗号分隔，空值=跟随全局模型链）</div>
          <input
            value={policyDraft.providerChain}
            onChange={(event) => setPolicyDraft((prev) => ({ ...prev, providerChain: event.target.value }))}
            placeholder="zhipu,deepseek,kimi"
            style={fieldStyle}
          />
        </label>
        {selectedTaskPolicy ? (
          <div className="card" style={{ fontSize: 12, color: "var(--ink-1)" }}>
            当前策略来源：{selectedTaskPolicy.source === "runtime" ? "运行时覆盖" : "默认策略"} · 生效链：
            {selectedTaskPolicy.providerChain.join(" -> ")} · 更新时间：
            {selectedTaskPolicy.updatedAt ? new Date(selectedTaskPolicy.updatedAt).toLocaleString("zh-CN") : "-"}
          </div>
        ) : null}
        <div className="cta-row">
          <button className="button primary" type="button" onClick={onSaveTaskPolicy} disabled={saving}>
            保存任务策略
          </button>
          <button className="button ghost" type="button" onClick={onResetTaskPolicy} disabled={saving}>
            重置当前任务
          </button>
        </div>
      </div>
    </Card>
  );
}
