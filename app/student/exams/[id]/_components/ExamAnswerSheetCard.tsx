import type { FormEventHandler } from "react";
import Card from "@/components/Card";
import MathText from "@/components/MathText";
import type { ExamDetail } from "../types";

type ExamAnswerSheetCardProps = {
  data: ExamDetail;
  answers: Record<string, string>;
  submitted: boolean;
  lockedByTime: boolean;
  lockedByServer: boolean;
  submitting: boolean;
  online: boolean;
  lockReason: string | null;
  finalScore: number;
  finalTotal: number;
  queuedReviewCount?: number;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onAnswerChange: (questionId: string, value: string) => void;
};

export default function ExamAnswerSheetCard({
  data,
  answers,
  submitted,
  lockedByTime,
  lockedByServer,
  submitting,
  online,
  lockReason,
  finalScore,
  finalTotal,
  queuedReviewCount,
  onSubmit,
  onAnswerChange
}: ExamAnswerSheetCardProps) {
  return (
    <Card title="考试作答" tag="作答">
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 14 }}>
        {data.questions.map((question, index) => (
          <div className="card" key={question.id}>
            <div className="section-title">
              {index + 1}. <MathText text={question.stem} showCopyActions />
            </div>
            <div style={{ marginTop: 6, display: "grid", gap: 6 }}>
              {question.options.map((option, optionIndex) => (
                <label key={`${question.id}-${optionIndex}`} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type="radio"
                    name={question.id}
                    value={option}
                    checked={answers[question.id] === option}
                    disabled={submitted || lockedByTime || lockedByServer || submitting}
                    onChange={(event) => onAnswerChange(question.id, event.target.value)}
                  />
                  <MathText text={option} />
                </label>
              ))}
            </div>
            <div style={{ marginTop: 6, fontSize: 12, color: "var(--ink-1)" }}>分值：{question.score}</div>
          </div>
        ))}

        {submitted ? (
          <div className="card">
            <div className="section-title">考试已提交</div>
            <p>你的成绩：{finalScore}/{finalTotal}</p>
            <div style={{ fontSize: 12, color: "var(--ink-1)" }}>
              提交时间：{data.assignment.submittedAt ? new Date(data.assignment.submittedAt).toLocaleString("zh-CN") : "-"}
            </div>
            {queuedReviewCount ? <div style={{ marginTop: 6, fontSize: 12, color: "var(--ink-1)" }}>错题已加入今日复练清单：{queuedReviewCount} 题</div> : null}
          </div>
        ) : (
          <button className="button primary" type="submit" disabled={submitting || !online || lockedByServer}>
            {submitting
              ? "提交中..."
              : !online
                ? "离线状态不可提交"
                : lockedByServer
                  ? lockReason ?? "当前不可提交"
                  : lockedByTime
                    ? "时间已结束，立即提交"
                    : "提交考试"}
          </button>
        )}
      </form>
    </Card>
  );
}
