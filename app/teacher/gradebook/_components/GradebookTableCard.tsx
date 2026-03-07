import Card from "@/components/Card";
import type {
  GradebookAssignment,
  GradebookAssignmentStat,
  GradebookStudent,
  GradebookTrendItem,
  GradebookViewMode
} from "../types";
import GradebookAssignmentTable from "./GradebookAssignmentTable";
import GradebookStudentTable from "./GradebookStudentTable";

type GradebookTableCardProps = {
  loading: boolean;
  viewMode: GradebookViewMode;
  students: GradebookStudent[];
  filteredAssignments: GradebookAssignment[];
  visibleAssignments: GradebookAssignment[];
  assignmentStatMap: ReadonlyMap<string, GradebookAssignmentStat>;
  ranked: ReadonlyMap<string, number>;
  trendMap: ReadonlyMap<string, GradebookTrendItem>;
  now: number;
};

export default function GradebookTableCard({
  loading,
  viewMode,
  students,
  filteredAssignments,
  visibleAssignments,
  assignmentStatMap,
  ranked,
  trendMap,
  now
}: GradebookTableCardProps) {
  return (
    <Card title="成绩册" tag="作业">
      {loading ? (
        <p>加载中...</p>
      ) : viewMode === "student" && students.length ? (
        <GradebookStudentTable
          students={students}
          visibleAssignments={visibleAssignments}
          assignmentStatMap={assignmentStatMap}
          ranked={ranked}
          now={now}
        />
      ) : viewMode === "assignment" && filteredAssignments.length ? (
        <GradebookAssignmentTable
          assignments={filteredAssignments}
          assignmentStatMap={assignmentStatMap}
          trendMap={trendMap}
        />
      ) : (
        <p>暂无学生或作业数据。</p>
      )}
    </Card>
  );
}
