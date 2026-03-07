import type { FormEventHandler } from "react";
import Card from "@/components/Card";
import type {
  TeacherAssignmentReviewItemState,
  TeacherAssignmentReviewQuestion,
  TeacherAssignmentReviewRubricState,
  TeacherAssignmentRubric
} from "../types";
import AssignmentReviewQuestionFeedbackCard from "./AssignmentReviewQuestionFeedbackCard";
import AssignmentReviewRubricEditorCard from "./AssignmentReviewRubricEditorCard";

type AssignmentReviewFormCardProps = {
  isQuiz: boolean;
  isEssay: boolean;
  wrongQuestions: TeacherAssignmentReviewQuestion[];
  overallComment: string;
  itemState: TeacherAssignmentReviewItemState;
  rubricState: TeacherAssignmentReviewRubricState;
  rubrics: TeacherAssignmentRubric[];
  saving: boolean;
  message: string | null;
  error: string | null;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onOverallCommentChange: (value: string) => void;
  onQuestionWrongTagChange: (questionId: string, value: string) => void;
  onQuestionCommentChange: (questionId: string, value: string) => void;
  onRubricScoreChange: (rubricId: string, value: number) => void;
  onRubricCommentChange: (rubricId: string, value: string) => void;
};

export default function AssignmentReviewFormCard({
  isQuiz,
  isEssay,
  wrongQuestions,
  overallComment,
  itemState,
  rubricState,
  rubrics,
  saving,
  message,
  error,
  onSubmit,
  onOverallCommentChange,
  onQuestionWrongTagChange,
  onQuestionCommentChange,
  onRubricScoreChange,
  onRubricCommentChange
}: AssignmentReviewFormCardProps) {
  return (
    <Card title="错题复盘" tag="批改">
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 16 }}>
        {!isQuiz ? (
          <p>该作业为{isEssay ? "作文/主观题" : "上传作业"}，请结合附件与 AI 批改结果进行点评。</p>
        ) : wrongQuestions.length === 0 ? (
          <p>该学生全部答对，可补充总体点评。</p>
        ) : null}
        {isQuiz
          ? wrongQuestions.map((question, index) => (
              <AssignmentReviewQuestionFeedbackCard
                question={question}
                index={index}
                itemState={itemState[question.id]}
                key={question.id}
                onWrongTagChange={onQuestionWrongTagChange}
                onCommentChange={onQuestionCommentChange}
              />
            ))
          : null}
        <label>
          <div className="section-title">总体点评</div>
          <textarea
            value={overallComment}
            onChange={(event) => onOverallCommentChange(event.target.value)}
            rows={3}
            style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
          />
        </label>
        {rubrics.length ? (
          <div className="card" style={{ display: "grid", gap: 12 }}>
            <div className="section-title">评分维度（Rubric）</div>
            {rubrics.map((rubric) => (
              <AssignmentReviewRubricEditorCard
                rubric={rubric}
                rubricState={rubricState[rubric.id]}
                key={rubric.id}
                onScoreChange={onRubricScoreChange}
                onCommentChange={onRubricCommentChange}
              />
            ))}
          </div>
        ) : (
          <p style={{ color: "var(--ink-1)" }}>该作业暂无评分维度，可直接填写总体点评。</p>
        )}
        {message ? <div style={{ color: "#1a7f37", fontSize: 13 }}>{message}</div> : null}
        {error ? <div style={{ color: "#b42318", fontSize: 13 }}>{error}</div> : null}
        <button className="button primary" type="submit" disabled={saving}>
          {saving ? "保存中..." : "保存批改"}
        </button>
      </form>
    </Card>
  );
}
