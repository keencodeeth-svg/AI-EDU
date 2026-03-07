import Card from "@/components/Card";
import EduIcon from "@/components/EduIcon";
import type { WeeklyReport } from "../types";

type ParentWeakPointsCardProps = {
  report: WeeklyReport;
};

export default function ParentWeakPointsCard({ report }: ParentWeakPointsCardProps) {
  return (
    <Card title="薄弱点与建议" tag="诊断">
      <div className="feature-card">
        <EduIcon name="brain" />
        <p>识别薄弱知识点，给出本周提升建议。</p>
      </div>
      <div className="grid" style={{ gap: 8 }}>
        {report.weakPoints?.length ? (
          report.weakPoints.map((item) => (
            <div className="card" key={item.id}>
              <div className="section-title">{item.title}</div>
              <p>正确率 {item.ratio}%</p>
              <p>建议：本周补做 5 题，巩固该知识点。</p>
            </div>
          ))
        ) : (
          <p>暂无薄弱点数据。</p>
        )}
      </div>
      {report.suggestions?.length ? (
        <div style={{ marginTop: 12 }}>
          <div className="badge">本周建议</div>
          <div className="grid" style={{ gap: 6, marginTop: 8 }}>
            {report.suggestions.map((item, idx) => (
              <div key={`${item}-${idx}`}>{item}</div>
            ))}
          </div>
        </div>
      ) : null}
      {report.parentTips?.length ? (
        <div style={{ marginTop: 12 }}>
          <div className="badge">家长提示</div>
          <div className="grid" style={{ gap: 6, marginTop: 8 }}>
            {report.parentTips.map((item, idx) => (
              <div key={`${item}-${idx}`}>{item}</div>
            ))}
          </div>
        </div>
      ) : null}
    </Card>
  );
}
