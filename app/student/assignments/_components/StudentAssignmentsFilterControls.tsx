import { SUBJECT_LABELS } from "@/lib/constants";
import type { StudentAssignmentStatusFilter, StudentAssignmentViewMode } from "../types";

type StudentAssignmentsFilterControlsProps = {
  subjectOptions: string[];
  statusFilter: StudentAssignmentStatusFilter;
  subjectFilter: string;
  viewMode: StudentAssignmentViewMode;
  keyword: string;
  filteredCount: number;
  hasActiveFilters: boolean;
  mobile?: boolean;
  onStatusFilterChange: (value: StudentAssignmentStatusFilter) => void;
  onSubjectFilterChange: (value: string) => void;
  onViewModeChange: (value: StudentAssignmentViewMode) => void;
  onKeywordChange: (value: string) => void;
  onClearFilters: () => void;
};

export default function StudentAssignmentsFilterControls({
  subjectOptions,
  statusFilter,
  subjectFilter,
  viewMode,
  keyword,
  filteredCount,
  hasActiveFilters,
  mobile = false,
  onStatusFilterChange,
  onSubjectFilterChange,
  onViewModeChange,
  onKeywordChange,
  onClearFilters
}: StudentAssignmentsFilterControlsProps) {
  return (
    <>
      <button
        className={statusFilter === "all" ? "button secondary" : "button ghost"}
        type="button"
        onClick={() => onStatusFilterChange("all")}
      >
        全部
      </button>
      <button
        className={statusFilter === "pending" ? "button secondary" : "button ghost"}
        type="button"
        onClick={() => onStatusFilterChange("pending")}
      >
        待完成
      </button>
      <button
        className={statusFilter === "overdue" ? "button secondary" : "button ghost"}
        type="button"
        onClick={() => onStatusFilterChange("overdue")}
      >
        已逾期
      </button>
      <button
        className={statusFilter === "completed" ? "button secondary" : "button ghost"}
        type="button"
        onClick={() => onStatusFilterChange("completed")}
      >
        已完成
      </button>
      <select
        className={mobile ? "select-control assignment-mobile-select" : "select-control"}
        value={subjectFilter}
        onChange={(event) => onSubjectFilterChange(event.target.value)}
      >
        <option value="all">全部学科</option>
        {subjectOptions.map((subject) => (
          <option key={subject} value={subject}>
            {SUBJECT_LABELS[subject] ?? subject}
          </option>
        ))}
      </select>
      <input
        className={mobile ? "workflow-search-input assignment-mobile-select" : "workflow-search-input"}
        value={keyword}
        onChange={(event) => onKeywordChange(event.target.value)}
        placeholder="搜索作业/班级/模块"
        aria-label="搜索作业"
      />
      <button
        className={viewMode === "compact" ? "button secondary" : "button ghost"}
        type="button"
        onClick={() => onViewModeChange("compact")}
      >
        紧凑视图
      </button>
      <button
        className={viewMode === "detailed" ? "button secondary" : "button ghost"}
        type="button"
        onClick={() => onViewModeChange("detailed")}
      >
        详细视图
      </button>
      <button className="button ghost" type="button" onClick={onClearFilters} disabled={!hasActiveFilters}>
        清空筛选
      </button>
      <span className="chip">当前 {filteredCount} 份</span>
    </>
  );
}
