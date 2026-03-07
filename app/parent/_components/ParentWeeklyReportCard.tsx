import Card from "@/components/Card";
import EduIcon from "@/components/EduIcon";
import Stat from "@/components/Stat";
import ParentActionItemsList from "./ParentActionItemsList";
import type { ParentActionItem, ReceiptSource, ReceiptStatus, WeeklyReport } from "../types";

type ParentWeeklyReportCardProps = {
  report: WeeklyReport;
  receiptError: string | null;
  receiptNotes: Record<string, string>;
  receiptLoadingKey: string | null;
  onNoteChange: (key: string, value: string) => void;
  onSubmitReceipt: (source: ReceiptSource, item: ParentActionItem, status: ReceiptStatus) => void | Promise<void>;
};

export default function ParentWeeklyReportCard({
  report,
  receiptError,
  receiptNotes,
  receiptLoadingKey,
  onNoteChange,
  onSubmitReceipt
}: ParentWeeklyReportCardProps) {
  return (
    <Card title="家长周报" tag="学情">
      <div className="feature-card">
        <EduIcon name="chart" />
        <p>近 7 天学习概览与环比变化。</p>
      </div>
      <div className="grid grid-2">
        <Stat label="完成题量" value={`${report.stats.total} 题`} helper="近 7 天" />
        <Stat label="正确率" value={`${report.stats.accuracy}%`} helper="近 7 天" />
      </div>
      <div className="grid grid-2" style={{ marginTop: 12 }}>
        <div className="card">
          <div className="section-title">上周完成题量</div>
          <p>{report.previousStats?.total ?? 0} 题</p>
        </div>
        <div className="card">
          <div className="section-title">上周正确率</div>
          <p>{report.previousStats?.accuracy ?? 0}%</p>
        </div>
      </div>
      <div style={{ marginTop: 12 }}>
        <div className="section-title">本周可执行行动卡（预计 {report.estimatedMinutes ?? 0} 分钟）</div>
        <ParentActionItemsList
          source="weekly_report"
          items={report.actionItems ?? []}
          receiptNotes={receiptNotes}
          receiptLoadingKey={receiptLoadingKey}
          error={receiptError}
          notePlaceholder="例如：今天有校内活动，改为明天执行"
          emptyText="暂无行动卡。"
          showParentTip
          onNoteChange={onNoteChange}
          onSubmitReceipt={onSubmitReceipt}
        />
      </div>
      <div style={{ marginTop: 10, fontSize: 12, color: "var(--ink-1)" }}>
        执行闭环：建议 {report.execution?.suggestedCount ?? 0} 项 · 已打卡 {report.execution?.completedCount ?? 0} 项 ·
        已跳过 {report.execution?.skippedCount ?? 0} 项 · 待执行 {report.execution?.pendingCount ?? 0} 项 ·
        完成率 {report.execution?.completionRate ?? 0}% · 连续执行 {report.execution?.streakDays ?? 0} 天 ·
        累计执行时长 {report.execution?.doneMinutes ?? 0} 分钟 · 净效果分 {report.effect?.receiptEffectScore ?? 0}
        （最近7日 {report.effect?.last7dEffectScore ?? 0}，平均每次 {report.effect?.avgEffectScore ?? 0}，完成贡献 {report.effect?.doneEffectScore ?? 0}，跳过影响 {report.effect?.skippedPenaltyScore ?? 0}）
      </div>
    </Card>
  );
}
