"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Card from "@/components/Card";
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

export default function TeacherSubmissionsPage() {
  const [rows, setRows] = useState<SubmissionRow[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [classId, setClassId] = useState("");
  const [status, setStatus] = useState("all");
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (nextClassId?: string, nextStatus?: string) => {
      setLoading(true);
      setError(null);
      const query = new URLSearchParams();
      if (nextClassId) query.set("classId", nextClassId);
      if (nextStatus && nextStatus !== "all") query.set("status", nextStatus);
      const res = await fetch(`/api/teacher/submissions?${query.toString()}`);
      const payload = await res.json();
      if (!res.ok) {
        setError(payload?.error ?? "加载失败");
        setLoading(false);
        return;
      }
      setRows(payload.data ?? []);
      setClasses(payload.classes ?? []);
      if (!nextClassId && payload.classes?.length && !classId) {
        setClassId(payload.classes[0].id);
      }
      setLoading(false);
    },
    [classId]
  );

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const keywordLower = keyword.trim().toLowerCase();
    if (!keywordLower) return rows;
    return rows.filter(
      (row) =>
        row.studentName.toLowerCase().includes(keywordLower) ||
        row.studentEmail.toLowerCase().includes(keywordLower) ||
        row.assignmentTitle.toLowerCase().includes(keywordLower)
    );
  }, [rows, keyword]);

  return (
    <div className="grid" style={{ gap: 18 }}>
      <div className="section-head">
        <div>
          <h2>提交箱（Submission Inbox）</h2>
          <div className="section-sub">统一查看作业提交、逾期与未交学生。</div>
        </div>
        <span className="chip">教师端</span>
      </div>

      <Card title="筛选条件" tag="筛选">
        <div className="grid grid-2" style={{ alignItems: "end" }}>
          <label>
            <div className="section-title">班级</div>
            <select
              value={classId}
              onChange={(event) => {
                const next = event.target.value;
                setClassId(next);
                load(next, status);
              }}
              style={{ width: "100%" }}
            >
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
            <select
              value={status}
              onChange={(event) => {
                const next = event.target.value;
                setStatus(next);
                load(classId, next);
              }}
              style={{ width: "100%" }}
            >
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
              placeholder="学生/作业名称"
              style={{ width: "100%" }}
            />
          </label>
          <div className="cta-row">
            <Link className="button secondary" href="/teacher">
              返回教师端
            </Link>
          </div>
        </div>
        {error ? <div className="status-note error">{error}</div> : null}
      </Card>

      <Card title="提交列表" tag="列表">
        {loading ? (
          <div className="empty-state">
            <p className="empty-state-title">加载中</p>
            <p>正在拉取提交记录。</p>
          </div>
        ) : filtered.length ? (
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
                    <td>{row.studentName}</td>
                    <td>{row.className}</td>
                    <td>{row.assignmentTitle}</td>
                    <td>{ASSIGNMENT_TYPE_LABELS[row.submissionType as "quiz"] ?? row.submissionType}</td>
                    <td>
                      {row.status === "completed" ? "已提交" : row.status === "overdue" ? "已逾期" : "待提交"}
                    </td>
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
                      <Link
                        className="button ghost"
                        href={`/teacher/assignments/${row.assignmentId}/reviews/${row.studentId}`}
                      >
                        查看/批改
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <p className="empty-state-title">暂无记录</p>
            <p>当前筛选条件下没有提交数据。</p>
          </div>
        )}
      </Card>
    </div>
  );
}
