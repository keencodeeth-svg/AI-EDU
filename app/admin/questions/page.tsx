"use client";

import { useEffect, useMemo, useState } from "react";
import Card from "@/components/Card";
import { GRADE_OPTIONS, SUBJECT_LABELS, SUBJECT_OPTIONS } from "@/lib/constants";

type KnowledgePoint = {
  id: string;
  subject: string;
  grade: string;
  title: string;
  chapter: string;
};

type Question = {
  id: string;
  subject: string;
  grade: string;
  knowledgePointId: string;
  stem: string;
  options: string[];
  answer: string;
  explanation: string;
  difficulty?: string;
  questionType?: string;
  tags?: string[];
  abilities?: string[];
};

type QuestionQuality = {
  questionId: string;
  qualityScore: number;
  duplicateRisk: "low" | "medium" | "high";
  ambiguityRisk: "low" | "medium" | "high";
  answerConsistency: number;
  issues: string[];
  checkedAt: string | null;
};

const difficultyLabel: Record<string, string> = {
  easy: "简单",
  medium: "适中",
  hard: "困难"
};

const questionTypeLabel: Record<string, string> = {
  choice: "选择题",
  fill: "填空题",
  short: "简答题"
};

const riskLabel: Record<"low" | "medium" | "high", string> = {
  low: "低",
  medium: "中",
  high: "高"
};

export default function QuestionsAdminPage() {
  const [list, setList] = useState<Question[]>([]);
  const [knowledgePoints, setKnowledgePoints] = useState<KnowledgePoint[]>([]);
  const [qualityMap, setQualityMap] = useState<Record<string, QuestionQuality>>({});
  const [loading, setLoading] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [form, setForm] = useState({
    subject: "math",
    grade: "4",
    knowledgePointId: "",
    stem: "",
    options: "",
    answer: "",
    explanation: "",
    difficulty: "medium",
    questionType: "choice",
    tags: "",
    abilities: ""
  });
  const [aiForm, setAiForm] = useState({
    subject: "math",
    grade: "4",
    knowledgePointId: "",
    count: 1,
    difficulty: "medium",
    mode: "single",
    chapter: ""
  });
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [aiErrors, setAiErrors] = useState<string[]>([]);

  const chapterOptions = useMemo(() => {
    const filtered = knowledgePoints.filter(
      (kp) => kp.subject === aiForm.subject && kp.grade === aiForm.grade
    );
    const chapters = filtered.map((kp) => kp.chapter).filter(Boolean);
    return Array.from(new Set(chapters));
  }, [knowledgePoints, aiForm.subject, aiForm.grade]);

  const aiKnowledgePoints = useMemo(
    () => knowledgePoints.filter((kp) => kp.subject === aiForm.subject && kp.grade === aiForm.grade),
    [knowledgePoints, aiForm.subject, aiForm.grade]
  );

  async function load() {
    setLoading(true);
    const [qRes, kpRes, qualityRes] = await Promise.all([
      fetch("/api/admin/questions"),
      fetch("/api/admin/knowledge-points"),
      fetch("/api/admin/questions/quality")
    ]);
    const qData = await qRes.json();
    const kpData = await kpRes.json();
    const qualityData = qualityRes.ok ? await qualityRes.json() : { data: [] };
    setList(qData.data ?? []);
    setKnowledgePoints(kpData.data ?? []);
    const map: Record<string, QuestionQuality> = {};
    (qualityData.data ?? []).forEach((item: QuestionQuality) => {
      map[item.questionId] = item;
    });
    setQualityMap(map);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (knowledgePoints.length && !form.knowledgePointId) {
      setForm((prev) => ({ ...prev, knowledgePointId: knowledgePoints[0].id }));
    }
    if (aiKnowledgePoints.length && !aiForm.knowledgePointId) {
      setAiForm((prev) => ({ ...prev, knowledgePointId: aiKnowledgePoints[0].id }));
    }
    if (aiForm.knowledgePointId && !aiKnowledgePoints.find((kp) => kp.id === aiForm.knowledgePointId)) {
      setAiForm((prev) => ({ ...prev, knowledgePointId: aiKnowledgePoints[0]?.id ?? "" }));
    }
  }, [knowledgePoints, form.knowledgePointId, aiForm.knowledgePointId, aiKnowledgePoints]);

  useEffect(() => {
    if (aiForm.mode === "batch" && chapterOptions.length && !aiForm.chapter) {
      setAiForm((prev) => ({ ...prev, chapter: chapterOptions[0] }));
    }
  }, [aiForm.mode, aiForm.chapter, chapterOptions]);

  function parseCsv(text: string) {
    const rows: string[][] = [];
    let current = "";
    let row: string[] = [];
    let inQuotes = false;
    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];
      const next = text[i + 1];
      if (char === "\"") {
        if (inQuotes && next === "\"") {
          current += "\"";
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        row.push(current.trim());
        current = "";
      } else if ((char === "\n" || char === "\r") && !inQuotes) {
        if (current.length || row.length) {
          row.push(current.trim());
          rows.push(row);
          row = [];
          current = "";
        }
      } else {
        current += char;
      }
    }
    if (current.length || row.length) {
      row.push(current.trim());
      rows.push(row);
    }
    return rows;
  }

  function parseListText(input: string) {
    return input
      .split(/[,|，\n]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function downloadTemplate() {
    const header = [
      "subject",
      "grade",
      "knowledgePointId",
      "knowledgePointTitle",
      "stem",
      "options",
      "answer",
      "explanation",
      "difficulty",
      "questionType",
      "tags",
      "abilities"
    ];
    const sample = [
      "math",
      "4",
      "math-g4-fractions-meaning",
      "分数的意义",
      "把一个披萨平均分成 8 份，小明吃了 3 份，吃了几分之几？",
      "1/8|3/8|3/5|8/3",
      "3/8",
      "平均分成 8 份，每份是 1/8，吃了 3 份就是 3/8。",
      "medium",
      "choice",
      "分数|图形",
      "计算|理解"
    ];
    const csv = `${header.join(",")}\n${sample.map((item) => `\"${item}\"`).join(",")}\n`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "questions-template.csv";
    link.click();
  }

  async function handleImport(file?: File | null) {
    if (!file) return;
    setImportMessage(null);
    setImportErrors([]);
    const text = await file.text();
    const rows = parseCsv(text);
    if (rows.length < 2) {
      setImportErrors(["CSV 内容不足"]);
      return;
    }
    const headers = rows[0].map((h) => h.trim());
    const items: any[] = [];
    const errors: string[] = [];

    for (let i = 1; i < rows.length; i += 1) {
      const row = rows[i];
      if (!row.length) continue;
      const record: Record<string, string> = {};
      headers.forEach((key, index) => {
        record[key] = row[index] ?? "";
      });
      const options = (record.options || "")
        .split("|")
        .map((opt) => opt.trim())
        .filter(Boolean);
      const tags = parseListText(record.tags || "");
      const abilities = parseListText(record.abilities || "");
      let knowledgePointId = record.knowledgePointId;
      if (!knowledgePointId && record.knowledgePointTitle) {
        const kp = knowledgePoints.find(
          (item) => item.title === record.knowledgePointTitle && item.subject === record.subject
        );
        knowledgePointId = kp?.id ?? "";
      }
      if (!knowledgePointId) {
        errors.push(`第 ${i + 1} 行：找不到知识点`);
        continue;
      }
      items.push({
        subject: record.subject,
        grade: record.grade,
        knowledgePointId,
        stem: record.stem,
        options,
        answer: record.answer,
        explanation: record.explanation,
        difficulty: record.difficulty,
        questionType: record.questionType,
        tags,
        abilities
      });
    }

    if (!items.length) {
      setImportErrors(errors.length ? errors : ["没有可导入的题目"]);
      return;
    }

    const res = await fetch("/api/admin/questions/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items })
    });
    const data = await res.json();
    if (!res.ok) {
      setImportErrors([data?.error ?? "导入失败"]);
      return;
    }
    const highRiskCount = (data.items ?? []).filter(
      (item: any) => item.duplicateRisk === "high" || item.ambiguityRisk === "high"
    ).length;
    setImportMessage(
      `已导入 ${data.created} 题，失败 ${data.failed?.length ?? 0} 条，高风险 ${highRiskCount} 题。`
    );
    setImportErrors(errors);
    load();
  }

  async function handleGenerate(event: React.FormEvent) {
    event.preventDefault();
    setAiMessage(null);
    setAiErrors([]);
    setAiLoading(true);

    const endpoint =
      aiForm.mode === "batch" ? "/api/admin/questions/generate-batch" : "/api/admin/questions/generate";

    const count = aiForm.mode === "batch" ? Math.max(aiForm.count, 10) : aiForm.count;
    const payload =
      aiForm.mode === "batch"
        ? {
            subject: aiForm.subject,
            grade: aiForm.grade,
            count,
            chapter: aiForm.chapter || undefined,
            difficulty: aiForm.difficulty
          }
        : {
            subject: aiForm.subject,
            grade: aiForm.grade,
            knowledgePointId: aiForm.knowledgePointId,
            count,
            difficulty: aiForm.difficulty
          };

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) {
      setAiErrors([data?.error ?? "生成失败"]);
      setAiLoading(false);
      return;
    }

    const failed = data.failed ?? [];
    if (failed.length) {
      setAiErrors(failed.map((item: any) => `第 ${item.index + 1} 题：${item.reason}`));
    }
    const highRiskCount = (data.created ?? []).filter(
      (item: any) => item.duplicateRisk === "high" || item.ambiguityRisk === "high"
    ).length;
    setAiMessage(`已生成 ${data.created?.length ?? 0} 题，高风险 ${highRiskCount} 题。`);
    setAiLoading(false);
    load();
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    const options = form.options
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
    const tags = parseListText(form.tags);
    const abilities = parseListText(form.abilities);

    await fetch("/api/admin/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject: form.subject,
        grade: form.grade,
        knowledgePointId: form.knowledgePointId,
        stem: form.stem,
        options,
        answer: form.answer,
        explanation: form.explanation,
        difficulty: form.difficulty,
        questionType: form.questionType,
        tags,
        abilities
      })
    });

    setForm({
      subject: form.subject,
      grade: form.grade,
      knowledgePointId: form.knowledgePointId,
      stem: "",
      options: "",
      answer: "",
      explanation: "",
      difficulty: form.difficulty,
      questionType: form.questionType,
      tags: "",
      abilities: ""
    });
    load();
  }

  async function handleDelete(id: string) {
    await fetch(`/api/admin/questions/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="grid" style={{ gap: 18 }}>
      <div className="section-head">
        <div>
          <h2>题库管理</h2>
          <div className="section-sub">CSV 导入、AI 出题与题库维护。</div>
        </div>
        <span className="chip">管理端</span>
      </div>

      <Card title="批量导入题库（CSV）" tag="导入">
        <p style={{ color: "var(--ink-1)", fontSize: 13 }}>
          支持 CSV 导入。若是 Excel，请先另存为 CSV。
        </p>
        <div className="cta-row">
          <button className="button secondary" type="button" onClick={downloadTemplate}>
            下载模板
          </button>
          <label className="button primary" style={{ cursor: "pointer" }}>
            选择 CSV 文件
            <input
              type="file"
              accept=".csv"
              style={{ display: "none" }}
              onChange={(event) => handleImport(event.target.files?.[0])}
            />
          </label>
        </div>
        {importMessage ? <div style={{ marginTop: 8 }}>{importMessage}</div> : null}
        {importErrors.length ? (
          <div style={{ marginTop: 8, color: "#b42318", fontSize: 13 }}>
            {importErrors.slice(0, 5).map((err) => (
              <div key={err}>{err}</div>
            ))}
          </div>
        ) : null}
      </Card>
      <Card title="AI 生成题目" tag="AI">
        <p style={{ color: "var(--ink-1)", fontSize: 13 }}>
          需要配置 LLM（如智谱），系统会按知识点自动生成选择题。
        </p>
        <form onSubmit={handleGenerate} style={{ display: "grid", gap: 12, marginTop: 12 }}>
          <label>
            <div className="section-title">生成模式</div>
            <select
              value={aiForm.mode}
              onChange={(event) => setAiForm({ ...aiForm, mode: event.target.value })}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
            >
              <option value="single">单知识点生成</option>
              <option value="batch">批量生成（按知识点分配）</option>
            </select>
          </label>
          <label>
            <div className="section-title">学科</div>
            <select
              value={aiForm.subject}
              onChange={(event) => setAiForm({ ...aiForm, subject: event.target.value })}
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
              value={aiForm.grade}
              onChange={(event) => setAiForm({ ...aiForm, grade: event.target.value })}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
            >
              {GRADE_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          {aiForm.mode === "single" ? (
            <label>
              <div className="section-title">知识点</div>
              <select
                value={aiForm.knowledgePointId}
                onChange={(event) => setAiForm({ ...aiForm, knowledgePointId: event.target.value })}
                style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
              >
                {aiKnowledgePoints.map((kp) => (
                  <option value={kp.id} key={kp.id}>
                    {kp.title} ({kp.grade}年级)
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label>
              <div className="section-title">章节筛选（可选）</div>
              <select
                value={aiForm.chapter}
                onChange={(event) => setAiForm({ ...aiForm, chapter: event.target.value })}
                style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
              >
                {chapterOptions.length === 0 ? <option value="">暂无章节</option> : null}
                {chapterOptions.map((chapter) => (
                  <option value={chapter} key={chapter}>
                    {chapter}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            <div className="section-title">难度</div>
            <select
              value={aiForm.difficulty}
              onChange={(event) => setAiForm({ ...aiForm, difficulty: event.target.value })}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
            >
              <option value="easy">简单</option>
              <option value="medium">适中</option>
              <option value="hard">困难</option>
            </select>
          </label>
          <label>
            <div className="section-title">
              生成题量（{aiForm.mode === "single" ? "1-5" : "10-50"}）
            </div>
            <input
              type="number"
              min={aiForm.mode === "single" ? 1 : 10}
              max={aiForm.mode === "single" ? 5 : 50}
              value={aiForm.count}
              onChange={(event) => setAiForm({ ...aiForm, count: Number(event.target.value) })}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
            />
          </label>
          <button className="button primary" type="submit" disabled={aiLoading}>
            {aiLoading ? "生成中..." : "开始生成"}
          </button>
        </form>
        {aiMessage ? <div style={{ marginTop: 8 }}>{aiMessage}</div> : null}
        {aiErrors.length ? (
          <div style={{ marginTop: 8, color: "#b42318", fontSize: 13 }}>
            {aiErrors.slice(0, 5).map((err) => (
              <div key={err}>{err}</div>
            ))}
          </div>
        ) : null}
      </Card>
      <Card title="新增题目" tag="新增">
        <form onSubmit={handleCreate} style={{ display: "grid", gap: 12 }}>
          <label>
            <div className="section-title">学科</div>
            <select
              value={form.subject}
              onChange={(event) => setForm({ ...form, subject: event.target.value })}
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
              value={form.grade}
              onChange={(event) => setForm({ ...form, grade: event.target.value })}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
            >
              {GRADE_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <div className="section-title">知识点</div>
            <select
              value={form.knowledgePointId}
              onChange={(event) => setForm({ ...form, knowledgePointId: event.target.value })}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
            >
              {knowledgePoints.map((kp) => (
                <option value={kp.id} key={kp.id}>
                  {kp.title} ({kp.grade}年级)
                </option>
              ))}
            </select>
          </label>
          <label>
            <div className="section-title">难度</div>
            <select
              value={form.difficulty}
              onChange={(event) => setForm({ ...form, difficulty: event.target.value })}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
            >
              <option value="easy">简单</option>
              <option value="medium">适中</option>
              <option value="hard">困难</option>
            </select>
          </label>
          <label>
            <div className="section-title">题型</div>
            <select
              value={form.questionType}
              onChange={(event) => setForm({ ...form, questionType: event.target.value })}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
            >
              <option value="choice">选择题</option>
              <option value="fill">填空题</option>
              <option value="short">简答题</option>
            </select>
          </label>
          <label>
            <div className="section-title">题干</div>
            <textarea
              value={form.stem}
              onChange={(event) => setForm({ ...form, stem: event.target.value })}
              rows={3}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
            />
          </label>
          <label>
            <div className="section-title">选项（每行一个）</div>
            <textarea
              value={form.options}
              onChange={(event) => setForm({ ...form, options: event.target.value })}
              rows={4}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
            />
          </label>
          <label>
            <div className="section-title">答案</div>
            <input
              value={form.answer}
              onChange={(event) => setForm({ ...form, answer: event.target.value })}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
            />
          </label>
          <label>
            <div className="section-title">解析</div>
            <textarea
              value={form.explanation}
              onChange={(event) => setForm({ ...form, explanation: event.target.value })}
              rows={3}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
            />
          </label>
          <label>
            <div className="section-title">标签（逗号或 | 分隔）</div>
            <input
              value={form.tags}
              onChange={(event) => setForm({ ...form, tags: event.target.value })}
              placeholder="如：分数, 图形"
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
            />
          </label>
          <label>
            <div className="section-title">能力维度（逗号或 | 分隔）</div>
            <input
              value={form.abilities}
              onChange={(event) => setForm({ ...form, abilities: event.target.value })}
              placeholder="如：计算, 理解"
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
            />
          </label>
          <button className="button primary" type="submit">
            保存
          </button>
        </form>
      </Card>

      <Card title="题目列表" tag="列表">
        {loading ? <p>加载中...</p> : null}
        <div className="grid" style={{ gap: 8 }}>
          {list.map((item) => (
            <div className="card" key={item.id}>
              {(() => {
                const quality = qualityMap[item.id];
                return quality ? (
                  <div style={{ marginBottom: 6, display: "flex", flexWrap: "wrap", gap: 6 }}>
                    <span className="badge">质量分 {quality.qualityScore}</span>
                    <span className="badge">重复风险 {riskLabel[quality.duplicateRisk]}</span>
                    <span className="badge">歧义风险 {riskLabel[quality.ambiguityRisk]}</span>
                    <span className="badge">答案一致性 {quality.answerConsistency}</span>
                  </div>
                ) : null;
              })()}
              <div className="section-title">{item.stem}</div>
              <div style={{ fontSize: 12, color: "var(--ink-1)" }}>
                {SUBJECT_LABELS[item.subject] ?? item.subject} · {item.grade} 年级 · 难度{" "}
                {difficultyLabel[item.difficulty ?? "medium"] ?? item.difficulty ?? "中"} · 题型{" "}
                {questionTypeLabel[item.questionType ?? "choice"] ?? item.questionType ?? "选择题"} · 选项{" "}
                {item.options.length} 个
              </div>
              {item.tags?.length ? (
                <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {item.tags.map((tag) => (
                    <span className="badge" key={`${item.id}-${tag}`}>
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
              <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                <div className="badge">答案：{item.answer}</div>
                <button className="button secondary" onClick={() => handleDelete(item.id)}>
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
