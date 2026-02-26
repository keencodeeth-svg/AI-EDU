"use client";

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

  return (
    <Card title="知识点列表（分类筛选）" tag="列表">
      <div className="card" style={{ padding: 12, marginBottom: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
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

      <div className="split-rail-layout" style={{ marginTop: 12 }}>
        <div className="side-rail card" style={{ padding: 12 }}>
          <div className="section-title" style={{ marginTop: 0 }}>
            分类导航
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            {tree.map((subjectNode, index) => (
              <details
                key={subjectNode.subject}
                open={query.subject === subjectNode.subject || (query.subject === "all" && index === 0)}
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

        <div className="masonry-list">
          {loading ? <p>加载中...</p> : null}
          {!loading && list.length === 0 ? (
            <div className="card full-span">
              <div className="section-title" style={{ marginTop: 0 }}>
                暂无结果
              </div>
              <div style={{ color: "var(--ink-1)", fontSize: 13 }}>请调整筛选条件后重试。</div>
            </div>
          ) : null}
          {list.map((item) => (
            <div className="card" key={item.id} style={{ display: "grid", gap: 8 }}>
              <div className="section-title" style={{ marginTop: 0 }}>
                {item.title}
              </div>
              <div style={{ fontSize: 12, color: "var(--ink-1)", lineHeight: 1.5 }}>
                {SUBJECT_LABELS[item.subject] ?? item.subject} · {item.grade} 年级 · {item.unit ?? "未分单元"} ·{" "}
                {item.chapter}
              </div>
              <div>
                <button className="button secondary" type="button" onClick={() => onDelete(item.id)}>
                  删除
                </button>
              </div>
            </div>
          ))}

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
