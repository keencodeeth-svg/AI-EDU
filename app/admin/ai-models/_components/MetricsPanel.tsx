import Card from "@/components/Card";
import type { AiMetrics } from "../types";

type MetricsPanelProps = {
  metrics: AiMetrics | null;
  metricsLoading: boolean;
  onLoadMetrics: () => void;
};

export default function MetricsPanel({ metrics, metricsLoading, onLoadMetrics }: MetricsPanelProps) {
  return (
    <Card title="AI 调用指标" tag="Metrics">
      <div className="cta-row" style={{ marginBottom: 10 }}>
        <button className="button secondary" type="button" onClick={onLoadMetrics} disabled={metricsLoading}>
          {metricsLoading ? "刷新中..." : "刷新指标"}
        </button>
      </div>
      {metrics ? (
        <div className="grid" style={{ gap: 8 }}>
          <div className="pill-list">
            <span className="pill">调用量 {metrics.totalCalls}</span>
            <span className="pill">成功率 {metrics.successRate}%</span>
            <span className="pill">回退率 {metrics.fallbackRate}%</span>
            <span className="pill">超时率 {metrics.timeoutRate}%</span>
            <span className="pill">质量拦截率 {metrics.qualityRejectRate}%</span>
            <span className="pill">预算拦截率 {metrics.budgetRejectRate}%</span>
            <span className="pill">P95 {metrics.p95LatencyMs}ms</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--ink-1)" }}>更新时间：{new Date(metrics.generatedAt).toLocaleString("zh-CN")}</div>
          <div className="grid" style={{ gap: 8 }}>
            {(metrics.rows ?? []).map((row) => (
              <div className="card" key={row.key}>
                <div className="section-title">
                  {row.taskType} · {row.provider}
                </div>
                <div style={{ fontSize: 12, color: "var(--ink-1)" }}>
                  调用 {row.calls} · 成功率 {row.successRate}% · 超时率 {row.timeoutRate}% · 平均回退 {row.avgFallback} · 质量拦截 {row.qualityRejectRate}% · 预算拦截 {row.budgetRejectRate}% · 平均延迟 {row.avgLatencyMs}ms · P95 {row.p95LatencyMs}ms
                </div>
              </div>
            ))}
            {!metrics.rows?.length ? <div style={{ color: "var(--ink-1)" }}>暂无调用日志。</div> : null}
          </div>
        </div>
      ) : (
        <p style={{ color: "var(--ink-1)" }}>暂无指标数据。</p>
      )}
    </Card>
  );
}
