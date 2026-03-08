import Card from "@/components/Card";
import MathText from "@/components/MathText";
import type { Question } from "../types";

type PracticeQuestionCardProps = {
  question: Question;
  answer: string;
  favorite: { tags: string[] } | null;
  favoriteLoading: boolean;
  canSubmit: boolean;
  questionLoading: boolean;
  submitting: boolean;
  onAnswerChange: (value: string) => void;
  onToggleFavorite: () => void;
  onEditFavoriteTags: () => void;
  onLoadQuestion: () => void;
  onSubmit: () => void;
};

export default function PracticeQuestionCard({
  question,
  answer,
  favorite,
  favoriteLoading,
  canSubmit,
  questionLoading,
  submitting,
  onAnswerChange,
  onToggleFavorite,
  onEditFavoriteTags,
  onLoadQuestion,
  onSubmit
}: PracticeQuestionCardProps) {
  const actionBusy = questionLoading || submitting;

  return (
    <Card title="题目" tag="作答">
      <MathText as="p" text={question.stem} showCopyActions />
      {question.recommendation?.reason ? (
        <div className="practice-recommendation-note">
          推荐原因：{question.recommendation.reason}
          {typeof question.recommendation.weaknessRank === "number" ? `（薄弱度第 ${question.recommendation.weaknessRank} 位）` : ""}
        </div>
      ) : null}
      <div className="cta-row practice-favorite-row">
        <button className="button secondary" type="button" onClick={onToggleFavorite} disabled={favoriteLoading || actionBusy}>
          {favoriteLoading ? "处理中..." : favorite ? "已收藏" : "收藏"}
        </button>
        <button className="button secondary" type="button" onClick={onEditFavoriteTags} disabled={!favorite || actionBusy}>
          标签
        </button>
        {favorite?.tags?.length ? <div className="practice-tags-line">标签：{favorite.tags.join("、")}</div> : null}
      </div>
      <div className="grid practice-option-list">
        {question.options.map((option) => (
          <label className="card practice-option-card" key={option}>
            <input
              className="practice-option-radio"
              type="radio"
              name={question.id}
              checked={answer === option}
              onChange={() => onAnswerChange(option)}
              disabled={actionBusy}
            />
            <MathText text={option} />
          </label>
        ))}
      </div>
      <div className="practice-choice-status">
        {answer ? "已选择答案，可以直接提交。" : "先选择一个答案，再提交判题。"}
      </div>
      <div className="cta-row practice-question-actions">
        <button className="button secondary" type="button" onClick={onLoadQuestion} disabled={actionBusy}>
          {questionLoading ? "获取中..." : "换一题"}
        </button>
        <button className="button primary" type="button" onClick={onSubmit} disabled={!canSubmit || actionBusy} aria-busy={submitting}>
          {submitting ? "判题中..." : "提交答案"}
        </button>
      </div>
    </Card>
  );
}
