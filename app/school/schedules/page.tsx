"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Card from "@/components/Card";
import StatePanel from "@/components/StatePanel";
import Stat from "@/components/Stat";
import { formatLoadedTime, getRequestErrorMessage, isAuthError, requestJson } from "@/lib/client-request";
import type { ClassScheduleSession } from "@/lib/class-schedules";
import type { SchoolClassRecord, SchoolUserRecord } from "@/lib/school-admin-types";
import type { SchoolScheduleTemplate } from "@/lib/school-schedule-templates";
import type { TeacherScheduleRule } from "@/lib/teacher-schedule-rules";
import type { TeacherUnavailableSlot } from "@/lib/teacher-unavailability";

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
type AiMode = "fill_missing" | "replace_all";

type AiImpactedClass = {
  id: string;
  name: string;
  subject: string;
  grade: string;
  teacherName?: string;
  teacherId: string | null;
  requestedLessons: number;
  createdLessons: number;
  totalLessonsAfter: number;
  status: "generated" | "skipped" | "unchanged";
  reason?: string;
};

type AiScheduleResponse = {
  data?: {
    summary: {
      targetClassCount: number;
      teacherBoundClassCount: number;
      replacedClassCount: number;
      createdSessions: number;
      requestedLessons: number;
      unresolvedLessons: number;
      skippedClassCount: number;
      untouchedClassCount: number;
      templateAppliedClassCount?: number;
      lockedPreservedSessionCount?: number;
    };
    warnings: string[];
    createdSessions: ScheduleViewItem[];
    impactedClasses: AiImpactedClass[];
    applied?: boolean;
    previewId?: string;
    operationId?: string;
    rollbackAvailable?: boolean;
    generatedAt?: string;
  };
};

type AiOperationSummary = {
  id: string;
  createdAt: string;
  appliedAt?: string;
  mode: AiMode;
  targetClassCount: number;
  createdSessions: number;
  unresolvedLessons: number;
  lockedPreservedSessionCount: number;
  rollbackAvailable: boolean;
};

type ScheduleTemplateResponse = { data?: SchoolScheduleTemplate[] };
type TeacherRuleListResponse = { data?: TeacherScheduleRule[] };
type TeacherRuleMutationResponse = { data?: TeacherScheduleRule | null };
type TeacherUnavailableResponse = { data?: TeacherUnavailableSlot[] };
type SchoolUsersResponse = { data?: SchoolUserRecord[] };
type LatestAiOperationResponse = { data?: AiOperationSummary | null };
type AiRollbackResponse = { data?: { operationId: string; restoredClassCount: number; restoredSessionCount: number } };

type TemplateFormState = {
  id?: string;
  grade: string;
  subject: string;
  weeklyLessonsPerClass: string;
  lessonDurationMinutes: string;
  periodsPerDay: string;
  dayStartTime: string;
  shortBreakMinutes: string;
  lunchBreakAfterPeriod: string;
  lunchBreakMinutes: string;
  campus: string;
  weekdays: string[];
};

type TeacherRuleFormState = {
  id?: string;
  teacherId: string;
  weeklyMaxLessons: string;
  maxConsecutiveLessons: string;
  minCampusGapMinutes: string;
};

type TeacherUnavailableFormState = {
  teacherId: string;
  weekday: string;
  startTime: string;
  endTime: string;
  reason: string;
};

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

type AiScheduleFormState = {
  mode: AiMode;
  weeklyLessonsPerClass: string;
  lessonDurationMinutes: string;
  periodsPerDay: string;
  dayStartTime: string;
  shortBreakMinutes: string;
  lunchBreakAfterPeriod: string;
  lunchBreakMinutes: string;
  campus: string;
  weekdays: string[];
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

const DEFAULT_AI_FORM: AiScheduleFormState = {
  mode: "fill_missing",
  weeklyLessonsPerClass: "5",
  lessonDurationMinutes: "45",
  periodsPerDay: "6",
  dayStartTime: "08:00",
  shortBreakMinutes: "10",
  lunchBreakAfterPeriod: "4",
  lunchBreakMinutes: "60",
  campus: "主校区",
  weekdays: ["1", "2", "3", "4", "5"]
};

const DEFAULT_TEMPLATE_FORM: TemplateFormState = {
  grade: "",
  subject: "",
  weeklyLessonsPerClass: "5",
  lessonDurationMinutes: "45",
  periodsPerDay: "6",
  dayStartTime: "08:00",
  shortBreakMinutes: "10",
  lunchBreakAfterPeriod: "4",
  lunchBreakMinutes: "60",
  campus: "主校区",
  weekdays: ["1", "2", "3", "4", "5"]
};

const DEFAULT_TEACHER_RULE_FORM: TeacherRuleFormState = {
  teacherId: "",
  weeklyMaxLessons: "",
  maxConsecutiveLessons: "",
  minCampusGapMinutes: ""
};

const DEFAULT_TEACHER_UNAVAILABLE_FORM: TeacherUnavailableFormState = {
  teacherId: "",
  weekday: "1",
  startTime: "08:00",
  endTime: "08:45",
  reason: ""
};

function formatSubjectLine(item: Pick<ScheduleViewItem, "subject" | "grade" | "teacherName" | "teacherId">) {
  return `${item.subject} · ${item.grade} 年级 · ${item.teacherName ?? item.teacherId ?? "未绑定教师"}`;
}

function toOptionalNumber(value: string) {
  const next = value.trim();
  return next ? Number(next) : undefined;
}

function addMinutesToTime(time: string, minutes: number) {
  const [hourPart, minutePart] = time.split(":").map(Number);
  if (!Number.isFinite(hourPart) || !Number.isFinite(minutePart) || !Number.isFinite(minutes)) {
    return time;
  }
  const totalMinutes = hourPart * 60 + minutePart + minutes;
  const normalized = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const nextHour = String(Math.floor(normalized / 60)).padStart(2, "0");
  const nextMinute = String(normalized % 60).padStart(2, "0");
  return `${nextHour}:${nextMinute}`;
}

function formatTeacherRuleSummary(rule: TeacherScheduleRule) {
  const parts: string[] = [];
  if (rule.weeklyMaxLessons) parts.push(`周上限 ${rule.weeklyMaxLessons} 节`);
  if (rule.maxConsecutiveLessons) parts.push(`最多连堂 ${rule.maxConsecutiveLessons} 节`);
  if (rule.minCampusGapMinutes) parts.push(`跨校区缓冲 ${rule.minCampusGapMinutes} 分钟`);
  return parts.join(" · ");
}

function applyTemplateToAiForm(template: SchoolScheduleTemplate): AiScheduleFormState {
  return {
    mode: "fill_missing",
    weeklyLessonsPerClass: String(template.weeklyLessonsPerClass),
    lessonDurationMinutes: String(template.lessonDurationMinutes),
    periodsPerDay: String(template.periodsPerDay),
    dayStartTime: template.dayStartTime,
    shortBreakMinutes: String(template.shortBreakMinutes),
    lunchBreakAfterPeriod: template.lunchBreakAfterPeriod ? String(template.lunchBreakAfterPeriod) : "",
    lunchBreakMinutes: String(template.lunchBreakMinutes),
    campus: template.campus ?? "主校区",
    weekdays: template.weekdays.map((item) => String(item))
  };
}

export default function SchoolSchedulesPage() {
  const manualEditorRef = useRef<HTMLDivElement | null>(null);
  const weekViewRef = useRef<HTMLDivElement | null>(null);
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
  const [aiForm, setAiForm] = useState<AiScheduleFormState>(DEFAULT_AI_FORM);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiRollingBack, setAiRollingBack] = useState(false);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<AiScheduleResponse["data"] | null>(null);
  const [latestAiOperation, setLatestAiOperation] = useState<AiOperationSummary | null>(null);
  const [lockingId, setLockingId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<SchoolScheduleTemplate[]>([]);
  const [teacherRules, setTeacherRules] = useState<TeacherScheduleRule[]>([]);
  const [teacherUnavailableSlots, setTeacherUnavailableSlots] = useState<TeacherUnavailableSlot[]>([]);
  const [teachers, setTeachers] = useState<SchoolUserRecord[]>([]);
  const [templateForm, setTemplateForm] = useState<TemplateFormState>(DEFAULT_TEMPLATE_FORM);
  const [templateSaving, setTemplateSaving] = useState(false);
  const [templateDeletingId, setTemplateDeletingId] = useState<string | null>(null);
  const [templateMessage, setTemplateMessage] = useState<string | null>(null);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [teacherRuleForm, setTeacherRuleForm] = useState<TeacherRuleFormState>(DEFAULT_TEACHER_RULE_FORM);
  const [teacherRuleSaving, setTeacherRuleSaving] = useState(false);
  const [teacherRuleDeletingId, setTeacherRuleDeletingId] = useState<string | null>(null);
  const [teacherRuleMessage, setTeacherRuleMessage] = useState<string | null>(null);
  const [teacherRuleError, setTeacherRuleError] = useState<string | null>(null);
  const [teacherUnavailableForm, setTeacherUnavailableForm] = useState<TeacherUnavailableFormState>(DEFAULT_TEACHER_UNAVAILABLE_FORM);
  const [teacherUnavailableSaving, setTeacherUnavailableSaving] = useState(false);
  const [teacherUnavailableDeletingId, setTeacherUnavailableDeletingId] = useState<string | null>(null);
  const [teacherUnavailableMessage, setTeacherUnavailableMessage] = useState<string | null>(null);
  const [teacherUnavailableError, setTeacherUnavailableError] = useState<string | null>(null);

  const loadData = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    if (mode === "refresh") {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setPageError(null);

    try {
      const [payload, templatesPayload, teacherRulesPayload, teacherUnavailablePayload, teachersPayload, latestAiOperationPayload] = await Promise.all([
        requestJson<SchoolSchedulesResponse>("/api/school/schedules"),
        requestJson<ScheduleTemplateResponse>("/api/school/schedules/templates"),
        requestJson<TeacherRuleListResponse>("/api/school/schedules/teacher-rules"),
        requestJson<TeacherUnavailableResponse>("/api/school/schedules/teacher-unavailability"),
        requestJson<SchoolUsersResponse>("/api/school/users?role=teacher"),
        requestJson<LatestAiOperationResponse>("/api/school/schedules/ai-operations/latest")
      ]);
      setClasses(payload.data?.classes ?? []);
      setSessions(payload.data?.sessions ?? []);
      setSummary(payload.data?.summary ?? null);
      setTemplates(templatesPayload.data ?? []);
      setTeacherRules(teacherRulesPayload.data ?? []);
      setTeacherUnavailableSlots(teacherUnavailablePayload.data ?? []);
      setTeachers(teachersPayload.data ?? []);
      setLatestAiOperation(latestAiOperationPayload.data ?? null);
      setAuthRequired(false);
      setLastLoadedAt(new Date().toISOString());
      if (payload.data?.classes?.[0]?.id) {
        const firstClass = payload.data.classes[0];
        setForm((prev) => (prev.classId ? prev : { ...prev, classId: firstClass.id }));
        setTemplateForm((prev) => prev.grade && prev.subject ? prev : { ...DEFAULT_TEMPLATE_FORM, grade: firstClass.grade, subject: firstClass.subject });
        setTeacherRuleForm((prev) => prev.teacherId ? prev : { ...DEFAULT_TEACHER_RULE_FORM, teacherId: firstClass.teacherId ?? "" });
        setTeacherUnavailableForm((prev) => prev.teacherId ? prev : { ...DEFAULT_TEACHER_UNAVAILABLE_FORM, teacherId: firstClass.teacherId ?? "" });
      }
    } catch (error) {
      if (isAuthError(error)) {
        setAuthRequired(true);
        setClasses([]);
        setSessions([]);
        setSummary(null);
        setTemplates([]);
        setTeacherRules([]);
        setTeacherUnavailableSlots([]);
        setTeachers([]);
        setLatestAiOperation(null);
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

  const templateByKey = useMemo(() => {
    return new Map(templates.map((item) => [`${item.grade}:${item.subject}`, item]));
  }, [templates]);

  const teacherOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    teachers.forEach((item) => {
      map.set(item.id, { id: item.id, name: item.name || item.email || item.id });
    });
    classes.forEach((item) => {
      if (!item.teacherId || map.has(item.teacherId)) return;
      map.set(item.teacherId, { id: item.teacherId, name: item.teacherName ?? item.teacherId });
    });
    return Array.from(map.values()).sort((left, right) => left.name.localeCompare(right.name, "zh-CN"));
  }, [classes, teachers]);

  const teacherRuleByTeacherId = useMemo(() => new Map(teacherRules.map((item) => [item.teacherId, item])), [teacherRules]);
  const teacherRuleCoverageCount = useMemo(() => classes.filter((item) => item.teacherId && teacherRuleByTeacherId.has(item.teacherId)).length, [classes, teacherRuleByTeacherId]);
  const crossCampusRuleCount = useMemo(() => teacherRules.filter((item) => item.minCampusGapMinutes).length, [teacherRules]);

  const gradeOptions = useMemo(() => Array.from(new Set(classes.map((item) => item.grade))).sort((left, right) => Number(left) - Number(right)), [classes]);
  const subjectOptions = useMemo(() => Array.from(new Set(classes.map((item) => item.subject))).sort((left, right) => left.localeCompare(right, "zh-CN")), [classes]);

  const aiWeeklyLessonsTarget = Math.max(0, Number(aiForm.weeklyLessonsPerClass) || 0);
  const getPreviewTargetForClass = useCallback((item: SchoolClassRecord) => {
    return templateByKey.get(`${item.grade}:${item.subject}`)?.weeklyLessonsPerClass ?? aiWeeklyLessonsTarget;
  }, [aiWeeklyLessonsTarget, templateByKey]);

  const aiTargetClassCount = useMemo(() => {
    return classes.filter((item) => (aiForm.mode === "replace_all" ? true : (scheduleCountByClass.get(item.id) ?? 0) < getPreviewTargetForClass(item))).length;
  }, [aiForm.mode, classes, getPreviewTargetForClass, scheduleCountByClass]);

  const aiRequestedLessonCount = useMemo(() => {
    return classes.reduce((sum, item) => {
      const current = scheduleCountByClass.get(item.id) ?? 0;
      const target = getPreviewTargetForClass(item);
      return sum + (aiForm.mode === "replace_all" ? target : Math.max(target - current, 0));
    }, 0);
  }, [aiForm.mode, classes, getPreviewTargetForClass, scheduleCountByClass]);

  const aiTeacherGapCount = useMemo(() => {
    return classes.filter((item) => {
      if (item.teacherId) return false;
      return aiForm.mode === "replace_all" ? true : (scheduleCountByClass.get(item.id) ?? 0) < getPreviewTargetForClass(item);
    }).length;
  }, [aiForm.mode, classes, getPreviewTargetForClass, scheduleCountByClass]);

  const aiTemplateCoverageCount = useMemo(() => {
    return classes.filter((item) => templateByKey.has(`${item.grade}:${item.subject}`)).length;
  }, [classes, templateByKey]);

  const lockedSessionCount = useMemo(() => sessions.filter((item) => item.locked).length, [sessions]);

  const targetedAiClasses = useMemo(() => {
    return classes.filter((item) => (aiForm.mode === "replace_all" ? true : (scheduleCountByClass.get(item.id) ?? 0) < getPreviewTargetForClass(item)));
  }, [aiForm.mode, classes, getPreviewTargetForClass, scheduleCountByClass]);
  const aiTeacherBoundTargetCount = useMemo(() => targetedAiClasses.filter((item) => Boolean(item.teacherId)).length, [targetedAiClasses]);
  const aiMissingTemplateTargetCount = useMemo(
    () => targetedAiClasses.filter((item) => !templateByKey.has(`${item.grade}:${item.subject}`)).length,
    [targetedAiClasses, templateByKey]
  );
  const aiTeacherRuleGapTargetCount = useMemo(
    () => targetedAiClasses.filter((item) => item.teacherId && !teacherRuleByTeacherId.has(item.teacherId)).length,
    [targetedAiClasses, teacherRuleByTeacherId]
  );
  const aiZeroScheduleTargetCount = useMemo(
    () => targetedAiClasses.filter((item) => (scheduleCountByClass.get(item.id) ?? 0) === 0).length,
    [scheduleCountByClass, targetedAiClasses]
  );
  const aiPreviewBlockingReasons = useMemo(() => {
    const reasons: string[] = [];
    if (!aiForm.weekdays.length) {
      reasons.push("至少选择 1 个排课日");
    }
    if (!aiForm.dayStartTime) {
      reasons.push("需要设置首节开始时间");
    }
    if ((Number(aiForm.periodsPerDay) || 0) <= 0) {
      reasons.push("每日节次数需要大于 0");
    }
    if ((Number(aiForm.lessonDurationMinutes) || 0) <= 0) {
      reasons.push("单节课时需要大于 0 分钟");
    }
    if (aiTargetClassCount <= 0 || aiRequestedLessonCount <= 0) {
      reasons.push(aiForm.mode === "replace_all" ? "当前没有可处理的班级" : "当前没有需要补齐的课时，可切换为全校重排或调整模板");
    }
    if (aiTeacherBoundTargetCount <= 0) {
      reasons.push("目标班级里还没有绑定教师的班级，AI 排课无法落位");
    }
    return reasons;
  }, [aiForm.dayStartTime, aiForm.lessonDurationMinutes, aiForm.mode, aiForm.periodsPerDay, aiForm.weekdays.length, aiRequestedLessonCount, aiTargetClassCount, aiTeacherBoundTargetCount]);
  const aiPreviewWarningReasons = useMemo(() => {
    const reasons: string[] = [];
    if (aiTeacherGapCount > 0) {
      reasons.push(`${aiTeacherGapCount} 个目标班级未绑定教师，将在 AI 排课时自动跳过`);
    }
    if (aiMissingTemplateTargetCount > 0) {
      reasons.push(`${aiMissingTemplateTargetCount} 个目标班级缺少年级学科模板，将回退到当前全局参数`);
    }
    if (aiTeacherRuleGapTargetCount > 0) {
      reasons.push(`${aiTeacherRuleGapTargetCount} 个目标班级还未配置教师排课规则，建议先补齐约束`);
    }
    if (teacherUnavailableSlots.length === 0) {
      reasons.push("当前还没有教师禁排时段，教研会或固定值班时间不会被提前避开");
    }
    if (aiForm.mode === "replace_all" && lockedSessionCount === 0) {
      reasons.push("当前没有锁定节次，全校重排时不会保留关键课时");
    }
    return reasons;
  }, [aiForm.mode, aiTeacherGapCount, aiMissingTemplateTargetCount, aiTeacherRuleGapTargetCount, lockedSessionCount, teacherUnavailableSlots.length]);
  const aiReadinessLabel = aiPreviewBlockingReasons.length ? "暂不可预演" : aiPreviewWarningReasons.length ? "建议补配置" : "可直接预演";
  const aiReadinessTone = aiPreviewBlockingReasons.length ? "#b42318" : aiPreviewWarningReasons.length ? "#b54708" : "#027a48";

  const lockedCountByClass = useMemo(() => {
    const map = new Map<string, number>();
    sessions.forEach((item) => {
      if (!item.locked) return;
      map.set(item.classId, (map.get(item.classId) ?? 0) + 1);
    });
    return map;
  }, [sessions]);
  const classWeekdayCountByClass = useMemo(() => {
    const map = new Map<string, Map<string, number>>();
    sessions.forEach((item) => {
      const weekdayMap = map.get(item.classId) ?? new Map<string, number>();
      const weekdayKey = String(item.weekday);
      weekdayMap.set(weekdayKey, (weekdayMap.get(weekdayKey) ?? 0) + 1);
      map.set(item.classId, weekdayMap);
    });
    return map;
  }, [sessions]);
  const selectedManualClass = useMemo(() => classes.find((item) => item.id === form.classId) ?? null, [classes, form.classId]);
  const selectedManualClassTemplate = useMemo(
    () => (selectedManualClass ? templateByKey.get(`${selectedManualClass.grade}:${selectedManualClass.subject}`) ?? null : null),
    [selectedManualClass, templateByKey]
  );
  const selectedManualTeacherRule = useMemo(
    () => (selectedManualClass?.teacherId ? teacherRuleByTeacherId.get(selectedManualClass.teacherId) ?? null : null),
    [selectedManualClass, teacherRuleByTeacherId]
  );
  const selectedManualClassScheduleCount = selectedManualClass ? scheduleCountByClass.get(selectedManualClass.id) ?? 0 : 0;
  const selectedManualClassLockedCount = selectedManualClass ? lockedCountByClass.get(selectedManualClass.id) ?? 0 : 0;
  const selectedWeekViewClass = useMemo(
    () => (classFilter === "all" ? null : classes.find((item) => item.id === classFilter) ?? null),
    [classFilter, classes]
  );
  const selectedWeekdayOption = useMemo(
    () => (weekdayFilter === "all" ? null : WEEKDAY_OPTIONS.find((item) => item.value === weekdayFilter) ?? null),
    [weekdayFilter]
  );
  const trimmedKeyword = keyword.trim();
  const activeWeekViewFilterCount = Number(Boolean(selectedWeekViewClass)) + Number(Boolean(selectedWeekdayOption)) + Number(Boolean(trimmedKeyword));

  const filteredSessions = useMemo(() => {
    const keywordLower = trimmedKeyword.toLowerCase();
    return sessions.filter((item) => {
      if (classFilter !== "all" && item.classId !== classFilter) return false;
      if (weekdayFilter !== "all" && String(item.weekday) !== weekdayFilter) return false;
      if (!keywordLower) return true;
      return [item.className, item.subject, item.grade, item.room ?? "", item.campus ?? "", item.focusSummary ?? "", item.note ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(keywordLower);
    });
  }, [classFilter, sessions, trimmedKeyword, weekdayFilter]);
  const filteredLockedSessionCount = useMemo(() => filteredSessions.filter((item) => item.locked).length, [filteredSessions]);

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

  const scrollToManualEditor = useCallback(() => {
    if (typeof window === "undefined") return;
    window.requestAnimationFrame(() => {
      manualEditorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  const scrollToWeekView = useCallback(() => {
    if (typeof window === "undefined") return;
    window.requestAnimationFrame(() => {
      weekViewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  const buildManualScheduleDraft = useCallback((classId: string) => {
    const klass = classes.find((item) => item.id === classId);
    const template = klass ? templateByKey.get(`${klass.grade}:${klass.subject}`) ?? null : null;
    const weekdayCountMap = classWeekdayCountByClass.get(classId) ?? new Map<string, number>();
    const candidateWeekdays = template?.weekdays?.length ? template.weekdays.map((item) => String(item)) : WEEKDAY_OPTIONS.map((item) => item.value);
    const weekday = candidateWeekdays
      .slice()
      .sort((left, right) => (weekdayCountMap.get(left) ?? 0) - (weekdayCountMap.get(right) ?? 0) || Number(left) - Number(right))[0] ?? EMPTY_FORM.weekday;
    const startTime = template?.dayStartTime ?? EMPTY_FORM.startTime;
    const lessonDuration = template?.lessonDurationMinutes ?? 45;
    return {
      ...EMPTY_FORM,
      classId,
      weekday,
      startTime,
      endTime: addMinutesToTime(startTime, lessonDuration),
      campus: template?.campus ?? EMPTY_FORM.campus
    } satisfies ScheduleFormState;
  }, [classWeekdayCountByClass, classes, templateByKey]);

  const resetForm = useCallback((options?: { preserveMessage?: boolean; nextClassId?: string }) => {
    setEditingId(null);
    setFormError(null);
    if (!options?.preserveMessage) {
      setFormMessage(null);
    }
    const nextClassId = options?.nextClassId ?? classes[0]?.id ?? "";
    setForm(nextClassId ? buildManualScheduleDraft(nextClassId) : { ...EMPTY_FORM, classId: nextClassId });
  }, [buildManualScheduleDraft, classes]);

  const startCreateForClass = useCallback((classId: string) => {
    setEditingId(null);
    setFormError(null);
    setFormMessage(null);
    setForm(buildManualScheduleDraft(classId));
    scrollToManualEditor();
  }, [buildManualScheduleDraft, scrollToManualEditor]);

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
    scrollToManualEditor();
  }, [scrollToManualEditor]);

  const clearWeekViewFilters = useCallback(() => {
    setClassFilter("all");
    setWeekdayFilter("all");
    setKeyword("");
  }, []);

  const keepFocusedClassWeekView = useCallback(() => {
    if (classFilter === "all") return;
    setWeekdayFilter("all");
    setKeyword("");
  }, [classFilter]);

  const focusClassInWeekView = useCallback((classId: string) => {
    setClassFilter(classId);
    setWeekdayFilter("all");
    setKeyword("");
    scrollToWeekView();
  }, [scrollToWeekView]);

  const applySelectedClassTemplateToForm = useCallback(() => {
    if (!selectedManualClass) return;
    const draft = buildManualScheduleDraft(selectedManualClass.id);
    setForm((prev) => ({
      ...prev,
      classId: selectedManualClass.id,
      weekday: draft.weekday,
      startTime: draft.startTime,
      endTime: draft.endTime,
      campus: draft.campus || prev.campus
    }));
    setFormMessage("已带入该班模板的推荐星期、时间和校区，可继续微调后保存。");
    setFormError(null);
  }, [buildManualScheduleDraft, selectedManualClass]);

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

  const toggleAiWeekday = useCallback((weekday: string) => {
    setAiForm((prev) => {
      const exists = prev.weekdays.includes(weekday);
      const weekdays = exists
        ? prev.weekdays.filter((item) => item !== weekday)
        : [...prev.weekdays, weekday].sort((left, right) => Number(left) - Number(right));
      return { ...prev, weekdays };
    });
  }, []);

  const resetAiForm = useCallback(() => {
    setAiForm(DEFAULT_AI_FORM);
    setAiError(null);
    setAiMessage(null);
    setAiResult(null);
  }, []);

  const buildAiRequestBody = useCallback(() => {
    const weeklyLessonsPerClass = Number(aiForm.weeklyLessonsPerClass);
    const lessonDurationMinutes = Number(aiForm.lessonDurationMinutes);
    const periodsPerDay = Number(aiForm.periodsPerDay);
    const shortBreakMinutes = Number(aiForm.shortBreakMinutes);
    const lunchBreakMinutes = Number(aiForm.lunchBreakMinutes);
    const lunchBreakAfterPeriod = aiForm.lunchBreakAfterPeriod ? Number(aiForm.lunchBreakAfterPeriod) : undefined;

    if (!aiForm.weekdays.length) {
      throw new Error("请至少选择 1 个排课日。");
    }
    if (!Number.isFinite(weeklyLessonsPerClass) || weeklyLessonsPerClass < 1) {
      throw new Error("请填写有效的每班每周总节数。");
    }

    return {
      weeklyLessonsPerClass,
      lessonDurationMinutes,
      periodsPerDay,
      weekdays: aiForm.weekdays.map((item) => Number(item)),
      dayStartTime: aiForm.dayStartTime,
      shortBreakMinutes,
      lunchBreakAfterPeriod,
      lunchBreakMinutes,
      mode: aiForm.mode,
      campus: aiForm.campus
    };
  }, [aiForm]);

  const handleAiPreview = useCallback(async () => {
    try {
      const payload = buildAiRequestBody();
      setAiGenerating(true);
      setAiError(null);
      setAiMessage(null);
      const result = await requestJson<AiScheduleResponse>("/api/school/schedules/ai-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      setAiResult(result.data ?? null);
      setAiMessage(`AI 预演已完成，预计新增 ${result.data?.summary.createdSessions ?? 0} 个节次。`);
    } catch (error) {
      setAiError(getRequestErrorMessage(error, "AI 预演失败"));
    } finally {
      setAiGenerating(false);
    }
  }, [buildAiRequestBody]);

  const handleAiApplyPreview = useCallback(async () => {
    if (!aiResult?.previewId) {
      setAiError("请先完成一次 AI 预演。");
      return;
    }
    if (aiForm.mode === "replace_all" && typeof window !== "undefined") {
      const confirmed = window.confirm("确认将本次 AI 预演正式写入课表吗？系统会保留已锁定节次，并支持回滚最近一次 AI 排课。");
      if (!confirmed) {
        return;
      }
    }

    setAiGenerating(true);
    setAiError(null);
    setAiMessage(null);
    try {
      const result = await requestJson<AiScheduleResponse>(`/api/school/schedules/ai-preview/${aiResult.previewId}/apply`, {
        method: "POST"
      });
      setAiResult(result.data ?? null);
      await loadData("refresh");
      setAiMessage(`AI 排课已写入课表，本次新增 ${result.data?.summary.createdSessions ?? 0} 个节次。`);
    } catch (error) {
      setAiError(getRequestErrorMessage(error, "确认写入 AI 排课失败"));
    } finally {
      setAiGenerating(false);
    }
  }, [aiForm.mode, aiResult?.previewId, loadData]);

  const handleAiRollback = useCallback(async () => {
    if (!latestAiOperation?.id) {
      setAiError("当前没有可回滚的 AI 排课记录。");
      return;
    }
    if (typeof window !== "undefined") {
      const confirmed = window.confirm("确定回滚最近一次已写入的 AI 排课吗？仅在课表未被后续人工调整时可成功回滚。");
      if (!confirmed) {
        return;
      }
    }

    setAiRollingBack(true);
    setAiError(null);
    setAiMessage(null);
    try {
      const result = await requestJson<AiRollbackResponse>("/api/school/schedules/ai-operations/rollback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operationId: latestAiOperation.id })
      });
      setAiResult(null);
      await loadData("refresh");
      setAiMessage(`已回滚最近一次 AI 排课，恢复 ${result.data?.restoredSessionCount ?? 0} 个节次。`);
    } catch (error) {
      setAiError(getRequestErrorMessage(error, "回滚 AI 排课失败"));
    } finally {
      setAiRollingBack(false);
    }
  }, [latestAiOperation?.id, loadData]);

  const handleToggleLock = useCallback(async (item: ScheduleViewItem) => {
    setLockingId(item.id);
    setPageError(null);
    setFormError(null);
    setFormMessage(null);
    try {
      await requestJson<ScheduleMutationResponse>(`/api/school/schedules/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locked: !item.locked })
      });
      if (editingId === item.id && !item.locked) {
        resetForm({ preserveMessage: true });
      }
      await loadData("refresh");
      setFormMessage(item.locked ? "课程节次已解锁" : "课程节次已锁定");
    } catch (error) {
      setPageError(getRequestErrorMessage(error, item.locked ? "解锁节次失败" : "锁定节次失败"));
    } finally {
      setLockingId(null);
    }
  }, [editingId, loadData, resetForm]);


  const toggleTemplateWeekday = useCallback((weekday: string) => {
    setTemplateForm((prev) => {
      const exists = prev.weekdays.includes(weekday);
      const weekdays = exists
        ? prev.weekdays.filter((item) => item !== weekday)
        : [...prev.weekdays, weekday].sort((left, right) => Number(left) - Number(right));
      return { ...prev, weekdays };
    });
  }, []);

  const resetTemplateForm = useCallback(() => {
    setTemplateForm((prev) => ({ ...DEFAULT_TEMPLATE_FORM, grade: prev.grade || gradeOptions[0] || "", subject: prev.subject || subjectOptions[0] || "" }));
    setTemplateError(null);
    setTemplateMessage(null);
  }, [gradeOptions, subjectOptions]);

  const resetTeacherRuleForm = useCallback(() => {
    setTeacherRuleForm((prev) => ({ ...DEFAULT_TEACHER_RULE_FORM, teacherId: prev.teacherId || teacherOptions[0]?.id || "" }));
    setTeacherRuleError(null);
    setTeacherRuleMessage(null);
  }, [teacherOptions]);

  const startEditTeacherRule = useCallback((rule: TeacherScheduleRule) => {
    setTeacherRuleError(null);
    setTeacherRuleMessage(null);
    setTeacherRuleForm({
      id: rule.id,
      teacherId: rule.teacherId,
      weeklyMaxLessons: rule.weeklyMaxLessons ? String(rule.weeklyMaxLessons) : "",
      maxConsecutiveLessons: rule.maxConsecutiveLessons ? String(rule.maxConsecutiveLessons) : "",
      minCampusGapMinutes: rule.minCampusGapMinutes ? String(rule.minCampusGapMinutes) : ""
    });
  }, []);

  const startEditTemplate = useCallback((template: SchoolScheduleTemplate) => {
    setTemplateError(null);
    setTemplateMessage(null);
    setTemplateForm({
      id: template.id,
      grade: template.grade,
      subject: template.subject,
      weeklyLessonsPerClass: String(template.weeklyLessonsPerClass),
      lessonDurationMinutes: String(template.lessonDurationMinutes),
      periodsPerDay: String(template.periodsPerDay),
      dayStartTime: template.dayStartTime,
      shortBreakMinutes: String(template.shortBreakMinutes),
      lunchBreakAfterPeriod: template.lunchBreakAfterPeriod ? String(template.lunchBreakAfterPeriod) : "",
      lunchBreakMinutes: String(template.lunchBreakMinutes),
      campus: template.campus ?? "主校区",
      weekdays: template.weekdays.map((item) => String(item))
    });
  }, []);

  const handleSaveTemplate = useCallback(async () => {
    const weeklyLessonsPerClass = Number(templateForm.weeklyLessonsPerClass);
    const lessonDurationMinutes = Number(templateForm.lessonDurationMinutes);
    const periodsPerDay = Number(templateForm.periodsPerDay);
    const shortBreakMinutes = Number(templateForm.shortBreakMinutes);
    const lunchBreakMinutes = Number(templateForm.lunchBreakMinutes);
    const lunchBreakAfterPeriod = templateForm.lunchBreakAfterPeriod ? Number(templateForm.lunchBreakAfterPeriod) : undefined;
    if (!templateForm.grade || !templateForm.subject) {
      setTemplateError("请选择年级和学科。");
      return;
    }
    if (!templateForm.weekdays.length) {
      setTemplateError("模板至少需要 1 个排课日。");
      return;
    }
    setTemplateSaving(true);
    setTemplateError(null);
    setTemplateMessage(null);
    try {
      await requestJson<ScheduleTemplateResponse>("/api/school/schedules/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: templateForm.id,
          grade: templateForm.grade,
          subject: templateForm.subject,
          weeklyLessonsPerClass,
          lessonDurationMinutes,
          periodsPerDay,
          weekdays: templateForm.weekdays.map((item) => Number(item)),
          dayStartTime: templateForm.dayStartTime,
          shortBreakMinutes,
          lunchBreakAfterPeriod,
          lunchBreakMinutes,
          campus: templateForm.campus
        })
      });
      await loadData("refresh");
      setTemplateMessage(templateForm.id ? "课时模板已更新" : "课时模板已保存");
      setTemplateForm((prev) => ({ ...prev, id: undefined }));
    } catch (error) {
      setTemplateError(getRequestErrorMessage(error, "保存模板失败"));
    } finally {
      setTemplateSaving(false);
    }
  }, [loadData, templateForm]);


  const applyDraftTemplateToAi = useCallback(() => {
    if (!templateForm.grade || !templateForm.subject || !templateForm.weekdays.length) {
      setTemplateError("请先补全年级、学科和排课日，再应用到 AI 参数。");
      return;
    }
    setAiForm(
      applyTemplateToAiForm({
        id: templateForm.id ?? "draft-template",
        schoolId: "school-default",
        grade: templateForm.grade,
        subject: templateForm.subject,
        weeklyLessonsPerClass: Number(templateForm.weeklyLessonsPerClass) || 5,
        lessonDurationMinutes: Number(templateForm.lessonDurationMinutes) || 45,
        periodsPerDay: Number(templateForm.periodsPerDay) || 6,
        weekdays: templateForm.weekdays.map((item) => Number(item)) as Array<1 | 2 | 3 | 4 | 5 | 6 | 7>,
        dayStartTime: templateForm.dayStartTime,
        shortBreakMinutes: Number(templateForm.shortBreakMinutes) || 10,
        lunchBreakAfterPeriod: templateForm.lunchBreakAfterPeriod ? Number(templateForm.lunchBreakAfterPeriod) : undefined,
        lunchBreakMinutes: Number(templateForm.lunchBreakMinutes) || 60,
        campus: templateForm.campus,
        createdAt: "",
        updatedAt: ""
      })
    );
    setTemplateMessage("模板参数已同步到 AI 排课配置区。");
  }, [templateForm]);

  const handleDeleteTemplate = useCallback(async (id: string) => {
    if (typeof window !== "undefined" && !window.confirm("确定删除这个课时模板吗？")) {
      return;
    }
    setTemplateDeletingId(id);
    setTemplateError(null);
    setTemplateMessage(null);
    try {
      await requestJson(`/api/school/schedules/templates/${id}`, { method: "DELETE" });
      await loadData("refresh");
      if (templateForm.id === id) {
        resetTemplateForm();
      }
      setTemplateMessage("课时模板已删除");
    } catch (error) {
      setTemplateError(getRequestErrorMessage(error, "删除模板失败"));
    } finally {
      setTemplateDeletingId(null);
    }
  }, [loadData, resetTemplateForm, templateForm.id]);

  const handleSaveTeacherRule = useCallback(async () => {
    const weeklyMaxLessons = toOptionalNumber(teacherRuleForm.weeklyMaxLessons);
    const maxConsecutiveLessons = toOptionalNumber(teacherRuleForm.maxConsecutiveLessons);
    const minCampusGapMinutes = toOptionalNumber(teacherRuleForm.minCampusGapMinutes);
    if (!teacherRuleForm.teacherId) {
      setTeacherRuleError("请选择教师。");
      return;
    }
    if (
      weeklyMaxLessons === undefined &&
      maxConsecutiveLessons === undefined &&
      minCampusGapMinutes === undefined
    ) {
      setTeacherRuleError("请至少填写一项教师排课规则。");
      return;
    }
    setTeacherRuleSaving(true);
    setTeacherRuleError(null);
    setTeacherRuleMessage(null);
    try {
      await requestJson<TeacherRuleMutationResponse>("/api/school/schedules/teacher-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: teacherRuleForm.id,
          teacherId: teacherRuleForm.teacherId,
          weeklyMaxLessons,
          maxConsecutiveLessons,
          minCampusGapMinutes
        })
      });
      await loadData("refresh");
      setTeacherRuleMessage(teacherRuleForm.id ? "教师排课规则已更新" : "教师排课规则已保存");
      setTeacherRuleForm((prev) => ({ ...DEFAULT_TEACHER_RULE_FORM, teacherId: prev.teacherId }));
    } catch (error) {
      setTeacherRuleError(getRequestErrorMessage(error, "保存教师排课规则失败"));
    } finally {
      setTeacherRuleSaving(false);
    }
  }, [loadData, teacherRuleForm]);

  const handleDeleteTeacherRule = useCallback(async (id: string) => {
    if (typeof window !== "undefined" && !window.confirm("确定删除这个教师排课规则吗？")) {
      return;
    }
    setTeacherRuleDeletingId(id);
    setTeacherRuleError(null);
    setTeacherRuleMessage(null);
    try {
      await requestJson(`/api/school/schedules/teacher-rules/${id}`, { method: "DELETE" });
      await loadData("refresh");
      if (teacherRuleForm.id === id) {
        resetTeacherRuleForm();
      }
      setTeacherRuleMessage("教师排课规则已删除");
    } catch (error) {
      setTeacherRuleError(getRequestErrorMessage(error, "删除教师排课规则失败"));
    } finally {
      setTeacherRuleDeletingId(null);
    }
  }, [loadData, resetTeacherRuleForm, teacherRuleForm.id]);

  const handleSaveTeacherUnavailable = useCallback(async () => {
    if (!teacherUnavailableForm.teacherId) {
      setTeacherUnavailableError("请选择教师。");
      return;
    }
    setTeacherUnavailableSaving(true);
    setTeacherUnavailableError(null);
    setTeacherUnavailableMessage(null);
    try {
      await requestJson<TeacherUnavailableResponse>("/api/school/schedules/teacher-unavailability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacherId: teacherUnavailableForm.teacherId,
          weekday: Number(teacherUnavailableForm.weekday),
          startTime: teacherUnavailableForm.startTime,
          endTime: teacherUnavailableForm.endTime,
          reason: teacherUnavailableForm.reason
        })
      });
      await loadData("refresh");
      setTeacherUnavailableMessage("教师禁排时段已保存");
      setTeacherUnavailableForm((prev) => ({ ...DEFAULT_TEACHER_UNAVAILABLE_FORM, teacherId: prev.teacherId }));
    } catch (error) {
      setTeacherUnavailableError(getRequestErrorMessage(error, "保存教师禁排失败"));
    } finally {
      setTeacherUnavailableSaving(false);
    }
  }, [loadData, teacherUnavailableForm]);

  const handleDeleteTeacherUnavailable = useCallback(async (id: string) => {
    if (typeof window !== "undefined" && !window.confirm("确定删除这个教师禁排时段吗？")) {
      return;
    }
    setTeacherUnavailableDeletingId(id);
    setTeacherUnavailableError(null);
    setTeacherUnavailableMessage(null);
    try {
      await requestJson(`/api/school/schedules/teacher-unavailability/${id}`, { method: "DELETE" });
      await loadData("refresh");
      setTeacherUnavailableMessage("教师禁排时段已删除");
    } catch (error) {
      setTeacherUnavailableError(getRequestErrorMessage(error, "删除教师禁排失败"));
    } finally {
      setTeacherUnavailableDeletingId(null);
    }
  }, [loadData]);

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

      <Card title="AI 一键排课" tag="AI">
        <div className="grid" style={{ gap: 12 }}>
          <div className="section-sub">
            先预演、再写入，并支持保留锁定节次和回滚最近一次 AI 排课，避免学校端误操作直接覆盖课表。
          </div>

          <div className="grid grid-3">
            <Stat label="本轮目标班级" value={String(aiTargetClassCount)} helper={aiForm.mode === "replace_all" ? "全校现有课表重排" : "优先补齐不足班级"} />
            <Stat label="预计新增节次" value={String(aiRequestedLessonCount)} helper={`按每班 ${aiWeeklyLessonsTarget || 0} 节/周估算`} />
            <Stat label="待补教师班级" value={String(aiTeacherGapCount)} helper="未绑定教师会自动跳过" />
            <Stat label="已配置模板班级" value={String(aiTemplateCoverageCount)} helper="同年级同学科自动套用" />
            <Stat label="已锁定节次" value={String(lockedSessionCount)} helper="重排时自动保留" />
            <Stat label="最近 AI 新增" value={String(latestAiOperation?.createdSessions ?? 0)} helper={latestAiOperation ? "可一键回滚" : "暂无已写入记录"} />
          </div>

          <div className="card">
            <div className="cta-row" style={{ justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
              <div>
                <div className="section-title">排前检查</div>
                <div className="meta-text" style={{ marginTop: 6 }}>先确认老师、模板和约束是否齐备，再进入 AI 预演，避免出现“预演了但大量跳过”的体验。</div>
              </div>
              <span className="pill" style={{ color: aiReadinessTone, borderColor: aiReadinessTone }}>{aiReadinessLabel}</span>
            </div>
            <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginTop: 12 }}>
              <div className="card">
                <div className="section-title">已绑教师目标班级</div>
                <p>{aiTeacherBoundTargetCount} / {aiTargetClassCount}</p>
              </div>
              <div className="card">
                <div className="section-title">缺模板目标班级</div>
                <p>{aiMissingTemplateTargetCount} 个</p>
              </div>
              <div className="card">
                <div className="section-title">缺教师规则班级</div>
                <p>{aiTeacherRuleGapTargetCount} 个</p>
              </div>
              <div className="card">
                <div className="section-title">待补首课班级</div>
                <p>{aiZeroScheduleTargetCount} 个</p>
              </div>
            </div>
            {aiPreviewBlockingReasons.length ? (
              <div className="grid" style={{ gap: 8, marginTop: 12 }}>
                <div className="section-title">必须先处理</div>
                {aiPreviewBlockingReasons.map((reason) => (
                  <div key={reason} className="meta-text">- {reason}</div>
                ))}
              </div>
            ) : null}
            {aiPreviewWarningReasons.length ? (
              <div className="grid" style={{ gap: 8, marginTop: 12 }}>
                <div className="section-title">建议先补配置</div>
                {aiPreviewWarningReasons.slice(0, 5).map((reason) => (
                  <div key={reason} className="meta-text">- {reason}</div>
                ))}
              </div>
            ) : null}
            <div className="cta-row" style={{ marginTop: 12, flexWrap: "wrap" }}>
              <a className="button ghost" href="#schedule-templates">去补课时模板</a>
              <a className="button ghost" href="#schedule-unavailability">去配禁排时段</a>
              <a className="button ghost" href="#schedule-rules">去配教师规则</a>
            </div>
          </div>

          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span className="section-sub">排课模式</span>
              <select value={aiForm.mode} onChange={(event) => setAiForm((prev) => ({ ...prev, mode: event.target.value as AiMode }))} style={fieldStyle}>
                <option value="fill_missing">补齐不足课时</option>
                <option value="replace_all">全校重排课表</option>
              </select>
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span className="section-sub">每班每周总节数</span>
              <input type="number" min={1} max={30} value={aiForm.weeklyLessonsPerClass} onChange={(event) => setAiForm((prev) => ({ ...prev, weeklyLessonsPerClass: event.target.value }))} style={fieldStyle} />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span className="section-sub">单节课时（分钟）</span>
              <input type="number" min={30} max={120} value={aiForm.lessonDurationMinutes} onChange={(event) => setAiForm((prev) => ({ ...prev, lessonDurationMinutes: event.target.value }))} style={fieldStyle} />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span className="section-sub">每日节次数</span>
              <input type="number" min={1} max={12} value={aiForm.periodsPerDay} onChange={(event) => setAiForm((prev) => ({ ...prev, periodsPerDay: event.target.value }))} style={fieldStyle} />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span className="section-sub">首节开始时间</span>
              <input type="time" value={aiForm.dayStartTime} onChange={(event) => setAiForm((prev) => ({ ...prev, dayStartTime: event.target.value }))} style={fieldStyle} />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span className="section-sub">课间（分钟）</span>
              <input type="number" min={0} max={30} value={aiForm.shortBreakMinutes} onChange={(event) => setAiForm((prev) => ({ ...prev, shortBreakMinutes: event.target.value }))} style={fieldStyle} />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span className="section-sub">午休前节次</span>
              <input type="number" min={1} max={12} value={aiForm.lunchBreakAfterPeriod} onChange={(event) => setAiForm((prev) => ({ ...prev, lunchBreakAfterPeriod: event.target.value }))} style={fieldStyle} />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span className="section-sub">午休（分钟）</span>
              <input type="number" min={0} max={180} value={aiForm.lunchBreakMinutes} onChange={(event) => setAiForm((prev) => ({ ...prev, lunchBreakMinutes: event.target.value }))} style={fieldStyle} />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span className="section-sub">默认校区</span>
              <input value={aiForm.campus} onChange={(event) => setAiForm((prev) => ({ ...prev, campus: event.target.value }))} placeholder="如：主校区 / 东校区" style={fieldStyle} />
            </label>
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <span className="section-sub">排课日</span>
            <div className="cta-row" style={{ flexWrap: "wrap" }}>
              {WEEKDAY_OPTIONS.map((item) => {
                const active = aiForm.weekdays.includes(item.value);
                return (
                  <button
                    key={item.value}
                    className={active ? "button secondary" : "button ghost"}
                    type="button"
                    onClick={() => toggleAiWeekday(item.value)}
                    disabled={aiGenerating || aiRollingBack}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          {latestAiOperation ? (
            <div className="card">
              <div className="section-title">最近一次已写入的 AI 排课</div>
              <div className="meta-text" style={{ marginTop: 6 }}>
                {latestAiOperation.mode === "replace_all" ? "全校重排" : "补齐课时"} · 目标班级 {latestAiOperation.targetClassCount} 个 · 新增 {latestAiOperation.createdSessions} 节 · 未完成 {latestAiOperation.unresolvedLessons} 节
              </div>
              <div className="meta-text" style={{ marginTop: 6 }}>
                写入于 {formatLoadedTime(latestAiOperation.appliedAt ?? latestAiOperation.createdAt)}
                {latestAiOperation.lockedPreservedSessionCount ? ` · 保留锁定节次 ${latestAiOperation.lockedPreservedSessionCount} 个` : ""}
              </div>
            </div>
          ) : null}

          {aiError ? <StatePanel compact tone="error" title="AI 排课失败" description={aiError} /> : null}
          {aiMessage ? <StatePanel compact tone="success" title={aiResult?.applied ? "AI 排课已写入" : "AI 预演完成"} description={aiMessage} /> : null}

          <div className="cta-row">
            <button className="button primary" type="button" onClick={() => void handleAiPreview()} disabled={aiGenerating || aiRollingBack || aiPreviewBlockingReasons.length > 0}>
              {aiPreviewBlockingReasons.length ? "先补配置再预演" : aiGenerating && (!aiResult?.previewId || aiResult?.applied) ? "AI 预演中..." : "先预演 AI 排课"}
            </button>
            <button className="button secondary" type="button" onClick={() => void handleAiApplyPreview()} disabled={aiGenerating || aiRollingBack || !aiResult?.previewId || aiResult?.applied}>
              {aiGenerating && aiResult?.previewId && !aiResult?.applied ? "写入中..." : aiResult?.applied ? "已写入课表" : "确认写入课表"}
            </button>
            <button className="button ghost" type="button" onClick={() => void handleAiRollback()} disabled={aiGenerating || aiRollingBack || !latestAiOperation?.rollbackAvailable}>
              {aiRollingBack ? "回滚中..." : "回滚最近一次 AI"}
            </button>
            <button className="button ghost" type="button" onClick={resetAiForm} disabled={aiGenerating || aiRollingBack}>
              重置配置
            </button>
          </div>

          {aiResult ? (
            <div className="grid grid-2" style={{ alignItems: "start" }}>
              <div className="card">
                <div className="section-title">{aiResult.applied ? "本次 AI 已写入课表" : "本次 AI 预演结果"}</div>
                <div className="meta-text" style={{ marginTop: 6 }}>
                  目标班级 {aiResult.summary.targetClassCount} 个 · 新增节次 {aiResult.summary.createdSessions} 个 · 未完成 {aiResult.summary.unresolvedLessons} 节
                  {(aiResult.summary.lockedPreservedSessionCount ?? 0) > 0 ? ` · 保留锁定 ${(aiResult.summary.lockedPreservedSessionCount ?? 0)} 节` : ""}
                </div>
                <div className="meta-text" style={{ marginTop: 6 }}>
                  {aiResult.applied ? "本轮已落库；如果尚未有后续人工改动，可用上方按钮一键回滚。" : "当前仅为预演结果，确认后才会正式写入学校课程表。"}
                </div>
                <div className="grid" style={{ gap: 8, marginTop: 12 }}>
                  {aiResult.createdSessions.slice(0, 6).map((item) => (
                    <div key={item.id} style={{ border: "1px solid var(--stroke)", borderRadius: 12, padding: 10 }}>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{item.className}</div>
                      <div className="section-sub" style={{ marginTop: 4 }}>{item.startTime}-{item.endTime}{item.slotLabel ? ` · ${item.slotLabel}` : ""}</div>
                      <div className="meta-text" style={{ marginTop: 6 }}>{formatSubjectLine(item)}{item.room ? ` · ${item.room}` : ""}</div>
                    </div>
                  ))}
                  {!aiResult.createdSessions.length ? <div className="section-sub">本次没有生成新节次。</div> : null}
                </div>
              </div>

              <div className="card">
                <div className="section-title">班级处理明细</div>
                <div className="grid" style={{ gap: 8, marginTop: 12 }}>
                  {aiResult.impactedClasses.slice(0, 8).map((item) => (
                    <div key={item.id} style={{ border: "1px solid var(--stroke)", borderRadius: 12, padding: 10 }}>
                      <div className="cta-row" style={{ justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700 }}>{item.name}</div>
                          <div className="section-sub" style={{ marginTop: 4 }}>{item.subject} · {item.grade} 年级 · 教师 {item.teacherName ?? item.teacherId ?? "未绑定"}</div>
                        </div>
                        <span className="pill">{item.status === "generated" ? "已生成" : item.status === "unchanged" ? "已达标" : "已跳过"}</span>
                      </div>
                      <div className="meta-text" style={{ marginTop: 6 }}>
                        目标 {item.requestedLessons} 节 · 新增 {item.createdLessons} 节 · 课表总数 {item.totalLessonsAfter} 节
                      </div>
                      {item.reason ? <div className="meta-text" style={{ marginTop: 6 }}>说明：{item.reason}</div> : null}
                    </div>
                  ))}
                </div>
                {aiResult.warnings.length ? (
                  <div className="grid" style={{ gap: 8, marginTop: 12 }}>
                    <div className="section-title">需人工确认</div>
                    {aiResult.warnings.slice(0, 6).map((warning, index) => (
                      <div key={`${warning}-${index}`} className="meta-text">- {warning}</div>
                    ))}
                  </div>
                ) : (
                  <div className="meta-text" style={{ marginTop: 12 }}>本轮未发现需要人工处理的异常约束。</div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </Card>

      <div className="grid grid-2" style={{ alignItems: "start" }}>
        <Card title="年级学科课时模板" tag="模板">
          <div className="grid" style={{ gap: 12 }}>
            <div id="schedule-templates" className="section-sub">为同年级同学科配置默认每周节数、课时和时段参数，AI 排课时会自动优先套用。</div>
            <div className="grid grid-3">
              <Stat label="模板总数" value={String(templates.length)} helper="学校级规则库" />
              <Stat label="模板覆盖班级" value={String(aiTemplateCoverageCount)} helper="可直接套用" />
              <Stat label="禁排时段" value={String(teacherUnavailableSlots.length)} helper="教师约束" />
            </div>
            <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <span className="section-sub">年级</span>
                <select value={templateForm.grade} onChange={(event) => setTemplateForm((prev) => ({ ...prev, grade: event.target.value }))} style={fieldStyle}>
                  <option value="">请选择年级</option>
                  {gradeOptions.map((item) => <option key={item} value={item}>{item} 年级</option>)}
                </select>
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span className="section-sub">学科</span>
                <select value={templateForm.subject} onChange={(event) => setTemplateForm((prev) => ({ ...prev, subject: event.target.value }))} style={fieldStyle}>
                  <option value="">请选择学科</option>
                  {subjectOptions.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span className="section-sub">每周总节数</span>
                <input type="number" min={1} max={30} value={templateForm.weeklyLessonsPerClass} onChange={(event) => setTemplateForm((prev) => ({ ...prev, weeklyLessonsPerClass: event.target.value }))} style={fieldStyle} />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span className="section-sub">单节课时</span>
                <input type="number" min={30} max={120} value={templateForm.lessonDurationMinutes} onChange={(event) => setTemplateForm((prev) => ({ ...prev, lessonDurationMinutes: event.target.value }))} style={fieldStyle} />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span className="section-sub">每日节次数</span>
                <input type="number" min={1} max={12} value={templateForm.periodsPerDay} onChange={(event) => setTemplateForm((prev) => ({ ...prev, periodsPerDay: event.target.value }))} style={fieldStyle} />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span className="section-sub">首节时间</span>
                <input type="time" value={templateForm.dayStartTime} onChange={(event) => setTemplateForm((prev) => ({ ...prev, dayStartTime: event.target.value }))} style={fieldStyle} />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span className="section-sub">课间</span>
                <input type="number" min={0} max={30} value={templateForm.shortBreakMinutes} onChange={(event) => setTemplateForm((prev) => ({ ...prev, shortBreakMinutes: event.target.value }))} style={fieldStyle} />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span className="section-sub">午休前节次</span>
                <input type="number" min={1} max={12} value={templateForm.lunchBreakAfterPeriod} onChange={(event) => setTemplateForm((prev) => ({ ...prev, lunchBreakAfterPeriod: event.target.value }))} style={fieldStyle} />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span className="section-sub">午休时长</span>
                <input type="number" min={0} max={180} value={templateForm.lunchBreakMinutes} onChange={(event) => setTemplateForm((prev) => ({ ...prev, lunchBreakMinutes: event.target.value }))} style={fieldStyle} />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span className="section-sub">默认校区</span>
                <input value={templateForm.campus} onChange={(event) => setTemplateForm((prev) => ({ ...prev, campus: event.target.value }))} style={fieldStyle} />
              </label>
            </div>
            <div style={{ display: "grid", gap: 6 }}>
              <span className="section-sub">模板排课日</span>
              <div className="cta-row" style={{ flexWrap: "wrap" }}>
                {WEEKDAY_OPTIONS.map((item) => {
                  const active = templateForm.weekdays.includes(item.value);
                  return (
                    <button key={item.value} className={active ? "button secondary" : "button ghost"} type="button" onClick={() => toggleTemplateWeekday(item.value)}>
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
            {templateError ? <StatePanel compact tone="error" title="模板保存失败" description={templateError} /> : null}
            {templateMessage ? <StatePanel compact tone="success" title="模板已更新" description={templateMessage} /> : null}
            <div className="cta-row">
              <button className="button primary" type="button" onClick={() => void handleSaveTemplate()} disabled={templateSaving}>
                {templateSaving ? "保存中..." : templateForm.id ? "更新模板" : "保存模板"}
              </button>
              <button className="button ghost" type="button" onClick={resetTemplateForm} disabled={templateSaving}>重置</button>
              <button className="button secondary" type="button" onClick={applyDraftTemplateToAi} disabled={templateSaving || !templateForm.grade || !templateForm.subject}>应用到 AI 参数</button>
            </div>
            <div className="grid" style={{ gap: 8 }}>
              {templates.map((item) => (
                <div key={item.id} className="card">
                  <div className="cta-row" style={{ justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                    <div>
                      <div className="section-title">{item.grade} 年级 · {item.subject}</div>
                      <div className="meta-text" style={{ marginTop: 6 }}>
                        {item.weeklyLessonsPerClass} 节/周 · {item.lessonDurationMinutes} 分钟 · 每日 {item.periodsPerDay} 节 · {item.dayStartTime} 开始
                      </div>
                    </div>
                    <span className="pill">{item.weekdays.map((day) => WEEKDAY_OPTIONS.find((option) => option.value === String(day))?.label ?? day).join(" / ")}</span>
                  </div>
                  <div className="cta-row cta-row-tight" style={{ marginTop: 10 }}>
                    <button className="button secondary" type="button" onClick={() => setAiForm(applyTemplateToAiForm(item))}>应用到 AI</button>
                    <button className="button ghost" type="button" onClick={() => startEditTemplate(item)}>编辑</button>
                    <button className="button ghost" type="button" onClick={() => void handleDeleteTemplate(item.id)} disabled={templateDeletingId === item.id}>
                      {templateDeletingId === item.id ? "删除中..." : "删除"}
                    </button>
                  </div>
                </div>
              ))}
              {!templates.length ? <div className="section-sub">还没有模板，建议先为高频年级学科配置默认课时。</div> : null}
            </div>
          </div>
        </Card>

        <Card title="教师禁排时段" tag="约束">
          <div className="grid" style={{ gap: 12 }}>
            <div id="schedule-unavailability" className="section-sub">配置教师固定禁排窗口，AI 排课和手动新建节次都会自动避开这些时间；教师列表优先取全校教师账号。</div>
            <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <span className="section-sub">教师</span>
                <select value={teacherUnavailableForm.teacherId} onChange={(event) => setTeacherUnavailableForm((prev) => ({ ...prev, teacherId: event.target.value }))} style={fieldStyle}>
                  <option value="">请选择教师</option>
                  {teacherOptions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span className="section-sub">星期</span>
                <select value={teacherUnavailableForm.weekday} onChange={(event) => setTeacherUnavailableForm((prev) => ({ ...prev, weekday: event.target.value }))} style={fieldStyle}>
                  {WEEKDAY_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span className="section-sub">开始时间</span>
                <input type="time" value={teacherUnavailableForm.startTime} onChange={(event) => setTeacherUnavailableForm((prev) => ({ ...prev, startTime: event.target.value }))} style={fieldStyle} />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span className="section-sub">结束时间</span>
                <input type="time" value={teacherUnavailableForm.endTime} onChange={(event) => setTeacherUnavailableForm((prev) => ({ ...prev, endTime: event.target.value }))} style={fieldStyle} />
              </label>
            </div>
            <label style={{ display: "grid", gap: 6 }}>
              <span className="section-sub">原因说明</span>
              <input value={teacherUnavailableForm.reason} onChange={(event) => setTeacherUnavailableForm((prev) => ({ ...prev, reason: event.target.value }))} placeholder="如：教研会 / 固定值班 / 跨校区授课" style={fieldStyle} />
            </label>
            {teacherUnavailableError ? <StatePanel compact tone="error" title="教师禁排保存失败" description={teacherUnavailableError} /> : null}
            {teacherUnavailableMessage ? <StatePanel compact tone="success" title="教师禁排已更新" description={teacherUnavailableMessage} /> : null}
            <div className="cta-row">
              <button className="button primary" type="button" onClick={() => void handleSaveTeacherUnavailable()} disabled={teacherUnavailableSaving}>
                {teacherUnavailableSaving ? "保存中..." : "保存禁排时段"}
              </button>
            </div>
            <div className="grid" style={{ gap: 8 }}>
              {teacherUnavailableSlots.map((item) => {
                const teacherName = teacherOptions.find((option) => option.id === item.teacherId)?.name ?? item.teacherId;
                return (
                  <div key={item.id} className="card">
                    <div className="cta-row" style={{ justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                      <div>
                        <div className="section-title">{teacherName}</div>
                        <div className="meta-text" style={{ marginTop: 6 }}>
                          {WEEKDAY_OPTIONS.find((option) => option.value === String(item.weekday))?.label ?? item.weekday} · {item.startTime}-{item.endTime}
                        </div>
                        {item.reason ? <div className="meta-text" style={{ marginTop: 6 }}>原因：{item.reason}</div> : null}
                      </div>
                      <button className="button ghost" type="button" onClick={() => void handleDeleteTeacherUnavailable(item.id)} disabled={teacherUnavailableDeletingId === item.id}>
                        {teacherUnavailableDeletingId === item.id ? "删除中..." : "删除"}
                      </button>
                    </div>
                  </div>
                );
              })}
              {!teacherUnavailableSlots.length ? <div className="section-sub">当前未配置教师禁排时段。</div> : null}
            </div>
          </div>
        </Card>
      </div>

      <Card title="教师排课规则" tag="规则">
        <div className="grid" style={{ gap: 12 }}>
          <div id="schedule-rules" className="section-sub">用于限制教师周课时、连续连堂和跨校区缓冲时间；AI 预演、正式写入和手动新建节次都会同步校验。</div>
          <div className="grid grid-3">
            <Stat label="已配置教师" value={String(teacherRules.length)} helper="逐教师精细约束" />
            <Stat label="覆盖班级" value={String(teacherRuleCoverageCount)} helper="命中已绑定教师班级" />
            <Stat label="跨校区规则" value={String(crossCampusRuleCount)} helper="含跨校区缓冲" />
          </div>
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span className="section-sub">教师</span>
              <select value={teacherRuleForm.teacherId} onChange={(event) => setTeacherRuleForm((prev) => ({ ...prev, teacherId: event.target.value }))} style={fieldStyle}>
                <option value="">请选择教师</option>
                {teacherOptions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span className="section-sub">周课时上限</span>
              <input type="number" min={1} max={60} value={teacherRuleForm.weeklyMaxLessons} onChange={(event) => setTeacherRuleForm((prev) => ({ ...prev, weeklyMaxLessons: event.target.value }))} placeholder="如：18" style={fieldStyle} />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span className="section-sub">最多连续节数</span>
              <input type="number" min={1} max={12} value={teacherRuleForm.maxConsecutiveLessons} onChange={(event) => setTeacherRuleForm((prev) => ({ ...prev, maxConsecutiveLessons: event.target.value }))} placeholder="如：2" style={fieldStyle} />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span className="section-sub">跨校区最小间隔</span>
              <input type="number" min={1} max={240} value={teacherRuleForm.minCampusGapMinutes} onChange={(event) => setTeacherRuleForm((prev) => ({ ...prev, minCampusGapMinutes: event.target.value }))} placeholder="如：20 分钟" style={fieldStyle} />
            </label>
          </div>
          {teacherRuleError ? <StatePanel compact tone="error" title="教师规则保存失败" description={teacherRuleError} /> : null}
          {teacherRuleMessage ? <StatePanel compact tone="success" title="教师规则已更新" description={teacherRuleMessage} /> : null}
          <div className="cta-row">
            <button className="button primary" type="button" onClick={() => void handleSaveTeacherRule()} disabled={teacherRuleSaving}>
              {teacherRuleSaving ? "保存中..." : teacherRuleForm.id ? "更新规则" : "保存规则"}
            </button>
            <button className="button ghost" type="button" onClick={resetTeacherRuleForm} disabled={teacherRuleSaving}>重置</button>
          </div>
          <div className="grid" style={{ gap: 8 }}>
            {teacherRules.map((item) => {
              const teacherName = teacherOptions.find((option) => option.id === item.teacherId)?.name ?? item.teacherId;
              return (
                <div key={item.id} className="card">
                  <div className="cta-row" style={{ justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                    <div>
                      <div className="section-title">{teacherName}</div>
                      <div className="meta-text" style={{ marginTop: 6 }}>{formatTeacherRuleSummary(item)}</div>
                    </div>
                    <span className="pill">教师规则</span>
                  </div>
                  <div className="cta-row cta-row-tight" style={{ marginTop: 10 }}>
                    <button className="button secondary" type="button" onClick={() => startEditTeacherRule(item)} disabled={teacherRuleDeletingId === item.id}>编辑</button>
                    <button className="button ghost" type="button" onClick={() => void handleDeleteTeacherRule(item.id)} disabled={teacherRuleDeletingId === item.id}>
                      {teacherRuleDeletingId === item.id ? "删除中..." : "删除"}
                    </button>
                  </div>
                </div>
              );
            })}
            {!teacherRules.length ? <div className="section-sub">当前未配置教师排课规则，建议优先为满课教师、跨校区教师配置约束。</div> : null}
          </div>
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
          <button className="button ghost" type="button" onClick={clearWeekViewFilters}>
            清空筛选
          </button>
        </div>
      </Card>

      <div className="grid grid-2" style={{ alignItems: "start" }}>
        <div ref={manualEditorRef} id="schedule-manual-editor">
        <Card title={editingId ? "编辑课程节次" : "新建课程节次"} tag={editingId ? "编辑" : "新建"}>
          <div className="grid" style={{ gap: 12 }}>
            {selectedManualClass ? (
              <div className="card">
                <div className="cta-row" style={{ justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                  <div>
                    <div className="section-title">当前正在处理：{selectedManualClass.name}</div>
                    <div className="section-sub" style={{ marginTop: 4 }}>
                      {selectedManualClass.subject} · {selectedManualClass.grade} 年级 · 教师 {selectedManualClass.teacherName ?? selectedManualClass.teacherId ?? "未绑定"}
                    </div>
                  </div>
                  <span className="pill">{editingId ? "编辑已有节次" : "新建单个节次"}</span>
                </div>
                <div className="badge-row" style={{ marginTop: 10 }}>
                  <span className="badge">已排 {selectedManualClassScheduleCount} 节/周</span>
                  <span className="badge">锁定 {selectedManualClassLockedCount} 节</span>
                  <span className="badge">{selectedManualClassTemplate ? "已配课时模板" : "缺课时模板"}</span>
                  <span className="badge">{selectedManualTeacherRule ? "已配教师规则" : selectedManualClass.teacherId ? "缺教师规则" : "未绑定教师"}</span>
                </div>
                <div className="meta-text" style={{ marginTop: 10, lineHeight: 1.65 }}>
                  {selectedManualClassTemplate
                    ? `建议优先使用模板时段：${selectedManualClassTemplate.dayStartTime} 开始，单节 ${selectedManualClassTemplate.lessonDurationMinutes} 分钟，排课日 ${selectedManualClassTemplate.weekdays.map((day) => WEEKDAY_OPTIONS.find((option) => option.value === String(day))?.label ?? day).join(" / ")}。`
                    : "当前没有匹配的年级学科模板，建议先补模板后再批量或手动排课。"}
                </div>
                <div className="cta-row" style={{ marginTop: 10, flexWrap: "wrap" }}>
                  {selectedManualClassTemplate ? (
                    <button className="button secondary" type="button" onClick={applySelectedClassTemplateToForm} disabled={saving}>
                      带入模板基础参数
                    </button>
                  ) : (
                    <a className="button ghost" href="#schedule-templates">去补课时模板</a>
                  )}
                  {selectedManualClass.teacherId && !selectedManualTeacherRule ? (
                    <a className="button ghost" href="#schedule-rules">去配教师规则</a>
                  ) : null}
                  <button className="button ghost" type="button" onClick={() => focusClassInWeekView(selectedManualClass.id)}>
                    查看该班周视图
                  </button>
                </div>
              </div>
            ) : null}
            <label style={{ display: "grid", gap: 6 }}>
              <span className="section-sub">班级</span>
              <select
                value={form.classId}
                onChange={(event) => setForm(buildManualScheduleDraft(event.target.value))}
                style={fieldStyle}
                disabled={Boolean(editingId)}
              >
                <option value="">请选择班级</option>
                {classes.map((item) => (
                  <option key={item.id} value={item.id}>{item.name} · {item.subject} · {item.grade} 年级</option>
                ))}
              </select>
              {editingId ? (
                <div className="meta-text">编辑模式只修改当前节次的时间、教室和备注；若要换班，建议新建后删除原节次。</div>
              ) : null}
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
        </div>

        <div ref={weekViewRef}>
        <Card title="当前周视图" tag="周视图">
          <div className="card" style={{ marginBottom: 12, border: "1px solid rgba(105, 65, 198, 0.18)", background: "rgba(105, 65, 198, 0.06)" }}>
            <div className="cta-row" style={{ justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginTop: 0 }}>
              <div>
                <div className="section-title">
                  当前正在看：{selectedWeekViewClass ? selectedWeekViewClass.name : "全校"} · {selectedWeekdayOption?.label ?? "整周"}
                  {trimmedKeyword ? ` · 关键词“${trimmedKeyword}”` : ""}
                </div>
                <div className="meta-text" style={{ marginTop: 6, lineHeight: 1.7 }}>
                  当前命中 {filteredSessions.length} 节{filteredLockedSessionCount ? `，其中 ${filteredLockedSessionCount} 节已锁定` : ""}。
                  {selectedWeekViewClass
                    ? " 从班级状态或手动排课入口跳转到周视图时，会默认展示该班整周课表。"
                    : " 可先聚焦单个班级，再补充星期或关键词做精查。"}
                </div>
              </div>
              <div className="badge-row" style={{ justifyContent: "flex-end" }}>
                <span className="badge">班级：{selectedWeekViewClass?.name ?? "全校"}</span>
                <span className="badge">星期：{selectedWeekdayOption?.label ?? "整周"}</span>
                {trimmedKeyword ? <span className="badge">关键词：{trimmedKeyword}</span> : null}
                {filteredLockedSessionCount ? <span className="badge">锁定 {filteredLockedSessionCount} 节</span> : null}
              </div>
            </div>
            <div className="cta-row" style={{ marginTop: 10, flexWrap: "wrap" }}>
              {selectedWeekViewClass && (selectedWeekdayOption || trimmedKeyword) ? (
                <button className="button secondary" type="button" onClick={keepFocusedClassWeekView}>
                  仅保留该班整周
                </button>
              ) : null}
              {selectedWeekdayOption ? (
                <button className="button ghost" type="button" onClick={() => setWeekdayFilter("all")}>
                  查看整周
                </button>
              ) : null}
              {trimmedKeyword ? (
                <button className="button ghost" type="button" onClick={() => setKeyword("")}>
                  清空关键词
                </button>
              ) : null}
              {activeWeekViewFilterCount ? (
                <button className="button ghost" type="button" onClick={clearWeekViewFilters}>
                  恢复全校周视图
                </button>
              ) : null}
              {filteredLockedSessionCount ? (
                <span className="meta-text" style={{ color: "#6941c6" }}>
                  锁定节次需先解锁，才能编辑、删除或重新调整。
                </span>
              ) : null}
            </div>
          </div>

          {activeWeekViewFilterCount && !filteredSessions.length ? (
            <div className="card" style={{ marginBottom: 12, borderStyle: "dashed" }}>
              <div className="section-title">当前筛选没有命中节次</div>
              <div className="meta-text" style={{ marginTop: 6, lineHeight: 1.7 }}>
                建议先恢复全校周视图，或仅保留班级整周，再逐步加上星期与关键词定位问题课节。
              </div>
            </div>
          ) : null}

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
                            <div className="cta-row" style={{ justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginTop: 0 }}>
                              <div style={{ fontSize: 14, fontWeight: 700 }}>{item.className}</div>
                              {item.locked ? <span className="pill">已锁定</span> : null}
                            </div>
                            <div className="section-sub" style={{ marginTop: 4 }}>{item.startTime}-{item.endTime}{item.slotLabel ? ` · ${item.slotLabel}` : ""}</div>
                            <div className="meta-text" style={{ marginTop: 6 }}>{formatSubjectLine(item)}{item.room ? ` · ${item.room}` : ""}</div>
                            {item.focusSummary ? <div className="meta-text" style={{ marginTop: 6 }}>课堂焦点：{item.focusSummary}</div> : null}
                            {item.note ? <div className="meta-text" style={{ marginTop: 6 }}>备注：{item.note}</div> : null}
                            {item.locked ? <div className="meta-text" style={{ marginTop: 6, color: "#6941c6" }}>已锁定：AI 重排、编辑与删除都会跳过该节次；如需调整，请先解锁再修改。</div> : null}
                            <div className="cta-row cta-row-tight" style={{ marginTop: 10 }}>
                              <button className="button ghost" type="button" onClick={() => void handleToggleLock(item)} disabled={lockingId === item.id || deletingId === item.id}>
                                {lockingId === item.id ? "处理中..." : item.locked ? "解锁" : "锁定"}
                              </button>
                              <button
                                className="button secondary"
                                type="button"
                                onClick={() => startEdit(item)}
                                disabled={item.locked || lockingId === item.id}
                                title={item.locked ? "请先解锁该节次后再编辑" : undefined}
                              >
                                {item.locked ? "先解锁再编辑" : "编辑"}
                              </button>
                              <button
                                className="button ghost"
                                type="button"
                                onClick={() => void handleDelete(item.id)}
                                disabled={item.locked || deletingId === item.id || lockingId === item.id}
                                title={item.locked ? "请先解锁该节次后再删除" : undefined}
                              >
                                {item.locked ? "先解锁再删除" : deletingId === item.id ? "删除中..." : "删除"}
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="section-sub">{activeWeekViewFilterCount ? "当前筛选下暂无节次" : "暂无节次"}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
        </div>
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
                      当前已排 {scheduleCount} 节/周{(lockedCountByClass.get(item.id) ?? 0) ? `（锁定 ${(lockedCountByClass.get(item.id) ?? 0)} 节）` : ""} · 作业 {item.assignmentCount} 份 · 学生 {item.studentCount} 人
                    </div>
                    {item.teacherId && teacherRuleByTeacherId.get(item.teacherId) ? (
                      <div className="meta-text" style={{ marginTop: 6 }}>
                        教师规则：{formatTeacherRuleSummary(teacherRuleByTeacherId.get(item.teacherId)!)}
                      </div>
                    ) : null}
                    <div className="badge-row" style={{ marginTop: 8 }}>
                      <span className="badge">{templateByKey.has(`${item.grade}:${item.subject}`) ? "已配模板" : "缺模板"}</span>
                      <span className="badge">{item.teacherId ? teacherRuleByTeacherId.get(item.teacherId) ? "已配规则" : "缺规则" : "未绑教师"}</span>
                    </div>
                  </div>
                  <span className="pill">{hasSchedule ? `${scheduleCount} 节/周` : "待排课"}</span>
                </div>
                <div className="cta-row" style={{ marginTop: 10, flexWrap: "wrap" }}>
                  <button className="button secondary" type="button" onClick={() => startCreateForClass(item.id)}>
                    为该班排课
                  </button>
                  <button className="button ghost" type="button" onClick={() => focusClassInWeekView(item.id)}>
                    查看该班周视图
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
