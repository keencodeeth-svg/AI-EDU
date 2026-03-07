type StudentAssignmentsKpiGridProps = {
  pendingCount: number;
  completedCount: number;
  overdueCount: number;
};

export default function StudentAssignmentsKpiGrid({
  pendingCount,
  completedCount,
  overdueCount
}: StudentAssignmentsKpiGridProps) {
  return (
    <div className="grid grid-3 assignment-kpi-grid">
      <div className="card assignment-kpi-card" style={{ padding: 12 }}>
        <div style={{ fontSize: 12, color: "var(--ink-1)" }}>待完成</div>
        <div style={{ fontSize: 24, fontWeight: 700, marginTop: 2 }}>{pendingCount}</div>
      </div>
      <div className="card assignment-kpi-card" style={{ padding: 12 }}>
        <div style={{ fontSize: 12, color: "var(--ink-1)" }}>已完成</div>
        <div style={{ fontSize: 24, fontWeight: 700, marginTop: 2 }}>{completedCount}</div>
      </div>
      <div className="card assignment-kpi-card" style={{ padding: 12 }}>
        <div style={{ fontSize: 12, color: "var(--ink-1)" }}>已逾期</div>
        <div style={{ fontSize: 24, fontWeight: 700, marginTop: 2 }}>{overdueCount}</div>
      </div>
    </div>
  );
}
