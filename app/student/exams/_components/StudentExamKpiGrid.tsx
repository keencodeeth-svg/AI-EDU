type StudentExamKpiGridProps = {
  ongoingCount: number;
  upcomingCount: number;
  finishedCount: number;
};

export default function StudentExamKpiGrid({ ongoingCount, upcomingCount, finishedCount }: StudentExamKpiGridProps) {
  return (
    <div className="grid grid-3 exams-kpi-grid">
      <div className="card exams-kpi-card">
        <div style={{ fontSize: 12, color: "var(--ink-1)" }}>待进行</div>
        <div style={{ fontSize: 24, fontWeight: 700, marginTop: 2 }}>{ongoingCount}</div>
      </div>
      <div className="card exams-kpi-card">
        <div style={{ fontSize: 12, color: "var(--ink-1)" }}>即将开始</div>
        <div style={{ fontSize: 24, fontWeight: 700, marginTop: 2 }}>{upcomingCount}</div>
      </div>
      <div className="card exams-kpi-card">
        <div style={{ fontSize: 12, color: "var(--ink-1)" }}>已完成</div>
        <div style={{ fontSize: 24, fontWeight: 700, marginTop: 2 }}>{finishedCount}</div>
      </div>
    </div>
  );
}
