"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Card from "@/components/Card";
import EduIcon from "@/components/EduIcon";

const DIFFICULTY_OPTIONS = [
  { value: "easy", label: "简单" },
  { value: "medium", label: "中等" },
  { value: "hard", label: "困难" }
];

type ClassItem = {
  id: string;
  name: string;
  subject: string;
  grade: string;
};

type KnowledgePoint = {
  id: string;
  subject: string;
  grade: string;
  title: string;
  chapter: string;
  unit?: string;
};

export default function CreateTeacherExamPage() {
  const router = useRouter();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [knowledgePoints, setKnowledgePoints] = useState<KnowledgePoint[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [form, setForm] = useState({
    classId: "",
    title: "",
    description: "",
    startAt: "",
    endAt: "",
    durationMinutes: 60,
    questionCount: 10,
    knowledgePointId: "",
    difficulty: "medium",
    questionType: "choice"
  });

  useEffect(() => {
    fetch("/api/teacher/classes")
      .then((res) => res.json())
      .then((payload) => {
        const list = payload.data ?? [];
        setClasses(list);
        if (list.length) {
          const defaultEndAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16);
          setForm((prev) => ({
            ...prev,
            classId: prev.classId || list[0].id,
            endAt: prev.endAt || defaultEndAt
          }));
        }
      });

    fetch("/api/knowledge-points")
      .then((res) => res.json())
      .then((payload) => setKnowledgePoints(payload.data ?? []));
  }, []);

  const filteredPoints = useMemo(() => {
    const klass = classes.find((item) => item.id === form.classId);
    if (!klass) return [];
    return knowledgePoints.filter((item) => item.subject === klass.subject && item.grade === klass.grade);
  }, [classes, knowledgePoints, form.classId]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    const res = await fetch("/api/teacher/exams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        classId: form.classId,
        title: form.title,
        description: form.description,
        startAt: form.startAt || undefined,
        endAt: form.endAt || undefined,
        durationMinutes: form.durationMinutes || undefined,
        questionCount: form.questionCount,
        knowledgePointId: form.knowledgePointId || undefined,
        difficulty: form.difficulty || undefined,
        questionType: form.questionType || undefined
      })
    });
    const payload = await res.json();
    if (!res.ok) {
      setError(payload?.error ?? "发布失败");
      setSaving(false);
      return;
    }
    setMessage(payload?.message ?? "考试发布成功");
    const examId = payload?.data?.id;
    if (examId) {
      router.push(`/teacher/exams/${examId}`);
      return;
    }
    router.push("/teacher/exams");
  }

  return (
    <div className="grid" style={{ gap: 18 }}>
      <div className="section-head">
        <div>
          <h2>发布在线考试</h2>
          <div className="section-sub">按班级发布独立考试，学生完成后自动统计成绩。</div>
        </div>
      </div>

      <Card title="考试设置" tag="创建">
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
          <label>
            <div className="section-title">班级</div>
            <select
              value={form.classId}
              onChange={(event) => setForm((prev) => ({ ...prev, classId: event.target.value, knowledgePointId: "" }))}
              required
            >
              {classes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · {item.subject} · {item.grade} 年级
                </option>
              ))}
            </select>
          </label>

          <label>
            <div className="section-title">考试标题</div>
            <input
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="例如：第一单元阶段测评"
              required
            />
          </label>

          <label>
            <div className="section-title">考试说明（可选）</div>
            <textarea
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              rows={3}
              placeholder="说明考试范围与注意事项"
            />
          </label>

          <div className="grid grid-2">
            <label>
              <div className="section-title">开始时间（可选）</div>
              <input
                type="datetime-local"
                value={form.startAt}
                onChange={(event) => setForm((prev) => ({ ...prev, startAt: event.target.value }))}
              />
            </label>
            <label>
              <div className="section-title">截止时间</div>
              <input
                type="datetime-local"
                value={form.endAt}
                onChange={(event) => setForm((prev) => ({ ...prev, endAt: event.target.value }))}
                required
              />
            </label>
          </div>

          <div className="grid grid-3">
            <label>
              <div className="section-title">题目数量</div>
              <input
                type="number"
                min={1}
                max={100}
                value={form.questionCount}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, questionCount: Number(event.target.value || 1) }))
                }
                required
              />
            </label>
            <label>
              <div className="section-title">考试时长（分钟）</div>
              <input
                type="number"
                min={5}
                max={300}
                value={form.durationMinutes}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, durationMinutes: Number(event.target.value || 60) }))
                }
              />
            </label>
            <label>
              <div className="section-title">难度</div>
              <select
                value={form.difficulty}
                onChange={(event) => setForm((prev) => ({ ...prev, difficulty: event.target.value }))}
              >
                {DIFFICULTY_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid grid-2">
            <label>
              <div className="section-title">题型</div>
              <select
                value={form.questionType}
                onChange={(event) => setForm((prev) => ({ ...prev, questionType: event.target.value }))}
              >
                <option value="choice">选择题</option>
                <option value="fill">填空题</option>
                <option value="qa">问答题</option>
              </select>
            </label>
            <label>
              <div className="section-title">知识点（可选）</div>
              <select
                value={form.knowledgePointId}
                onChange={(event) => setForm((prev) => ({ ...prev, knowledgePointId: event.target.value }))}
              >
                <option value="">全部知识点</option>
                {filteredPoints.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.chapter} · {item.title}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="feature-card">
            <EduIcon name="chart" />
            <p>考试发布后会自动分配给班级内学生，并支持自动保存与提交统计。</p>
          </div>

          {message ? <div style={{ color: "#1a7f37", fontSize: 13 }}>{message}</div> : null}
          {error ? <div style={{ color: "#b42318", fontSize: 13 }}>{error}</div> : null}

          <div className="cta-row">
            <button className="button primary" type="submit" disabled={saving || !classes.length}>
              {saving ? "发布中..." : "发布考试"}
            </button>
            <Link className="button ghost" href="/teacher/exams">
              返回考试列表
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
}
