"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Card from "@/components/Card";
import EduIcon from "@/components/EduIcon";

type ChallengeTask = {
  id: string;
  title: string;
  description: string;
  goal: number;
  points: number;
  type: "count" | "streak" | "accuracy" | "mastery";
  progress: number;
  completed: boolean;
  claimed: boolean;
  linkedKnowledgePoints: Array<{
    id: string;
    title: string;
    subject: string;
    grade: string;
  }>;
  unlockRule: string;
  learningProof?: {
    windowDays: number;
    linkedAttempts: number;
    linkedCorrect: number;
    linkedAccuracy: number;
    linkedReviewCorrect: number;
    masteryAverage: number;
    missingActions: string[];
  };
};

type ChallengeExperiment = {
  key: string;
  variant: "control" | "treatment";
  enabled: boolean;
  rollout: number;
};

export default function ChallengePage() {
  const [tasks, setTasks] = useState<ChallengeTask[]>([]);
  const [points, setPoints] = useState(0);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [experiment, setExperiment] = useState<ChallengeExperiment | null>(null);

  async function load() {
    const res = await fetch("/api/challenges");
    const data = await res.json();
    setTasks(data?.data?.tasks ?? []);
    setPoints(data?.data?.points ?? 0);
    setExperiment(data?.data?.experiment ?? null);
  }

  useEffect(() => {
    load();
  }, []);

  async function claim(taskId: string) {
    setLoadingId(taskId);
    setActionMessage(null);
    const res = await fetch("/api/challenges/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId })
    });
    const data = await res.json();
    setTasks(data?.data?.tasks ?? []);
    setPoints(data?.data?.points ?? 0);
    setExperiment(data?.data?.experiment ?? null);
    if (data?.data?.result?.ok === false) {
      setActionMessage(data?.data?.result?.message ?? "领取失败");
    } else if (data?.data?.result?.ok === true) {
      setActionMessage("奖励领取成功");
    }
    setLoadingId(null);
  }

  return (
    <div className="grid" style={{ gap: 18 }}>
      <div className="section-head">
        <div>
          <h2>闯关式任务</h2>
          <div className="section-sub">挑战目标驱动学习节奏，获取奖励积分。</div>
        </div>
        <span className="chip">挑战系统</span>
      </div>

      <Card title="闯关式任务系统" tag="激励">
        <div className="feature-card">
          <EduIcon name="trophy" />
          <p>完成挑战获取奖励积分，用于激励学习。</p>
        </div>
        <div className="card" style={{ marginTop: 12 }}>
          <div className="section-title">当前积分</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{points}</div>
          {experiment ? (
            <div style={{ marginTop: 6, fontSize: 12, color: "var(--ink-1)" }}>
              实验分组：{experiment.variant === "treatment" ? "实验组" : "对照组"} · 灰度 {experiment.rollout}%
            </div>
          ) : null}
        </div>
        <div className="cta-row" style={{ marginTop: 12 }}>
          <Link className="button secondary" href="/practice?mode=challenge">
            进入闯关练习
          </Link>
        </div>
      </Card>

      <Card title="挑战任务" tag="清单">
        {actionMessage ? <div style={{ marginBottom: 10 }}>{actionMessage}</div> : null}
        <div className="grid" style={{ gap: 12 }}>
          {tasks.map((task) => (
            <div className="card" key={task.id}>
              <div className="section-title">{task.title}</div>
              <p>{task.description}</p>
              <div style={{ fontSize: 12, color: "var(--ink-1)" }}>
                进度：
                {task.type === "accuracy" || task.type === "mastery"
                  ? `${task.progress}%`
                  : `${task.progress}/${task.goal}`}{" "}
                · 奖励 {task.points} 积分
              </div>
              {task.linkedKnowledgePoints?.length ? (
                <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {task.linkedKnowledgePoints.map((item) => (
                    <span className="badge" key={`${task.id}-${item.id}`}>
                      {item.title}
                    </span>
                  ))}
                </div>
              ) : null}
              <div style={{ fontSize: 12, color: "var(--ink-1)", marginTop: 8 }}>
                解锁规则：{task.unlockRule}
              </div>
              {task.learningProof ? (
                <div style={{ fontSize: 12, color: "var(--ink-1)", marginTop: 6 }}>
                  学习证明：近 {task.learningProof.windowDays} 天练习 {task.learningProof.linkedAttempts} 题，
                  正确率 {task.learningProof.linkedAccuracy}% ，错题复练答对 {task.learningProof.linkedReviewCorrect} 次，
                  掌握度均分 {task.learningProof.masteryAverage}。
                </div>
              ) : null}
              {!task.completed && task.learningProof?.missingActions?.length ? (
                <div style={{ marginTop: 6, color: "#b42318", fontSize: 12 }}>
                  未达成：{task.learningProof.missingActions[0]}
                </div>
              ) : null}
              <div className="cta-row" style={{ marginTop: 8 }}>
                <button
                  className="button primary"
                  onClick={() => claim(task.id)}
                  disabled={!task.completed || task.claimed || loadingId === task.id}
                >
                  {task.claimed ? "已领取" : task.completed ? "领取奖励" : "未完成"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
