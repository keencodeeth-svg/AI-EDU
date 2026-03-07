import Card from "@/components/Card";
import type { AssignmentAiReview } from "../types";

type AssignmentAiReviewCardProps = {
  aiReview: AssignmentAiReview;
};

export default function AssignmentAiReviewCard({ aiReview }: AssignmentAiReviewCardProps) {
  return (
    <Card title="AI 批改建议" tag="AI">
      <div className="card">
        <div className="section-title">评分</div>
        <div style={{ fontSize: 20, fontWeight: 700 }}>{aiReview.result?.score ?? 0} 分</div>
        <p style={{ marginTop: 8 }}>{aiReview.result?.summary ?? "暂无总结。"}</p>
      </div>
      {aiReview.result?.strengths?.length ? (
        <div className="grid" style={{ gap: 6, marginTop: 12 }}>
          <div className="badge">优点</div>
          {aiReview.result.strengths.map((item) => (
            <div key={item}>{item}</div>
          ))}
        </div>
      ) : null}
      {aiReview.result?.issues?.length ? (
        <div className="grid" style={{ gap: 6, marginTop: 12 }}>
          <div className="badge">问题</div>
          {aiReview.result.issues.map((item) => (
            <div key={item}>{item}</div>
          ))}
        </div>
      ) : null}
      {aiReview.result?.suggestions?.length ? (
        <div className="grid" style={{ gap: 6, marginTop: 12 }}>
          <div className="badge">建议</div>
          {aiReview.result.suggestions.map((item) => (
            <div key={item}>{item}</div>
          ))}
        </div>
      ) : null}
      {aiReview.result?.writing ? (
        <div className="card" style={{ marginTop: 12 }}>
          <div className="section-title">写作评分</div>
          <div className="pill-list" style={{ marginTop: 8 }}>
            <span className="pill">结构 {aiReview.result.writing.scores?.structure ?? 0}</span>
            <span className="pill">语法 {aiReview.result.writing.scores?.grammar ?? 0}</span>
            <span className="pill">词汇 {aiReview.result.writing.scores?.vocab ?? 0}</span>
          </div>
          <p style={{ marginTop: 8 }}>{aiReview.result.writing.summary ?? "暂无写作总结。"}</p>
          {aiReview.result.writing.strengths?.length ? (
            <div style={{ marginTop: 8 }}>
              <div className="section-title">写作优点</div>
              <ul style={{ margin: "6px 0 0 16px" }}>
                {aiReview.result.writing.strengths.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {aiReview.result.writing.improvements?.length ? (
            <div style={{ marginTop: 8 }}>
              <div className="section-title">改进建议</div>
              <ul style={{ margin: "6px 0 0 16px" }}>
                {aiReview.result.writing.improvements.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {aiReview.result.writing.corrected ? (
            <div style={{ marginTop: 8 }}>
              <div className="section-title">修改示例</div>
              <div style={{ whiteSpace: "pre-wrap" }}>{aiReview.result.writing.corrected}</div>
            </div>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
