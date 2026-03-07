import Card from "@/components/Card";
import MathText from "@/components/MathText";
import type { ReviewQueueData, ReviewQueueItem } from "../types";
import { formatDateTime } from "../utils";

type WrongBookReviewQueueCardProps = {
  reviewQueue: ReviewQueueData | null;
  reviewAnswers: Record<string, string>;
  reviewSubmitting: Record<string, boolean>;
  reviewMessages: Record<string, string>;
  onReviewAnswerChange: (questionId: string, value: string) => void;
  onSubmitReview: (item: ReviewQueueItem) => void | Promise<void>;
};

export default function WrongBookReviewQueueCard({
  reviewQueue,
  reviewAnswers,
  reviewSubmitting,
  reviewMessages,
  onReviewAnswerChange,
  onSubmitReview
}: WrongBookReviewQueueCardProps) {
  return (
    <Card title="今日复练清单" tag="24h / 72h / 7d">
      <div className="grid grid-3">
        <div className="card">
          <div className="section-title">今日应复练</div>
          <p>{reviewQueue?.summary?.dueToday ?? 0} 题</p>
        </div>
        <div className="card">
          <div className="section-title">逾期</div>
          <p>{reviewQueue?.summary?.overdue ?? 0} 题</p>
        </div>
        <div className="card">
          <div className="section-title">后续排队</div>
          <p>{reviewQueue?.summary?.upcoming ?? 0} 题</p>
        </div>
      </div>

      <div className="grid" style={{ gap: 12, marginTop: 12 }}>
        {!reviewQueue?.today?.length ? <p>今日暂无到期复练，继续保持。</p> : null}
        {(reviewQueue?.today ?? []).map((item) => (
          <div className="card" key={item.id}>
            <div className="section-title">
              <MathText text={item.question?.stem ?? "题目已删除"} />
            </div>
            <div style={{ fontSize: 12, color: "var(--ink-1)", marginTop: 4 }}>
              节奏：{item.intervalLabel} · 应复练时间：{formatDateTime(item.nextReviewAt)}
            </div>
            {item.question?.options?.length ? (
              <div className="grid" style={{ gap: 8, marginTop: 10 }}>
                {item.question.options.map((option) => (
                  <label className="card" key={`${item.id}-${option}`} style={{ cursor: "pointer" }}>
                    <input
                      type="radio"
                      name={`review-${item.questionId}`}
                      checked={reviewAnswers[item.questionId] === option}
                      onChange={() => onReviewAnswerChange(item.questionId, option)}
                      style={{ marginRight: 8 }}
                    />
                    <MathText text={option} />
                  </label>
                ))}
              </div>
            ) : (
              <p style={{ marginTop: 10 }}>题目选项缺失，暂不可复练。</p>
            )}
            <div className="cta-row" style={{ marginTop: 10 }}>
              <button
                className="button primary"
                onClick={() => onSubmitReview(item)}
                disabled={!item.question?.options?.length || Boolean(reviewSubmitting[item.questionId])}
              >
                {reviewSubmitting[item.questionId] ? "提交中..." : "提交复练"}
              </button>
            </div>
            {reviewMessages[item.questionId] ? (
              <div style={{ marginTop: 8, fontSize: 12 }}>{reviewMessages[item.questionId]}</div>
            ) : null}
          </div>
        ))}
      </div>

      {reviewQueue?.upcoming?.length ? (
        <div className="grid" style={{ gap: 8, marginTop: 12 }}>
          <div className="section-title">后续复练排期</div>
          {reviewQueue.upcoming.slice(0, 5).map((item) => (
            <div key={`upcoming-${item.id}`} style={{ fontSize: 13, color: "var(--ink-1)" }}>
              <MathText text={item.question?.stem ?? item.questionId} /> · {item.intervalLabel} · {formatDateTime(item.nextReviewAt)}
            </div>
          ))}
        </div>
      ) : null}
    </Card>
  );
}
