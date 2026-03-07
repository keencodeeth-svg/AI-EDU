import Link from "next/link";
import Card from "@/components/Card";
import type { ReviewPack, ReviewPackSummary } from "../types";

type ExamReviewPackCardProps = {
  reviewPackLoading: boolean;
  reviewPack: ReviewPack | null;
  reviewPackSummary: ReviewPackSummary | null;
  onLoadReviewPack: () => void;
};

export default function ExamReviewPackCard({ reviewPackLoading, reviewPack, reviewPackSummary, onLoadReviewPack }: ExamReviewPackCardProps) {
  if (!reviewPackLoading && !reviewPack && !reviewPackSummary) return null;

  return (
    <Card title="考试复盘包" tag="闭环">
      {reviewPackLoading ? <p>复盘包加载中...</p> : null}
      {!reviewPackLoading && !reviewPack ? (
        <div className="grid" style={{ gap: 8 }}>
          <p>
            系统已生成复盘摘要：错题 {reviewPackSummary?.wrongCount ?? 0} 题，预计 {reviewPackSummary?.estimatedMinutes ?? 0} 分钟。
          </p>
          <div className="cta-row">
            <button className="button secondary" type="button" onClick={onLoadReviewPack}>
              加载完整复盘包
            </button>
          </div>
        </div>
      ) : null}
      {reviewPack ? (
        <div className="grid" style={{ gap: 10 }}>
          <div className="grid grid-3">
            <div className="card">
              <div className="section-title">错题总数</div>
              <p>{reviewPack.wrongCount}</p>
            </div>
            <div className="card">
              <div className="section-title">预计复盘时长</div>
              <p>{reviewPack.summary.estimatedMinutes} 分钟</p>
            </div>
            <div className="card">
              <div className="section-title">生成时间</div>
              <p style={{ fontSize: 13 }}>{new Date(reviewPack.generatedAt).toLocaleString("zh-CN")}</p>
            </div>
          </div>

          <div className="card">
            <div className="section-title">核心错因</div>
            <div className="grid" style={{ gap: 6 }}>
              {reviewPack.rootCauses.length ? (
                reviewPack.rootCauses.map((cause, index) => (
                  <div key={`cause-${index}`} style={{ fontSize: 13, color: "var(--ink-1)" }}>
                    {index + 1}. {cause}
                  </div>
                ))
              ) : (
                <div style={{ fontSize: 13, color: "var(--ink-1)" }}>暂无错因分析。</div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="section-title">薄弱知识点</div>
            <div className="grid" style={{ gap: 6 }}>
              {reviewPack.summary.topWeakKnowledgePoints.length ? (
                reviewPack.summary.topWeakKnowledgePoints.map((item) => (
                  <div key={item.knowledgePointId} style={{ fontSize: 13, color: "var(--ink-1)" }}>
                    {item.title} · 错题 {item.wrongCount}
                  </div>
                ))
              ) : (
                <div style={{ fontSize: 13, color: "var(--ink-1)" }}>暂无聚类薄弱点。</div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="section-title">推荐动作</div>
            <div className="grid" style={{ gap: 8 }}>
              {reviewPack.actionItems.map((item) => (
                <div key={item.id} style={{ fontSize: 13 }}>
                  <strong>{item.title}</strong> · {item.estimatedMinutes} 分钟
                  <div style={{ color: "var(--ink-1)" }}>{item.description}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="section-title">7 日修复计划</div>
            <div className="grid" style={{ gap: 6 }}>
              {reviewPack.sevenDayPlan.map((item) => (
                <div key={`day-${item.day}`} style={{ fontSize: 13 }}>
                  D{item.day} · {item.title} · {item.estimatedMinutes} 分钟
                  <div style={{ color: "var(--ink-1)" }}>{item.focus}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="cta-row">
            <Link className="button secondary" href="/wrong-book">
              打开今日复练清单
            </Link>
            <Link className="button ghost" href="/practice?mode=review">
              进入错题复练
            </Link>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
