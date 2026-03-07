import type { Dispatch, SetStateAction } from "react";
import Card from "@/components/Card";
import { SUBJECT_LABELS } from "@/lib/constants";
import type { LibraryContentFilter, LibraryFacets, LibraryMeta, LibrarySummary } from "../types";

const fieldStyle = {
  width: "100%",
  padding: 10,
  borderRadius: 10,
  border: "1px solid var(--stroke)"
} as const;

type LibraryFiltersPanelProps = {
  subjectList: string[];
  facets: LibraryFacets;
  subjectFilter: string;
  setSubjectFilter: Dispatch<SetStateAction<string>>;
  contentFilter: LibraryContentFilter;
  setContentFilter: Dispatch<SetStateAction<LibraryContentFilter>>;
  keyword: string;
  setKeyword: Dispatch<SetStateAction<string>>;
  pageSize: number;
  setPageSize: Dispatch<SetStateAction<number>>;
  meta: LibraryMeta;
  summary: LibrarySummary;
  loading: boolean;
  onPrevPage: () => void;
  onNextPage: () => void;
};

export default function LibraryFiltersPanel({
  subjectList,
  facets,
  subjectFilter,
  setSubjectFilter,
  contentFilter,
  setContentFilter,
  keyword,
  setKeyword,
  pageSize,
  setPageSize,
  meta,
  summary,
  loading,
  onPrevPage,
  onNextPage
}: LibraryFiltersPanelProps) {
  return (
    <Card title="分学科管理" tag="筛选">
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
        <button className={subjectFilter === "all" ? "button secondary" : "button ghost"} type="button" onClick={() => setSubjectFilter("all")}>
          全部学科
        </button>
        {subjectList.map((subject) => (
          <button key={subject} className={subjectFilter === subject ? "button secondary" : "button ghost"} type="button" onClick={() => setSubjectFilter(subject)}>
            {SUBJECT_LABELS[subject] ?? subject}
          </button>
        ))}
      </div>
      <div className="grid grid-3">
        <label>
          <div className="section-title">学科</div>
          <select value={subjectFilter} onChange={(event) => setSubjectFilter(event.target.value)} style={fieldStyle}>
            <option value="all">全部学科</option>
            {subjectList.map((subject) => (
              <option key={subject} value={subject}>
                {SUBJECT_LABELS[subject] ?? subject}（{facets.subjects.find((item) => item.value === subject)?.count ?? 0}）
              </option>
            ))}
          </select>
        </label>
        <label>
          <div className="section-title">类型</div>
          <select value={contentFilter} onChange={(event) => setContentFilter(event.target.value as LibraryContentFilter)} style={fieldStyle}>
            <option value="all">全部类型</option>
            <option value="textbook">教材</option>
            <option value="courseware">课件</option>
            <option value="lesson_plan">教案</option>
          </select>
        </label>
        <label>
          <div className="section-title">关键词</div>
          <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="按标题或简介搜索" style={fieldStyle} />
        </label>
      </div>
      <div className="cta-row" style={{ marginTop: 10 }}>
        <label style={{ display: "grid", gap: 4 }}>
          <span className="section-title">每页数量</span>
          <select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))} style={{ padding: 8, borderRadius: 10, border: "1px solid var(--stroke)" }}>
            <option value={16}>16</option>
            <option value={12}>12</option>
            <option value={24}>24</option>
            <option value={48}>48</option>
          </select>
        </label>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "flex-end" }}>
          <button className="button ghost" type="button" onClick={onPrevPage} disabled={!meta.hasPrev || loading}>
            上一页
          </button>
          <button className="button ghost" type="button" onClick={onNextPage} disabled={!meta.hasNext || loading}>
            下一页
          </button>
        </div>
      </div>
      <div style={{ fontSize: 12, color: "var(--ink-1)", marginTop: 10 }}>
        当前筛选结果：共 {meta.total} 条（教材 {summary.textbookCount}，课件 {summary.coursewareCount}，教案 {summary.lessonPlanCount}）· 第 {meta.page} / {Math.max(meta.totalPages, 1)} 页
      </div>
    </Card>
  );
}
