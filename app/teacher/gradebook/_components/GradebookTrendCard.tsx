import Card from "@/components/Card";
import type { GradebookTrendItem } from "../types";

type GradebookTrendCardProps = {
  trend: GradebookTrendItem[];
};

export default function GradebookTrendCard({ trend }: GradebookTrendCardProps) {
  return (
    <Card title="成绩趋势" tag="趋势">
      {trend.length ? (
        <div className="grid" style={{ gap: 10 }}>
          {trend.map((item) => (
            <div className="card" key={item.assignmentId}>
              <div className="section-title">{item.title}</div>
              <div style={{ fontSize: 12, color: "var(--ink-1)" }}>
                截止 {new Date(item.dueDate).toLocaleDateString("zh-CN")}
              </div>
              <div className="pill-list" style={{ marginTop: 8 }}>
                <span className="pill">平均分 {item.avgScore}</span>
                <span className="pill">完成率 {item.completionRate}%</span>
              </div>
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 12, color: "var(--ink-1)" }}>平均分</div>
                <div style={{ height: 8, background: "#f1f5f9", borderRadius: 999, overflow: "hidden" }}>
                  <div
                    style={{
                      width: `${item.avgScore}%`,
                      height: "100%",
                      background: "linear-gradient(90deg, #f97316, #facc15)"
                    }}
                  />
                </div>
              </div>
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 12, color: "var(--ink-1)" }}>完成率</div>
                <div style={{ height: 8, background: "#f1f5f9", borderRadius: 999, overflow: "hidden" }}>
                  <div
                    style={{
                      width: `${item.completionRate}%`,
                      height: "100%",
                      background: "linear-gradient(90deg, #16a34a, #65a30d)"
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p>暂无趋势数据。</p>
      )}
    </Card>
  );
}
