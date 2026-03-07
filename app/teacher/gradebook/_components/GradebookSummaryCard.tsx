import Card from "@/components/Card";
import type { GradebookSummary } from "../types";

type GradebookSummaryCardProps = {
  summary: GradebookSummary | null;
  assignmentFilter: string;
  visibleAssignmentsCount: number;
  onExportCsv: () => void;
  onExportExcel: () => void;
};

export default function GradebookSummaryCard({
  summary,
  assignmentFilter,
  visibleAssignmentsCount,
  onExportCsv,
  onExportExcel
}: GradebookSummaryCardProps) {
  return (
    <Card title="班级概览" tag="数据">
      <div className="grid grid-2">
        <div className="card">
          <div className="section-title">学生数</div>
          <p>{summary?.students ?? 0}</p>
        </div>
        <div className="card">
          <div className="section-title">作业数</div>
          <p>{summary?.assignments ?? 0}</p>
        </div>
        <div className="card">
          <div className="section-title">完成率</div>
          <p>{summary?.completionRate ?? 0}%</p>
        </div>
        <div className="card">
          <div className="section-title">平均分</div>
          <p>{summary?.avgScore ?? 0}</p>
        </div>
      </div>
      <div style={{ marginTop: 10, fontSize: 12, color: "var(--ink-1)" }}>
        {assignmentFilter !== "all"
          ? "已筛选 1 份作业。"
          : `当前仅展示最近 ${visibleAssignmentsCount} 份作业。更多作业可在“作业列表”查看。`}
      </div>
      <div className="cta-row" style={{ marginTop: 12 }}>
        <button className="button secondary" type="button" onClick={onExportCsv}>
          导出 CSV
        </button>
        <button className="button ghost" type="button" onClick={onExportExcel}>
          导出 Excel
        </button>
      </div>
    </Card>
  );
}
