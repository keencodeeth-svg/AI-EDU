import MathText from "@/components/MathText";
import type { TeacherAssignmentReviewItemState, TeacherAssignmentReviewQuestion } from "../types";
import { ASSIGNMENT_REVIEW_TAGS } from "../utils";

type AssignmentReviewQuestionFeedbackCardProps = {
  question: TeacherAssignmentReviewQuestion;
  index: number;
  itemState: TeacherAssignmentReviewItemState[string] | undefined;
  onWrongTagChange: (questionId: string, value: string) => void;
  onCommentChange: (questionId: string, value: string) => void;
};

export default function AssignmentReviewQuestionFeedbackCard({
  question,
  index,
  itemState,
  onWrongTagChange,
  onCommentChange
}: AssignmentReviewQuestionFeedbackCardProps) {
  return (
    <div className="card">
      <div className="section-title">
        {index + 1}. <MathText text={question.stem} showCopyActions />
      </div>
      <div className="pill-list" style={{ marginTop: 8 }}>
        <span className="pill">
          学生答案：<MathText text={question.answer || "未作答"} />
        </span>
        <span className="pill">
          正确答案：<MathText text={question.correctAnswer} />
        </span>
      </div>
      <p style={{ marginTop: 8 }}>
        解析：<MathText text={question.explanation} showCopyActions />
      </p>
      <label>
        <div className="section-title">错因标签</div>
        <select
          value={itemState?.wrongTag ?? ""}
          onChange={(event) => onWrongTagChange(question.id, event.target.value)}
          style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
        >
          <option value="">请选择</option>
          {ASSIGNMENT_REVIEW_TAGS.map((tag) => (
            <option key={tag} value={tag}>
              {tag}
            </option>
          ))}
        </select>
      </label>
      <label>
        <div className="section-title">点评</div>
        <textarea
          value={itemState?.comment ?? ""}
          onChange={(event) => onCommentChange(question.id, event.target.value)}
          rows={3}
          style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
        />
      </label>
    </div>
  );
}
