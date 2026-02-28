"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Card from "@/components/Card";
import EduIcon from "@/components/EduIcon";
import { ASSIGNMENT_TYPE_LABELS, SUBJECT_LABELS } from "@/lib/constants";

type AssignmentItem = {
  id: string;
  title: string;
  dueDate: string;
  className: string;
  classSubject: string;
  classGrade: string;
  moduleTitle?: string;
  status: string;
  score: number | null;
  total: number | null;
  completedAt: string | null;
  submissionType?: "quiz" | "upload" | "essay";
};

export default function StudentAssignmentsPage() {
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "completed">("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"compact" | "detailed">("compact");
  const [showAll, setShowAll] = useState(false);

  async function load() {
    setError(null);
    const res = await fetch("/api/student/assignments");
    const data = await res.json();
    if (!res.ok) {
      setError(data?.error ?? "加载失败");
      return;
    }
    setAssignments(data.data ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  const subjectOptions = useMemo(() => {
    const subjects = Array.from(new Set(assignments.map((item) => item.classSubject)));
    return subjects.sort((a, b) =>
      (SUBJECT_LABELS[a] ?? a).localeCompare(SUBJECT_LABELS[b] ?? b, "zh-CN")
    );
  }, [assignments]);

  const filteredAssignments = useMemo(() => {
    return assignments
      .filter((item) => {
        if (statusFilter === "pending" && item.status === "completed") return false;
        if (statusFilter === "completed" && item.status !== "completed") return false;
        if (subjectFilter !== "all" && item.classSubject !== subjectFilter) return false;
        return true;
      })
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [assignments, statusFilter, subjectFilter]);

  const visibleAssignments = showAll ? filteredAssignments : filteredAssignments.slice(0, 10);

  const pendingCount = assignments.filter((item) => item.status !== "completed").length;
  const completedCount = assignments.filter((item) => item.status === "completed").length;
  const overdueCount = assignments.filter((item) => {
    if (item.status === "completed") return false;
    return new Date(item.dueDate).getTime() < Date.now();
  }).length;

  function renderCompactAssignment(item: AssignmentItem) {
    return (
      <div
        className="card"
        key={item.id}
        style={{
          padding: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div className="section-title" style={{ fontSize: 14 }}>
              {item.title}
            </div>
            <span className="card-tag">{item.status === "completed" ? "已完成" : "待完成"}</span>
          </div>
          <div
            style={{
              marginTop: 4,
              fontSize: 12,
              color: "var(--ink-1)",
              display: "flex",
              flexWrap: "wrap",
              gap: 8
            }}
          >
            <span>
              {item.className} · {SUBJECT_LABELS[item.classSubject] ?? item.classSubject}
            </span>
            <span>截止 {new Date(item.dueDate).toLocaleDateString("zh-CN")}</span>
            <span>{ASSIGNMENT_TYPE_LABELS[item.submissionType ?? "quiz"]}</span>
            {item.status === "completed" ? (
              item.submissionType && item.submissionType !== "quiz" ? (
                <span>已提交待批改</span>
              ) : (
                <span>
                  得分 {item.score ?? 0}/{item.total ?? 0}
                </span>
              )
            ) : (
              <span>等待提交</span>
            )}
          </div>
        </div>
        <Link className="button secondary" href={`/student/assignments/${item.id}`}>
          {item.status === "completed" ? "查看" : "开始"}
        </Link>
      </div>
    );
  }

  if (error) {
    return <Card title="作业中心">{error}</Card>;
  }

  return (
    <div className="grid" style={{ gap: 18 }}>
      <div className="section-head">
        <div>
          <h2>作业中心</h2>
          <div className="section-sub">查看作业进度与得分反馈。</div>
        </div>
        <span className="chip">总计 {assignments.length} 份</span>
      </div>

      <div className="grid grid-3">
        <div className="card" style={{ padding: 12 }}>
          <div style={{ fontSize: 12, color: "var(--ink-1)" }}>待完成</div>
          <div style={{ fontSize: 24, fontWeight: 700, marginTop: 2 }}>{pendingCount}</div>
        </div>
        <div className="card" style={{ padding: 12 }}>
          <div style={{ fontSize: 12, color: "var(--ink-1)" }}>已完成</div>
          <div style={{ fontSize: 24, fontWeight: 700, marginTop: 2 }}>{completedCount}</div>
        </div>
        <div className="card" style={{ padding: 12 }}>
          <div style={{ fontSize: 12, color: "var(--ink-1)" }}>已逾期</div>
          <div style={{ fontSize: 24, fontWeight: 700, marginTop: 2 }}>{overdueCount}</div>
        </div>
      </div>

      <Card title="作业列表" tag="作业">
        {assignments.length === 0 ? (
          <p>暂无作业。</p>
        ) : (
          <>
            <div className="toolbar-wrap" style={{ marginBottom: 10 }}>
              <button
                className={statusFilter === "all" ? "button secondary" : "button ghost"}
                type="button"
                onClick={() => {
                  setStatusFilter("all");
                  setShowAll(false);
                }}
              >
                全部
              </button>
              <button
                className={statusFilter === "pending" ? "button secondary" : "button ghost"}
                type="button"
                onClick={() => {
                  setStatusFilter("pending");
                  setShowAll(false);
                }}
              >
                待完成
              </button>
              <button
                className={statusFilter === "completed" ? "button secondary" : "button ghost"}
                type="button"
                onClick={() => {
                  setStatusFilter("completed");
                  setShowAll(false);
                }}
              >
                已完成
              </button>
              <select
                className="select-control"
                value={subjectFilter}
                onChange={(event) => {
                  setSubjectFilter(event.target.value);
                  setShowAll(false);
                }}
              >
                <option value="all">全部学科</option>
                {subjectOptions.map((subject) => (
                  <option key={subject} value={subject}>
                    {SUBJECT_LABELS[subject] ?? subject}
                  </option>
                ))}
              </select>
              <button
                className={viewMode === "compact" ? "button secondary" : "button ghost"}
                type="button"
                onClick={() => setViewMode("compact")}
              >
                紧凑视图
              </button>
              <button
                className={viewMode === "detailed" ? "button secondary" : "button ghost"}
                type="button"
                onClick={() => setViewMode("detailed")}
              >
                详细视图
              </button>
              <span className="chip">当前 {filteredAssignments.length} 份</span>
            </div>

            {filteredAssignments.length === 0 ? (
              <p>当前筛选条件下暂无作业。</p>
            ) : (
              <>
                {viewMode === "compact" ? (
                  <div className="grid" style={{ gap: 8 }}>
                    {visibleAssignments.map((item) => renderCompactAssignment(item))}
                  </div>
                ) : (
                  <div className="grid" style={{ gap: 12 }}>
                    {visibleAssignments.map((item) => (
                      <div className="card" key={item.id}>
                        <div className="card-header">
                          <div className="section-title">{item.title}</div>
                          <span className="card-tag">{item.status === "completed" ? "已完成" : "待完成"}</span>
                        </div>
                        <div className="feature-card">
                          <EduIcon name="pencil" />
                          <p>
                            {item.className} · {SUBJECT_LABELS[item.classSubject] ?? item.classSubject} ·{" "}
                            {item.classGrade} 年级
                          </p>
                          {item.moduleTitle ? (
                            <div style={{ fontSize: 12, color: "var(--ink-1)" }}>模块：{item.moduleTitle}</div>
                          ) : null}
                        </div>
                        <div className="pill-list" style={{ marginTop: 8 }}>
                          <span className="pill">截止 {new Date(item.dueDate).toLocaleDateString("zh-CN")}</span>
                          <span className="pill">{ASSIGNMENT_TYPE_LABELS[item.submissionType ?? "quiz"]}</span>
                          {item.status === "completed" ? (
                            item.submissionType && item.submissionType !== "quiz" ? (
                              <span className="pill">已提交待批改</span>
                            ) : (
                              <span className="pill">
                                得分 {item.score ?? 0}/{item.total ?? 0}
                              </span>
                            )
                          ) : (
                            <span className="pill">等待提交</span>
                          )}
                        </div>
                        <Link className="button secondary" href={`/student/assignments/${item.id}`} style={{ marginTop: 8 }}>
                          {item.status === "completed" ? "查看详情" : "开始作业"}
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
                {filteredAssignments.length > 10 ? (
                  <button className="button ghost" type="button" onClick={() => setShowAll((prev) => !prev)}>
                    {showAll ? "收起" : `展开全部（${filteredAssignments.length}）`}
                  </button>
                ) : null}
              </>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
