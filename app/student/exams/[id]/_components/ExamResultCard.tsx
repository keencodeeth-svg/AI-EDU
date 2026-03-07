import Card from "@/components/Card";
import MathText from "@/components/MathText";
import type { SubmitResultDetail } from "../types";

type ExamResultCardProps = {
  details: SubmitResultDetail[];
};

export default function ExamResultCard({ details }: ExamResultCardProps) {
  if (!details.length) return null;

  return (
    <Card title="答题结果" tag="反馈">
      <div className="grid" style={{ gap: 8 }}>
        {details.map((item, index) => (
          <div className="card" key={item.questionId}>
            <div className="section-title">
              {index + 1}. {item.correct ? "正确" : "错误"}
            </div>
            <div style={{ fontSize: 12, color: "var(--ink-1)" }}>
              你的答案：<MathText text={item.answer || "未作答"} />；正确答案：<MathText text={item.correctAnswer} />；分值：{item.score}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
