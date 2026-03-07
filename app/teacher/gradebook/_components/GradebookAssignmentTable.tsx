import { ASSIGNMENT_TYPE_LABELS } from "@/lib/constants";
import type {
  GradebookAssignment,
  GradebookAssignmentStat,
  GradebookTrendItem
} from "../types";

type GradebookAssignmentTableProps = {
  assignments: GradebookAssignment[];
  assignmentStatMap: ReadonlyMap<string, GradebookAssignmentStat>;
  trendMap: ReadonlyMap<string, GradebookTrendItem>;
};

export default function GradebookAssignmentTable({
  assignments,
  assignmentStatMap,
  trendMap
}: GradebookAssignmentTableProps) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table className="gradebook-table">
        <thead>
          <tr>
            <th>作业</th>
            <th>截止日期</th>
            <th>类型</th>
            <th>完成率</th>
            <th>平均分</th>
            <th>逾期</th>
          </tr>
        </thead>
        <tbody>
          {assignments.map((assignment) => {
            const stat = assignmentStatMap.get(assignment.id);
            const trend = trendMap.get(assignment.id);
            return (
              <tr key={assignment.id}>
                <td>
                  <div className="section-title">{assignment.title}</div>
                  <div className="gradebook-sub">已交 {stat?.completed ?? 0}/{stat?.total ?? 0}</div>
                </td>
                <td>{new Date(assignment.dueDate).toLocaleDateString("zh-CN")}</td>
                <td>{ASSIGNMENT_TYPE_LABELS[assignment.submissionType ?? "quiz"]}</td>
                <td>{trend?.completionRate ?? 0}%</td>
                <td>{trend?.avgScore ?? 0}</td>
                <td>{stat?.overdue ?? 0}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
