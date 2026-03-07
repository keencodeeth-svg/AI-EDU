import Card from "@/components/Card";
import type { AnalysisHeatItem } from "../types";
import { ratioColor } from "../utils";

type AnalysisHeatmapCardProps = {
  items: AnalysisHeatItem[];
  showHeatmapSkeleton: boolean;
};

export default function AnalysisHeatmapCard({ items, showHeatmapSkeleton }: AnalysisHeatmapCardProps) {
  return (
    <Card title="知识点掌握热力图" tag="热力图">
      {showHeatmapSkeleton ? (
        <div className="skeleton-grid grid-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div className="skeleton-card" key={`heat-skeleton-${index}`}>
              <div className="skeleton-line lg w-80" />
              <div className="skeleton-line w-60" />
              <div className="skeleton-line w-100" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <p className="empty-state-title">暂无练习数据</p>
          <p>当前班级还没有可用于热力图的练习记录。</p>
        </div>
      ) : (
        <div className="grid grid-3" style={{ gap: 12 }}>
          {items.map((item) => (
            <div
              className="card"
              key={item.id}
              style={{
                borderColor: ratioColor(item.ratio),
                boxShadow: "none"
              }}
            >
              <div className="section-title">{item.title}</div>
              <div style={{ fontSize: 12, color: "var(--ink-1)" }}>
                {item.unit ? `${item.unit} / ` : ""}
                {item.chapter}
              </div>
              <div style={{ marginTop: 6, fontSize: 12 }}>
                正确率：<span style={{ color: ratioColor(item.ratio) }}>{item.ratio}%</span> · 练习 {item.total} 次
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
