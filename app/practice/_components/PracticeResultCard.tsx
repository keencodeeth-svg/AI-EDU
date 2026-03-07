import Card from "@/components/Card";
import MathText from "@/components/MathText";
import type { ExplainPack, PracticeResult } from "../types";

type PracticeResultCardProps = {
  result: PracticeResult;
  explainMode: "text" | "visual" | "analogy";
  explainPack: ExplainPack | null;
  explainLoading: boolean;
  loadingVariants: boolean;
  onExplainModeChange: (value: "text" | "visual" | "analogy") => void;
  onLoadVariants: () => void;
};

export default function PracticeResultCard({
  result,
  explainMode,
  explainPack,
  explainLoading,
  loadingVariants,
  onExplainModeChange,
  onLoadVariants
}: PracticeResultCardProps) {
  return (
    <Card title="解析" tag="讲解">
      <div className="badge practice-result-badge">{result.correct ? "回答正确" : "回答错误"}</div>
      <p className="practice-answer-line">
        正确答案：<MathText text={result.answer} />
      </p>
      <div className="pill-list practice-metrics-list">
        <span className="pill">掌握度 {result.masteryScore ?? 0}</span>
        <span className="pill">
          变化 {result.masteryDelta && result.masteryDelta > 0 ? "+" : ""}
          {result.masteryDelta ?? 0}
        </span>
        <span className="pill">置信度 {result.confidenceScore ?? 0}</span>
        <span className="pill">近期权重 {result.recencyWeight ?? 0}</span>
        <span className="pill">
          趋势 {result.masteryTrend7d && result.masteryTrend7d > 0 ? "+" : ""}
          {result.masteryTrend7d ?? 0}
        </span>
        {typeof result.weaknessRank === "number" ? <span className="pill">薄弱度第 {result.weaknessRank} 位</span> : null}
      </div>
      <div className="cta-row practice-explain-switch">
        <button className="button secondary" type="button" onClick={() => onExplainModeChange("text")}>
          文字版
        </button>
        <button className="button secondary" type="button" onClick={() => onExplainModeChange("visual")}>
          图解版
        </button>
        <button className="button secondary" type="button" onClick={() => onExplainModeChange("analogy")}>
          类比版
        </button>
      </div>
      <details className="practice-collapsible" open>
        <summary>AI 讲解内容</summary>
        <div className="practice-collapsible-body">
          {explainLoading ? (
            <div className="practice-loading-text">解析生成中...</div>
          ) : (
            <MathText as="div" className="explain-content" text={explainPack ? explainPack[explainMode] : result.explanation} showCopyActions />
          )}
        </div>
      </details>
      {typeof result.masteryScore === "number" ? (
        <div className="practice-info-line">
          当前知识点掌握分：{result.masteryScore}
          {typeof result.masteryDelta === "number" ? `（${result.masteryDelta >= 0 ? "+" : ""}${result.masteryDelta}）` : ""}
        </div>
      ) : null}
      {explainPack?.provider ? <div className="practice-info-line">解析来源：{explainPack.provider}</div> : null}
      {explainPack?.manualReviewRule ? <div className="practice-warning-line">{explainPack.manualReviewRule}</div> : null}
      {explainPack?.citations?.length ? (
        <details className="practice-collapsible practice-citation-block">
          <summary>教材依据（{explainPack.citations.length}）</summary>
          <div className="practice-collapsible-body practice-citation-body">
            {explainPack.citationGovernance ? (
              <div className="card practice-citation-governance">
                平均置信度 {explainPack.citationGovernance.averageConfidence} · 高可信 {explainPack.citationGovernance.highTrustCount} 条 · 中可信 {explainPack.citationGovernance.mediumTrustCount} 条 · 低可信 {explainPack.citationGovernance.lowTrustCount} 条
              </div>
            ) : null}
            {explainPack.citations.map((item) => (
              <div className="card practice-citation-item" key={`${item.itemId}-${item.score}`}>
                <div className="practice-citation-title">
                  {item.itemTitle}
                  <span
                    className={
                      item.trustLevel === "high"
                        ? "practice-citation-trust high"
                        : item.trustLevel === "medium"
                          ? "practice-citation-trust medium"
                          : "practice-citation-trust low"
                    }
                  >
                    {item.trustLevel === "high" ? "高可信" : item.trustLevel === "medium" ? "中可信" : "低可信"} · 置信度 {item.confidence}
                  </span>
                </div>
                <div className="practice-citation-snippet">{item.snippet}</div>
                {item.reason?.length ? <div className="practice-citation-snippet">{item.reason.join("；")}</div> : null}
              </div>
            ))}
          </div>
        </details>
      ) : null}
      <div className="cta-row practice-variant-trigger">
        <button className="button secondary" type="button" onClick={onLoadVariants}>
          {loadingVariants ? "生成中..." : "AI 错题讲解 + 变式训练"}
        </button>
      </div>
    </Card>
  );
}
