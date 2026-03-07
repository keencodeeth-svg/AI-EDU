import { ASSIGNMENT_TYPE_LABELS } from "@/lib/constants";
import type {
  GradebookAssignment,
  GradebookAssignmentStat,
  GradebookStudent
} from "../types";
import { getAssignmentProgressCell, getProgressPillClassName, getTierLabel } from "../utils";

type GradebookStudentTableProps = {
  students: GradebookStudent[];
  visibleAssignments: GradebookAssignment[];
  assignmentStatMap: ReadonlyMap<string, GradebookAssignmentStat>;
  ranked: ReadonlyMap<string, number>;
  now: number;
};

export default function GradebookStudentTable({
  students,
  visibleAssignments,
  assignmentStatMap,
  ranked,
  now
}: GradebookStudentTableProps) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table className="gradebook-table">
        <thead>
          <tr>
            <th>学生</th>
            <th>排名</th>
            <th>层级</th>
            <th>完成</th>
            <th>待交</th>
            <th>逾期</th>
            <th>迟交</th>
            <th>平均分</th>
            {visibleAssignments.map((assignment) => {
              const stat = assignmentStatMap.get(assignment.id);
              return (
                <th key={assignment.id}>
                  <div>{assignment.title}</div>
                  <div className="gradebook-sub">
                    {new Date(assignment.dueDate).toLocaleDateString("zh-CN")} · {ASSIGNMENT_TYPE_LABELS[assignment.submissionType ?? "quiz"]}
                  </div>
                  {stat ? <div className="gradebook-sub">已交 {stat.completed}/{stat.total}</div> : null}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {students.map((student) => (
            <tr key={student.id}>
              <td>
                <div className="section-title">{student.name}</div>
                <div className="gradebook-sub">{student.email}</div>
              </td>
              <td>{ranked.get(student.id) ?? "-"}</td>
              <td>{getTierLabel(student.stats.avgScore)}</td>
              <td>{student.stats.completed}</td>
              <td>{student.stats.pending}</td>
              <td>{student.stats.overdue}</td>
              <td>{student.stats.late}</td>
              <td>{student.stats.avgScore}</td>
              {visibleAssignments.map((assignment) => {
                const cell = getAssignmentProgressCell(assignment, student.progress[assignment.id], now);
                return (
                  <td key={`${student.id}-${assignment.id}`}>
                    <span className={getProgressPillClassName(cell.state)}>{cell.label}</span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
