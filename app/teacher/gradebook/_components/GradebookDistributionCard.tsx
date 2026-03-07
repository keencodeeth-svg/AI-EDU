import Card from "@/components/Card";
import type { GradebookDistributionItem } from "../types";

type GradebookDistributionCardProps = {
  distribution: GradebookDistributionItem[];
};

export default function GradebookDistributionCard({ distribution }: GradebookDistributionCardProps) {
  if (!distribution.length) {
    return (
      <Card title="成绩分布" tag="分布">
        <p>暂无分布数据。</p>
      </Card>
    );
  }

  const max = Math.max(...distribution.map((item) => item.count), 1);

  return (
    <Card title="成绩分布" tag="分布">
      <div className="grid grid-2">
        {distribution.map((item) => (
          <div className="card" key={item.label}>
            <div className="section-title">{item.label}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  height: 8,
                  borderRadius: 999,
                  background: "linear-gradient(90deg, #1f6feb, #7ec4ff)",
                  width: `${(item.count / max) * 100}%`
                }}
              />
              <span style={{ fontSize: 12, color: "var(--ink-1)" }}>{item.count} 人</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
