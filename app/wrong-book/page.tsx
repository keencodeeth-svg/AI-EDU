"use client";

import { useEffect, useMemo, useState } from "react";
import Card from "@/components/Card";

type Question = {
  id: string;
  stem: string;
  explanation: string;
  options: string[];
  answer: string;
  subject: string;
  grade: string;
  knowledgePointId: string;
};

type WrongBookItem = Question & {
  weaknessRank?: number | null;
  lastAttemptAt?: string | null;
  nextReviewAt?: string | null;
  intervalLevel?: number | null;
  intervalLabel?: string | null;
  lastReviewResult?: "correct" | "wrong" | null;
};

type CorrectionTask = {
  id: string;
  questionId: string;
  status: "pending" | "completed";
  dueDate: string;
  createdAt: string;
  completedAt?: string | null;
  question?: Question | null;
};

type Summary = {
  pending: number;
  overdue: number;
  dueSoon: number;
  completed: number;
};

type ReviewQueueItem = {
  id: string;
  questionId: string;
  intervalLevel: number;
  intervalLabel: string;
  nextReviewAt: string | null;
  lastReviewResult: "correct" | "wrong" | null;
  lastReviewAt: string | null;
  reviewCount: number;
  status: "active" | "completed";
  question: {
    id: string;
    stem: string;
    options: string[];
    subject: string;
    grade: string;
    knowledgePointId: string;
  } | null;
};

type ReviewQueueData = {
  summary: {
    totalActive: number;
    dueToday: number;
    overdue: number;
    upcoming: number;
  };
  today: ReviewQueueItem[];
  upcoming: ReviewQueueItem[];
};

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("zh-CN");
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("zh-CN");
}

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

  async function load() {
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
  }

  useEffect(() => {
    load();
  }, []);

  function toggleSelect(id: string) {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
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

    const failed = data.skipped ?? [];
    if (failed.length) {
      setErrors(failed.map((item: any) => `${item.questionId}：${item.reason}`));
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

      <Card title="今日复练清单" tag="24h / 72h / 7d">
        <div className="grid grid-3">
          <div className="card">
            <div className="section-title">今日应复练</div>
            <p>{reviewQueue?.summary?.dueToday ?? 0} 题</p>
          </div>
          <div className="card">
            <div className="section-title">逾期</div>
            <p>{reviewQueue?.summary?.overdue ?? 0} 题</p>
          </div>
          <div className="card">
            <div className="section-title">后续排队</div>
            <p>{reviewQueue?.summary?.upcoming ?? 0} 题</p>
          </div>
        </div>

        <div className="grid" style={{ gap: 12, marginTop: 12 }}>
          {!reviewQueue?.today?.length ? <p>今日暂无到期复练，继续保持。</p> : null}
          {(reviewQueue?.today ?? []).map((item) => (
            <div className="card" key={item.id}>
              <div className="section-title">{item.question?.stem ?? "题目已删除"}</div>
              <div style={{ fontSize: 12, color: "var(--ink-1)", marginTop: 4 }}>
                节奏：{item.intervalLabel} · 应复练时间：{formatDateTime(item.nextReviewAt)}
              </div>
              {item.question?.options?.length ? (
                <div className="grid" style={{ gap: 8, marginTop: 10 }}>
                  {item.question.options.map((option) => (
                    <label className="card" key={`${item.id}-${option}`} style={{ cursor: "pointer" }}>
                      <input
                        type="radio"
                        name={`review-${item.questionId}`}
                        checked={reviewAnswers[item.questionId] === option}
                        onChange={() =>
                          setReviewAnswers((prev) => ({
                            ...prev,
                            [item.questionId]: option
                          }))
                        }
                        style={{ marginRight: 8 }}
                      />
                      {option}
                    </label>
                  ))}
                </div>
              ) : (
                <p style={{ marginTop: 10 }}>题目选项缺失，暂不可复练。</p>
              )}
              <div className="cta-row" style={{ marginTop: 10 }}>
                <button
                  className="button primary"
                  onClick={() => submitReview(item)}
                  disabled={!item.question?.options?.length || Boolean(reviewSubmitting[item.questionId])}
                >
                  {reviewSubmitting[item.questionId] ? "提交中..." : "提交复练"}
                </button>
              </div>
              {reviewMessages[item.questionId] ? (
                <div style={{ marginTop: 8, fontSize: 12 }}>{reviewMessages[item.questionId]}</div>
              ) : null}
            </div>
          ))}
        </div>

        {reviewQueue?.upcoming?.length ? (
          <div className="grid" style={{ gap: 8, marginTop: 12 }}>
            <div className="section-title">后续复练排期</div>
            {reviewQueue.upcoming.slice(0, 5).map((item) => (
              <div key={`upcoming-${item.id}`} style={{ fontSize: 13, color: "var(--ink-1)" }}>
                {item.question?.stem ?? item.questionId} · {item.intervalLabel} · {formatDateTime(item.nextReviewAt)}
              </div>
            ))}
          </div>
        ) : null}
      </Card>

      <Card title="订正任务" tag="订正">
        <div className="grid grid-2">
          <div className="card">
            <div className="section-title">待订正</div>
            <p>{summary?.pending ?? 0} 题</p>
          </div>
          <div className="card">
            <div className="section-title">逾期</div>
            <p>{summary?.overdue ?? 0} 题</p>
          </div>
          <div className="card">
            <div className="section-title">2 天内到期</div>
            <p>{summary?.dueSoon ?? 0} 题</p>
          </div>
          <div className="card">
            <div className="section-title">已完成</div>
            <p>{summary?.completed ?? 0} 题</p>
          </div>
        </div>
        <div className="grid" style={{ gap: 12, marginTop: 12 }}>
          {tasks.length === 0 ? <p>暂无订正任务。</p> : null}
          {tasks.map((task) => {
            const overdue = task.status === "pending" && new Date(task.dueDate).getTime() < Date.now();
            return (
              <div className="card" key={task.id} style={{ borderColor: overdue ? "#d92d20" : "var(--stroke)" }}>
                <div className="section-title">{task.question?.stem ?? "题目已删除"}</div>
                <p style={{ color: "var(--ink-1)" }}>截止：{formatDate(task.dueDate)}</p>
                <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <div className="badge">状态：{task.status === "completed" ? "已完成" : overdue ? "逾期" : "待订正"}</div>
                  {task.status === "completed" ? (
                    <div className="badge">完成时间：{formatDate(task.completedAt)}</div>
                  ) : (
                    <button className="button secondary" onClick={() => handleComplete(task.id)}>
                      标记完成
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card title="从错题生成订正任务" tag="生成">
        <div style={{ display: "grid", gap: 12 }}>
          <label>
            <div className="section-title">截止日期</div>
            <input
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
            />
          </label>
          <div className="grid" style={{ gap: 12 }}>
            {list.length === 0 ? <p>暂无错题，继续保持！</p> : null}
            {list.map((item) => (
              <div className="card" key={item.id}>
                <label style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <input
                    type="checkbox"
                    checked={Boolean(selected[item.id])}
                    onChange={() => toggleSelect(item.id)}
                    style={{ marginTop: 6 }}
                  />
                  <div>
                    <div className="section-title">{item.stem}</div>
                    <p>{item.explanation}</p>
                    <div style={{ fontSize: 12, color: "var(--ink-1)" }}>
                      {item.nextReviewAt ? `下次复练：${formatDateTime(item.nextReviewAt)} · ` : ""}
                      {item.intervalLabel ? `阶段：${item.intervalLabel} · ` : ""}
                      {item.weaknessRank ? `薄弱排序：#${item.weaknessRank}` : ""}
                    </div>
                  </div>
                </label>
              </div>
            ))}
          </div>
          <button className="button primary" type="button" onClick={handleCreateTasks}>
            创建订正任务
          </button>
          {message ? <div>{message}</div> : null}
          {errors.length ? (
            <div style={{ color: "#b42318", fontSize: 13 }}>
              {errors.slice(0, 5).map((err) => (
                <div key={err}>{err}</div>
              ))}
            </div>
          ) : null}
        </div>
      </Card>

      <Card title="错题本" tag="复盘">
        <div className="grid" style={{ gap: 12 }}>
          {list.length === 0 ? <p>暂无错题，继续保持！</p> : null}
          {list.map((item) => (
            <div className="card" key={item.id}>
              <div className="section-title">{item.stem}</div>
              <p>{item.explanation}</p>
              <div style={{ fontSize: 12, color: "var(--ink-1)" }}>
                最近答题：{formatDateTime(item.lastAttemptAt)} · 上次复练结果：{item.lastReviewResult ?? "-"} · 下次复练：
                {formatDateTime(item.nextReviewAt)}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

