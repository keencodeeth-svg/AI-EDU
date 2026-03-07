import Card from "@/components/Card";
import type { AssignmentStatsDistributionItem } from "../types";

type AssignmentStatsDistributionCardProps = {
  distribution: AssignmentStatsDistributionItem[];
  maxCount: number;
};

export default function AssignmentStatsDistributionCard({
  distribution,
  maxCount
}: AssignmentStatsDistributionCardProps) {
  return (
    <Card title="成绩分布" tag="分布">
      {distribution.length ? (
        <div className="grid" style={{ gap: 8 }}>
          {distribution.map((item) => (
            <div key={item.label} className="card">
              <div className="section-title">{item.label}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    height: 8,
                    borderRadius: 999,
                    background: "linear-gradient(90deg, #1f6feb, #7ec4ff)",
                    width: `${(item.count / maxCount) * 100}%`
                  }}
                />
                <span style={{ fontSize: 12, color: "var(--ink-1)" }}>{item.count} 人</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p>暂无分布数据。</p>
      )}
    </Card>
  );
}
