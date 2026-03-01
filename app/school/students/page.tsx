"use client";

import { useEffect, useState } from "react";
import Card from "@/components/Card";

type UserItem = {
  id: string;
  name: string;
  email: string;
  role: "teacher" | "student" | "parent" | "school_admin";
  grade?: string;
  createdAt?: string;
};

export default function SchoolStudentsPage() {
  const [students, setStudents] = useState<UserItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/school/users?role=student")
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) {
          setError(data?.error ?? "加载失败");
          return;
        }
        setStudents(data.data ?? []);
      });
  }, []);

  if (error) {
    return <Card title="学生管理">{error}</Card>;
  }

  return (
    <div className="grid" style={{ gap: 18 }}>
      <div className="section-head">
        <div>
          <h2>学生管理</h2>
          <div className="section-sub">学校维度学生账号列表（多租户隔离）。</div>
        </div>
        <span className="chip">Students</span>
      </div>
      <Card title={`学生列表（${students.length}）`} tag="成员">
        <div className="grid" style={{ gap: 8 }}>
          {students.map((student) => (
            <div className="card" key={student.id}>
              <div className="section-title">{student.name}</div>
              <div style={{ fontSize: 12, color: "var(--ink-1)" }}>
                {student.email} · {student.grade ? `${student.grade}年级` : "未设置年级"}
              </div>
              <div style={{ fontSize: 12, color: "var(--ink-1)" }}>ID: {student.id}</div>
            </div>
          ))}
          {!students.length ? <div className="section-sub">暂无学生账号。</div> : null}
        </div>
      </Card>
    </div>
  );
}
