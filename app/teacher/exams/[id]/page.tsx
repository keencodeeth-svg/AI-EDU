"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Card from "@/components/Card";
import MathViewControls from "@/components/MathViewControls";
import { SUBJECT_LABELS } from "@/lib/constants";
import { useMathViewSettings } from "@/lib/math-view-settings";
import ExamOverviewCard from "./_components/ExamOverviewCard";
import ExamQuestionsCard from "./_components/ExamQuestionsCard";
import ExamStudentsCard from "./_components/ExamStudentsCard";
import type { ExamDetail } from "./types";

export default function TeacherExamDetailPage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<ExamDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [publishingReviewPack, setPublishingReviewPack] = useState(false);
  const [publishMessage, setPublishMessage] = useState<string | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);
  const mathView = useMathViewSettings("teacher-exam-detail");

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch(`/api/teacher/exams/${params.id}`);
    const payload = await res.json();
    if (!res.ok) {
      setError(payload?.error ?? "加载失败");
      return;
    }
    setData(payload);
  }, [params.id]);

  async function handleStatusAction(action: "close" | "reopen") {
    if (!data || updatingStatus) return;
    setUpdatingStatus(true);
    const res = await fetch(`/api/teacher/exams/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action })
    });
    const payload = await res.json();
    if (!res.ok) {
      setError(payload?.error ?? "更新失败");
      setUpdatingStatus(false);
      return;
    }
    setData((prev) =>
      prev ? { ...prev, exam: { ...prev.exam, status: payload?.data?.status ?? prev.exam.status } } : prev
    );
    setUpdatingStatus(false);
  }

  async function handlePublishReviewPack(dryRun: boolean) {
    if (!data || publishingReviewPack) return;
    setPublishMessage(null);
    setPublishError(null);
    setPublishingReviewPack(true);
    try {
      const res = await fetch(`/api/teacher/exams/${params.id}/review-pack/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          minRiskLevel: "high",
          includeParents: true,
          dryRun
        })
      });
      const payload = await res.json();
      if (!res.ok) {
        setPublishError(payload?.error ?? "发布失败");
        return;
      }
      const result = payload?.data;
      const summary =
        result?.message ??
        (dryRun
          ? `预览完成：计划通知学生 ${result?.publishedStudents ?? 0} 人`
          : `发布完成：已通知学生 ${result?.publishedStudents ?? 0} 人`);
      const detail = `覆盖 ${result?.targetedStudents ?? 0} 人，跳过低风险 ${result?.skippedLowRisk ?? 0} 人，缺少提交 ${result?.skippedNoSubmission ?? 0} 人。`;
      setPublishMessage(`${summary} ${detail}`);
    } catch {
      setPublishError("发布失败");
    } finally {
      setPublishingReviewPack(false);
    }
  }

  useEffect(() => {
    load();
  }, [load]);

  const rankedStudents = useMemo(() => {
    if (!data?.students?.length) return [];
    return [...data.students].sort((a, b) => {
      if (b.riskScore !== a.riskScore) return b.riskScore - a.riskScore;
      if ((a.status === "submitted") !== (b.status === "submitted")) {
        return a.status === "submitted" ? -1 : 1;
      }
      return a.name.localeCompare(b.name, "zh-CN");
    });
  }, [data?.students]);

  if (error) {
    return (
      <Card title="考试详情">
        <div className="status-note error">{error}</div>
        <Link className="button secondary" href="/teacher/exams" style={{ marginTop: 12 }}>
          返回考试列表
        </Link>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card title="考试详情">
        <div className="empty-state">
          <p className="empty-state-title">加载中</p>
          <p>正在读取考试详情。</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid math-view-surface" style={{ gap: 18, ...mathView.style }}>
      <div className="section-head">
        <div>
          <h2>{data.exam.title}</h2>
          <div className="section-sub">
            {data.class.name} · {SUBJECT_LABELS[data.class.subject] ?? data.class.subject} · {data.class.grade} 年级
          </div>
        </div>
        <span className="chip">
          {data.exam.status === "closed" ? "已关闭" : "进行中"} · 提交 {data.summary.submitted}/{data.summary.assigned}
        </span>
      </div>
      <MathViewControls
        fontScale={mathView.fontScale}
        lineMode={mathView.lineMode}
        onDecrease={mathView.decreaseFontScale}
        onIncrease={mathView.increaseFontScale}
        onReset={mathView.resetView}
        onLineModeChange={mathView.setLineMode}
      />

      <ExamOverviewCard
        data={data}
        updatingStatus={updatingStatus}
        publishingReviewPack={publishingReviewPack}
        publishMessage={publishMessage}
        publishError={publishError}
        onStatusAction={handleStatusAction}
        onPublishReviewPack={handlePublishReviewPack}
      />

      <ExamStudentsCard students={rankedStudents} />
      <ExamQuestionsCard questions={data.questions} />
    </div>
  );
}
