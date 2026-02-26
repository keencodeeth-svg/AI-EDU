"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Card from "@/components/Card";
import EduIcon from "@/components/EduIcon";
import { SUBJECT_LABELS } from "@/lib/constants";

type LibraryItem = {
  id: string;
  title: string;
  description?: string;
  contentType: "textbook" | "courseware" | "lesson_plan";
  subject: string;
  grade: string;
  accessScope: "global" | "class";
  sourceType: "file" | "link" | "text";
  classId?: string;
  generatedByAi: boolean;
  createdAt: string;
  extractedKnowledgePoints: string[];
};

type ClassItem = {
  id: string;
  name: string;
  subject: string;
  grade: string;
};

type BatchImportSummary = {
  textbooksTotal: number;
  textbooksImported: number;
  textbooksFailed: number;
  questionsTotal: number;
  questionsImported: number;
  questionsFailed: number;
  knowledgePointsCreated: number;
};

function buildBatchImportTemplate() {
  return {
    options: {
      autoCreateKnowledgePoint: true,
      skipExistingQuestionStem: true
    },
    textbooks: [
      {
        title: "四年级数学 上册 第一单元",
        description: "示例教材文本",
        contentType: "textbook",
        subject: "math",
        grade: "4",
        sourceType: "text",
        textContent: "第一单元内容示例：四则运算...",
        accessScope: "global"
      }
    ],
    questions: [
      {
        subject: "math",
        grade: "4",
        knowledgePointTitle: "四则运算",
        chapter: "第一单元",
        stem: "12 + 18 = ?",
        options: ["20", "28", "30", "32"],
        answer: "30",
        explanation: "把十位和个位分别相加。",
        difficulty: "easy",
        questionType: "choice",
        tags: ["计算", "基础"],
        abilities: ["运算能力"]
      }
    ]
  };
}

function contentTypeLabel(type: string) {
  if (type === "courseware") return "课件";
  if (type === "lesson_plan") return "教案";
  return "教材";
}

function toBase64(file: File) {
  return new Promise<{ base64: string; mimeType: string; fileName: string; size: number }>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve({
        base64,
        mimeType: file.type || "application/octet-stream",
        fileName: file.name,
        size: file.size
      });
    };
    reader.onerror = () => reject(new Error("read file failed"));
    reader.readAsDataURL(file);
  });
}

export default function LibraryPage() {
  const [user, setUser] = useState<any>(null);
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [importForm, setImportForm] = useState({
    title: "",
    description: "",
    subject: "math",
    grade: "4",
    contentType: "textbook",
    sourceType: "text",
    textContent: "",
    linkUrl: ""
  });
  const [importFile, setImportFile] = useState<File | null>(null);
  const [batchFile, setBatchFile] = useState<File | null>(null);
  const [batchPreview, setBatchPreview] = useState<{
    textbooks: number;
    questions: number;
  } | null>(null);
  const [batchSummary, setBatchSummary] = useState<BatchImportSummary | null>(null);
  const [batchFailedPreview, setBatchFailedPreview] = useState<string[]>([]);

  const [aiForm, setAiForm] = useState({
    classId: "",
    topic: "",
    contentType: "lesson_plan"
  });

  const loadItems = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/library");
    const data = await res.json();
    setItems(data.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => setUser(data?.data ?? null));
    loadItems();
  }, [loadItems]);

  useEffect(() => {
    if (user?.role === "teacher") {
      fetch("/api/teacher/classes")
        .then((res) => res.json())
        .then((data) => {
          const list = data.data ?? [];
          setClasses(list);
          if (!aiForm.classId && list.length) {
            setAiForm((prev) => ({ ...prev, classId: list[0].id }));
          }
        });
    }
  }, [aiForm.classId, user?.role]);

  const grouped = useMemo(() => {
    return {
      textbook: items.filter((item) => item.contentType === "textbook"),
      courseware: items.filter((item) => item.contentType === "courseware"),
      lessonPlan: items.filter((item) => item.contentType === "lesson_plan")
    };
  }, [items]);

  async function submitImport(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    if (user?.role !== "admin") return;

    const payload: any = {
      ...importForm
    };

    if (importForm.sourceType === "file") {
      if (!importFile) {
        setError("请先选择文件");
        return;
      }
      const file = await toBase64(importFile);
      payload.fileName = file.fileName;
      payload.mimeType = file.mimeType;
      payload.size = file.size;
      payload.contentBase64 = file.base64;
      payload.textContent = "";
      payload.linkUrl = "";
    } else if (importForm.sourceType === "link") {
      if (!importForm.linkUrl.trim()) {
        setError("请填写链接");
        return;
      }
      payload.textContent = "";
    } else {
      if (!importForm.textContent.trim()) {
        setError("请填写教材内容");
        return;
      }
      payload.linkUrl = "";
    }

    const res = await fetch("/api/admin/library", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data?.error ?? "导入失败");
      return;
    }
    setMessage("教材导入成功");
    setImportForm((prev) => ({ ...prev, title: "", description: "", textContent: "", linkUrl: "" }));
    setImportFile(null);
    await loadItems();
  }

  function downloadBatchTemplate() {
    const blob = new Blob([JSON.stringify(buildBatchImportTemplate(), null, 2)], {
      type: "application/json;charset=utf-8"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "full-curriculum-batch-template.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function handleBatchFileChange(file?: File | null) {
    setBatchFile(file ?? null);
    setBatchSummary(null);
    setBatchFailedPreview([]);
    if (!file) {
      setBatchPreview(null);
      return;
    }
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      setBatchPreview({
        textbooks: Array.isArray(json?.textbooks) ? json.textbooks.length : 0,
        questions: Array.isArray(json?.questions) ? json.questions.length : 0
      });
    } catch {
      setBatchPreview(null);
      setError("批量文件不是合法 JSON");
    }
  }

  async function submitBatchImport(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    setBatchSummary(null);
    setBatchFailedPreview([]);
    if (user?.role !== "admin") return;
    if (!batchFile) {
      setError("请先上传批量 JSON 文件");
      return;
    }

    let payload: any = null;
    try {
      payload = JSON.parse(await batchFile.text());
    } catch {
      setError("批量文件解析失败，请检查 JSON 格式");
      return;
    }

    const res = await fetch("/api/admin/library/batch-import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data?.error ?? "批量导入失败");
      return;
    }

    const summary = data?.data?.summary ?? null;
    const textbookFailed = (data?.data?.textbooks?.failed ?? []).map(
      (item: any) => `教材#${Number(item.index) + 1}: ${item.reason}`
    );
    const questionFailed = (data?.data?.questions?.failed ?? []).map(
      (item: any) => `习题#${Number(item.index) + 1}: ${item.reason}`
    );
    setBatchSummary(summary);
    setBatchFailedPreview([...textbookFailed, ...questionFailed].slice(0, 20));
    setMessage("批量导入完成");
    await loadItems();
  }

  async function submitAiGenerate(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    if (user?.role !== "teacher") return;
    if (!aiForm.classId || !aiForm.topic.trim()) {
      setError("请先选择班级并填写主题");
      return;
    }

    const res = await fetch("/api/teacher/library/ai-generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(aiForm)
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data?.error ?? "生成失败");
      return;
    }
    setMessage("AI 资料已生成并发布");
    setAiForm((prev) => ({ ...prev, topic: "" }));
    await loadItems();
  }

  return (
    <div className="grid" style={{ gap: 18 }}>
      <div className="section-head">
        <div>
          <h2>教材与课件资料库</h2>
          <div className="section-sub">支持全局教材导入、AI 生成课件/教案、阅读与标注。</div>
        </div>
        <span className="chip">资料中心</span>
      </div>

      {user?.role === "admin" ? (
        <Card title="管理端导入教材" tag="管理">
          <form onSubmit={submitImport} style={{ display: "grid", gap: 12 }}>
            <label>
              <div className="section-title">标题</div>
              <input
                value={importForm.title}
                onChange={(event) => setImportForm((prev) => ({ ...prev, title: event.target.value }))}
                style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
              />
            </label>
            <label>
              <div className="section-title">简介</div>
              <textarea
                rows={2}
                value={importForm.description}
                onChange={(event) => setImportForm((prev) => ({ ...prev, description: event.target.value }))}
                style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
              />
            </label>
            <div className="grid grid-3">
              <label>
                <div className="section-title">学科</div>
                <select
                  value={importForm.subject}
                  onChange={(event) => setImportForm((prev) => ({ ...prev, subject: event.target.value }))}
                  style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
                >
                  {Object.entries(SUBJECT_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <div className="section-title">年级</div>
                <input
                  value={importForm.grade}
                  onChange={(event) => setImportForm((prev) => ({ ...prev, grade: event.target.value }))}
                  style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
                />
              </label>
              <label>
                <div className="section-title">类型</div>
                <select
                  value={importForm.contentType}
                  onChange={(event) => setImportForm((prev) => ({ ...prev, contentType: event.target.value }))}
                  style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
                >
                  <option value="textbook">教材</option>
                  <option value="courseware">课件</option>
                  <option value="lesson_plan">教案</option>
                </select>
              </label>
            </div>
            <label>
              <div className="section-title">导入方式</div>
              <select
                value={importForm.sourceType}
                onChange={(event) => setImportForm((prev) => ({ ...prev, sourceType: event.target.value }))}
                style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
              >
                <option value="text">粘贴文本</option>
                <option value="file">上传文件</option>
                <option value="link">外部链接</option>
              </select>
            </label>
            {importForm.sourceType === "text" ? (
              <label>
                <div className="section-title">教材文本</div>
                <textarea
                  rows={6}
                  value={importForm.textContent}
                  onChange={(event) => setImportForm((prev) => ({ ...prev, textContent: event.target.value }))}
                  style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
                />
              </label>
            ) : null}
            {importForm.sourceType === "file" ? (
              <label>
                <div className="section-title">上传文件</div>
                <input type="file" onChange={(event) => setImportFile(event.target.files?.[0] ?? null)} />
              </label>
            ) : null}
            {importForm.sourceType === "link" ? (
              <label>
                <div className="section-title">链接地址</div>
                <input
                  value={importForm.linkUrl}
                  onChange={(event) => setImportForm((prev) => ({ ...prev, linkUrl: event.target.value }))}
                  style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
                />
              </label>
            ) : null}
            <button className="button primary" type="submit">
              导入资料
            </button>
          </form>
        </Card>
      ) : null}

      {user?.role === "admin" ? (
        <Card title="全学科批量导入（教材+习题）" tag="批量">
          <div className="feature-card">
            <EduIcon name="board" />
            <p>上传 JSON 清单后，系统会批量导入教材并自动创建/质检配套习题。</p>
          </div>
          <div className="cta-row">
            <button className="button ghost" type="button" onClick={downloadBatchTemplate}>
              下载 JSON 模板
            </button>
          </div>
          <form onSubmit={submitBatchImport} style={{ display: "grid", gap: 12, marginTop: 10 }}>
            <label>
              <div className="section-title">上传批量 JSON</div>
              <input type="file" accept=".json,application/json" onChange={(event) => handleBatchFileChange(event.target.files?.[0] ?? null)} />
            </label>
            {batchPreview ? (
              <div className="card" style={{ fontSize: 12, color: "var(--ink-1)" }}>
                预览：教材 {batchPreview.textbooks} 条，习题 {batchPreview.questions} 条
              </div>
            ) : null}
            <button className="button primary" type="submit">
              开始批量导入
            </button>
          </form>
          {batchSummary ? (
            <div className="grid" style={{ gap: 8, marginTop: 12 }}>
              <div className="card">
                教材：{batchSummary.textbooksImported}/{batchSummary.textbooksTotal}，失败{" "}
                {batchSummary.textbooksFailed}
              </div>
              <div className="card">
                习题：{batchSummary.questionsImported}/{batchSummary.questionsTotal}，失败{" "}
                {batchSummary.questionsFailed}
              </div>
              <div className="card">自动创建知识点：{batchSummary.knowledgePointsCreated}</div>
              {batchFailedPreview.length ? (
                <div className="card">
                  <div className="section-title">失败样例（最多 20 条）</div>
                  <div className="grid" style={{ gap: 4, marginTop: 8 }}>
                    {batchFailedPreview.map((line, idx) => (
                      <div key={`${line}-${idx}`} style={{ fontSize: 12, color: "var(--ink-1)" }}>
                        {line}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </Card>
      ) : null}

      {user?.role === "teacher" ? (
        <Card title="AI 生成课件/教案" tag="AI">
          <div className="feature-card">
            <EduIcon name="brain" />
            <p>输入主题后自动生成，可直接给老师和学生查看。</p>
          </div>
          <form onSubmit={submitAiGenerate} style={{ display: "grid", gap: 12 }}>
            <label>
              <div className="section-title">班级</div>
              <select
                value={aiForm.classId}
                onChange={(event) => setAiForm((prev) => ({ ...prev, classId: event.target.value }))}
                style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
              >
                {classes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} · {SUBJECT_LABELS[item.subject] ?? item.subject} · {item.grade} 年级
                  </option>
                ))}
              </select>
            </label>
            <label>
              <div className="section-title">主题</div>
              <input
                value={aiForm.topic}
                onChange={(event) => setAiForm((prev) => ({ ...prev, topic: event.target.value }))}
                placeholder="例如：分数加减法综合复习"
                style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
              />
            </label>
            <label>
              <div className="section-title">生成类型</div>
              <select
                value={aiForm.contentType}
                onChange={(event) => setAiForm((prev) => ({ ...prev, contentType: event.target.value }))}
                style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
              >
                <option value="lesson_plan">教案</option>
                <option value="courseware">课件</option>
              </select>
            </label>
            <button className="button primary" type="submit">
              AI 生成并发布
            </button>
          </form>
        </Card>
      ) : null}

      {error ? <div style={{ color: "#b42318", fontSize: 13 }}>{error}</div> : null}
      {message ? <div style={{ color: "#027a48", fontSize: 13 }}>{message}</div> : null}

      <Card title="资料列表" tag="阅读">
        {loading ? <p>加载中...</p> : null}
        {!loading ? (
          <div className="grid" style={{ gap: 14 }}>
            <div className="card">
              <div className="section-title">教材（{grouped.textbook.length}）</div>
              <div className="grid" style={{ gap: 8, marginTop: 8 }}>
                {grouped.textbook.map((item) => (
                  <Link className="card" key={item.id} href={`/library/${item.id}`}>
                    <div className="section-title">{item.title}</div>
                    <div style={{ fontSize: 12, color: "var(--ink-1)" }}>
                      {SUBJECT_LABELS[item.subject] ?? item.subject} · {item.grade} 年级 ·{" "}
                      {item.accessScope === "global" ? "全局可见" : "班级可见"}
                    </div>
                  </Link>
                ))}
                {!grouped.textbook.length ? <p>暂无教材。</p> : null}
              </div>
            </div>
            <div className="card">
              <div className="section-title">课件与教案（{grouped.courseware.length + grouped.lessonPlan.length}）</div>
              <div className="grid" style={{ gap: 8, marginTop: 8 }}>
                {[...grouped.courseware, ...grouped.lessonPlan].map((item) => (
                  <Link className="card" key={item.id} href={`/library/${item.id}`}>
                    <div className="section-title">
                      {item.title} <span className="badge">{contentTypeLabel(item.contentType)}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--ink-1)" }}>
                      {SUBJECT_LABELS[item.subject] ?? item.subject} · {item.grade} 年级 ·{" "}
                      {item.generatedByAi ? "AI生成" : "人工上传"}
                    </div>
                  </Link>
                ))}
                {!grouped.courseware.length && !grouped.lessonPlan.length ? <p>暂无课件/教案。</p> : null}
              </div>
            </div>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
