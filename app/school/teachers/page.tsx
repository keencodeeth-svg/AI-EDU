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

export default function SchoolTeachersPage() {
  const [teachers, setTeachers] = useState<UserItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/school/users?role=teacher")
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) {
          setError(data?.error ?? "加载失败");
          return;
        }
        setTeachers(data.data ?? []);
      });
  }, []);

  if (error) {
    return <Card title="教师管理">{error}</Card>;
  }

  return (
    <div className="grid" style={{ gap: 18 }}>
      <div className="section-head">
        <div>
          <h2>教师管理</h2>
          <div className="section-sub">学校维度教师账号列表（组织级权限）。</div>
        </div>
        <span className="chip">Teachers</span>
      </div>
      <Card title={`教师列表（${teachers.length}）`} tag="成员">
        <div className="grid" style={{ gap: 8 }}>
          {teachers.map((teacher) => (
            <div className="card" key={teacher.id}>
              <div className="section-title">{teacher.name}</div>
              <div style={{ fontSize: 12, color: "var(--ink-1)" }}>{teacher.email}</div>
              <div style={{ fontSize: 12, color: "var(--ink-1)" }}>ID: {teacher.id}</div>
            </div>
          ))}
          {!teachers.length ? <div className="section-sub">暂无教师账号。</div> : null}
        </div>
      </Card>
    </div>
  );
}
