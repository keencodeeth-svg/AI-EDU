import Card from "@/components/Card";
import MathText from "@/components/MathText";
import type { AssignmentReviewQuestion } from "../types";

type AssignmentWrongQuestionsCardProps = {
  questions: AssignmentReviewQuestion[];
};

export default function AssignmentWrongQuestionsCard({ questions }: AssignmentWrongQuestionsCardProps) {
  const wrongQuestions = questions.filter((item) => !item.correct);

  return (
    <Card title="错题复盘" tag="复盘">
      <div className="grid" style={{ gap: 12 }}>
        {wrongQuestions.map((item) => (
          <div className="card" key={item.id}>
            <div className="section-title">
              <MathText text={item.stem} showCopyActions />
            </div>
            <div className="pill-list" style={{ marginTop: 8 }}>
              <span className="pill">你的答案：<MathText text={item.answer || "未作答"} /></span>
              <span className="pill">正确答案：<MathText text={item.correctAnswer} /></span>
            </div>
            <p style={{ marginTop: 8 }}>解析：<MathText text={item.explanation} showCopyActions /></p>
          </div>
        ))}
      </div>
    </Card>
  );
}
