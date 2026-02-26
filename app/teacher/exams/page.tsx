"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Card from "@/components/Card";
import EduIcon from "@/components/EduIcon";
import { SUBJECT_LABELS } from "@/lib/constants";

type TeacherExamItem = {
  id: string;
  title: string;
  description?: string;
  startAt?: string;
  endAt: string;
  durationMinutes?: number;
  className: string;
  classSubject: string;
  classGrade: string;
  assignedCount: number;
  submittedCount: number;
  avgScore: number;
  createdAt: string;
};

export default function TeacherExamsPage() {
  const [list, setList] = useState<TeacherExamItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/teacher/exams");
    const payload = await res.json();
    if (!res.ok) {
      setError(payload?.error ?? "加载失败");
      setLoading(false);
      return;
    }
    setList(payload.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (error) {
    return (
      <Card title="在线考试">
        <p>{error}</p>
        <Link className="button secondary" href="/teacher" style={{ marginTop: 12 }}>
          返回教师端
        </Link>
      </Card>
    );
  }

  return (
    <div className="grid" style={{ gap: 18 }}>
      <div className="section-head">
        <div>
          <h2>在线考试</h2>
          <div className="section-sub">独立于日常练习的班级考试模块。</div>
        </div>
        <span className="chip">共 {list.length} 场考试</span>
      </div>

      <Card title="考试管理" tag="教师">
        <div className="feature-card">
          <EduIcon name="board" />
          <p>发布考试、跟踪提交进度、查看成绩分布。</p>
        </div>
        <div className="cta-row" style={{ marginTop: 12 }}>
          <Link className="button primary" href="/teacher/exams/create">
            发布新考试
          </Link>
          <Link className="button ghost" href="/teacher">
            返回教师端
          </Link>
        </div>
      </Card>

      <Card title="考试列表" tag="进度">
        {loading ? (
          <p>加载中...</p>
        ) : list.length === 0 ? (
          <p>暂无考试，先创建第一场考试。</p>
        ) : (
          <div className="grid" style={{ gap: 12 }}>
            {list.map((item) => (
              <div className="card" key={item.id}>
                <div className="card-header">
                  <div className="section-title">{item.title}</div>
                  <span className="card-tag">
                    已提交 {item.submittedCount}/{item.assignedCount}
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
                  ) : null}
                  <span className="pill">截止 {new Date(item.endAt).toLocaleString("zh-CN")}</span>
                  <span className="pill">平均分 {item.avgScore}%</span>
                  <span className="pill">
                    时长 {item.durationMinutes ? `${item.durationMinutes} 分钟` : "不限"}
                  </span>
                </div>
                {item.description ? (
                  <div style={{ marginTop: 8, fontSize: 12, color: "var(--ink-1)" }}>{item.description}</div>
                ) : null}
                <div className="cta-row" style={{ marginTop: 10 }}>
                  <Link className="button secondary" href={`/teacher/exams/${item.id}`}>
                    查看详情
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
