"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import WrongBookHistoryCard from "./_components/WrongBookHistoryCard";
import WrongBookReviewQueueCard from "./_components/WrongBookReviewQueueCard";
import WrongBookTaskGeneratorCard from "./_components/WrongBookTaskGeneratorCard";
import WrongBookTasksCard from "./_components/WrongBookTasksCard";
import type {
  CorrectionTask,
  CreateCorrectionSkippedItem,
  ReviewQueueData,
  ReviewQueueItem,
  Summary,
  WrongBookItem
} from "./types";
import { formatDateTime, toDateInputValue } from "./utils";

export default function WrongBookPage() {
  const [list, setList] = useState<WrongBookItem[]>([]);
  const [tasks, setTasks] = useState<CorrectionTask[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [reviewQueue, setReviewQueue] = useState<ReviewQueueData | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [reviewAnswers, setReviewAnswers] = useState<Record<string, string>>({});
  const [reviewSubmitting, setReviewSubmitting] = useState<Record<string, boolean>>({});
  const [reviewMessages, setReviewMessages] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  const defaultDueDate = useMemo(() => {
    const base = new Date();
    base.setDate(base.getDate() + 3);
    return toDateInputValue(base);
  }, []);

  const [dueDate, setDueDate] = useState(defaultDueDate);

  const load = useCallback(async () => {
    const [wrongRes, taskRes, queueRes] = await Promise.all([
      fetch("/api/wrong-book"),
      fetch("/api/corrections"),
      fetch("/api/wrong-book/review-queue")
    ]);
    const wrongData = await wrongRes.json();
    const taskData = await taskRes.json();
    const queueData = await queueRes.json();
    setList(wrongData.data ?? []);
    setTasks(taskData.data ?? []);
    setSummary(taskData.summary ?? null);
    setReviewQueue(queueData.data ?? null);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function toggleSelect(id: string) {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function handleReviewAnswerChange(questionId: string, value: string) {
    setReviewAnswers((prev) => ({
      ...prev,
      [questionId]: value
    }));
  }

  async function handleCreateTasks() {
    setMessage(null);
    setErrors([]);
    const ids = list.filter((item) => selected[item.id]).map((item) => item.id);
    if (!ids.length) {
      setErrors(["请先选择要订正的错题。"]);
      return;
    }

    const res = await fetch("/api/corrections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionIds: ids, dueDate })
    });
    const data = await res.json();
    if (!res.ok) {
      setErrors([data?.error ?? "创建任务失败"]);
      return;
    }

    const failed = (data.skipped ?? []) as CreateCorrectionSkippedItem[];
    if (failed.length) {
      setErrors(failed.map((item) => `${item.questionId}：${item.reason}`));
    }
    setMessage(`已创建 ${data.created?.length ?? 0} 个订正任务。`);
    setSelected({});
    load();
  }

  async function handleComplete(id: string) {
    await fetch(`/api/corrections/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "completed" })
    });
    load();
  }

  async function submitReview(item: ReviewQueueItem) {
    const answer = reviewAnswers[item.questionId];
    if (!answer) {
      setReviewMessages((prev) => ({ ...prev, [item.questionId]: "请先选择答案。" }));
      return;
    }

    setReviewSubmitting((prev) => ({ ...prev, [item.questionId]: true }));
    setReviewMessages((prev) => ({ ...prev, [item.questionId]: "" }));

    const res = await fetch("/api/wrong-book/review-result", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId: item.questionId, answer })
    });
    const data = await res.json();

    if (!res.ok) {
      setReviewMessages((prev) => ({ ...prev, [item.questionId]: data?.error ?? "提交失败" }));
      setReviewSubmitting((prev) => ({ ...prev, [item.questionId]: false }));
      return;
    }

    const nextSlot = data?.review?.intervalLabel ? `，下一轮：${data.review.intervalLabel}` : "";
    const nextDate = data?.nextReviewAt ? `（${formatDateTime(data.nextReviewAt)}）` : "";
    setReviewMessages((prev) => ({
      ...prev,
      [item.questionId]: `${data.correct ? "复练正确" : "复练错误"}${nextSlot}${nextDate}`
    }));
    setReviewAnswers((prev) => ({ ...prev, [item.questionId]: "" }));
    setReviewSubmitting((prev) => ({ ...prev, [item.questionId]: false }));
    await load();
  }

  return (
    <div className="grid" style={{ gap: 18 }}>
      <div className="section-head">
        <div>
          <h2>错题与订正</h2>
          <div className="section-sub">错题复盘 + 间隔复练 + 订正计划。</div>
        </div>
        <span className="chip">错题闭环</span>
      </div>

      <WrongBookReviewQueueCard
        reviewQueue={reviewQueue}
        reviewAnswers={reviewAnswers}
        reviewSubmitting={reviewSubmitting}
        reviewMessages={reviewMessages}
        onReviewAnswerChange={handleReviewAnswerChange}
        onSubmitReview={submitReview}
      />

      <WrongBookTasksCard summary={summary} tasks={tasks} onCompleteTask={handleComplete} />

      <WrongBookTaskGeneratorCard
        dueDate={dueDate}
        list={list}
        selected={selected}
        message={message}
        errors={errors}
        onDueDateChange={setDueDate}
        onToggleSelect={toggleSelect}
        onCreateTasks={handleCreateTasks}
      />

      <WrongBookHistoryCard list={list} />
    </div>
  );
}
