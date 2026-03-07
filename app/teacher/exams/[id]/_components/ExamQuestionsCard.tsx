import Card from "@/components/Card";
import MathText from "@/components/MathText";
import type { ExamQuestion } from "../types";

type ExamQuestionsCardProps = {
  questions: ExamQuestion[];
};

export default function ExamQuestionsCard({ questions }: ExamQuestionsCardProps) {
  return (
    <Card title="题目清单" tag="试卷">
      {questions.length === 0 ? (
        <div className="empty-state">
          <p className="empty-state-title">暂无题目</p>
          <p>该考试暂未生成题目。</p>
        </div>
      ) : (
        <div className="grid" style={{ gap: 8 }}>
          {questions.map((question, index) => (
            <div className="card" key={question.id}>
              <div className="section-title">
                {index + 1}. <MathText text={question.stem} showCopyActions />
              </div>
              <div style={{ marginTop: 6, fontSize: 12, color: "var(--ink-1)" }}>分值：{question.score}</div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
