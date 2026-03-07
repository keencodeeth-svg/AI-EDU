import crypto from "crypto";
import { readJson, writeJson } from "./storage";
import type { ResolvedTeacherNotificationRule, TeacherNotificationStage } from "./teacher-notification-engine";

export type TeacherNotificationHistoryAssignment = {
  assignmentId: string;
  title: string;
  dueDate: string;
  stage: TeacherNotificationStage;
  studentTargets: number;
  parentTargets: number;
};

export type TeacherNotificationHistoryClassResult = {
  classId: string;
  className: string;
  subject: string;
  grade: string;
  rule: ResolvedTeacherNotificationRule;
  assignmentTargets: number;
  dueSoonAssignments: number;
  overdueAssignments: number;
  studentTargets: number;
  parentTargets: number;
  uniqueStudents: number;
  sampleAssignments: TeacherNotificationHistoryAssignment[];
};

export type TeacherNotificationHistoryItem = {
  id: string;
  teacherId: string;
  executedAt: string;
  scope: {
    classIds: string[];
  };
  totals: {
    classes: number;
    enabledClasses: number;
    assignmentTargets: number;
    dueSoonAssignments: number;
    overdueAssignments: number;
    studentTargets: number;
    parentTargets: number;
    uniqueStudents: number;
  };
  classResults: TeacherNotificationHistoryClassResult[];
};

const HISTORY_FILE = "teacher-notification-history.json";
const HISTORY_LIMIT = 120;

function normalizeAssignment(input: Partial<TeacherNotificationHistoryAssignment> | null | undefined) {
  if (!input?.assignmentId || !input.title || !input.dueDate || !input.stage) return null;
  return {
    assignmentId: String(input.assignmentId),
    title: String(input.title),
    dueDate: String(input.dueDate),
    stage: input.stage === "overdue" ? "overdue" : "due_soon",
    studentTargets: Number(input.studentTargets ?? 0),
    parentTargets: Number(input.parentTargets ?? 0)
  } satisfies TeacherNotificationHistoryAssignment;
}

function normalizeRule(input: Partial<ResolvedTeacherNotificationRule> | null | undefined) {
  if (!input?.classId) return null;
  return {
    classId: String(input.classId),
    enabled: Boolean(input.enabled),
    dueDays: Number(input.dueDays ?? 0),
    overdueDays: Number(input.overdueDays ?? 0),
    includeParents: Boolean(input.includeParents)
  } satisfies ResolvedTeacherNotificationRule;
}

function normalizeClassResult(input: Partial<TeacherNotificationHistoryClassResult> | null | undefined) {
  if (!input?.classId || !input.className || !input.subject || !input.grade) return null;
  const rule = normalizeRule(input.rule);
  if (!rule) return null;
  return {
    classId: String(input.classId),
    className: String(input.className),
    subject: String(input.subject),
    grade: String(input.grade),
    rule,
    assignmentTargets: Number(input.assignmentTargets ?? 0),
    dueSoonAssignments: Number(input.dueSoonAssignments ?? 0),
    overdueAssignments: Number(input.overdueAssignments ?? 0),
    studentTargets: Number(input.studentTargets ?? 0),
    parentTargets: Number(input.parentTargets ?? 0),
    uniqueStudents: Number(input.uniqueStudents ?? 0),
    sampleAssignments: Array.isArray(input.sampleAssignments)
      ? input.sampleAssignments
          .map((item) => normalizeAssignment(item))
          .filter((item): item is TeacherNotificationHistoryAssignment => Boolean(item))
      : []
  } satisfies TeacherNotificationHistoryClassResult;
}

function normalizeHistoryItem(input: Partial<TeacherNotificationHistoryItem> | null | undefined) {
  if (!input?.id || !input.teacherId || !input.executedAt) return null;
  return {
    id: String(input.id),
    teacherId: String(input.teacherId),
    executedAt: String(input.executedAt),
    scope: {
      classIds: Array.isArray(input.scope?.classIds) ? input.scope.classIds.map((item) => String(item)) : []
    },
    totals: {
      classes: Number(input.totals?.classes ?? 0),
      enabledClasses: Number(input.totals?.enabledClasses ?? 0),
      assignmentTargets: Number(input.totals?.assignmentTargets ?? 0),
      dueSoonAssignments: Number(input.totals?.dueSoonAssignments ?? 0),
      overdueAssignments: Number(input.totals?.overdueAssignments ?? 0),
      studentTargets: Number(input.totals?.studentTargets ?? 0),
      parentTargets: Number(input.totals?.parentTargets ?? 0),
      uniqueStudents: Number(input.totals?.uniqueStudents ?? 0)
    },
    classResults: Array.isArray(input.classResults)
      ? input.classResults
          .map((item) => normalizeClassResult(item))
          .filter((item): item is TeacherNotificationHistoryClassResult => Boolean(item))
      : []
  } satisfies TeacherNotificationHistoryItem;
}

export function listTeacherNotificationHistory(params: {
  teacherId: string;
  classId?: string;
  limit?: number;
}) {
  const cappedLimit = Number.isFinite(params.limit) ? Math.max(1, Math.min(100, Math.round(params.limit ?? 10))) : 10;
  const raw = readJson<Array<Partial<TeacherNotificationHistoryItem>>>(HISTORY_FILE, []);
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => normalizeHistoryItem(item))
    .filter((item): item is TeacherNotificationHistoryItem => Boolean(item))
    .filter((item) => item.teacherId === params.teacherId)
    .filter((item) => (params.classId ? item.scope.classIds.includes(params.classId) : true))
    .sort((a, b) => b.executedAt.localeCompare(a.executedAt))
    .slice(0, cappedLimit);
}

export function appendTeacherNotificationHistory(
  input: Omit<TeacherNotificationHistoryItem, "id"> & { id?: string }
) {
  const history = listTeacherNotificationHistory({ teacherId: input.teacherId, limit: HISTORY_LIMIT });
  const globalRaw = readJson<Array<Partial<TeacherNotificationHistoryItem>>>(HISTORY_FILE, []);
  const globalHistory = Array.isArray(globalRaw)
    ? globalRaw
        .map((item) => normalizeHistoryItem(item))
        .filter((item): item is TeacherNotificationHistoryItem => Boolean(item))
    : [];
  const next: TeacherNotificationHistoryItem = {
    ...input,
    id: input.id ?? `teacher-notify-run-${crypto.randomBytes(6).toString("hex")}`
  };
  const merged = [next, ...globalHistory].sort((a, b) => b.executedAt.localeCompare(a.executedAt)).slice(0, HISTORY_LIMIT);
  writeJson(HISTORY_FILE, merged);
  return next;
}
