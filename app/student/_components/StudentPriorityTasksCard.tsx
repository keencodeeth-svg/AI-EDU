import Link from "next/link";
import type { ScheduleResponse } from "@/lib/class-schedules";
import Card from "@/components/Card";
import type { TodayTask, TodayTaskEventName } from "../types";
import { getStudentLessonWindow, getStudentTaskTimingAdvice, getTodayTaskStatusLabel } from "../utils";

type StudentPriorityTasksCardProps = {
  schedule: ScheduleResponse["data"] | null;
  todayTaskError: string | null;
  visiblePriorityTasks: TodayTask[];
  hiddenTodayTaskCount: number;
  onTaskEvent: (task: TodayTask, eventName: TodayTaskEventName) => void;
};

export default function StudentPriorityTasksCard({
  schedule,
  todayTaskError,
  visiblePriorityTasks,
  hiddenTodayTaskCount,
  onTaskEvent
}: StudentPriorityTasksCardProps) {
  const lessonWindow = getStudentLessonWindow(schedule);
  const timedPriorityTasks = visiblePriorityTasks.map((task) => ({
    task,
    timing: getStudentTaskTimingAdvice(task, schedule)
  }));
  const actionableTasks = lessonWindow.lessonWindowActive
    ? timedPriorityTasks.filter((item) => item.timing.canStartNow)
    : timedPriorityTasks;
  const deferredTasks = lessonWindow.lessonWindowActive
    ? timedPriorityTasks.filter((item) => !item.timing.canStartNow)
    : [];
  const remainingTaskCount = hiddenTodayTaskCount + deferredTasks.length;

  return (
    <Card title="今日高优先任务" tag="队列">
      {todayTaskError ? <div className="status-note error">{todayTaskError}</div> : null}

      {lessonWindow.lessonWindowActive ? (
        <div className="card" style={{ marginBottom: 10, border: "1px solid rgba(105, 65, 198, 0.18)", background: "rgba(105, 65, 198, 0.06)" }}>
          <div className="section-title">
            {lessonWindow.lessonInProgress
              ? `当前正在上 ${lessonWindow.nextLesson?.subjectLabel ?? "课程"}`
              : `距离下节 ${lessonWindow.nextLesson?.subjectLabel ?? "课程"} 还有 ${lessonWindow.minutesUntilNextLesson ?? 0} 分钟`}
          </div>
          <div className="meta-text" style={{ marginTop: 6, lineHeight: 1.7 }}>
            当前优先展示能在上课前收口的任务；较长任务会先让位给课堂准备，避免做到一半被打断。
          </div>
        </div>
      ) : null}

      {actionableTasks.length === 0 ? (
        <div className="empty-state">
          <p className="empty-state-title">{lessonWindow.lessonWindowActive ? "当前窗口内暂无适合立刻开做的高优先任务" : "当前暂无待处理任务"}</p>
          <p className="meta-text">
            {lessonWindow.lessonWindowActive
              ? lessonWindow.lessonInProgress
                ? "建议先聚焦课堂任务，课后再回到高优先队列继续推进。"
                : "建议先做课前准备、查看课程焦点或使用课前快问。"
              : "保持节奏即可，建议先进入学习工具完成一次练习。"}
          </p>
        </div>
      ) : (
        <div className="stack-8">
          {actionableTasks.map(({ task, timing }, index) => (
            <div
              key={task.id}
              style={{
                border: "1px solid var(--stroke)",
                borderRadius: 12,
                background: "rgba(255,255,255,0.72)",
                padding: 10
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 8
                }}
              >
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
                  TOP {index + 1} · {task.title}
                </div>
                <span className="card-tag">{getTodayTaskStatusLabel(task.status)}</span>
              </div>
              <p
                className="meta-text"
                style={{
                  marginTop: 6,
                  display: "-webkit-box",
                  WebkitLineClamp: 1,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden"
                }}
              >
                {task.description}
              </p>
              <div className="badge-row" style={{ marginTop: 6 }}>
                <span className="badge">{timing.timingLabel}</span>
                {task.tags.slice(0, 2).map((tag) => (
                  <span className="badge" key={`${task.id}-${tag}`}>
                    {tag}
                  </span>
                ))}
                <span className="badge">预计 {task.effortMinutes} 分钟</span>
                <span className="badge">预期收益 {task.expectedGain}</span>
                {task.dueAt ? <span className="badge">截止 {new Date(task.dueAt).toLocaleDateString("zh-CN")}</span> : null}
              </div>
              <div className="cta-row cta-row-tight" style={{ marginTop: 8 }}>
                <Link className="button secondary" href={task.href} onClick={() => onTaskEvent(task, "task_started")}>
                  去完成
                </Link>
                <button className="button ghost" type="button" onClick={() => onTaskEvent(task, "task_skipped")}>
                  暂后处理
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {deferredTasks.length > 0 ? (
        <div className="card" style={{ marginTop: 10, borderStyle: "dashed" }}>
          <div className="section-title">这些更适合课后开始</div>
          <div className="meta-text" style={{ marginTop: 6, lineHeight: 1.7 }}>
            已临时收起 {deferredTasks.length} 项较长任务，避免上课前开启后难以收口。课后可再回到完整队列继续推进。
          </div>
        </div>
      ) : null}

      {remainingTaskCount > 0 ? (
        <div className="cta-row" style={{ alignItems: "center" }}>
          <p className="meta-note" style={{ margin: 0 }}>
            还有 {remainingTaskCount} 项任务待处理{deferredTasks.length ? `（其中 ${deferredTasks.length} 项建议课后）` : ""}。
          </p>
          <a className="button ghost" href="#student-task-queue">
            查看剩余任务
          </a>
        </div>
      ) : null}
    </Card>
  );
}
