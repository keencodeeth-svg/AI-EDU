"use client";

import { useEffect, useState } from "react";
import Card from "@/components/Card";
import EduIcon from "@/components/EduIcon";
import { SUBJECT_LABELS } from "@/lib/constants";
import type { StudentGrowthData } from "./types";

export default function StudentGrowthPage() {
  const [data, setData] = useState<StudentGrowthData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setError(null);
      const res = await fetch("/api/student/growth");
      const payload = (await res.json()) as StudentGrowthData & { error?: string };
      if (!res.ok) {
        setError(payload.error ?? "加载失败");
        return;
      }
      setData(payload);
    }

    void load();
  }, []);

  if (error) {
    return <Card title="成长档案">{error}</Card>;
  }

  if (!data) {
    return <Card title="成长档案">加载中...</Card>;
  }

  return (
    <div className="grid" style={{ gap: 18 }}>
      <div className="section-head">
        <div>
          <h2>成长档案</h2>
          <div className="section-sub">学习轨迹、学科掌握度与薄弱点。</div>
        </div>
        <span className="chip">成长分析</span>
      </div>

      <Card title="学习路径总览" tag="总览">
        <div className="feature-card">
          <EduIcon name="chart" />
          <p>练习量、正确率与近 7 天表现。</p>
        </div>
        <div className="grid grid-3">
          <div className="card">
            <div className="section-title">总练习题量</div>
            <p>{data.summary.totalAttempts} 题</p>
          </div>
          <div className="card">
            <div className="section-title">总体正确率</div>
            <p>{data.summary.accuracy}%</p>
          </div>
          <div className="card">
            <div className="section-title">近 7 天正确率</div>
            <p>{data.summary.last7Accuracy}%</p>
          </div>
        </div>
        <div className="grid grid-3" style={{ marginTop: 12 }}>
          <div className="card">
            <div className="section-title">近 7 天练习</div>
            <p>{data.summary.last7Total} 题</p>
          </div>
          <div className="card">
            <div className="section-title">已完成作业</div>
            <p>{data.summary.assignmentsCompleted} 份</p>
          </div>
        </div>
      </Card>

      <Card title="学科掌握度" tag="学科">
        {data.subjects.length ? (
          <div className="grid" style={{ gap: 12 }}>
            {data.subjects.map((item) => (
              <div className="card" key={item.subject}>
                <div className="section-title">{SUBJECT_LABELS[item.subject] ?? item.subject}</div>
                <p>正确率 {item.accuracy}%</p>
                <p>练习 {item.total} 题</p>
              </div>
            ))}
          </div>
        ) : (
          <p>暂无练习数据。</p>
        )}
      </Card>

      <Card title="薄弱知识点" tag="薄弱">
        {data.weakPoints.length ? (
          <div className="grid" style={{ gap: 12 }}>
            {data.weakPoints.map((item) => (
              <div className="card" key={item.id}>
                <div className="section-title">{item.title}</div>
                <p>
                  {SUBJECT_LABELS[item.subject] ?? item.subject} · {item.grade} 年级
                </p>
                <p>正确率 {item.ratio}% · 练习 {item.total} 次</p>
              </div>
            ))}
          </div>
        ) : (
          <p>暂无薄弱点记录。</p>
        )}
      </Card>
    </div>
  );
}
