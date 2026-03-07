"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Card from "@/components/Card";
import type { TodayTaskPayload } from "../types";
import StudentExamArchiveCard from "./_components/StudentExamArchiveCard";
import StudentExamKpiGrid from "./_components/StudentExamKpiGrid";
import StudentExamSectionCard from "./_components/StudentExamSectionCard";
import StudentSelfAssessmentIntroCard from "./_components/StudentSelfAssessmentIntroCard";
import StudentSelfAssessmentTasksCard from "./_components/StudentSelfAssessmentTasksCard";
import type { StudentExamItem, StudentExamModuleTab, StudentSelfAssessmentTask } from "./types";
import { buildSelfAssessmentSummary, filterSelfAssessmentTasks, groupStudentExams } from "./utils";

export default function StudentExamsPage() {
  const [list, setList] = useState<StudentExamItem[]>([]);
  const [todayTasks, setTodayTasks] = useState<StudentSelfAssessmentTask[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [moduleTab, setModuleTab] = useState<StudentExamModuleTab>("teacher_exam");
  const [showPastExams, setShowPastExams] = useState(false);

  async function load() {
    setError(null);
    const res = await fetch("/api/student/exams");
    const payload = await res.json();
    if (!res.ok) {
      setError(payload?.error ?? "加载失败");
      return;
    }
    setList(payload.data ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    fetch("/api/student/today-tasks")
      .then((res) => res.json())
      .then((payload: { data?: TodayTaskPayload }) => {
        setTodayTasks(payload?.data?.tasks ?? []);
      })
      .catch(() => {
        setTodayTasks([]);
      });
  }, []);

  useEffect(() => {
    if (moduleTab !== "teacher_exam") {
      setShowPastExams(false);
    }
  }, [moduleTab]);

  const grouped = useMemo(() => groupStudentExams(list), [list]);
  const selfAssessmentTasks = useMemo(() => filterSelfAssessmentTasks(todayTasks), [todayTasks]);
  const visibleSelfAssessmentTasks = useMemo(() => selfAssessmentTasks.slice(0, 6), [selfAssessmentTasks]);
  const selfAssessmentSummary = useMemo(
    () => buildSelfAssessmentSummary(selfAssessmentTasks),
    [selfAssessmentTasks]
  );

  if (error) {
    return (
      <Card title="在线考试">
        <p>{error}</p>
        <Link className="button secondary" href="/student" style={{ marginTop: 12 }}>
          返回学生端
        </Link>
      </Card>
    );
  }

  return (
    <div className="grid" style={{ gap: 18 }}>
      <div className="section-head">
        <div>
          <h2>在线考试</h2>
          <div className="section-sub">老师发布考试与学生自主测评分模块管理，避免混淆。</div>
        </div>
        <div className="badge-row">
          <span className="chip">共 {list.length} 场考试</span>
          <span className="chip">开放中 {grouped.ongoing.length}</span>
        </div>
      </div>

      <div className="cta-row exams-module-switch" style={{ marginTop: 0 }}>
        <button
          className={moduleTab === "teacher_exam" ? "button secondary" : "button ghost"}
          type="button"
          onClick={() => setModuleTab("teacher_exam")}
        >
          老师发布考试
        </button>
        <button
          className={moduleTab === "self_assessment" ? "button secondary" : "button ghost"}
          type="button"
          onClick={() => setModuleTab("self_assessment")}
        >
          学生自主测评
        </button>
      </div>

      {moduleTab === "teacher_exam" ? (
        <>
          <StudentExamKpiGrid
            ongoingCount={grouped.ongoing.length}
            upcomingCount={grouped.upcoming.length}
            finishedCount={grouped.finished.length}
          />
          <StudentExamSectionCard
            title="待进行"
            tag="考试"
            items={grouped.ongoing}
            emptyText="当前没有正在开放的考试。"
          />
          <StudentExamSectionCard
            title="即将开始"
            tag="待开始"
            items={grouped.upcoming}
            emptyText="暂无即将开始的考试。"
          />
          <StudentExamArchiveCard
            finished={grouped.finished}
            locked={grouped.locked}
            showPastExams={showPastExams}
            onToggle={() => setShowPastExams((prev) => !prev)}
          />
        </>
      ) : null}

      {moduleTab === "self_assessment" ? (
        <>
          <StudentSelfAssessmentIntroCard />
          <StudentSelfAssessmentTasksCard tasks={visibleSelfAssessmentTasks} summary={selfAssessmentSummary} />
        </>
      ) : null}
    </div>
  );
}
