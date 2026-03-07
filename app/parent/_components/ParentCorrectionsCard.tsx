import Card from "@/components/Card";
import EduIcon from "@/components/EduIcon";
import type { CorrectionSummary } from "../types";

type ParentCorrectionsCardProps = {
  summary: CorrectionSummary | null;
  pendingCount: number;
  overdueCount: number;
  dueSoonCount: number;
  reminderText: string;
  reminderCopied: boolean;
  onCopyReminder: () => void | Promise<void>;
};

export default function ParentCorrectionsCard({
  summary,
  pendingCount,
  overdueCount,
  dueSoonCount,
  reminderText,
  reminderCopied,
  onCopyReminder
}: ParentCorrectionsCardProps) {
  return (
    <Card title="订正任务提醒" tag="督学">
      <div className="feature-card">
        <EduIcon name="pencil" />
        <p>自动生成订正清单与提醒文案。</p>
      </div>
      <div className="grid grid-2">
        <div className="card">
          <div className="section-title">待订正</div>
          <p>{summary?.pending ?? pendingCount} 题</p>
        </div>
        <div className="card">
          <div className="section-title">逾期</div>
          <p>{summary?.overdue ?? overdueCount} 题</p>
        </div>
        <div className="card">
          <div className="section-title">2 天内到期</div>
          <p>{summary?.dueSoon ?? dueSoonCount} 题</p>
        </div>
        <div className="card">
          <div className="section-title">已完成</div>
          <p>{summary?.completed ?? 0} 题</p>
        </div>
      </div>
      <div style={{ marginTop: 12 }}>
        <div className="section-title">提醒文案</div>
        <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, color: "var(--ink-1)" }}>{reminderText}</pre>
      </div>
      <div className="cta-row">
        <button className="button secondary" type="button" onClick={onCopyReminder}>
          {reminderCopied ? "已复制" : "复制提醒文案"}
        </button>
      </div>
    </Card>
  );
}
