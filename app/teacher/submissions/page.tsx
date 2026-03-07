"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Card from "@/components/Card";
import StatePanel from "@/components/StatePanel";
import { ASSIGNMENT_TYPE_LABELS, SUBJECT_LABELS } from "@/lib/constants";

type SubmissionRow = {
  assignmentId: string;
  assignmentTitle: string;
  submissionType: string;
  dueDate: string;
  classId: string;
  className: string;
  subject: string;
  grade: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  status: string;
  score: number | null;
  total: number | null;
  completedAt: string | null;
  submittedAt?: string | null;
  uploadCount: number;
};

type ClassItem = { id: string; name: string; subject: string; grade: string };

type StatusFilter = "all" | "completed" | "pending" | "overdue";

const STATUS_LABELS: Record<StatusFilter, string> = {
  all: "全部",
  completed: "已提交",
  pending: "待提交",
  overdue: "已逾期"
};

function formatLoadedTime(value: string | null) {
  if (!value) return "";
  return new Date(value).toLocaleString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function getStatusLabel(status: string) {
  return status === "completed" ? "已提交" : status === "overdue" ? "已逾期" : "待提交";
}

export default function TeacherSubmissionsPage() {
  const [rows, setRows] = useState<SubmissionRow[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [classId, setClassId] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastLoadedAt, setLastLoadedAt] = useState<string | null>(null);

  const load = useCallback(async (nextClassId: string, nextStatus: StatusFilter, mode: "initial" | "refresh" = "initial") => {
    if (mode === "refresh") {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const query = new URLSearchParams();
      if (nextClassId) query.set("classId", nextClassId);
      if (nextStatus !== "all") query.set("status", nextStatus);
      const res = await fetch(`/api/teacher/submissions?${query.toString()}`);
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error ?? "加载失败");
      }
      setRows(Array.isArray(payload.data) ? payload.data : []);
      setClasses(Array.isArray(payload.classes) ? payload.classes : []);
      setLastLoadedAt(new Date().toISOString());
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "加载失败");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load(classId, status);
  }, [classId, load, status]);

  const filtered = useMemo(() => {
    const keywordLower = keyword.trim().toLowerCase();
    if (!keywordLower) return rows;
    return rows.filter((row) =>
      [
        row.studentName,
        row.studentEmail,
        row.assignmentTitle,
        row.className,
        SUBJECT_LABELS[row.subject] ?? row.subject,
        row.grade
      ]
        .join(" ")
        .toLowerCase()
        .includes(keywordLower)
    );
  }, [rows, keyword]);

  const overallSummary = useMemo(
    () => ({
      total: rows.length,
      completed: rows.filter((row) => row.status === "completed").length,
      pending: rows.filter((row) => row.status === "pending").length,
      overdue: rows.filter((row) => row.status === "overdue").length
    }),
    [rows]
  );

  const filteredSummary = useMemo(
    () => ({
      total: filtered.length,
      completed: filtered.filter((row) => row.status === "completed").length,
      pending: filtered.filter((row) => row.status === "pending").length,
      overdue: filtered.filter((row) => row.status === "overdue").length
    }),
    [filtered]
  );

  const hasActiveFilters = Boolean(classId || status !== "all" || keyword.trim());
  const selectedClass = classes.find((item) => item.id === classId);

  function handleClearFilters() {
    setClassId("");
    setStatus("all");
    setKeyword("");
  }

  return (
    <div className="grid" style={{ gap: 18 }}>
      <div className="section-head">
        <div>
          <h2>提交箱（Submission Inbox）</h2>
          <div className="section-sub">统一查看作业提交、逾期与未交学生，支持按班级、状态和关键词精准追踪。</div>
        </div>
        <div className="workflow-toolbar">
          <span className="chip">教师端</span>
          <span className="chip">筛选后 {filteredSummary.total} / {overallSummary.total} 条</span>
          {lastLoadedAt ? <span className="chip">更新于 {formatLoadedTime(lastLoadedAt)}</span> : null}
          <button
            className="button secondary"
            type="button"
            onClick={() => void load(classId, status, "refresh")}
            disabled={loading || refreshing}
          >
            {refreshing ? "刷新中..." : "刷新"}
          </button>
        </div>
      </div>

      <Card title="提交概览" tag="概览">
        <div className="grid grid-2">
          <div className="workflow-summary-card">
            <div className="workflow-summary-label">筛选结果</div>
            <div className="workflow-summary-value">{filteredSummary.total}</div>
            <div className="workflow-summary-helper">当前条件下待处理与已提交总数</div>
          </div>
          <div className="workflow-summary-card">
            <div className="workflow-summary-label">已提交</div>
            <div className="workflow-summary-value">{filteredSummary.completed}</div>
            <div className="workflow-summary-helper">已完成提交或已进入批改</div>
          </div>
          <div className="workflow-summary-card">
            <div className="workflow-summary-label">待提交</div>
            <div className="workflow-summary-value">{filteredSummary.pending}</div>
            <div className="workflow-summary-helper">仍在截止期内，适合提醒跟进</div>
          </div>
          <div className="workflow-summary-card">
            <div className="workflow-summary-label">已逾期</div>
            <div className="workflow-summary-value">{filteredSummary.overdue}</div>
            <div className="workflow-summary-helper">优先联系学生并安排补交</div>
          </div>
        </div>
      </Card>

      <Card title="筛选条件" tag="筛选">
        <div className="grid grid-2" style={{ alignItems: "end" }}>
          <label>
            <div className="section-title">班级</div>
            <select value={classId} onChange={(event) => setClassId(event.target.value)} style={{ width: "100%" }}>
              <option value="">全部班级</option>
              {classes.map((klass) => (
                <option key={klass.id} value={klass.id}>
                  {klass.name} · {SUBJECT_LABELS[klass.subject] ?? klass.subject} · {klass.grade} 年级
                </option>
              ))}
            </select>
          </label>
          <label>
            <div className="section-title">状态</div>
            <select value={status} onChange={(event) => setStatus(event.target.value as StatusFilter)} style={{ width: "100%" }}>
              <option value="all">全部</option>
              <option value="completed">已提交</option>
              <option value="pending">待提交</option>
              <option value="overdue">已逾期</option>
            </select>
          </label>
          <label>
            <div className="section-title">关键字</div>
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="学生/作业/班级/学科"
              style={{ width: "100%" }}
            />
          </label>
          <div className="cta-row cta-row-tight no-margin">
            <button className="button ghost" type="button" onClick={handleClearFilters} disabled={!hasActiveFilters}>
              清空筛选
            </button>
            <Link className="button secondary" href="/teacher">
              返回教师端
            </Link>
          </div>
        </div>

        <div className="workflow-card-meta">
          <span className="pill">班级：{selectedClass ? selectedClass.name : "全部班级"}</span>
          <span className="pill">状态：{STATUS_LABELS[status]}</span>
          <span className="pill">关键词：{keyword.trim() || "未设置"}</span>
        </div>

        {error && rows.length ? (
          <StatePanel
            compact
            tone="error"
            title="已展示最近一次成功数据"
            description={`最新刷新失败：${error}`}
            action={
              <button className="button secondary" type="button" onClick={() => void load(classId, status, "refresh")}>
                再试一次
              </button>
            }
          />
        ) : null}
      </Card>

      <Card title="提交列表" tag="列表">
        {loading && !rows.length ? (
          <StatePanel
            compact
            tone="loading"
            title="提交记录加载中"
            description="正在同步各班级学生的提交进度与批改数据。"
          />
        ) : error && !rows.length ? (
          <StatePanel
            compact
            tone="error"
            title="提交箱加载失败"
            description={error}
            action={
              <button className="button secondary" type="button" onClick={() => void load(classId, status, "refresh")}>
                重新加载
              </button>
            }
          />
        ) : !rows.length ? (
          <StatePanel
            compact
            tone="empty"
            title="当前还没有可追踪的提交"
            description="先去教师端发布作业，提交箱会自动沉淀待交、逾期和已交学生名单。"
            action={
              <Link className="button secondary" href="/teacher">
                去教师端工作台
              </Link>
            }
          />
        ) : !filtered.length ? (
          <StatePanel
            compact
            tone="empty"
            title="没有匹配的提交记录"
            description="试试清空筛选条件，或者换个关键词重新搜索。"
            action={
              <button className="button secondary" type="button" onClick={handleClearFilters}>
                清空筛选
              </button>
            }
          />
        ) : (
          <>
            <div className="workflow-card-meta">
              <span className="pill">已提交 {filteredSummary.completed}</span>
              <span className="pill">待提交 {filteredSummary.pending}</span>
              <span className="pill">已逾期 {filteredSummary.overdue}</span>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table className="gradebook-table">
                <thead>
                  <tr>
                    <th>学生</th>
                    <th>班级</th>
                    <th>作业</th>
                    <th>类型</th>
                    <th>状态</th>
                    <th>得分</th>
                    <th>提交时间</th>
                    <th>截止日期</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => (
                    <tr key={`${row.assignmentId}-${row.studentId}`}>
                      <td>
                        <div>{row.studentName}</div>
                        <div className="workflow-summary-helper">{row.studentEmail}</div>
                      </td>
                      <td>
                        <div>{row.className}</div>
                        <div className="workflow-summary-helper">
                          {SUBJECT_LABELS[row.subject] ?? row.subject} · {row.grade} 年级
                        </div>
                      </td>
                      <td>{row.assignmentTitle}</td>
                      <td>
                        {ASSIGNMENT_TYPE_LABELS[row.submissionType as "quiz"] ?? row.submissionType}
                        {row.uploadCount ? <div className="workflow-summary-helper">上传 {row.uploadCount} 个文件</div> : null}
                      </td>
                      <td>{getStatusLabel(row.status)}</td>
                      <td>
                        {row.status === "completed" && row.total !== null
                          ? `${row.score ?? 0}/${row.total ?? 0}`
                          : row.status === "completed"
                            ? "已交"
                            : "-"}
                      </td>
                      <td>{row.submittedAt ? new Date(row.submittedAt).toLocaleString("zh-CN") : "-"}</td>
                      <td>{new Date(row.dueDate).toLocaleDateString("zh-CN")}</td>
                      <td>
                        <Link className="button ghost" href={`/teacher/assignments/${row.assignmentId}/reviews/${row.studentId}`}>
                          查看/批改
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
