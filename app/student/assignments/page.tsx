"use client";

import { useEffect, useMemo, useState } from "react";
import StatePanel from "@/components/StatePanel";
import StudentAssignmentsKpiGrid from "./_components/StudentAssignmentsKpiGrid";
import StudentAssignmentsListCard from "./_components/StudentAssignmentsListCard";
import type {
  StudentAssignmentItem,
  StudentAssignmentStatusFilter,
  StudentAssignmentViewMode
} from "./types";
import {
  buildStudentAssignmentActiveFilterSummary,
  buildStudentAssignmentSubjectOptions,
  countCompletedAssignments,
  countDueSoonAssignments,
  countOverdueAssignments,
  countPendingAssignments,
  filterStudentAssignments,
  findPriorityAssignment,
  getStudentAssignmentUrgencyLabel
} from "./utils";

function formatLoadedTime(value: string | null) {
  if (!value) return "";
  return new Date(value).toLocaleString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export default function StudentAssignmentsPage() {
  const [assignments, setAssignments] = useState<StudentAssignmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StudentAssignmentStatusFilter>("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [viewMode, setViewMode] = useState<StudentAssignmentViewMode>("compact");
  const [keyword, setKeyword] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [lastLoadedAt, setLastLoadedAt] = useState<string | null>(null);

  async function load(mode: "initial" | "refresh" = "initial") {
    const isRefresh = mode === "refresh";
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const res = await fetch("/api/student/assignments");
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error ?? "加载失败");
      }
      setAssignments(Array.isArray(data.data) ? data.data : []);
      setLastLoadedAt(new Date().toISOString());
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "加载失败");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const subjectOptions = useMemo(() => buildStudentAssignmentSubjectOptions(assignments), [assignments]);
  const filteredAssignments = useMemo(
    () =>
      filterStudentAssignments(assignments, {
        statusFilter,
        subjectFilter,
        keyword
      }),
    [assignments, keyword, statusFilter, subjectFilter]
  );
  const visibleAssignments = useMemo(
    () => (showAll ? filteredAssignments : filteredAssignments.slice(0, 10)),
    [filteredAssignments, showAll]
  );

  const pendingCount = useMemo(() => countPendingAssignments(assignments), [assignments]);
  const completedCount = useMemo(() => countCompletedAssignments(assignments), [assignments]);
  const overdueCount = useMemo(() => countOverdueAssignments(assignments), [assignments]);
  const dueSoonCount = useMemo(() => countDueSoonAssignments(assignments), [assignments]);
  const priorityAssignment = useMemo(() => findPriorityAssignment(assignments), [assignments]);
  const activeFilterSummary = useMemo(
    () =>
      buildStudentAssignmentActiveFilterSummary({
        statusFilter,
        subjectFilter,
        viewMode,
        keyword
      }),
    [keyword, statusFilter, subjectFilter, viewMode]
  );
  const hasActiveFilters = statusFilter !== "all" || subjectFilter !== "all" || keyword.trim().length > 0;

  function handleStatusFilterChange(value: StudentAssignmentStatusFilter) {
    setStatusFilter(value);
    setShowAll(false);
  }

  function handleSubjectFilterChange(value: string) {
    setSubjectFilter(value);
    setShowAll(false);
  }

  function handleViewModeChange(value: StudentAssignmentViewMode) {
    setViewMode(value);
  }

  function handleKeywordChange(value: string) {
    setKeyword(value);
    setShowAll(false);
  }

  function handleClearFilters() {
    setStatusFilter("all");
    setSubjectFilter("all");
    setKeyword("");
    setShowAll(false);
  }

  if (loading && assignments.length === 0) {
    return (
      <StatePanel
        tone="loading"
        title="作业中心加载中"
        description="正在同步老师布置的作业、截止日期和完成进度。"
      />
    );
  }

  if (error && assignments.length === 0) {
    return (
      <StatePanel
        tone="error"
        title="作业中心暂时不可用"
        description={error}
        action={
          <button className="button secondary" type="button" onClick={() => void load("refresh")}>
            重新加载
          </button>
        }
      />
    );
  }

  return (
    <div className="grid" style={{ gap: 18 }}>
      <div className="section-head">
        <div>
          <h2>作业中心</h2>
          <div className="section-sub">查看作业进度、优先级与得分反馈，支持精细筛选与快速定位。</div>
        </div>
        <div className="workflow-toolbar">
          {priorityAssignment ? (
            <span className="chip">
              优先处理：{priorityAssignment.title} · {getStudentAssignmentUrgencyLabel(priorityAssignment) ?? "尽快完成"}
            </span>
          ) : (
            <span className="chip">当前没有待处理作业</span>
          )}
          <span className="chip">2 天内到期 {dueSoonCount} 份</span>
          {lastLoadedAt ? <span className="chip">更新于 {formatLoadedTime(lastLoadedAt)}</span> : null}
          <button
            className="button secondary"
            type="button"
            onClick={() => void load("refresh")}
            disabled={loading || refreshing}
          >
            {refreshing ? "刷新中..." : "刷新"}
          </button>
        </div>
      </div>

      {error ? (
        <StatePanel
          compact
          tone="error"
          title="已展示最近一次成功数据"
          description={`最新刷新失败：${error}`}
          action={
            <button className="button secondary" type="button" onClick={() => void load("refresh")}>
              再试一次
            </button>
          }
        />
      ) : null}

      <div className="workflow-card-meta">
        <span className="chip">总计 {assignments.length} 份</span>
        <span className="chip">{activeFilterSummary}</span>
      </div>

      <StudentAssignmentsKpiGrid
        pendingCount={pendingCount}
        completedCount={completedCount}
        overdueCount={overdueCount}
      />

      <StudentAssignmentsListCard
        assignments={assignments}
        subjectOptions={subjectOptions}
        filteredAssignments={filteredAssignments}
        visibleAssignments={visibleAssignments}
        statusFilter={statusFilter}
        subjectFilter={subjectFilter}
        viewMode={viewMode}
        keyword={keyword}
        showAll={showAll}
        hasActiveFilters={hasActiveFilters}
        onStatusFilterChange={handleStatusFilterChange}
        onSubjectFilterChange={handleSubjectFilterChange}
        onViewModeChange={handleViewModeChange}
        onKeywordChange={handleKeywordChange}
        onClearFilters={handleClearFilters}
        onToggleShowAll={() => setShowAll((prev) => !prev)}
      />
    </div>
  );
}
