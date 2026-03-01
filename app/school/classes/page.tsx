"use client";

import { useEffect, useState } from "react";
import Card from "@/components/Card";

type ClassItem = {
  id: string;
  name: string;
  subject: string;
  grade: string;
  teacherId: string | null;
  studentCount: number;
  assignmentCount: number;
  createdAt: string;
};

export default function SchoolClassesPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/school/classes")
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) {
          setError(data?.error ?? "加载失败");
          return;
        }
        setClasses(data.data ?? []);
      });
  }, []);

  if (error) {
    return <Card title="学校班级">{error}</Card>;
  }

  return (
    <div className="grid" style={{ gap: 18 }}>
      <div className="section-head">
        <div>
          <h2>学校班级</h2>
          <div className="section-sub">仅展示当前学校租户下的班级。</div>
        </div>
        <span className="chip">Classes</span>
      </div>
      <Card title={`班级列表（${classes.length}）`} tag="租户隔离">
        <div className="grid" style={{ gap: 8 }}>
          {classes.map((item) => (
            <div className="card" key={item.id}>
              <div className="section-title">{item.name}</div>
              <div style={{ fontSize: 12, color: "var(--ink-1)" }}>
                {item.subject} · {item.grade}年级 · 学生 {item.studentCount} · 作业 {item.assignmentCount}
              </div>
              <div style={{ fontSize: 12, color: "var(--ink-1)" }}>
                班级ID: {item.id} · 教师ID: {item.teacherId ?? "未绑定"}
              </div>
            </div>
          ))}
          {!classes.length ? <div className="section-sub">暂无班级数据。</div> : null}
        </div>
      </Card>
    </div>
  );
}
