import Card from "@/components/Card";
import StatePanel from "@/components/StatePanel";
import type {
  StudentAssignmentItem,
  StudentAssignmentStatusFilter,
  StudentAssignmentViewMode
} from "../types";
import StudentAssignmentCompactCard from "./StudentAssignmentCompactCard";
import StudentAssignmentDetailedCard from "./StudentAssignmentDetailedCard";
import StudentAssignmentsFilterControls from "./StudentAssignmentsFilterControls";

type StudentAssignmentsListCardProps = {
  assignments: StudentAssignmentItem[];
  subjectOptions: string[];
  filteredAssignments: StudentAssignmentItem[];
  visibleAssignments: StudentAssignmentItem[];
  statusFilter: StudentAssignmentStatusFilter;
  subjectFilter: string;
  viewMode: StudentAssignmentViewMode;
  keyword: string;
  showAll: boolean;
  hasActiveFilters: boolean;
  onStatusFilterChange: (value: StudentAssignmentStatusFilter) => void;
  onSubjectFilterChange: (value: string) => void;
  onViewModeChange: (value: StudentAssignmentViewMode) => void;
  onKeywordChange: (value: string) => void;
  onClearFilters: () => void;
  onToggleShowAll: () => void;
};

export default function StudentAssignmentsListCard({
  assignments,
  subjectOptions,
  filteredAssignments,
  visibleAssignments,
  statusFilter,
  subjectFilter,
  viewMode,
  keyword,
  showAll,
  hasActiveFilters,
  onStatusFilterChange,
  onSubjectFilterChange,
  onViewModeChange,
  onKeywordChange,
  onClearFilters,
  onToggleShowAll
}: StudentAssignmentsListCardProps) {
  return (
    <Card title="作业列表" tag="作业">
      {assignments.length === 0 ? (
        <StatePanel
          tone="empty"
          title="目前还没有作业"
          description="老师发布新的任务后，这里会第一时间展示进度、截止日期和得分反馈。"
        />
      ) : (
        <>
          <div className="toolbar-wrap assignment-toolbar-desktop" style={{ marginBottom: 10 }}>
            <StudentAssignmentsFilterControls
              subjectOptions={subjectOptions}
              statusFilter={statusFilter}
              subjectFilter={subjectFilter}
              viewMode={viewMode}
              keyword={keyword}
              filteredCount={filteredAssignments.length}
              hasActiveFilters={hasActiveFilters}
              onStatusFilterChange={onStatusFilterChange}
              onSubjectFilterChange={onSubjectFilterChange}
              onViewModeChange={onViewModeChange}
              onKeywordChange={onKeywordChange}
              onClearFilters={onClearFilters}
            />
          </div>
          <details className="assignment-mobile-filters" style={{ marginBottom: 10 }}>
            <summary>筛选与视图</summary>
            <div className="assignment-mobile-filters-body">
              <StudentAssignmentsFilterControls
                mobile
                subjectOptions={subjectOptions}
                statusFilter={statusFilter}
                subjectFilter={subjectFilter}
                viewMode={viewMode}
                keyword={keyword}
                filteredCount={filteredAssignments.length}
                hasActiveFilters={hasActiveFilters}
                onStatusFilterChange={onStatusFilterChange}
                onSubjectFilterChange={onSubjectFilterChange}
                onViewModeChange={onViewModeChange}
                onKeywordChange={onKeywordChange}
                onClearFilters={onClearFilters}
              />
            </div>
          </details>

          <div className="workflow-card-meta">
            <span className="pill">共 {assignments.length} 份作业</span>
            <span className="pill">筛选后 {filteredAssignments.length} 份</span>
            {hasActiveFilters ? <span className="pill">已启用精细筛选</span> : <span className="pill">当前查看全部作业</span>}
          </div>

          {filteredAssignments.length === 0 ? (
            <StatePanel
              compact
              tone="empty"
              title="当前筛选条件下暂无作业"
              description="可以清空筛选条件，或换个关键词试试。"
              action={
                <button className="button secondary" type="button" onClick={onClearFilters}>
                  清空筛选
                </button>
              }
            />
          ) : (
            <>
              {viewMode === "compact" ? (
                <div className="grid assignment-list-compact" style={{ gap: 8 }}>
                  {visibleAssignments.map((item) => (
                    <StudentAssignmentCompactCard item={item} key={item.id} />
                  ))}
                </div>
              ) : (
                <div className="grid assignment-list-detailed" style={{ gap: 12 }}>
                  {visibleAssignments.map((item) => (
                    <StudentAssignmentDetailedCard item={item} key={item.id} />
                  ))}
                </div>
              )}
              {filteredAssignments.length > 10 ? (
                <button className="button ghost" type="button" onClick={onToggleShowAll}>
                  {showAll ? "收起" : `展开全部（${filteredAssignments.length}）`}
                </button>
              ) : null}
            </>
          )}
        </>
      )}
    </Card>
  );
}
