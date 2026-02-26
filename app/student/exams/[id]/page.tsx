"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Card from "@/components/Card";
import EduIcon from "@/components/EduIcon";
import { SUBJECT_LABELS } from "@/lib/constants";

type ExamDetail = {
  exam: {
    id: string;
    title: string;
    description?: string;
    startAt?: string;
    endAt: string;
    durationMinutes?: number;
    status: "published" | "closed";
  };
  class: {
    id: string;
    name: string;
    subject: string;
    grade: string;
  };
  assignment: {
    status: "pending" | "in_progress" | "submitted";
    startedAt?: string;
    submittedAt?: string;
    score?: number;
    total?: number;
  };
  questions: Array<{
    id: string;
    stem: string;
    options: string[];
    score: number;
    orderIndex: number;
  }>;
  draftAnswers: Record<string, string>;
  submission: {
    score: number;
    total: number;
    submittedAt: string;
    answers: Record<string, string>;
  } | null;
};

type SubmitResult = {
  score: number;
  total: number;
  submittedAt: string;
  details: Array<{
    questionId: string;
    correct: boolean;
    answer: string;
    correctAnswer: string;
    score: number;
  }>;
};

export default function StudentExamDetailPage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<ExamDetail | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submitted = useMemo(
    () => (data?.assignment.status ?? "pending") === "submitted" || Boolean(data?.submission),
    [data]
  );

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch(`/api/student/exams/${params.id}`);
    const payload = await res.json();
    if (!res.ok) {
      setError(payload?.error ?? "加载失败");
      return;
    }
    setData(payload);
    const initialAnswers = payload?.submission?.answers ?? payload?.draftAnswers ?? {};
    setAnswers(initialAnswers);
    setSavedAt(payload?.assignment?.autoSavedAt ?? null);
    setDirty(false);
    setResult(null);
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  const saveDraft = useCallback(async () => {
    if (!data || submitted || saving) return;
    setSaving(true);
    const res = await fetch(`/api/student/exams/${params.id}/autosave`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers })
    });
    const payload = await res.json();
    if (!res.ok) {
      setError(payload?.error ?? "自动保存失败");
      setSaving(false);
      return;
    }
    setSavedAt(payload.savedAt ?? new Date().toISOString());
    setDirty(false);
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        assignment: {
          ...prev.assignment,
          status: payload.status ?? prev.assignment.status
        }
      };
    });
    setSaving(false);
  }, [answers, data, params.id, saving, submitted]);

  useEffect(() => {
    if (!dirty || submitted) return;
    const timer = setTimeout(() => {
      saveDraft();
    }, 1200);
    return () => clearTimeout(timer);
  }, [dirty, saveDraft, submitted]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!data || submitted) return;
    setSubmitting(true);
    setError(null);

    const res = await fetch(`/api/student/exams/${params.id}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers })
    });
    const payload = await res.json();
    if (!res.ok) {
      setError(payload?.error ?? "提交失败");
      setSubmitting(false);
      return;
    }

    setResult(payload);
    setSavedAt(payload.submittedAt ?? new Date().toISOString());
    setDirty(false);
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        assignment: {
          ...prev.assignment,
          status: "submitted",
          submittedAt: payload.submittedAt,
          score: payload.score,
          total: payload.total
        },
        submission: {
          score: payload.score,
          total: payload.total,
          submittedAt: payload.submittedAt,
          answers
        }
      };
    });
    setSubmitting(false);
  }

  if (error) {
    return (
      <Card title="考试详情">
        <p>{error}</p>
        <div className="cta-row" style={{ marginTop: 12 }}>
          <button className="button secondary" onClick={load}>
            重试
          </button>
          <Link className="button ghost" href="/student/exams">
            返回考试列表
          </Link>
        </div>
      </Card>
    );
  }

  if (!data) {
    return <Card title="考试详情">加载中...</Card>;
  }

  const totalScore = data.questions.reduce((sum, item) => sum + (item.score ?? 1), 0);
  const finalScore = result?.score ?? data.submission?.score ?? data.assignment.score ?? 0;
  const finalTotal = result?.total ?? data.submission?.total ?? data.assignment.total ?? totalScore;
  const answerCount = Object.values(answers).filter((value) => value && value.trim()).length;

  return (
    <div className="grid" style={{ gap: 18 }}>
      <div className="section-head">
        <div>
          <h2>{data.exam.title}</h2>
          <div className="section-sub">
            {data.class.name} · {SUBJECT_LABELS[data.class.subject] ?? data.class.subject} · {data.class.grade} 年级
          </div>
        </div>
        <span className="chip">{submitted ? "已提交" : "考试进行中"}</span>
      </div>

      <Card title="考试信息" tag="概览">
        <div className="grid grid-2">
          <div className="card feature-card">
            <EduIcon name="board" />
            <div className="section-title">考试说明</div>
            <p>{data.exam.description || "请认真作答，按时提交。"}</p>
            <div className="pill-list">
              {data.exam.startAt ? (
                <span className="pill">开始 {new Date(data.exam.startAt).toLocaleString("zh-CN")}</span>
              ) : (
                <span className="pill">可立即开始</span>
              )}
              <span className="pill">截止 {new Date(data.exam.endAt).toLocaleString("zh-CN")}</span>
            </div>
          </div>
          <div className="card feature-card">
            <EduIcon name="chart" />
            <div className="section-title">作答状态</div>
            <div className="pill-list">
              <span className="pill">已答 {answerCount}/{data.questions.length}</span>
              <span className="pill">总分 {totalScore}</span>
              <span className="pill">时长 {data.exam.durationMinutes ? `${data.exam.durationMinutes} 分钟` : "不限"}</span>
            </div>
            {submitted ? (
              <div style={{ marginTop: 8, fontSize: 13 }}>
                成绩：{finalScore}/{finalTotal}
              </div>
            ) : (
              <div style={{ marginTop: 8, fontSize: 12, color: "var(--ink-1)" }}>
                {saving ? "自动保存中..." : savedAt ? `最近保存：${new Date(savedAt).toLocaleTimeString("zh-CN")}` : "尚未保存"}
              </div>
            )}
          </div>
        </div>
        <div className="cta-row" style={{ marginTop: 12 }}>
          <Link className="button ghost" href="/student/exams">
            返回考试列表
          </Link>
          {!submitted ? (
            <button className="button secondary" type="button" onClick={saveDraft} disabled={saving || submitting}>
              {saving ? "保存中..." : "保存进度"}
            </button>
          ) : null}
        </div>
      </Card>

      <Card title="考试作答" tag="作答">
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 14 }}>
          {data.questions.map((question, index) => (
            <div className="card" key={question.id}>
              <div className="section-title">
                {index + 1}. {question.stem}
              </div>
              <div style={{ marginTop: 6, display: "grid", gap: 6 }}>
                {question.options.map((option) => (
                  <label key={option} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      type="radio"
                      name={question.id}
                      value={option}
                      checked={answers[question.id] === option}
                      disabled={submitted}
                      onChange={(event) => {
                        setAnswers((prev) => ({ ...prev, [question.id]: event.target.value }));
                        setDirty(true);
                      }}
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
              <div style={{ marginTop: 6, fontSize: 12, color: "var(--ink-1)" }}>分值：{question.score}</div>
            </div>
          ))}

          {submitted ? (
            <div className="card">
              <div className="section-title">考试已提交</div>
              <p>
                你的成绩：{finalScore}/{finalTotal}
              </p>
              <div style={{ fontSize: 12, color: "var(--ink-1)" }}>
                提交时间：{data.assignment.submittedAt ? new Date(data.assignment.submittedAt).toLocaleString("zh-CN") : "-"}
              </div>
            </div>
          ) : (
            <button className="button primary" type="submit" disabled={submitting}>
              {submitting ? "提交中..." : "提交考试"}
            </button>
          )}
        </form>
      </Card>

      {result?.details?.length ? (
        <Card title="答题结果" tag="反馈">
          <div className="grid" style={{ gap: 8 }}>
            {result.details.map((item, index) => (
              <div className="card" key={item.questionId}>
                <div className="section-title">
                  {index + 1}. {item.correct ? "正确" : "错误"}
                </div>
                <div style={{ fontSize: 12, color: "var(--ink-1)" }}>
                  你的答案：{item.answer || "未作答"}；正确答案：{item.correctAnswer}；分值：{item.score}
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
