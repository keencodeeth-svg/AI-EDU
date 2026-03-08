import crypto from "crypto";
import fs from "fs";
import path from "path";
import { conflict, notFound } from "./api/http";
import {
  listClassScheduleSessions,
  replaceClassScheduleSessions,
  type ClassScheduleSession,
  type ClassScheduleSessionInput
} from "./class-schedules";
import {
  buildSchoolAiSchedulePlan,
  executeSchoolAiSchedulePlan,
  type SchoolAiScheduleExecutionResult,
  type SchoolAiScheduleInput,
  type SchoolAiScheduleMode,
  type SchoolAiSchedulePlan,
  type SchoolAiScheduleResult
} from "./school-schedule-ai";
import { DEFAULT_SCHOOL_ID } from "./schools";

export type SchoolAiScheduleOperationStatus = "preview" | "applied" | "rolled_back";

export type SchoolAiScheduleOperationRecord = {
  id: string;
  schoolId: string;
  status: SchoolAiScheduleOperationStatus;
  createdAt: string;
  updatedAt: string;
  appliedAt?: string;
  rolledBackAt?: string;
  targetClassIds: string[];
  replaceClassIds: string[];
  baseSessions: ClassScheduleSession[];
  afterSessions: ClassScheduleSession[];
  drafts: ClassScheduleSessionInput[];
  result: SchoolAiScheduleResult;
};

export type SchoolAiScheduleOperationSummary = {
  id: string;
  schoolId: string;
  createdAt: string;
  appliedAt?: string;
  mode: SchoolAiScheduleMode;
  targetClassCount: number;
  createdSessions: number;
  unresolvedLessons: number;
  lockedPreservedSessionCount: number;
  rollbackAvailable: boolean;
};

const FILE = "school-schedule-ai-operations.json";
const runtimeDir = path.resolve(process.cwd(), process.env.DATA_DIR ?? ".runtime-data");
const seedDir = path.resolve(process.cwd(), process.env.DATA_SEED_DIR ?? "data");

function normalizeSchoolId(value?: string | null) {
  return value?.trim() || DEFAULT_SCHOOL_ID;
}

function readFileIfExists(filePath: string) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return null;
  }
}

function normalizeRecord(item: Partial<SchoolAiScheduleOperationRecord>): SchoolAiScheduleOperationRecord {
  return {
    id: item.id ?? `saio-${crypto.randomBytes(6).toString("hex")}`,
    schoolId: normalizeSchoolId(item.schoolId),
    status:
      item.status === "applied" || item.status === "rolled_back" ? item.status : "preview",
    createdAt: item.createdAt ?? new Date().toISOString(),
    updatedAt: item.updatedAt ?? item.createdAt ?? new Date().toISOString(),
    appliedAt: item.appliedAt,
    rolledBackAt: item.rolledBackAt,
    targetClassIds: Array.isArray(item.targetClassIds) ? item.targetClassIds.filter(Boolean) : [],
    replaceClassIds: Array.isArray(item.replaceClassIds) ? item.replaceClassIds.filter(Boolean) : [],
    baseSessions: Array.isArray(item.baseSessions) ? item.baseSessions : [],
    afterSessions: Array.isArray(item.afterSessions) ? item.afterSessions : [],
    drafts: Array.isArray(item.drafts) ? item.drafts : [],
    result: item.result as SchoolAiScheduleResult
  } satisfies SchoolAiScheduleOperationRecord;
}

function readStore(): SchoolAiScheduleOperationRecord[] {
  const runtimePath = path.join(runtimeDir, FILE);
  const seedPath = path.join(seedDir, FILE);
  const list = readFileIfExists(runtimePath) ?? readFileIfExists(seedPath) ?? [];
  return (Array.isArray(list) ? list : [])
    .map((item) => normalizeRecord(item))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

function writeStore(items: SchoolAiScheduleOperationRecord[]) {
  fs.mkdirSync(runtimeDir, { recursive: true });
  fs.writeFileSync(path.join(runtimeDir, FILE), JSON.stringify(items, null, 2));
}

function buildSessionSignature(sessions: ClassScheduleSession[]) {
  return JSON.stringify(
    sessions
      .slice()
      .sort((left, right) => {
        if (left.classId !== right.classId) return left.classId.localeCompare(right.classId, "zh-CN");
        if (left.weekday !== right.weekday) return left.weekday - right.weekday;
        if (left.startTime !== right.startTime) return left.startTime.localeCompare(right.startTime);
        return left.id.localeCompare(right.id, "zh-CN");
      })
      .map((item) => ({
        id: item.id,
        classId: item.classId,
        weekday: item.weekday,
        startTime: item.startTime,
        endTime: item.endTime,
        slotLabel: item.slotLabel ?? "",
        room: item.room ?? "",
        campus: item.campus ?? "",
        note: item.note ?? "",
        focusSummary: item.focusSummary ?? "",
        locked: item.locked === true,
        lockedAt: item.lockedAt ?? "",
        updatedAt: item.updatedAt,
        createdAt: item.createdAt
      }))
  );
}

function toSummary(record: SchoolAiScheduleOperationRecord): SchoolAiScheduleOperationSummary {
  return {
    id: record.id,
    schoolId: record.schoolId,
    createdAt: record.createdAt,
    appliedAt: record.appliedAt,
    mode: record.result.config.mode,
    targetClassCount: record.result.summary.targetClassCount,
    createdSessions: record.result.summary.createdSessions,
    unresolvedLessons: record.result.summary.unresolvedLessons,
    lockedPreservedSessionCount: record.result.summary.lockedPreservedSessionCount,
    rollbackAvailable: record.status === "applied"
  };
}

function upsertRecord(record: SchoolAiScheduleOperationRecord) {
  const list: SchoolAiScheduleOperationRecord[] = readStore();
  const index = list.findIndex((item) => item.id === record.id);
  if (index >= 0) {
    list[index] = record;
  } else {
    list.push(record);
  }
  writeStore(list);
}

async function getRecordById(id: string, scope?: { schoolId?: string | null }) {
  const record = readStore().find((item) => item.id === id) ?? null;
  if (!record) return null;
  if (scope?.schoolId && normalizeSchoolId(record.schoolId) !== normalizeSchoolId(scope.schoolId)) {
    return null;
  }
  return record;
}

function createPreviewRecord(plan: SchoolAiSchedulePlan) {
  return normalizeRecord({
    id: `saio-${crypto.randomBytes(6).toString("hex")}`,
    schoolId: plan.schoolId,
    status: "preview",
    createdAt: plan.generatedAt,
    updatedAt: plan.generatedAt,
    targetClassIds: plan.targetClassIds,
    replaceClassIds: plan.replaceClassIds,
    baseSessions: plan.baseSessions,
    afterSessions: [],
    drafts: plan.drafts,
    result: plan.result
  });
}

async function applyRecord(record: SchoolAiScheduleOperationRecord): Promise<SchoolAiScheduleExecutionResult> {
  const currentBaseSessions = await listClassScheduleSessions({
    schoolId: record.schoolId,
    classIds: record.targetClassIds
  });
  if (buildSessionSignature(currentBaseSessions) !== buildSessionSignature(record.baseSessions)) {
    conflict("课表已发生变化，请先重新预演后再执行");
  }

  const plan: SchoolAiSchedulePlan = {
    schoolId: record.schoolId,
    generatedAt: record.createdAt,
    targetClassIds: record.targetClassIds,
    replaceClassIds: record.replaceClassIds,
    baseSessions: record.baseSessions,
    drafts: record.drafts,
    result: record.result
  };

  const applied = await executeSchoolAiSchedulePlan(plan, {
    previewId: record.id,
    operationId: record.id
  });
  const afterSessions = await listClassScheduleSessions({ schoolId: record.schoolId, classIds: record.targetClassIds });
  const now = new Date().toISOString();
  upsertRecord({
    ...record,
    status: "applied",
    updatedAt: now,
    appliedAt: now,
    afterSessions,
    result: {
      ...record.result,
      createdSessions: applied.createdSessions
    }
  });
  return applied;
}

export async function previewSchoolAiScheduleOperation(input: SchoolAiScheduleInput): Promise<SchoolAiScheduleExecutionResult> {
  const plan = await buildSchoolAiSchedulePlan(input);
  const record = createPreviewRecord(plan);
  upsertRecord(record);
  return {
    ...plan.result,
    generatedAt: plan.generatedAt,
    applied: false,
    previewId: record.id,
    operationId: record.id,
    rollbackAvailable: false
  };
}

export async function applySchoolAiSchedulePreview(
  id: string,
  scope?: { schoolId?: string | null }
): Promise<SchoolAiScheduleExecutionResult> {
  const record = await getRecordById(id, scope);
  if (!record) {
    notFound("ai schedule preview not found");
  }
  if (record.status !== "preview") {
    conflict("该 AI 预演已执行或失效");
  }
  return applyRecord(record);
}

export async function applySchoolAiScheduleDirect(input: SchoolAiScheduleInput): Promise<SchoolAiScheduleExecutionResult> {
  const plan = await buildSchoolAiSchedulePlan(input);
  const record = createPreviewRecord(plan);
  upsertRecord(record);
  return applyRecord(record);
}

export async function getLatestAppliedSchoolAiScheduleOperation(scope?: { schoolId?: string | null }) {
  const record = readStore().find(
    (item) =>
      item.status === "applied" &&
      (!scope?.schoolId || normalizeSchoolId(item.schoolId) === normalizeSchoolId(scope.schoolId))
  );
  return record ? toSummary(record) : null;
}

export async function rollbackSchoolAiScheduleOperation(input: {
  schoolId?: string | null;
  operationId?: string;
}) {
  const record = input.operationId
    ? await getRecordById(input.operationId, input.schoolId ? { schoolId: input.schoolId } : undefined)
    : await getLatestAppliedSchoolAiScheduleOperationRecord({ schoolId: input.schoolId });

  if (!record) {
    notFound("ai schedule operation not found");
  }

  const currentAfterSessions = await listClassScheduleSessions({
    schoolId: record.schoolId,
    classIds: record.targetClassIds
  });
  if (buildSessionSignature(currentAfterSessions) !== buildSessionSignature(record.afterSessions)) {
    conflict("课表已在 AI 排课后被修改，暂不能一键回滚");
  }

  await replaceClassScheduleSessions({
    schoolId: record.schoolId,
    classIds: record.targetClassIds,
    sessions: record.baseSessions,
    ignoreTeacherUnavailable: true
  });

  const now = new Date().toISOString();
  upsertRecord({
    ...record,
    status: "rolled_back",
    rolledBackAt: now,
    updatedAt: now
  });

  return {
    operationId: record.id,
    restoredClassCount: record.targetClassIds.length,
    restoredSessionCount: record.baseSessions.length
  };
}

export async function getLatestAppliedSchoolAiScheduleOperationRecord(scope?: { schoolId?: string | null }) {
  return readStore().find(
    (item) =>
      item.status === "applied" &&
      (!scope?.schoolId || normalizeSchoolId(item.schoolId) === normalizeSchoolId(scope.schoolId))
  ) ?? null;
}
