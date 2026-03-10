"use client";

import Link from "next/link";
import Card from "@/components/Card";
import EduIcon from "@/components/EduIcon";
import { trackEvent } from "@/lib/analytics-client";
import type { ScheduleResponse } from "@/lib/class-schedules";
import { buildTutorLaunchHref, type TutorLaunchIntent } from "@/lib/tutor-launch";
import { getStudentLessonWindow } from "../utils";

type StudentQuickTutorCardProps = {
  schedule: ScheduleResponse["data"] | null;
  mustDoCount: number;
  weakPlanCount: number;
};


export default function StudentQuickTutorCard({ schedule, mustDoCount, weakPlanCount }: StudentQuickTutorCardProps) {
  const { nextLesson, minutesUntilNextLesson, lessonWindowActive } = getStudentLessonWindow(schedule);
  const recommendation = lessonWindowActive
    ? nextLesson?.status === "in_progress"
      ? "当前已经进入上课时段，遇到课堂题目卡住时适合快速拍题核对，但先以课堂任务为主。"
      : `距离下节 ${nextLesson?.subjectLabel ?? "课"} 还有 ${minutesUntilNextLesson ?? 0} 分钟，适合快问快答，不适合再开长练习。`
    : weakPlanCount > 0
      ? `你当前有 ${weakPlanCount} 个薄弱计划项，遇到不会的题直接拍照提问更省时间。`
      : mustDoCount > 0
        ? `今天还有 ${mustDoCount} 项必做任务，卡题时直接拍题能减少来回切换。`
        : "遇到不会的题别退出当前节奏，直接拍照识题最快。";

  function handleLaunch(intent: TutorLaunchIntent | "favorites") {
    trackEvent({
      eventName: "student_tutor_entry_clicked",
      page: "/student",
      props: {
        intent,
        mustDoCount,
        weakPlanCount,
        source: "student-console",
        nextLessonId: nextLesson?.id ?? null,
        nextLessonStatus: nextLesson?.status ?? null
      }
    });
  }

  return (
    <Card title="拍题即问" tag={lessonWindowActive ? "快问优先" : "高优先级"}>
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
            <EduIcon name="brain" />
            <div>
              <div className="section-title">{lessonWindowActive ? "临近上课，适合快问快答" : "卡住的题，不要退出，直接拍下来问"}</div>
              <p style={{ marginTop: 6 }}>{recommendation}</p>
            </div>
          </div>
          <div className="pill-list">
            {lessonWindowActive ? <span className="pill">课前快问</span> : null}
            <span className="pill">多图识题</span>
            <span className="pill">拖拽裁题</span>
            <span className="pill">分步讲解</span>
            <span className="pill">编辑重算</span>
            <span className="pill">历史回放</span>
          </div>
          <div className="cta-row">
            <Link
              className="button primary"
              href={buildTutorLaunchHref({ intent: "image", source: lessonWindowActive ? "student-console-lesson-window" : "student-console" })}
              onClick={() => handleLaunch("image")}
            >
              拍照识题
            </Link>
            <Link
              className="button secondary"
              href={buildTutorLaunchHref({ intent: "text", source: lessonWindowActive ? "student-console-lesson-window" : "student-console" })}
              onClick={() => handleLaunch("text")}
            >
              文字提问
            </Link>
            <Link
              className="button ghost"
              href={buildTutorLaunchHref({ panel: "history", favorites: true, source: lessonWindowActive ? "student-console-lesson-window" : "student-console" })}
              onClick={() => handleLaunch("favorites")}
            >
              看历史收藏
            </Link>
          </div>
        </div>

        <div className="grid" style={{ gap: 10 }}>
          <div className="card">
            <div className="section-title">现在适合用在</div>
            <div style={{ fontSize: 12, color: "var(--ink-1)", marginTop: 6, lineHeight: 1.7 }}>
              {lessonWindowActive
                ? "课前最后几分钟核对一道题、课堂中被题目卡住、作业临上课前快速确认。"
                : "作业卡题、错题复盘、图形题、题干太长、想快速核对答案或看分步讲解。"}
            </div>
          </div>
          <div className="grid grid-2" style={{ gap: 10 }}>
            <div className="card">
              <div className="section-title">今日必做</div>
              <div style={{ fontSize: 24, fontWeight: 700, marginTop: 6 }}>{mustDoCount}</div>
            </div>
            <div className="card">
              <div className="section-title">薄弱项</div>
              <div style={{ fontSize: 24, fontWeight: 700, marginTop: 6 }}>{weakPlanCount}</div>
            </div>
          </div>
          {lessonWindowActive ? (
            <div className="card">
              <div className="section-title">距离下节课</div>
              <div style={{ fontSize: 24, fontWeight: 700, marginTop: 6 }}>{nextLesson?.status === "in_progress" ? "进行中" : `${minutesUntilNextLesson ?? 0} 分钟`}</div>
              <div className="meta-text" style={{ marginTop: 6 }}>{nextLesson?.subjectLabel ?? "课程提醒"}{nextLesson?.room ? ` · ${nextLesson.room}` : ""}</div>
            </div>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
