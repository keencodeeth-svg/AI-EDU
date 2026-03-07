"use client";

import { type ChangeEvent, type FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Card from "@/components/Card";
import MathViewControls from "@/components/MathViewControls";
import { SUBJECT_LABELS } from "@/lib/constants";
import { useMathViewSettings } from "@/lib/math-view-settings";
import AssignmentAiReviewCard from "./_components/AssignmentAiReviewCard";
import AssignmentOverviewCard from "./_components/AssignmentOverviewCard";
import AssignmentQuizResultCard from "./_components/AssignmentQuizResultCard";
import AssignmentRubricsCard from "./_components/AssignmentRubricsCard";
import AssignmentSubmissionCard from "./_components/AssignmentSubmissionCard";
import AssignmentTeacherReviewCard from "./_components/AssignmentTeacherReviewCard";
import AssignmentWrongQuestionsCard from "./_components/AssignmentWrongQuestionsCard";
import type { AssignmentDetail, AssignmentReviewPayload, SubmitResult, UploadItem } from "./types";

export default function StudentAssignmentDetailPage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<AssignmentDetail | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [review, setReview] = useState<AssignmentReviewPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submissionText, setSubmissionText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const mathView = useMathViewSettings("student-assignment");

  const loadUploads = useCallback(async () => {
    const res = await fetch(`/api/student/assignments/${params.id}/uploads`);
    const payload = await res.json();
    if (res.ok) {
      setUploads(payload.data ?? []);
    }
  }, [params.id]);

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch(`/api/student/assignments/${params.id}`);
    const payload = await res.json();
    if (!res.ok) {
      setError(payload?.error ?? "加载失败");
      return;
    }
    setData(payload);
    if (payload?.progress?.status === "completed") {
      const reviewRes = await fetch(`/api/student/assignments/${params.id}/review`);
      const reviewPayload = await reviewRes.json();
      if (reviewRes.ok) {
        setReview(reviewPayload);
      }
    }
    if (payload?.assignment?.submissionType === "upload" || payload?.assignment?.submissionType === "essay") {
      loadUploads();
    }
  }, [loadUploads, params.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files ? Array.from(event.target.files) : [];
    if (!files.length) return;
    setUploading(true);
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    const res = await fetch(`/api/student/assignments/${params.id}/uploads`, {
      method: "POST",
      body: formData
    });
    if (!res.ok) {
      const payload = await res.json();
      setError(payload?.error ?? "上传失败");
    } else {
      await loadUploads();
    }
    setUploading(false);
    event.target.value = "";
  }

  async function handleDeleteUpload(uploadId: string) {
    await fetch(`/api/student/assignments/${params.id}/uploads?uploadId=${uploadId}`, { method: "DELETE" });
    loadUploads();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/student/assignments/${params.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers, submissionText })
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error ?? "提交失败");
      }
      setResult(payload);
      const reviewRes = await fetch(`/api/student/assignments/${params.id}/review`);
      const reviewPayload = await reviewRes.json();
      if (reviewRes.ok) {
        setReview(reviewPayload);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function handleAnswerChange(questionId: string, value: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  if (error) {
    return (
      <Card title="作业详情">
        <p>{error}</p>
        <Link className="button secondary" href="/student/assignments" style={{ marginTop: 12 }}>
          返回作业中心
        </Link>
      </Card>
    );
  }

  if (!data) {
    return <Card title="作业详情">加载中...</Card>;
  }

  const alreadyCompleted = data.progress?.status === "completed" && !result;
  const isUpload = data.assignment.submissionType === "upload";
  const isEssay = data.assignment.submissionType === "essay";
  const isQuiz = !isUpload && !isEssay;
  const hasUploads = uploads.length > 0;
  const hasText = Boolean(submissionText.trim());

  return (
    <div className="grid math-view-surface" style={{ gap: 18, ...mathView.style }}>
      <div className="section-head">
        <div>
          <h2>作业详情</h2>
          <div className="section-sub">
            {data.class.name} · {SUBJECT_LABELS[data.class.subject] ?? data.class.subject} · {data.class.grade} 年级
          </div>
        </div>
        <span className="chip">{alreadyCompleted ? "已完成" : "进行中"}</span>
      </div>
      <MathViewControls
        fontScale={mathView.fontScale}
        lineMode={mathView.lineMode}
        onDecrease={mathView.decreaseFontScale}
        onIncrease={mathView.increaseFontScale}
        onReset={mathView.resetView}
        onLineModeChange={mathView.setLineMode}
      />

      <AssignmentOverviewCard data={data} isUpload={isUpload} isEssay={isEssay} />

      <AssignmentSubmissionCard
        data={data}
        review={review}
        alreadyCompleted={alreadyCompleted}
        isUpload={isUpload}
        isEssay={isEssay}
        uploads={uploads}
        uploading={uploading}
        submissionText={submissionText}
        answers={answers}
        loading={loading}
        error={error}
        hasUploads={hasUploads}
        hasText={hasText}
        onUpload={handleUpload}
        onDeleteUpload={handleDeleteUpload}
        onSubmit={handleSubmit}
        onSubmissionTextChange={setSubmissionText}
        onAnswerChange={handleAnswerChange}
      />

      {result && isQuiz ? <AssignmentQuizResultCard result={result} questions={data.questions} /> : null}

      {result && (isUpload || isEssay) ? (
        <Card title="提交结果" tag="已提交">
          <p>作业已提交，等待老师批改。</p>
        </Card>
      ) : null}

      {review?.review ? (
        <AssignmentTeacherReviewCard
          overallComment={review.review.overallComment}
          reviewItems={review.reviewItems ?? []}
          questions={review.questions ?? []}
        />
      ) : null}

      {review?.rubrics?.length ? (
        <AssignmentRubricsCard rubrics={review.rubrics} reviewRubrics={review.reviewRubrics ?? []} />
      ) : null}

      {review?.aiReview ? <AssignmentAiReviewCard aiReview={review.aiReview} /> : null}

      {review?.questions && isQuiz ? <AssignmentWrongQuestionsCard questions={review.questions} /> : null}
    </div>
  );
}
