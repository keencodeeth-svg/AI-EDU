import { aiRiskLabel } from "../utils";
import type { TeacherAiQualityPayload } from "../types";

type TeacherAiQualityCardProps = {
  payload: TeacherAiQualityPayload | null | undefined;
};

export default function TeacherAiQualityCard({ payload }: TeacherAiQualityCardProps) {
  const quality = payload?.quality;
  if (!quality) return null;

  return (
    <div className="card">
      <div className="section-title">AI 质控</div>
      <div className="pill-list" style={{ marginTop: 6 }}>
        <span className="pill">置信度 {quality.confidenceScore ?? 0}</span>
        <span className="pill">风险 {aiRiskLabel(quality.riskLevel)}</span>
        <span className="pill">{quality.needsHumanReview ? "需人工复核" : "可直接使用"}</span>
      </div>
      <div style={{ marginTop: 8, fontSize: 12, color: "var(--ink-1)" }}>兜底建议：{quality.fallbackAction || "可直接使用。"}</div>
      {payload?.manualReviewRule ? <div style={{ marginTop: 6, fontSize: 12, color: "#b54708" }}>{payload.manualReviewRule}</div> : null}
      {quality.reasons?.length ? (
        <ul style={{ margin: "8px 0 0 16px" }}>
          {quality.reasons.map((item, index) => (
            <li key={`${item}-${index}`}>{item}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
