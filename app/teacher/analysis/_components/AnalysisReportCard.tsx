import Card from "@/components/Card";
import type { AnalysisReportData } from "../types";

type AnalysisReportCardProps = {
  classId: string;
  report: AnalysisReportData | null;
  reportLoading: boolean;
  reportError: string | null;
  showReportSkeleton: boolean;
  onGenerateReport: () => void | Promise<void>;
};

export default function AnalysisReportCard({
  classId,
  report,
  reportLoading,
  reportError,
  showReportSkeleton,
  onGenerateReport
}: AnalysisReportCardProps) {
  return (
    <Card title="学情报告 + 重点提醒" tag="报告">
      <div className="cta-row">
        <button className="button primary" onClick={onGenerateReport} disabled={reportLoading || !classId}>
          {reportLoading ? "生成中..." : "生成学情报告"}
        </button>
      </div>
      {reportError ? (
        <div className="status-note error" style={{ marginTop: 8 }}>
          {reportError}
        </div>
      ) : null}
      {showReportSkeleton ? (
        <div className="skeleton-grid" style={{ marginTop: 12 }}>
          <div className="skeleton-card">
            <div className="skeleton-line lg w-40" />
            <div className="skeleton-line w-100" />
            <div className="skeleton-line w-100" />
            <div className="skeleton-line w-80" />
          </div>
        </div>
      ) : report ? (
        <div className="grid" style={{ gap: 10, marginTop: 12 }}>
          <div className="card">
            <div className="section-title">报告摘要</div>
            <p>{report.report?.report ?? "暂无报告内容。"}</p>
          </div>
          {report.report?.highlights?.length ? (
            <div className="card">
              <div className="section-title">亮点</div>
              <ul style={{ margin: "6px 0 0 16px" }}>
                {report.report.highlights.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {report.report?.reminders?.length ? (
            <div className="card">
              <div className="section-title">重点提醒</div>
              <ul style={{ margin: "6px 0 0 16px" }}>
                {report.report.reminders.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="empty-state" style={{ marginTop: 12 }}>
          <p className="empty-state-title">尚未生成报告</p>
          <p>点击上方按钮生成当前班级的学情摘要与重点提醒。</p>
        </div>
      )}
    </Card>
  );
}
