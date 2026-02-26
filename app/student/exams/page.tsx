"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Card from "@/components/Card";
import EduIcon from "@/components/EduIcon";
import { SUBJECT_LABELS } from "@/lib/constants";

type StudentExamItem = {
  id: string;
  title: string;
  description?: string;
  startAt?: string;
  endAt: string;
  durationMinutes?: number;
  className: string;
  classSubject: string;
  classGrade: string;
  status: "pending" | "in_progress" | "submitted";
  score: number | null;
  total: number | null;
  startedAt: string | null;
  submittedAt: string | null;
};

export default function StudentExamsPage() {
  const [list, setList] = useState<StudentExamItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    const res = await fetch("/api/student/exams");
    const payload = await res.json();
    if (!res.ok) {
      setError(payload?.error ?? "加载失败");
      return;
    }
    setList(payload.data ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  if (error) {
    return (
      <Card title="在线考试">
        <p>{error}</p>
        <Link className="button secondary" href="/student" style={{ marginTop: 12 }}>
          返回学生端
        </Link>
      </Card>
    );
  }

  return (
    <div className="grid" style={{ gap: 18 }}>
      <div className="section-head">
        <div>
          <h2>在线考试</h2>
          <div className="section-sub">老师发布的班级考试，和日常练习独立。</div>
        </div>
        <span className="chip">共 {list.length} 场考试</span>
      </div>

      <Card title="考试列表" tag="考试">
        {list.length === 0 ? (
          <p>当前没有待参加考试。</p>
        ) : (
          <div className="grid" style={{ gap: 12 }}>
            {list.map((item) => (
              <div className="card" key={item.id}>
                <div className="card-header">
                  <div className="section-title">{item.title}</div>
                  <span className="card-tag">
                    {item.status === "submitted" ? "已提交" : item.status === "in_progress" ? "进行中" : "待开始"}
                  </span>
                </div>
                <div className="feature-card">
                  <EduIcon name="pencil" />
                  <p>
                    {item.className} · {SUBJECT_LABELS[item.classSubject] ?? item.classSubject} · {item.classGrade} 年级
                  </p>
                </div>
                <div className="pill-list" style={{ marginTop: 8 }}>
                  {item.startAt ? (
                    <span className="pill">开始 {new Date(item.startAt).toLocaleString("zh-CN")}</span>
                  ) : (
                    <span className="pill">可立即开始</span>
                  )}
                  <span className="pill">截止 {new Date(item.endAt).toLocaleString("zh-CN")}</span>
                  <span className="pill">
                    时长 {item.durationMinutes ? `${item.durationMinutes} 分钟` : "不限"}
                  </span>
                  {item.status === "submitted" ? (
                    <span className="pill">
                      得分 {item.score ?? 0}/{item.total ?? 0}
                    </span>
                  ) : null}
                </div>
                <Link className="button secondary" href={`/student/exams/${item.id}`} style={{ marginTop: 10 }}>
                  {item.status === "submitted" ? "查看结果" : "进入考试"}
                </Link>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
