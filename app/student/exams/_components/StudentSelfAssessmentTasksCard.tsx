import Link from "next/link";
import Card from "@/components/Card";
import type { StudentSelfAssessmentSummary, StudentSelfAssessmentTask } from "../types";

type StudentSelfAssessmentTasksCardProps = {
  tasks: StudentSelfAssessmentTask[];
  summary: StudentSelfAssessmentSummary;
};

export default function StudentSelfAssessmentTasksCard({
  tasks,
  summary
}: StudentSelfAssessmentTasksCardProps) {
  return (
    <Card title="今日自主任务" tag="计划">
      <div style={{ fontSize: 12, color: "var(--ink-1)", marginBottom: 8 }}>
        今日共 {summary.total} 项任务，必须完成 {summary.mustDo} 项，高优先级 {summary.highPriority} 项。
      </div>
      {tasks.length === 0 ? <p>当前没有可执行的自主测评任务。</p> : null}
      {tasks.length ? (
        <div className="grid" style={{ gap: 10 }}>
          {tasks.map((task) => (
            <div className="card" key={task.id}>
              <div className="card-header">
                <div className="section-title">{task.title}</div>
                <span className="card-tag">优先级 {task.priority}</span>
              </div>
              <p>{task.description || "按计划完成该项自主任务。"}</p>
              <Link className="button secondary" href={task.href} style={{ marginTop: 8 }}>
                去完成
              </Link>
            </div>
          ))}
        </div>
      ) : null}
    </Card>
  );
}
