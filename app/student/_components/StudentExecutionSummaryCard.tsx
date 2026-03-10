"use client";

import Link from "next/link";
import Card from "@/components/Card";
import EduIcon from "@/components/EduIcon";
import { buildTutorLaunchHref } from "@/lib/tutor-launch";
import type { ScheduleResponse } from "@/lib/class-schedules";
import type { TodayTask, TodayTaskEventName, TodayTaskPayload } from "../types";
import { getTodayTaskSourceLabel, getTodayTaskStatusLabel } from "../utils";

type StudentExecutionSummaryCardProps = {
  schedule: ScheduleResponse["data"] | null;
  todayTasks: TodayTaskPayload | null;
  recommendedTask: TodayTask | null;
  weakPlanCount: number;
  onTaskEvent: (task: TodayTask, eventName: TodayTaskEventName) => void;
};

function formatDueAt(value: string | null) {
  if (!value) return "时间相对宽松";
  return new Date(value).toLocaleString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatLessonRange(startAt: string, endAt: string) {
  return `${new Date(startAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}-${new Date(endAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}`;
}

function getMinutesUntil(startAt: string | undefined) {
  if (!startAt) return null;
  const diff = new Date(startAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 60000));
}

export default function StudentExecutionSummaryCard({
  schedule,
  todayTasks,
  recommendedTask,
  weakPlanCount,
  onTaskEvent
}: StudentExecutionSummaryCardProps) {
  const summary = todayTasks?.summary;
  const urgentCount = (summary?.overdue ?? 0) + (summary?.dueToday ?? 0);
  const nextQueueAnchor = summary?.mustDo ? "#student-priority-tasks" : "#student-task-queue";
  const nextQueueLabel = summary?.mustDo ? "先清必做任务" : "查看完整队列";
  const tutorHref = buildTutorLaunchHref({ intent: "image", source: "student-execution-summary" });
  const nextLesson = schedule?.nextLesson ?? null;
  const linkedLessonTask = nextLesson && todayTasks?.tasks?.length
    ? todayTasks.tasks.find((task) => task.source === "lesson" && task.sourceId === nextLesson.id) ?? null
    : null;
  const minutesUntilNextLesson = getMinutesUntil(nextLesson?.startAt);
  const lessonIsUrgent = Boolean(
    nextLesson && (nextLesson.status === "in_progress" || (minutesUntilNextLesson !== null && minutesUntilNextLesson <= 45))
  );
  const lessonActionHref = nextLesson?.actionHref ?? linkedLessonTask?.href ?? "/calendar";
  const lessonActionLabel = nextLesson?.actionLabel ?? (nextLesson?.pendingAssignmentCount ? "去准备课前任务" : "查看下节课");

  let lessonHeadline: string | null = null;
  let lessonDescription: string | null = null;

  if (nextLesson) {
    if (nextLesson.status === "in_progress") {
      lessonHeadline = `当前正在上：${nextLesson.className}`;
    } else if (minutesUntilNextLesson !== null && minutesUntilNextLesson <= 45) {
      lessonHeadline = `距离下节 ${nextLesson.subjectLabel} 还有 ${minutesUntilNextLesson} 分钟`;
    } else {
      lessonHeadline = `下节课：${nextLesson.className}`;
    }

    if (nextLesson.status === "in_progress") {
      lessonDescription = linkedLessonTask
        ? "当前已进入上课时段，先聚焦课堂内容；课后再回到今日队列继续收口。"
        : "当前已进入上课时段，建议先聚焦课堂内容与老师任务。";
    } else if (linkedLessonTask && linkedLessonTask.id === recommendedTask?.id) {
      lessonDescription = "系统已经把这节课相关准备排在第一优先，先做它最顺。";
    } else if (lessonIsUrgent && nextLesson.pendingAssignmentCount > 0) {
      lessonDescription = `距离上课不久了，建议先确认关联作业${nextLesson.nextAssignmentTitle ? `“${nextLesson.nextAssignmentTitle}”` : ""}和课堂焦点，避免临近上课再切换。`;
    } else if (lessonIsUrgent) {
      lessonDescription = "先看清课堂焦点、上课地点和开始时间，再决定是否插入短任务，避免做到一半被上课打断。";
    } else if (nextLesson.pendingAssignmentCount > 0) {
      lessonDescription = `下节课前还有 ${nextLesson.pendingAssignmentCount} 项关联任务，建议至少先处理最靠前的一项。`;
    } else if (nextLesson.focusSummary) {
      lessonDescription = `下节课重点：${nextLesson.focusSummary}，提前看一眼会更容易进入状态。`;
    } else {
      lessonDescription = "今天的学习动作最好围绕课表推进，先看下节课，再安排练习和拍题。";
    }
  }

  return (
    <Card title="今日执行摘要" tag="Today">
      <div className="grid" style={{ gap: 14 }}>
        {nextLesson ? (
          <div className="card" style={{ border: "1px solid rgba(105, 65, 198, 0.18)", background: "rgba(105, 65, 198, 0.06)" }}>
            <div className="cta-row" style={{ justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap", marginTop: 0 }}>
              <div>
                <div className="section-title">课表联动建议</div>
                <div className="section-sub" style={{ marginTop: 4 }}>{lessonHeadline}</div>
              </div>
              <span className="pill">{nextLesson.status === "in_progress" ? "上课中" : lessonIsUrgent ? "优先准备" : "提前看一眼"}</span>
            </div>

            <div className="badge-row" style={{ marginTop: 10 }}>
              <span className="badge">{nextLesson.subjectLabel}</span>
              <span className="badge">{formatLessonRange(nextLesson.startAt, nextLesson.endAt)}</span>
              {nextLesson.room ? <span className="badge">{nextLesson.room}</span> : null}
              {nextLesson.pendingAssignmentCount ? <span className="badge">关联作业 {nextLesson.pendingAssignmentCount} 项</span> : null}
              {linkedLessonTask ? <span className="badge">已进入今日任务队列</span> : null}
            </div>

            <div className="meta-text" style={{ marginTop: 10, lineHeight: 1.7 }}>{lessonDescription}</div>
            {nextLesson.focusSummary ? <div className="meta-text" style={{ marginTop: 6 }}>课堂焦点：{nextLesson.focusSummary}</div> : null}

            <div className="cta-row" style={{ marginTop: 10, flexWrap: "wrap" }}>
              <Link
                className="button secondary"
                href={lessonActionHref}
                onClick={() => {
                  if (linkedLessonTask) {
                    onTaskEvent(linkedLessonTask, "task_started");
                  }
                }}
              >
                {lessonActionLabel}
              </Link>
              <Link className="button ghost" href="/calendar">
                查看完整课表
              </Link>
              <a className="button ghost" href={nextQueueAnchor}>
                {linkedLessonTask && linkedLessonTask.id !== recommendedTask?.id ? "继续今日首项" : nextQueueLabel}
              </a>
            </div>
          </div>
        ) : null}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 14,
            alignItems: "stretch"
          }}
        >
          <div className="grid" style={{ gap: 10 }}>
            <div className="feature-card" style={{ alignItems: "flex-start" }}>
              <EduIcon name="rocket" />
              <div>
                <div className="section-title">{recommendedTask ? `第一优先：${recommendedTask.title}` : "今天先按当前节奏推进"}</div>
                <p style={{ marginTop: 6, lineHeight: 1.65 }}>
                  {recommendedTask
                    ? recommendedTask.recommendedReason
                    : urgentCount > 0
                      ? "建议先清逾期和今日到期任务，再安排练习或拍题，避免后面越积越多。"
                      : "当前没有明显卡点，适合先做一轮练习、推进薄弱项，或者把不会的题直接拍下来问。"}
                </p>
              </div>
            </div>

            {recommendedTask ? (
              <div className="badge-row" style={{ marginTop: 0 }}>
                <span className="badge">{getTodayTaskSourceLabel(recommendedTask.source)}</span>
                <span className="badge">{getTodayTaskStatusLabel(recommendedTask.status)}</span>
                <span className="badge">预计 {recommendedTask.effortMinutes} 分钟</span>
                <span className="badge">{formatDueAt(recommendedTask.dueAt)}</span>
              </div>
            ) : (
              <div className="badge-row" style={{ marginTop: 0 }}>
                <span className="badge">必做 {summary?.mustDo ?? 0}</span>
                <span className="badge">进行中 {summary?.inProgress ?? 0}</span>
                <span className="badge">薄弱项 {weakPlanCount}</span>
              </div>
            )}

            <div className="cta-row">
              <Link
                className="button primary"
                href={recommendedTask?.href ?? "/practice"}
                onClick={() => {
                  if (recommendedTask) {
                    onTaskEvent(recommendedTask, "task_started");
                  }
                }}
              >
                {recommendedTask ? "继续第一项" : "先做一轮练习"}
              </Link>
              <Link className="button secondary" href={tutorHref}>
                卡住就拍题
              </Link>
              <a className="button ghost" href={nextQueueAnchor}>
                {nextQueueLabel}
              </a>
            </div>
          </div>

          <div className="grid grid-2" style={{ gap: 10 }}>
            <div className="card">
              <div className="section-title">今天必须先清</div>
              <div style={{ fontSize: 24, fontWeight: 700, marginTop: 6 }}>{summary?.mustDo ?? 0}</div>
              <div className="meta-text" style={{ marginTop: 6 }}>逾期 {summary?.overdue ?? 0} · 今日到期 {summary?.dueToday ?? 0}</div>
            </div>
            <div className="card">
              <div className="section-title">正在推进</div>
              <div style={{ fontSize: 24, fontWeight: 700, marginTop: 6 }}>{summary?.inProgress ?? 0}</div>
              <div className="meta-text" style={{ marginTop: 6 }}>已经开始的任务尽量一次做完</div>
            </div>
            <div className="card">
              <div className="section-title">Top3 预计时长</div>
              <div style={{ fontSize: 24, fontWeight: 700, marginTop: 6 }}>{summary?.top3EstimatedMinutes ?? 0} 分钟</div>
              <div className="meta-text" style={{ marginTop: 6 }}>先看清今天要花多少时间</div>
            </div>
            <div className="card">
              <div className="section-title">薄弱知识点</div>
              <div style={{ fontSize: 24, fontWeight: 700, marginTop: 6 }}>{weakPlanCount}</div>
              <div className="meta-text" style={{ marginTop: 6 }}>不会就拍题，别在首页反复犹豫</div>
            </div>
          </div>
        </div>

        <div className="meta-text" style={{ lineHeight: 1.65 }}>
          建议顺序：{nextLesson ? "先看下节课 → " : ""}先做这些 → 继续推进 → 成长加分。系统已经帮你排好优先级，尽量不要再自己从头筛一遍。
        </div>
      </div>
    </Card>
  );
}
