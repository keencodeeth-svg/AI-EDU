"use client";

import { useEffect, useState } from "react";
import Card from "@/components/Card";
import { trackEvent } from "@/lib/analytics-client";

export default function ReportPage() {
  const [report, setReport] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [trackedReportView, setTrackedReportView] = useState(false);
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [chapterFilter, setChapterFilter] = useState("all");
  const [sortMode, setSortMode] = useState("ratio-asc");

  useEffect(() => {
    fetch("/api/report/weekly")
      .then((res) => res.json())
      .then((data) => setReport(data));
    fetch("/api/report/profile")
      .then((res) => res.json())
      .then((data) => setProfile(data));
  }, []);

  useEffect(() => {
    if (!report || trackedReportView) return;
    trackEvent({
      eventName: "report_weekly_view",
      page: "/report",
      props: {
        hasError: Boolean(report.error),
        total: report?.stats?.total ?? null,
        accuracy: report?.stats?.accuracy ?? null
      }
    });
    setTrackedReportView(true);
  }, [report, trackedReportView]);

  const ratioColor = (ratio: number) => {
    const hue = Math.min(120, Math.max(0, Math.round((ratio / 100) * 120)));
    return `hsl(${hue}, 70%, 88%)`;
  };

  const chapterOptions: string[] = (() => {
    if (!profile?.subjects?.length) return [];
    const groups =
      subjectFilter === "all"
        ? profile.subjects
        : profile.subjects.filter((group: any) => group.subject === subjectFilter);
    const chapters = groups
      .flatMap((group: any) => group.items.map((item: any) => item.chapter))
      .filter((item: any): item is string => typeof item === "string" && item.length > 0);
    return Array.from(new Set(chapters)) as string[];
  })();

  const displaySubjects = profile?.subjects?.length
    ? subjectFilter === "all"
      ? profile.subjects
      : profile.subjects.filter((group: any) => group.subject === subjectFilter)
    : [];

  if (!report) {
    return <Card title="学习报告">加载中...</Card>;
  }

  if (report.error) {
    return <Card title="学习报告">请先登录学生账号。</Card>;
  }

  return (
    <div className="grid" style={{ gap: 18 }}>
      <div className="section-head">
        <div>
          <h2>学习报告</h2>
          <div className="section-sub">学习数据与薄弱点复盘。</div>
        </div>
        <span className="chip">近 7 天</span>
      </div>

      <Card title="学习报告" tag="统计">
        <div className="grid grid-2">
          <div className="card">
            <div className="section-title">本周练习题量</div>
            <p>{report.stats.total} 题</p>
          </div>
          <div className="card">
            <div className="section-title">正确率</div>
            <p>{report.stats.accuracy}%</p>
          </div>
        </div>
        <div className="grid grid-2" style={{ marginTop: 12 }}>
          <div className="card">
            <div className="section-title">上周练习题量</div>
            <p>{report.previousStats?.total ?? 0} 题</p>
          </div>
          <div className="card">
            <div className="section-title">上周正确率</div>
            <p>{report.previousStats?.accuracy ?? 0}%</p>
          </div>
        </div>
      </Card>
      <Card title="学习画像 · 知识点掌握热力图" tag="画像">
        {!profile ? <p>加载中...</p> : null}
        {profile?.error ? <p>学习画像加载失败。</p> : null}
        {profile?.subjects?.length ? (
          <div className="grid" style={{ gap: 16 }}>
            <div className="card" style={{ display: "grid", gap: 10 }}>
              <div className="section-title">筛选</div>
              <div className="grid grid-3">
                <label>
                  <div style={{ fontSize: 12, color: "var(--ink-1)" }}>学科</div>
                  <select
                    value={subjectFilter}
                    onChange={(event) => {
                      setSubjectFilter(event.target.value);
                      setChapterFilter("all");
                    }}
                    style={{ width: "100%", padding: 8, borderRadius: 10, border: "1px solid var(--stroke)" }}
                  >
                    <option value="all">全部</option>
                    {profile.subjects.map((group: any) => (
                      <option key={group.subject} value={group.subject}>
                        {group.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <div style={{ fontSize: 12, color: "var(--ink-1)" }}>章节</div>
                  <select
                    value={chapterFilter}
                    onChange={(event) => setChapterFilter(event.target.value)}
                    style={{ width: "100%", padding: 8, borderRadius: 10, border: "1px solid var(--stroke)" }}
                  >
                    <option value="all">全部</option>
                    {chapterOptions.map((chapter) => (
                      <option key={chapter} value={chapter}>
                        {chapter}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <div style={{ fontSize: 12, color: "var(--ink-1)" }}>排序</div>
                  <select
                    value={sortMode}
                    onChange={(event) => setSortMode(event.target.value)}
                    style={{ width: "100%", padding: 8, borderRadius: 10, border: "1px solid var(--stroke)" }}
                  >
                    <option value="ratio-asc">正确率从低到高</option>
                    <option value="ratio-desc">正确率从高到低</option>
                    <option value="total-desc">练习次数从多到少</option>
                  </select>
                </label>
              </div>
            </div>
            {displaySubjects.map((group: any) => {
              const filteredItems = group.items
                .filter((item: any) => (chapterFilter === "all" ? true : item.chapter === chapterFilter))
                .sort((a: any, b: any) => {
                  if (sortMode === "ratio-desc") return b.ratio - a.ratio;
                  if (sortMode === "total-desc") return b.total - a.total;
                  return a.ratio - b.ratio;
                });

              return (
                <div key={group.subject}>
                  <div className="section-title">
                    {group.label}（{group.practiced}/{group.total} 已练习，均值 {group.avgRatio}%）
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {filteredItems.map((item: any) => (
                      <div
                        key={item.id}
                        style={{
                          padding: "8px 12px",
                          borderRadius: 12,
                          border: "1px solid var(--stroke)",
                          background: ratioColor(item.ratio),
                          minWidth: 140
                        }}
                      >
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{item.title}</div>
                        <div style={{ fontSize: 12, color: "var(--ink-1)" }}>
                          {item.ratio}% · {item.total} 题
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p>暂无知识点掌握数据。</p>
        )}
      </Card>
      <Card title="掌握趋势（近 7 天）" tag="趋势">
        <div className="grid" style={{ gap: 8 }}>
          {report.trend?.map((item: any) => (
            <div key={item.date} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 80, fontSize: 12, color: "var(--ink-1)" }}>{item.date}</div>
              <div style={{ flex: 1, background: "rgba(30,90,122,0.08)", borderRadius: 999, height: 10 }}>
                <div
                  style={{
                    width: `${item.accuracy}%`,
                    background: "var(--brand-0)",
                    height: 10,
                    borderRadius: 999
                  }}
                />
              </div>
              <div style={{ width: 40, fontSize: 12 }}>{item.accuracy}%</div>
            </div>
          ))}
        </div>
      </Card>
      <Card title="薄弱点" tag="提醒">
        <div className="grid" style={{ gap: 8 }}>
          {report.weakPoints?.length ? (
            report.weakPoints.map((item: any) => (
              <div className="card" key={item.id}>
                <div className="section-title">{item.title}</div>
                <p>
                  正确率 {item.ratio}% · 练习 {item.total} 题
                </p>
              </div>
            ))
          ) : (
            <p>暂无薄弱点数据。</p>
          )}
        </div>
        {report.suggestions?.length ? (
          <div style={{ marginTop: 12 }}>
            <div className="badge">学习建议</div>
            <div className="grid" style={{ gap: 6, marginTop: 8 }}>
              {report.suggestions.map((item: string, idx: number) => (
                <div key={`${item}-${idx}`}>{item}</div>
              ))}
            </div>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
