"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import Card from "@/components/Card";
import EduIcon from "@/components/EduIcon";
import MathText from "@/components/MathText";
import { GRADE_OPTIONS, SUBJECT_LABELS, SUBJECT_OPTIONS } from "@/lib/constants";
import { toPng } from "html-to-image";

type Question = {
  id: string;
  stem: string;
  options: string[];
  knowledgePointId: string;
};

export default function DiagnosticPage() {
  const [subject, setSubject] = useState("math");
  const [grade, setGrade] = useState("4");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{
    total: number;
    correct: number;
    accuracy: number;
    breakdown?: { knowledgePointId: string; title: string; total: number; correct: number; accuracy: number }[];
    wrongReasons?: { reason: string; count: number }[];
  } | null>(null);

  const reasonOptions = [
    "概念不清",
    "审题不仔细",
    "计算粗心",
    "方法不会",
    "记忆不牢"
  ];
  const reportRef = useRef<HTMLDivElement | null>(null);

  async function startDiagnostic() {
    const res = await fetch("/api/diagnostic/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, grade })
    });
    const data = await res.json();
    setQuestions(data.questions ?? []);
    setIndex(0);
    setAnswers({});
    setReasons({});
    setResult(null);
  }

  async function submitDiagnostic() {
    const payload = Object.entries(answers).map(([questionId, answer]) => ({
      questionId,
      answer,
      reason: reasons[questionId]
    }));
    const res = await fetch("/api/diagnostic/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, grade, answers: payload })
    });
    const data = await res.json();
    setResult({
      total: data.total,
      correct: data.correct,
      accuracy: data.accuracy,
      breakdown: data.breakdown,
      wrongReasons: data.wrongReasons
    });
  }

  async function exportImage() {
    if (!reportRef.current) return;
    const dataUrl = await toPng(reportRef.current, { backgroundColor: "#ffffff" });
    const link = document.createElement("a");
    link.download = "diagnostic-report.png";
    link.href = dataUrl;
    link.click();
  }

  const current = questions[index];

  return (
    <div className="grid" style={{ gap: 18 }}>
      <div className="section-head">
        <div>
          <h2>诊断测评</h2>
          <div className="section-sub">快速定位知识点薄弱项，生成学习计划。</div>
        </div>
        <span className="chip">学习体检</span>
      </div>

      <Card title="诊断测评" tag="测评">
        <div className="feature-card">
          <EduIcon name="book" />
          <p>选择学科与年级，开始 AI 诊断测评。</p>
        </div>
        <div className="grid grid-2" style={{ marginTop: 12 }}>
          <label>
            <div className="section-title">学科</div>
            <select
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
            >
              {SUBJECT_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <div className="section-title">年级</div>
            <select
              value={grade}
              onChange={(event) => setGrade(event.target.value)}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
            >
              {GRADE_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button className="button primary" style={{ marginTop: 12 }} onClick={startDiagnostic}>
          开始诊断
        </button>
      </Card>

      {current ? (
        <Card title={`第 ${index + 1} 题`} tag="答题">
          <div className="pill-list" style={{ marginBottom: 10 }}>
            <span className="pill">进度 {index + 1}/{questions.length}</span>
            <span className="pill">学科 {SUBJECT_LABELS[subject] ?? subject}</span>
            <span className="pill">年级 {grade}</span>
          </div>
          <MathText as="p" text={current.stem} />
          <div className="grid" style={{ gap: 8, marginTop: 12 }}>
            {current.options.map((option) => (
              <label className="card" key={option} style={{ cursor: "pointer" }}>
                <input
                  type="radio"
                  name={current.id}
                  value={option}
                  checked={answers[current.id] === option}
                  onChange={() => setAnswers((prev) => ({ ...prev, [current.id]: option }))}
                  style={{ marginRight: 8 }}
                />
                <MathText text={option} />
              </label>
            ))}
          </div>
          <label style={{ display: "block", marginTop: 12 }}>
            <div className="section-title">错因（可选）</div>
            <select
              value={reasons[current.id] ?? ""}
              onChange={(event) => setReasons((prev) => ({ ...prev, [current.id]: event.target.value }))}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
            >
              <option value="">未选择</option>
              {reasonOptions.map((reason) => (
                <option value={reason} key={reason}>
                  {reason}
                </option>
              ))}
            </select>
          </label>
          <div className="cta-row">
            <button
              className="button secondary"
              disabled={index === 0}
              onClick={() => setIndex((prev) => Math.max(prev - 1, 0))}
            >
              上一题
            </button>
            {index < questions.length - 1 ? (
              <button className="button primary" onClick={() => setIndex((prev) => prev + 1)}>
                下一题
              </button>
            ) : (
              <button className="button primary" onClick={submitDiagnostic}>
                提交诊断
              </button>
            )}
          </div>
        </Card>
      ) : null}

      {result ? (
        <Card title="诊断结果" tag="报告">
          <div className="feature-card">
            <EduIcon name="chart" />
            <p>生成掌握度分布与错因总结。</p>
          </div>
          <div ref={reportRef}>
            <p>
              正确 {result.correct} / {result.total}，正确率 {result.accuracy}%。
            </p>
            {result.breakdown?.length ? (
              <div className="grid" style={{ gap: 8, marginTop: 12 }}>
                <div className="badge">知识点掌握</div>
                {result.breakdown.map((item) => (
                  <div className="card" key={item.knowledgePointId}>
                    <div className="section-title">{item.title}</div>
                    <p>
                      正确 {item.correct}/{item.total}，正确率 {item.accuracy}%
                    </p>
                  </div>
                ))}
              </div>
            ) : null}
            {result.wrongReasons?.length ? (
              <div className="grid" style={{ gap: 8, marginTop: 12 }}>
                <div className="badge">错因分布</div>
                {result.wrongReasons.map((item) => (
                  <div key={item.reason}>
                    {item.reason}：{item.count} 次
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          <div className="cta-row">
            <button className="button secondary" onClick={() => window.print()}>
              导出 PDF
            </button>
            <button className="button secondary" onClick={exportImage}>
              导出图片
            </button>
            <Link className="button secondary" href="/plan">
              查看学习计划
            </Link>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
