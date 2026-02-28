"use client";

import { useEffect, useMemo, useState } from "react";
import Card from "@/components/Card";
import EduIcon from "@/components/EduIcon";
import { SUBJECT_LABELS } from "@/lib/constants";

type FavoriteItem = {
  id: string;
  questionId: string;
  tags: string[];
  updatedAt: string;
  question?: {
    id: string;
    stem: string;
    subject: string;
    grade: string;
    knowledgePointTitle: string;
  } | null;
};

export default function StudentFavoritesPage() {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [filterTag, setFilterTag] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"compact" | "detailed">("compact");
  const [showAll, setShowAll] = useState(false);

  async function load() {
    const res = await fetch("/api/favorites?includeQuestion=1");
    const data = await res.json();
    setFavorites(data?.data ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function editTags(item: FavoriteItem) {
    const input = prompt("输入标签（用逗号分隔）", item.tags?.join(",") ?? "");
    if (input === null) return;
    const tags = input
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    await fetch(`/api/favorites/${item.questionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags })
    });
    load();
  }

  async function remove(item: FavoriteItem) {
    await fetch(`/api/favorites/${item.questionId}`, { method: "DELETE" });
    load();
  }

  const subjectOptions = useMemo(() => {
    const subjects = Array.from(
      new Set(favorites.map((item) => item.question?.subject).filter((value): value is string => Boolean(value)))
    );
    return subjects.sort((a, b) =>
      (SUBJECT_LABELS[a] ?? a).localeCompare(SUBJECT_LABELS[b] ?? b, "zh-CN")
    );
  }, [favorites]);

  const topTags = useMemo(() => {
    const counter = new Map<string, number>();
    favorites.forEach((item) => {
      item.tags?.forEach((tag) => counter.set(tag, (counter.get(tag) ?? 0) + 1));
    });
    return Array.from(counter.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
  }, [favorites]);

  const filtered = useMemo(() => {
    return favorites
      .filter((item) => {
        if (filterTag && !item.tags?.some((tag) => tag.includes(filterTag))) return false;
        if (subjectFilter !== "all" && item.question?.subject !== subjectFilter) return false;
        return true;
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [favorites, filterTag, subjectFilter]);

  const visibleFavorites = showAll ? filtered : filtered.slice(0, 12);

  function renderCompactFavorite(item: FavoriteItem) {
    return (
      <div
        className="card"
        key={item.id}
        style={{
          padding: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            className="section-title"
            style={{
              fontSize: 14,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap"
            }}
            title={item.question?.stem ?? "题目"}
          >
            {item.question?.stem ?? "题目"}
          </div>
          <div style={{ fontSize: 12, color: "var(--ink-1)", marginTop: 4, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span>{SUBJECT_LABELS[item.question?.subject ?? ""] ?? item.question?.subject ?? "未分类"}</span>
            <span>{item.question?.knowledgePointTitle ?? "未关联知识点"}</span>
            <span>标签：{item.tags?.length ? item.tags.join("、") : "未设置"}</span>
          </div>
        </div>
        <div className="cta-row" style={{ marginTop: 0 }}>
          <button className="button secondary" onClick={() => editTags(item)}>
            标签
          </button>
          <button className="button ghost" onClick={() => remove(item)}>
            删除
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid" style={{ gap: 18 }}>
      <div className="section-head">
        <div>
          <h2>题目收藏夹</h2>
          <div className="section-sub">收藏题目 + 自定义标签，便于复习。</div>
        </div>
        <span className="chip">收藏</span>
      </div>

      <Card title="收藏筛选" tag="标签">
        <div className="grid grid-3">
          <label>
            <div className="section-title">标签关键字</div>
            <input
              value={filterTag}
              onChange={(event) => {
                setFilterTag(event.target.value);
                setShowAll(false);
              }}
              placeholder="例如：分数、应用题"
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
            />
          </label>
          <label>
            <div className="section-title">学科筛选</div>
            <select
              className="select-control"
              value={subjectFilter}
              onChange={(event) => {
                setSubjectFilter(event.target.value);
                setShowAll(false);
              }}
            >
              <option value="all">全部学科</option>
              {subjectOptions.map((subject) => (
                <option key={subject} value={subject}>
                  {SUBJECT_LABELS[subject] ?? subject}
                </option>
              ))}
            </select>
          </label>
          <div className="card" style={{ alignSelf: "end" }}>
            <div className="section-title">收藏总数</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>
              {favorites.length} <span style={{ fontSize: 12, color: "var(--ink-1)" }}>/ 当前 {filtered.length}</span>
            </div>
          </div>
        </div>
        {topTags.length ? (
          <div className="pill-list" style={{ marginTop: 10 }}>
            {topTags.map(([tag, count]) => (
              <button
                key={tag}
                type="button"
                className="pill"
                onClick={() => {
                  setFilterTag(tag);
                  setShowAll(false);
                }}
                style={{ cursor: "pointer", border: "none" }}
              >
                {tag} · {count}
              </button>
            ))}
          </div>
        ) : null}
      </Card>

      <Card title="我的收藏" tag="清单">
        <div className="toolbar-wrap" style={{ marginBottom: 10 }}>
          <button
            className={viewMode === "compact" ? "button secondary" : "button ghost"}
            type="button"
            onClick={() => setViewMode("compact")}
          >
            紧凑视图
          </button>
          <button
            className={viewMode === "detailed" ? "button secondary" : "button ghost"}
            type="button"
            onClick={() => setViewMode("detailed")}
          >
            详细视图
          </button>
        </div>

        {filtered.length === 0 ? <p>暂无收藏记录。</p> : null}
        {filtered.length ? (
          <>
            {viewMode === "compact" ? (
              <div className="grid" style={{ gap: 8 }}>
                {visibleFavorites.map((item) => renderCompactFavorite(item))}
              </div>
            ) : (
              <div className="grid" style={{ gap: 10 }}>
                {visibleFavorites.map((item) => (
                  <div className="card" key={item.id}>
                    <div className="feature-card">
                      <EduIcon name="book" />
                      <div>
                        <div className="section-title">{item.question?.stem ?? "题目"}</div>
                        <div style={{ fontSize: 12, color: "var(--ink-1)" }}>
                          {item.question?.knowledgePointTitle ?? "知识点"} · {item.question?.grade ?? "-"} 年级 ·{" "}
                          {SUBJECT_LABELS[item.question?.subject ?? ""] ?? item.question?.subject ?? "未分类"}
                        </div>
                      </div>
                    </div>
                    <div style={{ marginTop: 8, fontSize: 12, color: "var(--ink-1)" }}>
                      标签：{item.tags?.length ? item.tags.join("、") : "未设置"}
                    </div>
                    <div className="cta-row" style={{ marginTop: 10 }}>
                      <button className="button secondary" onClick={() => editTags(item)}>
                        编辑标签
                      </button>
                      <button className="button secondary" onClick={() => remove(item)}>
                        取消收藏
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {filtered.length > 12 ? (
              <button className="button ghost" type="button" onClick={() => setShowAll((prev) => !prev)}>
                {showAll ? "收起" : `展开全部（${filtered.length}）`}
              </button>
            ) : null}
          </>
        ) : null}
      </Card>
    </div>
  );
}
