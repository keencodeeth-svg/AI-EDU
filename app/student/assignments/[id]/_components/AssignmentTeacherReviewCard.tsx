import Card from "@/components/Card";
import MathText from "@/components/MathText";
import type { AssignmentReviewItem, AssignmentReviewQuestion } from "../types";

type AssignmentTeacherReviewCardProps = {
  overallComment?: string;
  reviewItems: AssignmentReviewItem[];
  questions: AssignmentReviewQuestion[];
};

export default function AssignmentTeacherReviewCard({
  overallComment,
  reviewItems,
  questions
}: AssignmentTeacherReviewCardProps) {
  return (
    <Card title="老师点评" tag="点评">
      <p>{overallComment || "暂无总体点评"}</p>
      <div className="grid" style={{ gap: 12, marginTop: 12 }}>
        {reviewItems.map((item) => {
          const question = questions.find((questionItem) => questionItem.id === item.questionId);
          return (
            <div className="card" key={item.questionId}>
              <div className="section-title">
                <MathText text={question?.stem ?? "题目"} showCopyActions />
              </div>
              <div className="pill-list" style={{ marginTop: 8 }}>
                <span className="pill">错因标签：{item.wrongTag || "未标注"}</span>
              </div>
              <p style={{ marginTop: 8 }}>点评：{item.comment || "暂无"}</p>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
