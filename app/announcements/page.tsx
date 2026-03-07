"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Card from "@/components/Card";
import EduIcon from "@/components/EduIcon";
import { SUBJECT_LABELS } from "@/lib/constants";
import type {
  AnnouncementClassListResponse,
  AnnouncementClassOption,
  AnnouncementItem,
  AnnouncementListResponse,
  AnnouncementSubmitResponse,
  AuthMeResponse,
  AppUserRole
} from "./types";

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [userRole, setUserRole] = useState<AppUserRole>(null);
  const [classes, setClasses] = useState<AnnouncementClassOption[]>([]);
  const [classId, setClassId] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadAnnouncements = useCallback(async () => {
    const res = await fetch("/api/announcements");
    const data = (await res.json()) as AnnouncementListResponse;
    if (res.ok) {
      setAnnouncements(data.data ?? []);
    }
  }, []);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data: AuthMeResponse) => setUserRole(data.user?.role ?? null));
    void loadAnnouncements();
  }, [loadAnnouncements]);

  useEffect(() => {
    if (userRole === "teacher") {
      fetch("/api/teacher/classes")
        .then((res) => res.json())
        .then((data: AnnouncementClassListResponse) => {
          setClasses(data.data ?? []);
          if (data.data?.length) {
            setClassId(data.data[0].id);
          }
        });
    }
  }, [userRole]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);
    const res = await fetch("/api/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classId, title, content })
    });
    const data = (await res.json()) as AnnouncementSubmitResponse;
    if (!res.ok) {
      setError(data.error ?? "发布失败");
    } else {
      setMessage("公告已发布");
      setTitle("");
      setContent("");
      await loadAnnouncements();
    }
    setLoading(false);
  }

  return (
    <div className="grid" style={{ gap: 18 }}>
      <div className="section-head">
        <div>
          <h2>班级公告</h2>
          <div className="section-sub">发布课程提醒与班级通知。</div>
        </div>
        <span className="chip">公告</span>
      </div>

      {userRole === "teacher" ? (
        <Card title="发布公告" tag="教师">
          <div className="feature-card">
            <EduIcon name="board" />
            <p>向班级学生与家长同步重要通知。</p>
          </div>
          {classes.length === 0 ? (
            <p>暂无班级，请先在教师端创建班级。</p>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
              <label>
                <div className="section-title">选择班级</div>
                <select
                  value={classId}
                  onChange={(event) => setClassId(event.target.value)}
                  style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
                >
                  {classes.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} · {SUBJECT_LABELS[item.subject] ?? item.subject} · {item.grade} 年级
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <div className="section-title">公告标题</div>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
                />
              </label>
              <label>
                <div className="section-title">公告内容</div>
                <textarea
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  rows={4}
                  style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
                />
              </label>
              {error ? <div style={{ color: "#b42318", fontSize: 13 }}>{error}</div> : null}
              {message ? <div style={{ color: "#027a48", fontSize: 13 }}>{message}</div> : null}
              <button className="button primary" type="submit" disabled={loading}>
                {loading ? "发布中..." : "发布公告"}
              </button>
            </form>
          )}
        </Card>
      ) : null}

      <Card title="公告列表" tag="最新">
        {announcements.length ? (
          <div className="grid" style={{ gap: 12 }}>
            {announcements.map((item) => (
              <div className="card" key={item.id}>
                <div className="card-header">
                  <div className="section-title">{item.title}</div>
                  <span className="card-tag">{new Date(item.createdAt).toLocaleDateString("zh-CN")}</span>
                </div>
                <div className="section-sub">
                  {item.className ?? "-"} · {SUBJECT_LABELS[item.classSubject ?? ""] ?? item.classSubject ?? "-"} ·{" "}
                  {item.classGrade ?? "-"} 年级
                </div>
                <p style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>{item.content}</p>
              </div>
            ))}
          </div>
        ) : (
          <p>暂无公告。</p>
        )}
      </Card>
    </div>
  );
}
