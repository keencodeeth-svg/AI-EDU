"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import Card from "@/components/Card";
import StatePanel from "@/components/StatePanel";
import Stat from "@/components/Stat";
import { formatLoadedTime, getRequestErrorMessage, isAuthError, requestJson } from "@/lib/client-request";
import type { ClassScheduleSession } from "@/lib/class-schedules";
import type { SchoolClassRecord } from "@/lib/school-admin-types";

const WEEKDAY_OPTIONS = [
  { value: "1", label: "周一" },
  { value: "2", label: "周二" },
  { value: "3", label: "周三" },
  { value: "4", label: "周四" },
  { value: "5", label: "周五" },
  { value: "6", label: "周六" },
  { value: "7", label: "周日" }
] as const;

const fieldStyle = {
  width: "100%",
  padding: 10,
  borderRadius: 10,
  border: "1px solid var(--stroke)",
  background: "var(--card)",
  color: "var(--ink)"
} as const;

type ScheduleViewItem = ClassScheduleSession & {
  className: string;
  subject: string;
  grade: string;
  teacherName?: string;
  teacherId: string | null;
};

type SchoolSchedulesResponse = {
  data?: {
    summary: {
      totalSessions: number;
      activeClasses: number;
      classesWithoutScheduleCount: number;
      averageLessonsPerWeek: number;
    };
    classes: SchoolClassRecord[];
    sessions: ScheduleViewItem[];
  };
};

type ScheduleMutationResponse = { data?: ClassScheduleSession | null; ok?: boolean };
type SchoolSchedulesData = NonNullable<SchoolSchedulesResponse["data"]>;

type ScheduleFormState = {
  classId: string;
  weekday: string;
  startTime: string;
  endTime: string;
  slotLabel: string;
  room: string;
  campus: string;
  focusSummary: string;
  note: string;
};

const EMPTY_FORM: ScheduleFormState = {
  classId: "",
  weekday: "1",
  startTime: "08:00",
  endTime: "08:45",
  slotLabel: "",
  room: "",
  campus: "",
  focusSummary: "",
  note: ""
};

function formatSubjectLine(item: Pick<ScheduleViewItem, "subject" | "grade" | "teacherName" | "teacherId">) {
  return `${item.subject} · ${item.grade} 年级 · ${item.teacherName ?? item.teacherId ?? "未绑定教师"}`;
}

export default function SchoolSchedulesPage() {
  const [classes, setClasses] = useState<SchoolClassRecord[]>([]);
  const [sessions, setSessions] = useState<ScheduleViewItem[]>([]);
  const [summary, setSummary] = useState<SchoolSchedulesData["summary"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [authRequired, setAuthRequired] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [lastLoadedAt, setLastLoadedAt] = useState<string | null>(null);
  const [classFilter, setClassFilter] = useState("all");
  const [weekdayFilter, setWeekdayFilter] = useState("all");
  const [keyword, setKeyword] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ScheduleFormState>(EMPTY_FORM);
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const loadData = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    if (mode === "refresh") {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setPageError(null);

    try {
      const payload = await requestJson<SchoolSchedulesResponse>("/api/school/schedules");
      setClasses(payload.data?.classes ?? []);
      setSessions(payload.data?.sessions ?? []);
      setSummary(payload.data?.summary ?? null);
      setAuthRequired(false);
      setLastLoadedAt(new Date().toISOString());
      if (payload.data?.classes?.[0]?.id) {
        setForm((prev) => (prev.classId ? prev : { ...prev, classId: payload.data?.classes?.[0]?.id ?? prev.classId }));
      }
    } catch (error) {
      if (isAuthError(error)) {
        setAuthRequired(true);
        setClasses([]);
        setSessions([]);
        setSummary(null);
      } else {
        setPageError(getRequestErrorMessage(error, "加载课程表管理失败"));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadData("initial");
  }, [loadData]);

  const scheduleCountByClass = useMemo(() => {
    const map = new Map<string, number>();
    sessions.forEach((item) => {
      map.set(item.classId, (map.get(item.classId) ?? 0) + 1);
    });
    return map;
  }, [sessions]);

  const filteredSessions = useMemo(() => {
    const keywordLower = keyword.trim().toLowerCase();
    return sessions.filter((item) => {
      if (classFilter !== "all" && item.classId !== classFilter) return false;
      if (weekdayFilter !== "all" && String(item.weekday) !== weekdayFilter) return false;
      if (!keywordLower) return true;
      return [item.className, item.subject, item.grade, item.room ?? "", item.campus ?? "", item.focusSummary ?? "", item.note ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(keywordLower);
    });
  }, [classFilter, keyword, sessions, weekdayFilter]);

  const sessionsByWeekday = useMemo(() => {
    const map = new Map<string, ScheduleViewItem[]>();
    WEEKDAY_OPTIONS.forEach((item) => map.set(item.value, []));
    filteredSessions
      .slice()
      .sort((left, right) => {
        if (left.weekday !== right.weekday) return left.weekday - right.weekday;
        if (left.startTime !== right.startTime) return left.startTime.localeCompare(right.startTime);
        return left.className.localeCompare(right.className, "zh-CN");
      })
      .forEach((item) => {
        const list = map.get(String(item.weekday)) ?? [];
        list.push(item);
        map.set(String(item.weekday), list);
      });
    return map;
  }, [filteredSessions]);

  const resetForm = useCallback((options?: { preserveMessage?: boolean; nextClassId?: string }) => {
    setEditingId(null);
    setFormError(null);
    if (!options?.preserveMessage) {
      setFormMessage(null);
    }
    setForm((prev) => ({ ...EMPTY_FORM, classId: options?.nextClassId ?? classes[0]?.id ?? prev.classId }));
  }, [classes]);

  const startCreateForClass = useCallback((classId: string) => {
    setEditingId(null);
    setFormError(null);
    setFormMessage(null);
    setForm({ ...EMPTY_FORM, classId });
  }, []);

  const startEdit = useCallback((item: ScheduleViewItem) => {
    setEditingId(item.id);
    setFormError(null);
    setFormMessage(null);
    setForm({
      classId: item.classId,
      weekday: String(item.weekday),
      startTime: item.startTime,
      endTime: item.endTime,
      slotLabel: item.slotLabel ?? "",
      room: item.room ?? "",
      campus: item.campus ?? "",
      focusSummary: item.focusSummary ?? "",
      note: item.note ?? ""
    });
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setFormError(null);
    setFormMessage(null);
    try {
      const payload = {
        classId: form.classId,
        weekday: Number(form.weekday),
        startTime: form.startTime,
        endTime: form.endTime,
        slotLabel: form.slotLabel,
        room: form.room,
        campus: form.campus,
        focusSummary: form.focusSummary,
        note: form.note
      };
      if (!payload.classId) {
        throw new Error("请选择班级");
      }
      const successMessage = editingId ? "课程节次已更新" : "课程节次已创建";
      if (editingId) {
        await requestJson<ScheduleMutationResponse>(`/api/school/schedules/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            weekday: payload.weekday,
            startTime: payload.startTime,
            endTime: payload.endTime,
            slotLabel: payload.slotLabel,
            room: payload.room,
            campus: payload.campus,
            focusSummary: payload.focusSummary,
            note: payload.note
          })
        });
      } else {
        await requestJson<ScheduleMutationResponse>("/api/school/schedules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      }
      await loadData("refresh");
      resetForm({ preserveMessage: true, nextClassId: payload.classId });
      setFormMessage(successMessage);
    } catch (error) {
      setFormError(getRequestErrorMessage(error, editingId ? "更新节次失败" : "创建节次失败"));
    } finally {
      setSaving(false);
    }
  }, [editingId, form, loadData, resetForm]);

  const handleDelete = useCallback(async (id: string) => {
    if (typeof window !== "undefined" && !window.confirm("确定删除这个课程节次吗？")) {
      return;
    }
    setDeletingId(id);
    setPageError(null);
    try {
      await requestJson<ScheduleMutationResponse>(`/api/school/schedules/${id}`, {
        method: "DELETE"
      });
      if (editingId === id) {
        resetForm({ preserveMessage: true });
      }
      await loadData("refresh");
      setFormMessage("课程节次已删除");
    } catch (error) {
      setPageError(getRequestErrorMessage(error, "删除节次失败"));
    } finally {
      setDeletingId(null);
    }
  }, [editingId, loadData, resetForm]);

  if (loading && !classes.length && !sessions.length && !authRequired) {
    return <StatePanel title="课程表管理加载中" description="正在汇总学校班级排课和课时覆盖情况。" tone="loading" />;
  }

  if (authRequired) {
    return (
      <StatePanel
        title="需要学校管理员权限"
        description="请使用学校管理员账号登录后查看课程表管理。"
        tone="info"
        action={
          <Link className="button secondary" href="/login">
            前往登录
          </Link>
        }
      />
    );
  }

  if (!classes.length && !loading) {
    return (
      <StatePanel
        title="当前学校还没有班级"
        description="请先完成班级建档，再为班级配置课程表。"
        tone="empty"
        action={
          <Link className="button secondary" href="/school/classes">
            去看班级管理
          </Link>
        }
      />
    );
  }

  return (
    <div className="grid" style={{ gap: 18 }}>
      <div className="section-head">
        <div>
          <h2>课程表管理</h2>
          <div className="section-sub">由学校统一维护班级固定节次，把课程安排与作业、课程模块和学生日程联动起来。</div>
        </div>
        <div className="cta-row no-margin" style={{ flexWrap: "wrap", justifyContent: "flex-end" }}>
          {lastLoadedAt ? <span className="chip">更新于 {formatLoadedTime(lastLoadedAt)}</span> : null}
          <span className="chip">School Schedule</span>
          <button className="button secondary" type="button" onClick={() => void loadData("refresh")} disabled={loading || refreshing}>
            {refreshing ? "刷新中..." : "刷新"}
          </button>
        </div>
      </div>

      {pageError ? <StatePanel title="本次刷新存在异常" description={pageError} tone="error" compact /> : null}

      <Card title="排课运营概览" tag="统计">
        <div className="grid grid-3">
          <Stat label="班级总数" value={String(classes.length)} helper="学校范围" />
          <Stat label="已排课班级" value={String(summary?.activeClasses ?? 0)} helper="至少有 1 个节次" />
          <Stat label="未排课班级" value={String(summary?.classesWithoutScheduleCount ?? 0)} helper="优先补齐" />
          <Stat label="总节次" value={String(summary?.totalSessions ?? 0)} helper={`当前筛选 ${filteredSessions.length} 个`} />
          <Stat label="平均每班课时" value={String(summary?.averageLessonsPerWeek ?? 0)} helper="按周估算" />
          <Stat label="需关注班级" value={String(classes.filter((item) => (scheduleCountByClass.get(item.id) ?? 0) === 0).length)} helper="优先排首课" />
        </div>
      </Card>

      <Card title="筛选与检索" tag="筛选">
        <div className="grid grid-3" style={{ alignItems: "end" }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span className="section-sub">班级</span>
            <select value={classFilter} onChange={(event) => setClassFilter(event.target.value)} style={fieldStyle}>
              <option value="all">全部班级</option>
              {classes.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span className="section-sub">星期</span>
            <select value={weekdayFilter} onChange={(event) => setWeekdayFilter(event.target.value)} style={fieldStyle}>
              <option value="all">全部星期</option>
              {WEEKDAY_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span className="section-sub">搜索节次</span>
            <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索班级、教室、校区或课堂焦点" style={fieldStyle} />
          </label>
        </div>
        <div className="cta-row" style={{ marginTop: 12 }}>
          <button className="button ghost" type="button" onClick={() => { setClassFilter("all"); setWeekdayFilter("all"); setKeyword(""); }}>
            清空筛选
          </button>
        </div>
      </Card>

      <div className="grid grid-2" style={{ alignItems: "start" }}>
        <Card title={editingId ? "编辑课程节次" : "新建课程节次"} tag={editingId ? "编辑" : "新建"}>
          <div className="grid" style={{ gap: 12 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span className="section-sub">班级</span>
              <select value={form.classId} onChange={(event) => setForm((prev) => ({ ...prev, classId: event.target.value }))} style={fieldStyle}>
                <option value="">请选择班级</option>
                {classes.map((item) => (
                  <option key={item.id} value={item.id}>{item.name} · {item.subject} · {item.grade} 年级</option>
                ))}
              </select>
            </label>
            <div className="grid grid-2">
              <label style={{ display: "grid", gap: 6 }}>
                <span className="section-sub">星期</span>
                <select value={form.weekday} onChange={(event) => setForm((prev) => ({ ...prev, weekday: event.target.value }))} style={fieldStyle}>
                  {WEEKDAY_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span className="section-sub">节次名称</span>
                <input value={form.slotLabel} onChange={(event) => setForm((prev) => ({ ...prev, slotLabel: event.target.value }))} placeholder="如：第一节 / 晚自习" style={fieldStyle} />
              </label>
            </div>
            <div className="grid grid-2">
              <label style={{ display: "grid", gap: 6 }}>
                <span className="section-sub">开始时间</span>
                <input type="time" value={form.startTime} onChange={(event) => setForm((prev) => ({ ...prev, startTime: event.target.value }))} style={fieldStyle} />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span className="section-sub">结束时间</span>
                <input type="time" value={form.endTime} onChange={(event) => setForm((prev) => ({ ...prev, endTime: event.target.value }))} style={fieldStyle} />
              </label>
            </div>
            <div className="grid grid-2">
              <label style={{ display: "grid", gap: 6 }}>
                <span className="section-sub">教室</span>
                <input value={form.room} onChange={(event) => setForm((prev) => ({ ...prev, room: event.target.value }))} placeholder="如：A201" style={fieldStyle} />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span className="section-sub">校区</span>
                <input value={form.campus} onChange={(event) => setForm((prev) => ({ ...prev, campus: event.target.value }))} placeholder="如：主校区" style={fieldStyle} />
              </label>
            </div>
            <label style={{ display: "grid", gap: 6 }}>
              <span className="section-sub">课堂焦点</span>
              <input value={form.focusSummary} onChange={(event) => setForm((prev) => ({ ...prev, focusSummary: event.target.value }))} placeholder="如：分数应用、作文审题、口语演练" style={fieldStyle} />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span className="section-sub">补充备注</span>
              <textarea value={form.note} onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))} rows={3} placeholder="如：课前带练习册、第三周起改到实验室" style={fieldStyle} />
            </label>
            {formError ? <div style={{ color: "#b42318", fontSize: 13 }}>{formError}</div> : null}
            {formMessage ? <div style={{ color: "#027a48", fontSize: 13 }}>{formMessage}</div> : null}
            <div className="cta-row">
              <button className="button primary" type="button" onClick={() => void handleSave()} disabled={saving}>
                {saving ? "保存中..." : editingId ? "保存修改" : "创建节次"}
              </button>
              <button className="button ghost" type="button" onClick={() => resetForm()} disabled={saving}>
                {editingId ? "取消编辑" : "重置表单"}
              </button>
            </div>
          </div>
        </Card>

        <Card title="当前周视图" tag="周视图">
          <div style={{ overflowX: "auto" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(180px, 1fr))", gap: 12, minWidth: 1280 }}>
              {WEEKDAY_OPTIONS.map((weekday) => {
                const list = sessionsByWeekday.get(weekday.value) ?? [];
                return (
                  <div className="card" key={weekday.value} style={{ minHeight: 220 }}>
                    <div className="section-title">{weekday.label}</div>
                    <div className="grid" style={{ gap: 8, marginTop: 10 }}>
                      {list.length ? (
                        list.map((item) => (
                          <div key={item.id} style={{ border: "1px solid var(--stroke)", borderRadius: 14, padding: 10, background: "rgba(255,255,255,0.72)" }}>
                            <div style={{ fontSize: 14, fontWeight: 700 }}>{item.className}</div>
                            <div className="section-sub" style={{ marginTop: 4 }}>{item.startTime}-{item.endTime}{item.slotLabel ? ` · ${item.slotLabel}` : ""}</div>
                            <div className="meta-text" style={{ marginTop: 6 }}>{formatSubjectLine(item)}{item.room ? ` · ${item.room}` : ""}</div>
                            {item.focusSummary ? <div className="meta-text" style={{ marginTop: 6 }}>课堂焦点：{item.focusSummary}</div> : null}
                            {item.note ? <div className="meta-text" style={{ marginTop: 6 }}>备注：{item.note}</div> : null}
                            <div className="cta-row cta-row-tight" style={{ marginTop: 10 }}>
                              <button className="button secondary" type="button" onClick={() => startEdit(item)}>编辑</button>
                              <button className="button ghost" type="button" onClick={() => void handleDelete(item.id)} disabled={deletingId === item.id}>
                                {deletingId === item.id ? "删除中..." : "删除"}
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="section-sub">暂无节次</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      </div>

      <Card title="班级排课状态" tag="覆盖">
        <div className="grid" style={{ gap: 10 }}>
          {classes.map((item) => {
            const scheduleCount = scheduleCountByClass.get(item.id) ?? 0;
            const hasSchedule = scheduleCount > 0;
            return (
              <div className="card" key={item.id}>
                <div className="cta-row" style={{ justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                  <div>
                    <div className="section-title">{item.name}</div>
                    <div className="section-sub" style={{ marginTop: 4 }}>
                      {item.subject} · {item.grade} 年级 · 教师 {item.teacherName ?? item.teacherId ?? "未绑定"}
                    </div>
                    <div className="meta-text" style={{ marginTop: 6 }}>
                      当前已排 {scheduleCount} 节/周 · 作业 {item.assignmentCount} 份 · 学生 {item.studentCount} 人
                    </div>
                  </div>
                  <span className="pill">{hasSchedule ? `${scheduleCount} 节/周` : "待排课"}</span>
                </div>
                <div className="cta-row" style={{ marginTop: 10 }}>
                  <button className="button ghost" type="button" onClick={() => startCreateForClass(item.id)}>
                    为该班排课
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
