import Card from "@/components/Card";
import MathText from "@/components/MathText";
import type { AssignmentQuestion, SubmitResult } from "../types";

type AssignmentQuizResultCardProps = {
  result: SubmitResult;
  questions: AssignmentQuestion[];
};

export default function AssignmentQuizResultCard({ result, questions }: AssignmentQuizResultCardProps) {
  return (
    <Card title="提交结果" tag="成绩">
      <div className="pill-list">
        <span className="pill">得分 {result.score}/{result.total}</span>
      </div>
      <div className="grid" style={{ gap: 12, marginTop: 12 }}>
        {result.details.map((detail) => {
          const question = questions.find((item) => item.id === detail.questionId);
          return (
            <div className="card" key={detail.questionId}>
              <div className="section-title">
                <MathText text={question?.stem ?? "题目"} showCopyActions />
              </div>
              <div className="pill-list" style={{ marginTop: 8 }}>
                <span className="pill">你的答案：<MathText text={detail.answer || "未作答"} /></span>
                <span className="pill">正确答案：<MathText text={detail.correctAnswer} /></span>
                <span className="pill">{detail.correct ? "回答正确" : "回答错误"}</span>
              </div>
              <p style={{ marginTop: 8 }}>解析：<MathText text={detail.explanation} showCopyActions /></p>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
