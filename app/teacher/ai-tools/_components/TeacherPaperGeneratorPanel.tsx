import type { Dispatch, FormEventHandler, SetStateAction } from "react";
import Card from "@/components/Card";
import MathText from "@/components/MathText";
import { SUBJECT_LABELS } from "@/lib/constants";
import type {
  ClassItem,
  KnowledgePoint,
  PaperFormState,
  PaperGenerationResult,
  PaperQuickFixAction
} from "../types";

const fieldStyle = {
  width: "100%",
  padding: 10,
  borderRadius: 10,
  border: "1px solid var(--stroke)"
} as const;

type TeacherPaperGeneratorPanelProps = {
  classes: ClassItem[];
  paperForm: PaperFormState;
  setPaperForm: Dispatch<SetStateAction<PaperFormState>>;
  paperPoints: KnowledgePoint[];
  loading: boolean;
  paperAutoFixing: boolean;
  paperAutoFixHint: string | null;
  paperResult: PaperGenerationResult | null;
  paperError: string | null;
  paperErrorSuggestions: string[];
  onGeneratePaper: FormEventHandler<HTMLFormElement>;
  onApplyPaperQuickFix: (action: PaperQuickFixAction) => void;
};

export default function TeacherPaperGeneratorPanel({
  classes,
  paperForm,
  setPaperForm,
  paperPoints,
  loading,
  paperAutoFixing,
  paperAutoFixHint,
  paperResult,
  paperError,
  paperErrorSuggestions,
  onGeneratePaper,
  onApplyPaperQuickFix
}: TeacherPaperGeneratorPanelProps) {
  return (
    <Card title="AI 组卷" tag="组卷">
      <form onSubmit={onGeneratePaper} style={{ display: "grid", gap: 12 }}>
        <label>
          <div className="section-title">选择班级</div>
          <select
            value={paperForm.classId}
            onChange={(event) => setPaperForm((prev) => ({ ...prev, classId: event.target.value, knowledgePointIds: [] }))}
            style={fieldStyle}
          >
            {classes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} · {SUBJECT_LABELS[item.subject] ?? item.subject} · {item.grade} 年级
              </option>
            ))}
          </select>
        </label>
        <label>
          <div className="section-title">知识点（可多选）</div>
          <select
            multiple
            value={paperForm.knowledgePointIds}
            onChange={(event) =>
              setPaperForm((prev) => ({
                ...prev,
                knowledgePointIds: Array.from(event.target.selectedOptions).map((opt) => opt.value)
              }))
            }
            style={{ ...fieldStyle, height: 140 }}
          >
            {paperPoints.map((item) => (
              <option key={item.id} value={item.id}>
                {item.unit ? `${item.unit} / ` : ""}
                {item.chapter} · {item.title}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-2">
          <label>
            <div className="section-title">难度</div>
            <select
              value={paperForm.difficulty}
              onChange={(event) =>
                setPaperForm((prev) => ({
                  ...prev,
                  difficulty: event.target.value as PaperFormState["difficulty"]
                }))
              }
              style={fieldStyle}
            >
              <option value="all">不限</option>
              <option value="easy">简单</option>
              <option value="medium">中等</option>
              <option value="hard">较难</option>
            </select>
          </label>
          <label>
            <div className="section-title">题型</div>
            <select
              value={paperForm.questionType}
              onChange={(event) =>
                setPaperForm((prev) => ({
                  ...prev,
                  questionType: event.target.value as PaperFormState["questionType"]
                }))
              }
              style={fieldStyle}
            >
              <option value="all">不限</option>
              <option value="choice">选择题</option>
              <option value="application">应用题</option>
              <option value="calculation">计算题</option>
            </select>
          </label>
        </div>
        <div className="grid grid-3">
          <label>
            <div className="section-title">考试时长（分钟）</div>
            <input
              type="number"
              min={10}
              max={120}
              value={paperForm.durationMinutes}
              onChange={(event) => setPaperForm((prev) => ({ ...prev, durationMinutes: Number(event.target.value) }))}
              style={fieldStyle}
            />
          </label>
          <label>
            <div className="section-title">题目数量（可选）</div>
            <input
              type="number"
              min={0}
              max={50}
              value={paperForm.questionCount}
              onChange={(event) => setPaperForm((prev) => ({ ...prev, questionCount: Number(event.target.value) }))}
              style={fieldStyle}
            />
          </label>
          <label>
            <div className="section-title">出题方式</div>
            <select
              value={paperForm.mode}
              onChange={(event) => setPaperForm((prev) => ({ ...prev, mode: event.target.value as PaperFormState["mode"] }))}
              style={fieldStyle}
            >
              <option value="bank">题库抽题</option>
              <option value="ai">AI 生成</option>
            </select>
          </label>
        </div>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <input
            type="checkbox"
            checked={paperForm.includeIsolated}
            onChange={(event) => setPaperForm((prev) => ({ ...prev, includeIsolated: event.target.checked }))}
          />
          <span>允许使用隔离池高风险题（默认关闭）</span>
        </label>
        <button className="button primary" type="submit" disabled={loading}>
          {loading ? "生成中..." : "生成试卷"}
        </button>
      </form>

      {paperAutoFixHint ? <div className="status-note info">{paperAutoFixHint}</div> : null}

      {paperResult ? (
        <div style={{ marginTop: 12 }} className="grid" aria-live="polite">
          <div className="badge">生成题目 {paperResult.count} / 目标 {paperResult.requestedCount ?? paperResult.count} 道</div>
          {paperResult.diagnostics ? (
            <div className="pill-list">
              <span className="pill">选题阶段：{paperResult.diagnostics.selectedStageLabel ?? "未知"}</span>
              <span className="pill">Bank 命中 {paperResult.diagnostics.generation?.bankSelectedCount ?? 0}</span>
              <span className="pill">AI 尝试 {paperResult.diagnostics.generation?.aiAttemptedCount ?? 0}</span>
              <span className="pill">AI 生成 {paperResult.diagnostics.generation?.aiGeneratedCount ?? 0}</span>
              {paperResult.diagnostics.generation?.ruleFallbackCount ? <span className="pill">规则兜底 {paperResult.diagnostics.generation.ruleFallbackCount}</span> : null}
            </div>
          ) : null}
          {paperResult.qualityGovernance ? (
            <div className="pill-list">
              <span className="pill">可用题池 {paperResult.qualityGovernance.activePoolCount}</span>
              {typeof paperResult.qualityGovernance.totalPoolCount === "number" ? <span className="pill">总题池 {paperResult.qualityGovernance.totalPoolCount}</span> : null}
              <span className="pill">隔离池总量 {paperResult.qualityGovernance.isolatedPoolCount}</span>
              <span className="pill">本次排除 {paperResult.qualityGovernance.isolatedExcludedCount}</span>
              <span className="pill">{paperResult.qualityGovernance.includeIsolated ? "允许隔离池" : "排除隔离池"}</span>
              {paperResult.qualityGovernance.shortfallCount ? <span className="pill">缺口 {paperResult.qualityGovernance.shortfallCount}</span> : null}
              {paperResult.qualityGovernance.qualityGovernanceDegraded ? <span className="pill">质检降级（质量表不可用）</span> : null}
            </div>
          ) : null}
          {paperResult.diagnostics?.stageTrail?.length ? (
            <div className="card">
              <div className="section-title">筛选放宽轨迹</div>
              <div className="grid" style={{ gap: 6, marginTop: 8 }}>
                {paperResult.diagnostics.stageTrail.map((stage) => (
                  <div key={stage.stage} style={{ fontSize: 12, color: "var(--ink-1)" }}>
                    {stage.label}：总题池 {stage.totalPoolCount}，可用 {stage.activePoolCount}，排除隔离池 {stage.isolatedExcludedCount}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          {paperResult.diagnostics?.suggestions?.length ? (
            <div className="card">
              <div className="section-title">系统建议</div>
              <ul style={{ margin: "8px 0 0 16px" }}>
                {paperResult.diagnostics.suggestions.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <div className="cta-row" style={{ marginTop: 8 }}>
                <button className="button secondary" type="button" disabled={paperAutoFixing || loading} onClick={() => onApplyPaperQuickFix("clear_filters")}>
                  清空筛选并重试
                </button>
                <button className="button secondary" type="button" disabled={paperAutoFixing || loading} onClick={() => onApplyPaperQuickFix("switch_ai")}>
                  切换 AI 补题重试
                </button>
                <button className="button secondary" type="button" disabled={paperAutoFixing || loading} onClick={() => onApplyPaperQuickFix("reduce_count")}>
                  降低题量重试
                </button>
              </div>
            </div>
          ) : null}
          <div className="grid" style={{ gap: 10, marginTop: 10 }}>
            {paperResult.questions.map((item, index) => (
              <div className="card" key={item.id}>
                <div className="section-title">
                  {index + 1}. <MathText text={item.stem} />
                </div>
                <div style={{ fontSize: 12, color: "var(--ink-1)" }}>
                  {item.unit ? `${item.unit} / ` : ""}
                  {item.chapter} · {item.knowledgePointTitle} · {item.source === "ai" ? "AI 生成" : "题库"}
                </div>
                <ul style={{ margin: "8px 0 0 16px" }}>
                  {item.options.map((opt, optionIndex) => (
                    <li key={`${item.id}-${optionIndex}`}>
                      <MathText text={opt} />
                    </li>
                  ))}
                </ul>
                <div style={{ marginTop: 6, fontSize: 12 }}>
                  答案：<MathText text={item.answer} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {paperError ? <div className="status-note error">{paperError}</div> : null}
      {paperErrorSuggestions.length ? (
        <div className="card" style={{ marginTop: 8 }}>
          <div className="section-title">排查建议</div>
          <ul style={{ margin: "8px 0 0 16px" }}>
            {paperErrorSuggestions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <div className="cta-row" style={{ marginTop: 8 }}>
            <button className="button secondary" type="button" disabled={paperAutoFixing || loading} onClick={() => onApplyPaperQuickFix("clear_filters")}>
              一键清空筛选并重试
            </button>
            <button className="button secondary" type="button" disabled={paperAutoFixing || loading} onClick={() => onApplyPaperQuickFix("reduce_count")}>
              一键降低题量并重试
            </button>
            <button className="button ghost" type="button" disabled={paperAutoFixing || loading} onClick={() => onApplyPaperQuickFix("allow_isolated")}>
              开启隔离池重试
            </button>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
