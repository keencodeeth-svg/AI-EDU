import type { AiHistoryOrigin } from "./ai-history";
import type { AiQualityMeta, AssistAnswerMode } from "./ai-types";
import { getParentsByStudentId, getUserById, type User } from "./auth";
import { getClassesByStudent } from "./classes";
import { SUBJECT_LABELS, getGradeLabel } from "./constants";

export type TutorShareTargetKind = "teacher" | "parent";

export type TutorShareTarget = {
  id: string;
  name: string;
  role: "teacher" | "parent";
  kind: TutorShareTargetKind;
  description: string;
  contextLabels: string[];
};

export type TutorSharePayload = {
  question: string;
  answer: string;
  recognizedQuestion?: string;
  origin?: AiHistoryOrigin;
  subject?: string;
  grade?: string;
  answerMode?: AssistAnswerMode;
  provider?: string;
  steps?: string[];
  hints?: string[];
  quality?: AiQualityMeta;
};

const ORIGIN_LABELS: Record<AiHistoryOrigin, string> = {
  text: "文字求解",
  image: "图片识题",
  refine: "编辑重算"
};

const ANSWER_MODE_LABELS: Record<AssistAnswerMode, string> = {
  answer_only: "只要答案",
  step_by_step: "分步讲解",
  hints_first: "先提示后答案"
};

const QUALITY_RISK_LABELS: Record<NonNullable<AiQualityMeta["riskLevel"]>, string> = {
  low: "低风险",
  medium: "中风险",
  high: "高风险"
};

function limitText(value: string, maxLength = 220) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(1, maxLength - 1))}…`;
}

function normalizeList(items: string[] | undefined, maxItems = 3, maxLength = 140) {
  return (items ?? [])
    .map((item) => limitText(item, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
}

function toUniqueTargets(targets: TutorShareTarget[]) {
  const map = new Map<string, TutorShareTarget>();
  targets.forEach((target) => {
    const existing = map.get(target.id);
    if (!existing) {
      map.set(target.id, target);
      return;
    }

    const contextLabels = Array.from(new Set([...existing.contextLabels, ...target.contextLabels]));
    map.set(target.id, {
      ...existing,
      contextLabels,
      description:
        contextLabels.length > 0
          ? `关联班级：${contextLabels.slice(0, 2).join("、")}${contextLabels.length > 2 ? " 等" : ""}`
          : existing.description
    });
  });
  return Array.from(map.values());
}

async function getTeacherTargetsByStudentId(studentId: string) {
  const classes = await getClassesByStudent(studentId);
  const targets: TutorShareTarget[] = [];

  for (const klass of classes) {
    if (!klass.teacherId) continue;
    const teacher = await getUserById(klass.teacherId);
    if (!teacher || teacher.role !== "teacher") continue;

    const subjectLabel = SUBJECT_LABELS[klass.subject] ?? klass.subject;
    const gradeLabel = getGradeLabel(klass.grade);
    const contextLabel = [klass.name, subjectLabel, gradeLabel].filter(Boolean).join(" · ");

    targets.push({
      id: teacher.id,
      name: teacher.name,
      role: "teacher",
      kind: "teacher",
      description: `关联班级：${contextLabel}`,
      contextLabels: contextLabel ? [contextLabel] : []
    });
  }

  return toUniqueTargets(targets);
}

async function getLinkedStudent(user: Pick<User, "id" | "role" | "studentId">) {
  if (user.role === "student") {
    return user;
  }
  if (user.role === "parent" && user.studentId) {
    const student = await getUserById(user.studentId);
    if (student?.role === "student") {
      return student;
    }
  }
  return null;
}

export async function getTutorShareTargets(user: Pick<User, "id" | "role" | "studentId">): Promise<TutorShareTarget[]> {
  const linkedStudent = await getLinkedStudent(user);
  if (!linkedStudent) {
    return [];
  }

  const teacherTargets = await getTeacherTargetsByStudentId(linkedStudent.id);

  if (user.role !== "student") {
    return teacherTargets;
  }

  const parents = await getParentsByStudentId(user.id);
  const parentTargets = parents
    .filter((item) => item.role === "parent")
    .map<TutorShareTarget>((parent) => ({
      id: parent.id,
      name: parent.name,
      role: "parent",
      kind: "parent",
      description: "已绑定家长，可同步这次识题结果",
      contextLabels: []
    }));

  return [...teacherTargets, ...toUniqueTargets(parentTargets)].sort((left, right) => {
    if (left.kind !== right.kind) {
      return left.kind === "teacher" ? -1 : 1;
    }
    return left.name.localeCompare(right.name, "zh-CN");
  });
}

export function buildTutorShareSubject(input: TutorSharePayload) {
  const subjectLabel = input.subject ? SUBJECT_LABELS[input.subject] ?? input.subject : "";
  const gradeLabel = input.grade ? getGradeLabel(input.grade) : "";
  const originLabel = input.origin ? ORIGIN_LABELS[input.origin] : "AI 讲解";

  return ["AI 解题分享", subjectLabel, gradeLabel && gradeLabel !== "-" ? gradeLabel : "", originLabel]
    .filter(Boolean)
    .join(" · ");
}

export function buildTutorShareMessage(
  input: TutorSharePayload & { target: TutorShareTarget }
) {
  const originLabel = input.origin ? ORIGIN_LABELS[input.origin] : "AI 讲解";
  const answerModeLabel = input.answerMode ? ANSWER_MODE_LABELS[input.answerMode] : "智能讲解";
  const questionText = input.recognizedQuestion?.trim() || input.question.trim();
  const subjectLine = input.subject ? SUBJECT_LABELS[input.subject] ?? input.subject : "";
  const gradeLine = input.grade ? getGradeLabel(input.grade) : "";
  const steps = normalizeList(input.steps);
  const hints = normalizeList(input.hints);
  const targetLine =
    input.target.kind === "teacher" ? "想请老师继续帮我确认这道题。" : "同步给家长，方便及时了解这次练习情况。";

  const sections = [
    "AI 解题结果分享",
    targetLine,
    [subjectLine, gradeLine && gradeLine !== "-" ? gradeLine : "", originLabel, answerModeLabel].filter(Boolean).join(" · "),
    questionText ? `题目：\n${questionText}` : "",
    input.answer.trim() ? `答案：\n${limitText(input.answer, 1500)}` : ""
  ].filter(Boolean);

  if (steps.length) {
    sections.push(`关键步骤：\n${steps.map((item, index) => `${index + 1}. ${item}`).join("\n")}`);
  }

  if (hints.length) {
    sections.push(`提示：\n${hints.map((item) => `- ${item}`).join("\n")}`);
  }

  if (input.quality) {
    sections.push(
      `可信度：${input.quality.confidenceScore}/100 · ${QUALITY_RISK_LABELS[input.quality.riskLevel]}${
        input.quality.fallbackAction ? `\n建议：${limitText(input.quality.fallbackAction, 120)}` : ""
      }`
    );
  }

  if (input.provider?.trim()) {
    sections.push(`模型：${input.provider.trim()}`);
  }

  return sections.join("\n\n");
}
