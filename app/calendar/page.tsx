"use client";

import { useEffect, useState } from "react";
import Card from "@/components/Card";
import EduIcon from "@/components/EduIcon";
import type { CalendarItem, CalendarItemType, CalendarResponse } from "./types";

const TYPE_LABELS: Record<CalendarItemType, string> = {
  assignment: "作业",
  announcement: "公告",
  correction: "订正"
};

export default function CalendarPage() {
  const [items, setItems] = useState<CalendarItem[]>([]);

  useEffect(() => {
    fetch("/api/calendar")
      .then((res) => res.json())
      .then((data: CalendarResponse) => setItems(data.data ?? []));
  }, []);

  return (
    <div className="grid" style={{ gap: 18 }}>
      <div className="section-head">
        <div>
          <h2>学习日程</h2>
          <div className="section-sub">查看近 30 天的作业、公告与订正任务。</div>
        </div>
        <span className="chip">日程</span>
      </div>

      <Card title="近期安排" tag="时间线">
        <div className="feature-card">
          <EduIcon name="chart" />
          <p>集中展示班级作业、公告与订正提醒。</p>
        </div>
        {items.length ? (
          <div className="grid" style={{ gap: 10 }}>
            {items.map((item) => (
              <div className="card" key={`${item.type}-${item.id}`}>
                <div className="card-header">
                  <div className="section-title">{item.title}</div>
                  <span className="card-tag">{TYPE_LABELS[item.type] ?? item.type}</span>
                </div>
                <div style={{ fontSize: 12, color: "var(--ink-1)" }}>
                  {new Date(item.date).toLocaleDateString("zh-CN")} {item.className ? `· ${item.className}` : ""}
                </div>
                {item.status ? (
                  <div className="pill-list" style={{ marginTop: 8 }}>
                    <span className="pill">{item.status === "completed" ? "已完成" : "待完成"}</span>
                  </div>
                ) : null}
                {item.description ? <p style={{ marginTop: 8 }}>{item.description}</p> : null}
              </div>
            ))}
          </div>
        ) : (
          <p>暂无日程数据。</p>
        )}
      </Card>
    </div>
  );
}
