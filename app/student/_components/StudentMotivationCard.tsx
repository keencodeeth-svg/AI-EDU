import Card from "@/components/Card";
import type { MotivationPayload } from "../types";

type StudentMotivationCardProps = {
  motivation: MotivationPayload | null;
};

export default function StudentMotivationCard({ motivation }: StudentMotivationCardProps) {
  return (
    <Card title="学习激励" tag="成长">
      <div className="grid grid-2">
        <div className="kpi">
          <div className="section-title kpi-title">连续学习</div>
          <div className="kpi-value">{motivation?.streak ?? 0} 天</div>
        </div>
        <div className="kpi">
          <div className="section-title kpi-title">本周正确率</div>
          <div className="kpi-value">{motivation?.weekly?.accuracy ?? 0}%</div>
        </div>
      </div>
      <div className="stack-8 panel-section">
        <div className="badge">徽章</div>
        {motivation?.badges?.length ? (
          motivation.badges.map((badge) => (
            <div className="meta-text" key={badge.id}>
              {badge.title} - {badge.description}
            </div>
          ))
        ) : (
          <div className="status-note info">完成一次练习即可获得首枚徽章。</div>
        )}
      </div>
    </Card>
  );
}
