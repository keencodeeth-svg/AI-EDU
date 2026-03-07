import Card from "@/components/Card";

type AssignmentReviewSubmissionTextCardProps = {
  text: string;
  isEssay: boolean;
};

export default function AssignmentReviewSubmissionTextCard({
  text,
  isEssay
}: AssignmentReviewSubmissionTextCardProps) {
  return (
    <Card title={isEssay ? "作文内容" : "学生作答说明"} tag="文本">
      <div className="card">
        <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.7 }}>{text}</div>
      </div>
    </Card>
  );
}
