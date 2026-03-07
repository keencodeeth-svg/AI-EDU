import type { Dispatch, FormEventHandler, SetStateAction } from "react";
import Card from "@/components/Card";
import MathText from "@/components/MathText";
import type { QuestionCheckFormState, QuestionCheckResult } from "../types";

const fieldStyle = {
  width: "100%",
  padding: 10,
  borderRadius: 10,
  border: "1px solid var(--stroke)"
} as const;

type TeacherQuestionCheckPanelProps = {
  checkForm: QuestionCheckFormState;
  setCheckForm: Dispatch<SetStateAction<QuestionCheckFormState>>;
  checkPreviewOptions: string[];
  hasCheckPreview: boolean;
  checkError: string | null;
  checkResult: QuestionCheckResult | null;
  loading: boolean;
  onCheckQuestion: FormEventHandler<HTMLFormElement>;
};

export default function TeacherQuestionCheckPanel({
  checkForm,
  setCheckForm,
  checkPreviewOptions,
  hasCheckPreview,
  checkError,
  checkResult,
  loading,
  onCheckQuestion
}: TeacherQuestionCheckPanelProps) {
  return (
    <Card title="AI 题库纠错" tag="质检">
      <form onSubmit={onCheckQuestion} style={{ display: "grid", gap: 12 }}>
        <label>
          <div className="section-title">题目 ID（可选，自动读取题库）</div>
          <input value={checkForm.questionId} onChange={(event) => setCheckForm((prev) => ({ ...prev, questionId: event.target.value }))} placeholder="q-xxx" style={fieldStyle} />
        </label>
        <label>
          <div className="section-title">题干</div>
          <textarea value={checkForm.stem} onChange={(event) => setCheckForm((prev) => ({ ...prev, stem: event.target.value }))} rows={3} placeholder="若不填写题目 ID，请手动填写题干" style={fieldStyle} />
        </label>
        <div className="grid grid-2">
          {checkForm.options.map((opt, index) => (
            <input
              key={`opt-${index}`}
              value={opt}
              onChange={(event) => {
                const next = [...checkForm.options];
                next[index] = event.target.value;
                setCheckForm((prev) => ({ ...prev, options: next }));
              }}
              placeholder={`选项 ${index + 1}`}
              style={fieldStyle}
            />
          ))}
        </div>
        <label>
          <div className="section-title">答案</div>
          <input value={checkForm.answer} onChange={(event) => setCheckForm((prev) => ({ ...prev, answer: event.target.value }))} placeholder="正确答案" style={fieldStyle} />
        </label>
        <label>
          <div className="section-title">解析</div>
          <textarea value={checkForm.explanation} onChange={(event) => setCheckForm((prev) => ({ ...prev, explanation: event.target.value }))} rows={2} placeholder="题目解析（可选）" style={fieldStyle} />
        </label>
        <button className="button primary" type="submit" disabled={loading}>
          {loading ? "检查中..." : "开始纠错"}
        </button>
      </form>

      {hasCheckPreview ? (
        <div className="card" style={{ marginTop: 12, display: "grid", gap: 8 }}>
          <div className="section-title">公式预览</div>
          <div>
            <div style={{ fontSize: 12, color: "var(--ink-1)" }}>题干</div>
            <MathText as="div" text={checkForm.stem || "（未填写）"} />
          </div>
          {checkPreviewOptions.length ? (
            <div>
              <div style={{ fontSize: 12, color: "var(--ink-1)" }}>选项</div>
              <ul style={{ margin: "6px 0 0 16px" }}>
                {checkPreviewOptions.map((item) => (
                  <li key={item}>
                    <MathText text={item} />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div>
            <div style={{ fontSize: 12, color: "var(--ink-1)" }}>答案</div>
            <MathText text={checkForm.answer || "（未填写）"} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: "var(--ink-1)" }}>解析</div>
            <MathText as="div" text={checkForm.explanation || "（未填写）"} />
          </div>
        </div>
      ) : null}
      {checkError ? <div className="status-note error" style={{ marginTop: 8 }}>{checkError}</div> : null}

      {checkResult ? (
        <div className="grid" style={{ gap: 8, marginTop: 12 }}>
          <div className="badge">风险等级：{checkResult.risk ?? "low"}</div>
          {checkResult.issues?.length ? (
            <ul style={{ margin: "6px 0 0 16px" }}>
              {checkResult.issues.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : (
            <p>未发现明显问题。</p>
          )}
          {checkResult.suggestedAnswer ? (
            <div>
              建议答案：<MathText text={checkResult.suggestedAnswer} />
            </div>
          ) : null}
          {checkResult.notes ? <div style={{ fontSize: 12 }}>{checkResult.notes}</div> : null}
        </div>
      ) : null}
    </Card>
  );
}
