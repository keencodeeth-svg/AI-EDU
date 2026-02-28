"use client";

import { useEffect, useMemo, useState } from "react";
import Card from "@/components/Card";
import { SUBJECT_LABELS } from "@/lib/constants";
import type {
  KnowledgePoint,
  KnowledgePointFacets,
  KnowledgePointQuery,
  KnowledgePointTreeNode
} from "../types";

type Props = {
  query: KnowledgePointQuery;
  patchQuery: (next: Partial<KnowledgePointQuery>) => void;
  facets: KnowledgePointFacets;
  tree: KnowledgePointTreeNode[];
  loading: boolean;
  list: KnowledgePoint[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
  pageSize: number;
  setPageSize: (value: number) => void;
  setPage: (updater: (current: number) => number) => void;
  pageStart: number;
  pageEnd: number;
  onDelete: (id: string) => Promise<void>;
};

type KpResultGroup = {
  id: string;
  subject: string;
  grade: string;
  unit: string;
  label: string;
  items: KnowledgePoint[];
};

export default function KnowledgePointsListPanel({
  query,
  patchQuery,
  facets,
  tree,
  loading,
  list,
  meta,
  pageSize,
  setPageSize,
  setPage,
  pageStart,
  pageEnd,
  onDelete
}: Props) {
  const [resultView, setResultView] = useState<"compact" | "detailed">("compact");
  const [openResultGroups, setOpenResultGroups] = useState<Record<string, boolean>>({});

  const controlStyle = {
    width: "100%",
    padding: 9,
    borderRadius: 10,
    border: "1px solid var(--stroke)"
  } as const;

  const activeFilters = [
    query.subject !== "all" ? `学科：${SUBJECT_LABELS[query.subject] ?? query.subject}` : null,
    query.grade !== "all" ? `年级：${query.grade}` : null,
    query.unit !== "all" ? `单元：${query.unit}` : null,
    query.chapter !== "all" ? `章节：${query.chapter}` : null,
    query.search.trim() ? `关键词：${query.search.trim()}` : null
  ].filter(Boolean) as string[];

  const groupedResults = useMemo(() => {
    const buckets = new Map<string, KpResultGroup>();
    list.forEach((item) => {
      const unit = item.unit ?? "未分单元";
      const id = `${item.subject}|${item.grade}|${unit}`;
      const current = buckets.get(id) ?? {
        id,
        subject: item.subject,
        grade: item.grade,
        unit,
        label: `${SUBJECT_LABELS[item.subject] ?? item.subject} · ${item.grade} 年级 · ${unit}`,
        items: []
      };
      current.items.push(item);
      buckets.set(id, current);
    });

    return Array.from(buckets.values())
      .map((group) => ({
        ...group,
        items: group.items.slice().sort((a, b) => {
          const chapterOrder = (a.chapter ?? "").localeCompare(b.chapter ?? "", "zh-CN");
          if (chapterOrder !== 0) return chapterOrder;
          return a.title.localeCompare(b.title, "zh-CN");
        })
      }))
      .sort((a, b) => {
        const subjectOrder = (SUBJECT_LABELS[a.subject] ?? a.subject).localeCompare(
          SUBJECT_LABELS[b.subject] ?? b.subject,
          "zh-CN"
        );
        if (subjectOrder !== 0) return subjectOrder;
        const gradeOrder = a.grade.localeCompare(b.grade, "zh-CN");
        if (gradeOrder !== 0) return gradeOrder;
        return a.unit.localeCompare(b.unit, "zh-CN");
      });
  }, [list]);

  useEffect(() => {
    setOpenResultGroups((prev) => {
      const next: Record<string, boolean> = {};
      groupedResults.forEach((group) => {
        if (typeof prev[group.id] === "boolean") {
          next[group.id] = prev[group.id];
          return;
        }
        next[group.id] = query.subject !== "all" && query.subject === group.subject;
      });
      return next;
    });
  }, [groupedResults, query.subject]);

  function patchGroupOpen(groupId: string, open: boolean) {
    setOpenResultGroups((prev) => ({ ...prev, [groupId]: open }));
  }

  function setAllResultGroups(open: boolean) {
    const next: Record<string, boolean> = {};
    groupedResults.forEach((group) => {
      next[group.id] = open;
    });
    setOpenResultGroups(next);
  }

  return (
    <Card title="知识点列表（分类筛选）" tag="列表">
      <div className="card" style={{ padding: 12, marginBottom: 10 }}>
        <div
          style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}
        >
          <div style={{ fontSize: 12, color: "var(--ink-1)" }}>
            共 {meta.total} 条，当前 {pageStart}-{pageEnd}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {activeFilters.length ? (
              activeFilters.map((item) => (
                <span className="badge" key={item}>
                  {item}
                </span>
              ))
            ) : (
              <span className="badge">当前为全部知识点</span>
            )}
          </div>
        </div>
      </div>

      <div className="grid" style={{ gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
        <label>
          <div className="section-title">搜索</div>
          <input
            value={query.search}
            onChange={(event) => patchQuery({ search: event.target.value })}
            placeholder="知识点 / 章节 / 单元"
            style={controlStyle}
          />
        </label>
        <label>
          <div className="section-title">学科</div>
          <select
            value={query.subject}
            onChange={(event) => patchQuery({ subject: event.target.value, grade: "all", unit: "all" })}
            style={controlStyle}
          >
            <option value="all">全部学科</option>
            {facets.subjects.map((item) => (
              <option key={item.value} value={item.value}>
                {(SUBJECT_LABELS[item.value] ?? item.value) + ` (${item.count})`}
              </option>
            ))}
          </select>
        </label>
        <label>
          <div className="section-title">年级</div>
          <select
            value={query.grade}
            onChange={(event) => patchQuery({ grade: event.target.value, unit: "all" })}
            style={controlStyle}
          >
            <option value="all">全部年级</option>
            {facets.grades.map((item) => (
              <option key={item.value} value={item.value}>
                {`${item.value} 年级 (${item.count})`}
              </option>
            ))}
          </select>
        </label>
        <label>
          <div className="section-title">单元</div>
          <select
            value={query.unit}
            onChange={(event) => patchQuery({ unit: event.target.value })}
            style={controlStyle}
          >
            <option value="all">全部单元</option>
            {facets.units.map((item) => (
              <option key={item.value} value={item.value}>
                {`${item.value} (${item.count})`}
              </option>
            ))}
          </select>
        </label>
        <label>
          <div className="section-title">章节</div>
          <select
            value={query.chapter}
            onChange={(event) => patchQuery({ chapter: event.target.value })}
            style={controlStyle}
          >
            <option value="all">全部章节</option>
            {facets.chapters.map((item) => (
              <option key={item.value} value={item.value}>
                {`${item.value} (${item.count})`}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <span className="section-title" style={{ marginBottom: 0 }}>
            每页
          </span>
          <select
            value={pageSize}
            onChange={(event) => {
              setPageSize(Number(event.target.value));
              setPage(() => 1);
            }}
            style={controlStyle}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </label>
      </div>

      <div className="cta-row" style={{ marginTop: 10 }}>
        <button
          className="button ghost"
          type="button"
          onClick={() =>
            patchQuery({
              subject: "all",
              grade: "all",
              unit: "all",
              chapter: "all",
              search: ""
            })
          }
        >
          清空筛选
        </button>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          <button
            className={query.subject === "all" ? "button secondary" : "button ghost"}
            type="button"
            onClick={() => patchQuery({ subject: "all", grade: "all", unit: "all" })}
          >
            全部
          </button>
          {tree.slice(0, 6).map((subjectNode) => (
            <button
              key={subjectNode.subject}
              className={query.subject === subjectNode.subject ? "button secondary" : "button ghost"}
              type="button"
              onClick={() => patchQuery({ subject: subjectNode.subject, grade: "all", unit: "all" })}
            >
              {SUBJECT_LABELS[subjectNode.subject] ?? subjectNode.subject}({subjectNode.count})
            </button>
          ))}
        </div>
      </div>

      <div className="cta-row" style={{ marginTop: 8 }}>
        <span className="badge">结果视图</span>
        <button
          className={resultView === "compact" ? "button secondary" : "button ghost"}
          type="button"
          onClick={() => setResultView("compact")}
        >
          紧凑模式
        </button>
        <button
          className={resultView === "detailed" ? "button secondary" : "button ghost"}
          type="button"
          onClick={() => setResultView("detailed")}
        >
          详细模式
        </button>
        <button className="button ghost" type="button" onClick={() => setAllResultGroups(false)}>
          收起全部分组
        </button>
        <button className="button ghost" type="button" onClick={() => setAllResultGroups(true)}>
          展开全部分组
        </button>
      </div>

      <div className="split-rail-layout" style={{ marginTop: 12 }}>
        <div className="side-rail card" style={{ padding: 12 }}>
          <div className="section-title" style={{ marginTop: 0 }}>
            分类导航（默认收起）
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            {tree.map((subjectNode) => (
              <details
                key={subjectNode.subject}
                open={query.subject === subjectNode.subject}
                style={{
                  border: "1px solid var(--stroke)",
                  borderRadius: 10,
                  background: "rgba(255, 255, 255, 0.6)",
                  padding: 8
                }}
              >
                <summary
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    cursor: "pointer",
                    listStyle: "none",
                    fontSize: 13,
                    fontWeight: 700
                  }}
                >
                  <span>{SUBJECT_LABELS[subjectNode.subject] ?? subjectNode.subject}</span>
                  <span className="badge">{subjectNode.count}</span>
                </summary>
                <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
                  {subjectNode.grades.map((gradeNode) => (
                    <div key={`${subjectNode.subject}-${gradeNode.grade}`} className="card" style={{ padding: 8 }}>
                      <button
                        className={query.grade === gradeNode.grade ? "button secondary" : "button ghost"}
                        type="button"
                        onClick={() =>
                          patchQuery({
                            subject: subjectNode.subject,
                            grade: gradeNode.grade,
                            unit: "all"
                          })
                        }
                        style={{ width: "100%", justifyContent: "space-between" }}
                      >
                        <span>{gradeNode.grade} 年级</span>
                        <span>{gradeNode.count}</span>
                      </button>
                      <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {gradeNode.units.slice(0, 10).map((unitNode) => (
                          <button
                            key={`${subjectNode.subject}-${gradeNode.grade}-${unitNode.unit}`}
                            className="badge"
                            type="button"
                            onClick={() =>
                              patchQuery({
                                subject: subjectNode.subject,
                                grade: gradeNode.grade,
                                unit: unitNode.unit
                              })
                            }
                            style={{ border: "none", cursor: "pointer" }}
                          >
                            {unitNode.unit} · {unitNode.count}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            ))}
          </div>
        </div>

        <div className="masonry-list" style={{ gridTemplateColumns: "1fr" }}>
          {loading ? (
            <div className="empty-state full-span">
              <p className="empty-state-title">加载中</p>
              <p style={{ margin: 0 }}>正在读取知识点列表。</p>
            </div>
          ) : null}
          {!loading && list.length === 0 ? (
            <div className="card full-span">
              <div className="section-title" style={{ marginTop: 0 }}>
                暂无结果
              </div>
              <div style={{ color: "var(--ink-1)", fontSize: 13 }}>请调整筛选条件后重试。</div>
            </div>
          ) : null}

          {!loading &&
            groupedResults.map((group) => {
              const chapterCount = new Set(group.items.map((item) => item.chapter)).size;
              return (
                <details
                  key={group.id}
                  className="card full-span"
                  open={openResultGroups[group.id] ?? false}
                  onToggle={(event) => patchGroupOpen(group.id, event.currentTarget.open)}
                  style={{ padding: 12 }}
                >
                  <summary
                    style={{
                      cursor: "pointer",
                      listStyle: "none",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 8,
                      fontWeight: 700
                    }}
                  >
                    <span>{group.label}</span>
                    <span className="badge">{group.items.length} 个知识点</span>
                  </summary>
                  <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
                    <span className="pill">章节数 {chapterCount}</span>
                  </div>

                  {resultView === "compact" ? (
                    <div className="grid" style={{ gap: 8, marginTop: 10 }}>
                      {group.items.map((item) => (
                        <div
                          key={item.id}
                          style={{
                            border: "1px solid var(--stroke)",
                            borderRadius: 12,
                            background: "rgba(255,255,255,0.72)",
                            padding: 10
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                            <div style={{ minWidth: 0 }}>
                              <div
                                style={{
                                  fontSize: 14,
                                  fontWeight: 700,
                                  display: "-webkit-box",
                                  WebkitLineClamp: 1,
                                  WebkitBoxOrient: "vertical",
                                  overflow: "hidden"
                                }}
                              >
                                {item.title}
                              </div>
                              <div style={{ marginTop: 4, fontSize: 12, color: "var(--ink-1)" }}>
                                {SUBJECT_LABELS[item.subject] ?? item.subject} · {item.grade} 年级 ·{" "}
                                {item.unit ?? "未分单元"} · {item.chapter}
                              </div>
                            </div>
                            <button className="button secondary" type="button" onClick={() => onDelete(item.id)}>
                              删除
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div
                      className="grid"
                      style={{ gap: 10, gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", marginTop: 10 }}
                    >
                      {group.items.map((item) => (
                        <div className="card" key={item.id} style={{ display: "grid", gap: 8 }}>
                          <div className="section-title" style={{ marginTop: 0 }}>
                            {item.title}
                          </div>
                          <div style={{ fontSize: 12, color: "var(--ink-1)", lineHeight: 1.5 }}>
                            {SUBJECT_LABELS[item.subject] ?? item.subject} · {item.grade} 年级 ·{" "}
                            {item.unit ?? "未分单元"} · {item.chapter}
                          </div>
                          <div>
                            <button className="button secondary" type="button" onClick={() => onDelete(item.id)}>
                              删除
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </details>
              );
            })}

          <div className="card full-span" style={{ padding: 14 }}>
            <div className="cta-row" style={{ marginTop: 0, justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 12, color: "var(--ink-1)" }}>
                共 {meta.total} 条，当前 {pageStart}-{pageEnd}
              </div>
              <div className="cta-row" style={{ marginTop: 0 }}>
                <button
                  className="button ghost"
                  type="button"
                  disabled={meta.page <= 1}
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                >
                  上一页
                </button>
                <span className="badge">
                  第 {meta.page}/{Math.max(meta.totalPages, 1)} 页
                </span>
                <button
                  className="button ghost"
                  type="button"
                  disabled={meta.page >= meta.totalPages}
                  onClick={() => setPage((prev) => Math.min(meta.totalPages, prev + 1))}
                >
                  下一页
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
