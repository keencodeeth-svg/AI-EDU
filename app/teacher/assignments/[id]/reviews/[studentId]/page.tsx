"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import Card from "@/components/Card";
import MathViewControls from "@/components/MathViewControls";
import { SUBJECT_LABELS } from "@/lib/constants";
import { useMathViewSettings } from "@/lib/math-view-settings";
import AssignmentReviewAiCard from "./_components/AssignmentReviewAiCard";
import AssignmentReviewFormCard from "./_components/AssignmentReviewFormCard";
import AssignmentReviewOverviewCard from "./_components/AssignmentReviewOverviewCard";
import AssignmentReviewSubmissionTextCard from "./_components/AssignmentReviewSubmissionTextCard";
import AssignmentReviewUploadsCard from "./_components/AssignmentReviewUploadsCard";
import type {
  TeacherAssignmentAiReviewResult,
  TeacherAssignmentReviewData,
  TeacherAssignmentReviewItemState,
  TeacherAssignmentReviewRubricState
} from "./types";
import { buildReviewItemState, buildReviewRubricState } from "./utils";

export default function TeacherAssignmentReviewPage({
  params
}: {
  params: { id: string; studentId: string };
}) {
  const [data, setData] = useState<TeacherAssignmentReviewData | null>(null);
  const [overallComment, setOverallComment] = useState("");
  const [itemState, setItemState] = useState<TeacherAssignmentReviewItemState>({});
  const [rubricState, setRubricState] = useState<TeacherAssignmentReviewRubricState>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiReview, setAiReview] = useState<TeacherAssignmentAiReviewResult | null>(null);
  const mathView = useMathViewSettings("teacher-assignment-review");

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch(`/api/teacher/assignments/${params.id}/reviews/${params.studentId}`);
    const payload = (await res.json()) as TeacherAssignmentReviewData & { error?: string };
    if (!res.ok) {
      setError(payload.error ?? "加载失败");
      return;
    }
    setData(payload);
    setOverallComment(payload.review?.overallComment ?? "");
    setItemState(buildReviewItemState(payload.reviewItems ?? []));
    setRubricState(buildReviewRubricState(payload.reviewRubrics ?? [], payload.rubrics ?? []));
    setAiReview(payload.aiReview?.result ?? null);
  }, [params.id, params.studentId]);

  useEffect(() => {
    load();
  }, [load]);

  const wrongQuestions = useMemo(
    () => (data?.questions ?? []).filter((item) => !item.correct),
    [data]
  );
  const canAiReview =
    (data?.uploads?.length ?? 0) > 0 || Boolean(data?.submission?.submissionText?.trim());
  const isEssay = data?.assignment?.submissionType === "essay";
  const isUpload = data?.assignment?.submissionType === "upload";
  const isQuiz = !isEssay && !isUpload;

  async function handleAiReview() {
    if (!data) return;
    setAiLoading(true);
    setMessage(null);
    setError(null);
    const res = await fetch(`/api/teacher/assignments/${params.id}/ai-review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId: params.studentId })
    });
    const payload = (await res.json()) as {
      error?: string;
      data?: {
        result?: TeacherAssignmentAiReviewResult | null;
      } | null;
    };
    if (!res.ok) {
      setError(payload.error ?? "AI 批改失败");
      setAiLoading(false);
      return;
    }
    setAiReview(payload.data?.result ?? null);
    setAiLoading(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!data) return;
    setSaving(true);
    setMessage(null);
    setError(null);
    const items = wrongQuestions.map((question) => ({
      questionId: question.id,
      wrongTag: itemState[question.id]?.wrongTag || "",
      comment: itemState[question.id]?.comment || ""
    }));
    const rubrics = data.rubrics.map((rubric) => ({
      rubricId: rubric.id,
      score: rubricState[rubric.id]?.score ?? 0,
      comment: rubricState[rubric.id]?.comment ?? ""
    }));
    const res = await fetch(`/api/teacher/assignments/${params.id}/reviews/${params.studentId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ overallComment, items, rubrics })
    });
    const payload = (await res.json()) as { error?: string };
    if (!res.ok) {
      setError(payload.error ?? "保存失败");
      setSaving(false);
      return;
    }
    setMessage("批改已保存并通知学生。");
    setSaving(false);
  }

  function handleQuestionWrongTagChange(questionId: string, value: string) {
    setItemState((prev) => ({
      ...prev,
      [questionId]: {
        wrongTag: value,
        comment: prev[questionId]?.comment ?? ""
      }
    }));
  }

  function handleQuestionCommentChange(questionId: string, value: string) {
    setItemState((prev) => ({
      ...prev,
      [questionId]: {
        wrongTag: prev[questionId]?.wrongTag ?? "",
        comment: value
      }
    }));
  }

  function handleRubricScoreChange(rubricId: string, value: number) {
    setRubricState((prev) => ({
      ...prev,
      [rubricId]: {
        score: value,
        comment: prev[rubricId]?.comment ?? ""
      }
    }));
  }

  function handleRubricCommentChange(rubricId: string, value: string) {
    setRubricState((prev) => ({
      ...prev,
      [rubricId]: {
        score: prev[rubricId]?.score ?? 0,
        comment: value
      }
    }));
  }

  if (error) {
    return (
      <Card title="作业批改">
        <p>{error}</p>
        <Link className="button secondary" href={`/teacher/assignments/${params.id}`} style={{ marginTop: 12 }}>
          返回作业详情
        </Link>
      </Card>
    );
  }

  if (!data) {
    return <Card title="作业批改">加载中...</Card>;
  }

  return (
    <div className="grid math-view-surface" style={{ gap: 18, ...mathView.style }}>
      <div className="section-head">
        <div>
          <h2>作业批改</h2>
          <div className="section-sub">
            {data.class.name} · {SUBJECT_LABELS[data.class.subject] ?? data.class.subject} · {data.class.grade} 年级
          </div>
        </div>
        <span className="chip">学生：{data.student.name}</span>
      </div>
      <MathViewControls
        fontScale={mathView.fontScale}
        lineMode={mathView.lineMode}
        onDecrease={mathView.decreaseFontScale}
        onIncrease={mathView.increaseFontScale}
        onReset={mathView.resetView}
        onLineModeChange={mathView.setLineMode}
      />

      <AssignmentReviewOverviewCard
        assignment={data.assignment}
        submission={data.submission}
        wrongQuestionsCount={wrongQuestions.length}
        isQuiz={isQuiz}
        backHref={`/teacher/assignments/${params.id}`}
      />

      {data.uploads?.length ? <AssignmentReviewUploadsCard uploads={data.uploads} /> : null}

      {data.submission?.submissionText ? (
        <AssignmentReviewSubmissionTextCard text={data.submission.submissionText} isEssay={isEssay} />
      ) : null}

      <AssignmentReviewAiCard
        aiLoading={aiLoading}
        canAiReview={canAiReview}
        aiReview={aiReview}
        onGenerate={handleAiReview}
      />

      <AssignmentReviewFormCard
        isQuiz={isQuiz}
        isEssay={isEssay}
        wrongQuestions={wrongQuestions}
        overallComment={overallComment}
        itemState={itemState}
        rubricState={rubricState}
        rubrics={data.rubrics}
        saving={saving}
        message={message}
        error={error}
        onSubmit={handleSubmit}
        onOverallCommentChange={setOverallComment}
        onQuestionWrongTagChange={handleQuestionWrongTagChange}
        onQuestionCommentChange={handleQuestionCommentChange}
        onRubricScoreChange={handleRubricScoreChange}
        onRubricCommentChange={handleRubricCommentChange}
      />
    </div>
  );
}
