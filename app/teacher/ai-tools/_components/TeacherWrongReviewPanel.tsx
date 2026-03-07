import type { Dispatch, FormEventHandler, SetStateAction } from "react";
import Card from "@/components/Card";
import MathText from "@/components/MathText";
import { SUBJECT_LABELS } from "@/lib/constants";
import type { ClassItem, WrongReviewFormState, WrongReviewResult } from "../types";
import TeacherAiQualityCard from "./TeacherAiQualityCard";

const fieldStyle = {
  width: "100%",
  padding: 10,
  borderRadius: 10,
  border: "1px solid var(--stroke)"
} as const;

type TeacherWrongReviewPanelProps = {
  classes: ClassItem[];
  wrongForm: WrongReviewFormState;
  setWrongForm: Dispatch<SetStateAction<WrongReviewFormState>>;
  loading: boolean;
  wrongError: string | null;
  wrongResult: WrongReviewResult | null;
  onWrongReview: FormEventHandler<HTMLFormElement>;
};

export default function TeacherWrongReviewPanel({
  classes,
  wrongForm,
  setWrongForm,
  loading,
  wrongError,
  wrongResult,
  onWrongReview
}: TeacherWrongReviewPanelProps) {
  return (
    <Card title="AI 错题讲评课脚本" tag="讲评">
      <form onSubmit={onWrongReview} style={{ display: "grid", gap: 12 }}>
        <label>
          <div className="section-title">选择班级</div>
          <select value={wrongForm.classId} onChange={(event) => setWrongForm((prev) => ({ ...prev, classId: event.target.value }))} style={fieldStyle}>
            {classes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} · {SUBJECT_LABELS[item.subject] ?? item.subject} · {item.grade} 年级
              </option>
            ))}
          </select>
        </label>
        <label>
          <div className="section-title">统计范围（天）</div>
          <input
            type="number"
            min={3}
            max={60}
            value={wrongForm.rangeDays}
            onChange={(event) => setWrongForm((prev) => ({ ...prev, rangeDays: Number(event.target.value) }))}
            style={fieldStyle}
          />
        </label>
        <button className="button primary" type="submit" disabled={loading}>
          {loading ? "生成中..." : "生成讲评脚本"}
        </button>
      </form>
      {wrongError ? <div className="status-note error" style={{ marginTop: 8 }}>{wrongError}</div> : null}

      {wrongResult?.script ? (
        <div className="grid" style={{ gap: 12, marginTop: 12 }}>
          <div className="card">
            <div className="section-title">高频错题知识点</div>
            <ul style={{ margin: "8px 0 0 16px" }}>
              {wrongResult.wrongPoints?.map((item) => (
                <li key={item.kpId}>
                  {item.title} · 错题 {item.count} 次
                </li>
              ))}
            </ul>
          </div>
          <div className="card">
            <div className="section-title">讲评课流程</div>
            <ol style={{ margin: "8px 0 0 16px" }}>
              {wrongResult.script.agenda?.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
          </div>
          <div className="card">
            <div className="section-title">讲评话术</div>
            <div className="grid" style={{ gap: 8 }}>
              {wrongResult.script.script?.map((item) => (
                <MathText as="div" key={item} text={item} />
              ))}
            </div>
          </div>
          <div className="card">
            <div className="section-title">重点提醒</div>
            <ul style={{ margin: "8px 0 0 16px" }}>
              {wrongResult.script.reminders?.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <TeacherAiQualityCard payload={wrongResult} />
        </div>
      ) : null}
    </Card>
  );
}
