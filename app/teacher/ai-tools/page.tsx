"use client";

import { useEffect, useMemo, useState } from "react";
import TeacherAiGuideCard from "./_components/TeacherAiGuideCard";
import TeacherOutlineGeneratorPanel from "./_components/TeacherOutlineGeneratorPanel";
import TeacherPaperGeneratorPanel from "./_components/TeacherPaperGeneratorPanel";
import TeacherQuestionCheckPanel from "./_components/TeacherQuestionCheckPanel";
import TeacherReviewPackPanel from "./_components/TeacherReviewPackPanel";
import TeacherWrongReviewPanel from "./_components/TeacherWrongReviewPanel";
import type {
  ClassItem,
  KnowledgePoint,
  OutlineFormState,
  OutlineResult,
  PaperFormState,
  PaperGenerationResult,
  PaperQuickFixAction,
  QuestionCheckFormState,
  QuestionCheckResult,
  ReviewPackDispatchOptions,
  ReviewPackDispatchQuality,
  ReviewPackDispatchResult,
  ReviewPackFailedItem,
  ReviewPackRelaxedItem,
  ReviewPackResult,
  ReviewPackReviewSheetItem,
  WrongReviewFormState,
  WrongReviewResult
} from "./types";

const TEACHER_AI_TOOLS_GUIDE_KEY = "guide:teacher-ai-tools:v1";

export default function TeacherAiToolsPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [knowledgePoints, setKnowledgePoints] = useState<KnowledgePoint[]>([]);
  const [paperForm, setPaperForm] = useState<PaperFormState>({
    classId: "",
    knowledgePointIds: [],
    difficulty: "all",
    questionType: "all",
    durationMinutes: 40,
    questionCount: 0,
    mode: "ai",
    includeIsolated: false
  });
  const [paperResult, setPaperResult] = useState<PaperGenerationResult | null>(null);
  const [paperError, setPaperError] = useState<string | null>(null);
  const [paperErrorSuggestions, setPaperErrorSuggestions] = useState<string[]>([]);
  const [outlineForm, setOutlineForm] = useState<OutlineFormState>({ classId: "", topic: "", knowledgePointIds: [] });
  const [outlineResult, setOutlineResult] = useState<OutlineResult | null>(null);
  const [outlineError, setOutlineError] = useState<string | null>(null);
  const [wrongForm, setWrongForm] = useState<WrongReviewFormState>({ classId: "", rangeDays: 7 });
  const [wrongResult, setWrongResult] = useState<WrongReviewResult | null>(null);
  const [wrongError, setWrongError] = useState<string | null>(null);
  const [reviewPackResult, setReviewPackResult] = useState<ReviewPackResult | null>(null);
  const [reviewPackError, setReviewPackError] = useState<string | null>(null);
  const [reviewPackAssigningId, setReviewPackAssigningId] = useState<string | null>(null);
  const [reviewPackAssigningAll, setReviewPackAssigningAll] = useState(false);
  const [reviewPackAssignMessage, setReviewPackAssignMessage] = useState<string | null>(null);
  const [reviewPackAssignError, setReviewPackAssignError] = useState<string | null>(null);
  const [reviewPackDispatchIncludeIsolated, setReviewPackDispatchIncludeIsolated] = useState(false);
  const [reviewPackDispatchQuality, setReviewPackDispatchQuality] = useState<ReviewPackDispatchQuality | null>(null);
  const [reviewPackFailedItems, setReviewPackFailedItems] = useState<ReviewPackFailedItem[]>([]);
  const [reviewPackRelaxedItems, setReviewPackRelaxedItems] = useState<ReviewPackRelaxedItem[]>([]);
  const [reviewPackRetryingFailed, setReviewPackRetryingFailed] = useState(false);
  const [showGuideCard, setShowGuideCard] = useState(true);
  const [paperAutoFixing, setPaperAutoFixing] = useState(false);
  const [paperAutoFixHint, setPaperAutoFixHint] = useState<string | null>(null);
  const [checkForm, setCheckForm] = useState<QuestionCheckFormState>({
    questionId: "",
    stem: "",
    options: ["", "", "", ""],
    answer: "",
    explanation: ""
  });
  const [checkResult, setCheckResult] = useState<QuestionCheckResult | null>(null);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/teacher/classes")
      .then((res) => res.json())
      .then((data) => setClasses(data.data ?? []));
    fetch("/api/knowledge-points")
      .then((res) => res.json())
      .then((data) => setKnowledgePoints(data.data ?? []));
  }, []);

  useEffect(() => {
    try {
      const hidden = window.localStorage.getItem(TEACHER_AI_TOOLS_GUIDE_KEY) === "hidden";
      setShowGuideCard(!hidden);
    } catch {
      setShowGuideCard(true);
    }
  }, []);

  useEffect(() => {
    if (!paperForm.classId && classes.length) {
      setPaperForm((prev) => ({ ...prev, classId: classes[0].id }));
    }
    if (!outlineForm.classId && classes.length) {
      setOutlineForm((prev) => ({ ...prev, classId: classes[0].id }));
    }
    if (!wrongForm.classId && classes.length) {
      setWrongForm((prev) => ({ ...prev, classId: classes[0].id }));
    }
  }, [classes, paperForm.classId, outlineForm.classId, wrongForm.classId]);

  const paperClass = classes.find((item) => item.id === paperForm.classId);
  const outlineClass = classes.find((item) => item.id === outlineForm.classId);

  const paperPoints = useMemo(() => {
    if (!paperClass) return [];
    return knowledgePoints.filter((kp) => kp.subject === paperClass.subject && kp.grade === paperClass.grade);
  }, [knowledgePoints, paperClass]);

  const outlinePoints = useMemo(() => {
    if (!outlineClass) return [];
    return knowledgePoints.filter((kp) => kp.subject === outlineClass.subject && kp.grade === outlineClass.grade);
  }, [knowledgePoints, outlineClass]);

  async function requestGeneratePaper(nextForm: PaperFormState) {
    setLoading(true);
    setPaperError(null);
    setPaperErrorSuggestions([]);
    const res = await fetch("/api/teacher/paper/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nextForm)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setPaperResult(null);
      setPaperError(data?.error ?? data?.message ?? "组卷失败，请稍后重试");
      setPaperErrorSuggestions(Array.isArray(data?.details?.suggestions) ? data.details.suggestions : []);
      setLoading(false);
      return false;
    }
    setPaperResult({
      questions: data?.data?.questions ?? [],
      count: data?.data?.count ?? 0,
      requestedCount: data?.data?.requestedCount ?? 0,
      diagnostics: data?.data?.diagnostics ?? null,
      qualityGovernance: data?.data?.qualityGovernance ?? null
    });
    setLoading(false);
    return true;
  }

  async function handleGeneratePaper(event: React.FormEvent) {
    event.preventDefault();
    if (!paperForm.classId) return;
    setPaperAutoFixHint(null);
    await requestGeneratePaper(paperForm);
  }

  function hideGuideCard() {
    setShowGuideCard(false);
    try {
      window.localStorage.setItem(TEACHER_AI_TOOLS_GUIDE_KEY, "hidden");
    } catch {
      // ignore localStorage errors
    }
  }

  function showGuideAgain() {
    setShowGuideCard(true);
    try {
      window.localStorage.removeItem(TEACHER_AI_TOOLS_GUIDE_KEY);
    } catch {
      // ignore localStorage errors
    }
  }

  async function applyPaperQuickFix(action: PaperQuickFixAction) {
    if (!paperForm.classId || paperAutoFixing || loading) return;
    const nextForm: PaperFormState = { ...paperForm };
    let hint = "";
    if (action === "clear_filters") {
      nextForm.knowledgePointIds = [];
      nextForm.difficulty = "all";
      nextForm.questionType = "all";
      hint = "已清空知识点/难度/题型筛选，正在重试。";
    } else if (action === "switch_ai") {
      nextForm.mode = "ai";
      hint = "已切换为 AI 补题模式，正在重试。";
    } else if (action === "reduce_count") {
      if (nextForm.questionCount <= 0) {
        nextForm.questionCount = Math.max(6, Math.floor(nextForm.durationMinutes / 3));
      } else {
        nextForm.questionCount = Math.max(5, nextForm.questionCount - 3);
      }
      hint = `已降低题量到 ${nextForm.questionCount} 题，正在重试。`;
    } else if (action === "allow_isolated") {
      nextForm.includeIsolated = true;
      hint = "已允许使用隔离池高风险题，正在重试（请人工复核）。";
    }
    setPaperForm(nextForm);
    setPaperAutoFixHint(hint);
    setPaperAutoFixing(true);
    try {
      await requestGeneratePaper(nextForm);
    } finally {
      setPaperAutoFixing(false);
    }
  }

  async function handleGenerateOutline(event: React.FormEvent) {
    event.preventDefault();
    if (!outlineForm.classId || !outlineForm.topic) return;
    setLoading(true);
    setOutlineError(null);
    const res = await fetch("/api/teacher/lesson/outline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(outlineForm)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setOutlineResult(null);
      setOutlineError(data?.error ?? data?.message ?? "生成讲稿失败，请稍后重试");
      setLoading(false);
      return;
    }
    setOutlineResult(data?.data ?? null);
    setLoading(false);
  }

  async function handleWrongReview(event: React.FormEvent) {
    event.preventDefault();
    if (!wrongForm.classId) return;
    setLoading(true);
    setWrongError(null);
    const res = await fetch("/api/teacher/lesson/wrong-review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(wrongForm)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setWrongResult(null);
      setWrongError(data?.error ?? data?.message ?? "生成讲评脚本失败，请稍后重试");
      setLoading(false);
      return;
    }
    setWrongResult(data?.data ?? null);
    setLoading(false);
  }

  async function handleReviewPack(event: React.FormEvent) {
    event.preventDefault();
    if (!wrongForm.classId) return;
    setReviewPackError(null);
    setReviewPackAssignMessage(null);
    setReviewPackAssignError(null);
    setReviewPackDispatchQuality(null);
    setReviewPackFailedItems([]);
    setReviewPackRelaxedItems([]);
    setLoading(true);
    const res = await fetch("/api/teacher/lesson/review-pack", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(wrongForm)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setReviewPackResult(null);
      setReviewPackError(data?.error ?? data?.message ?? "生成讲评包失败，请稍后重试");
      setLoading(false);
      return;
    }
    setReviewPackResult(data?.data ?? null);
    setLoading(false);
  }

  async function handleCheckQuestion(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setCheckError(null);
    const res = await fetch("/api/teacher/questions/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        questionId: checkForm.questionId || undefined,
        stem: checkForm.stem,
        options: checkForm.options,
        answer: checkForm.answer,
        explanation: checkForm.explanation
      })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setCheckResult(null);
      setCheckError(data?.error ?? data?.message ?? "题目纠错失败，请稍后重试");
      setLoading(false);
      return;
    }
    setCheckResult(data?.data ?? null);
    setLoading(false);
  }

  async function dispatchReviewPackItems(items: ReviewPackReviewSheetItem[], options?: ReviewPackDispatchOptions): Promise<ReviewPackDispatchResult> {
    const res = await fetch("/api/teacher/lesson/review-pack/dispatch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        classId: wrongForm.classId,
        items,
        includeIsolated: options?.includeIsolated ?? reviewPackDispatchIncludeIsolated,
        autoRelaxOnInsufficient: options?.autoRelaxOnInsufficient ?? false
      })
    });
    const data = await res.json();
    if (!res.ok) {
      return {
        ok: false,
        error: data?.error ?? "下发失败"
      };
    }
    return {
      ok: true,
      data: data?.data ?? null
    };
  }

  async function handleAssignReviewSheet(item: ReviewPackReviewSheetItem) {
    if (!wrongForm.classId) return;
    const assignKey = String(item?.id ?? "");
    setReviewPackAssignMessage(null);
    setReviewPackAssignError(null);
    setReviewPackFailedItems([]);
    setReviewPackRelaxedItems([]);
    setReviewPackAssigningId(assignKey);

    try {
      const result = await dispatchReviewPackItems([item]);
      if (!result.ok) {
        setReviewPackAssignError(result.error);
        return;
      }
      const summary = result.data?.summary;
      const failed = result.data?.failed ?? [];
      setReviewPackFailedItems(failed);
      setReviewPackRelaxedItems(summary?.relaxed ?? []);
      setReviewPackDispatchQuality(summary?.qualityGovernance ?? null);
      if (summary && summary.created > 0) {
        const quality = summary?.qualityGovernance;
        setReviewPackAssignMessage(
          `已下发 ${summary.created}/${summary.requested} 条，通知学生 ${summary.studentsNotified} 人，家长 ${summary.parentsNotified} 人。${
            quality && !quality.includeIsolated ? ` 已排除隔离池候选 ${quality.isolatedExcludedCount} 次。` : ""
          }${(summary?.relaxedCount ?? 0) > 0 ? ` 已自动放宽 ${summary.relaxedCount} 条。` : ""}`
        );
      } else {
        setReviewPackAssignMessage(null);
      }
      if (failed.length > 0) {
        setReviewPackAssignError(failed[0]?.reason ?? "下发失败");
      }
    } catch {
      setReviewPackAssignError("布置失败");
    } finally {
      setReviewPackAssigningId(null);
    }
  }

  async function handleAssignAllReviewSheets() {
    if (!wrongForm.classId) return;
    const items = reviewPackResult?.afterClassReviewSheet ?? [];
    if (!items.length) {
      setReviewPackAssignMessage(null);
      setReviewPackAssignError("暂无可布置的复练单");
      return;
    }
    setReviewPackAssignMessage(null);
    setReviewPackAssignError(null);
    setReviewPackFailedItems([]);
    setReviewPackRelaxedItems([]);
    setReviewPackAssigningAll(true);

    let summary = null;
    let failedItems: ReviewPackFailedItem[] = [];
    try {
      const result = await dispatchReviewPackItems(items);
      if (!result.ok) {
        setReviewPackAssignError(result.error);
        return;
      }
      summary = result.data?.summary ?? null;
      failedItems = result.data?.failed ?? [];
      setReviewPackFailedItems(failedItems);
      setReviewPackRelaxedItems(summary?.relaxed ?? []);
      setReviewPackDispatchQuality(summary?.qualityGovernance ?? null);
    } catch {
      setReviewPackAssignError("批量下发失败");
      return;
    } finally {
      setReviewPackAssigningAll(false);
    }

    if (summary && summary.created > 0) {
      const quality = summary?.qualityGovernance;
      setReviewPackAssignMessage(
        `已批量下发 ${summary.created}/${summary.requested} 条，通知学生 ${summary.studentsNotified} 人，家长 ${summary.parentsNotified} 人。${
          quality && !quality.includeIsolated ? ` 已排除隔离池候选 ${quality.isolatedExcludedCount} 次。` : ""
        }${(summary?.relaxedCount ?? 0) > 0 ? ` 已自动放宽 ${summary.relaxedCount} 条。` : ""}`
      );
    } else {
      setReviewPackAssignMessage(null);
    }

    if (failedItems.length > 0) {
      const brief = failedItems
        .slice(0, 3)
        .map((item) => `${item?.title ?? "未命名复练"}：${item?.reason ?? "下发失败"}`)
        .join("；");
      setReviewPackAssignError(`失败 ${failedItems.length} 条：${brief}`);
    } else {
      setReviewPackAssignError(null);
    }
  }

  async function handleRetryFailedReviewSheets() {
    if (!wrongForm.classId || !reviewPackFailedItems.length) return;
    const retryItems = reviewPackFailedItems
      .map((item) => item?.item)
      .filter((item): item is ReviewPackReviewSheetItem => Boolean(item));

    if (!retryItems.length) {
      setReviewPackAssignError("失败项缺少重试参数，请重新生成讲评包后再试。");
      return;
    }

    setReviewPackRetryingFailed(true);
    setReviewPackAssignMessage(null);
    setReviewPackAssignError(null);

    let summary = null;
    let failedItems: ReviewPackFailedItem[] = [];
    try {
      const result = await dispatchReviewPackItems(retryItems, {
        autoRelaxOnInsufficient: true
      });
      if (!result.ok) {
        setReviewPackAssignError(result.error);
        return;
      }
      summary = result.data?.summary ?? null;
      failedItems = result.data?.failed ?? [];
      setReviewPackFailedItems(failedItems);
      setReviewPackRelaxedItems(summary?.relaxed ?? []);
      setReviewPackDispatchQuality(summary?.qualityGovernance ?? null);
    } catch {
      setReviewPackAssignError("重试失败，请稍后再试");
      return;
    } finally {
      setReviewPackRetryingFailed(false);
    }

    if (summary && summary.created > 0) {
      setReviewPackAssignMessage(`失败项重试完成：新增下发 ${summary.created}/${summary.requested} 条，自动放宽 ${summary.relaxedCount ?? 0} 条。`);
    }

    if (failedItems.length > 0) {
      const brief = failedItems
        .slice(0, 3)
        .map((failedItem) => `${failedItem?.title ?? "未命名复练"}：${failedItem?.reason ?? "重试失败"}`)
        .join("；");
      setReviewPackAssignError(`重试后仍失败 ${failedItems.length} 条：${brief}`);
    }
  }

  const checkPreviewOptions = checkForm.options.map((item) => item.trim()).filter(Boolean);
  const hasCheckPreview = Boolean(
    checkForm.stem.trim() || checkPreviewOptions.length || checkForm.answer.trim() || checkForm.explanation.trim()
  );

  return (
    <div className="grid" style={{ gap: 18 }}>
      <div className="section-head">
        <div>
          <h2>AI 教学工具</h2>
          <div className="section-sub">一站式组卷、讲稿与纠错。</div>
        </div>
        <span className="chip">教学助手</span>
      </div>

      <TeacherAiGuideCard showGuideCard={showGuideCard} onHideGuideCard={hideGuideCard} onShowGuideAgain={showGuideAgain} />

      <TeacherPaperGeneratorPanel
        classes={classes}
        paperForm={paperForm}
        setPaperForm={setPaperForm}
        paperPoints={paperPoints}
        loading={loading}
        paperAutoFixing={paperAutoFixing}
        paperAutoFixHint={paperAutoFixHint}
        paperResult={paperResult}
        paperError={paperError}
        paperErrorSuggestions={paperErrorSuggestions}
        onGeneratePaper={handleGeneratePaper}
        onApplyPaperQuickFix={applyPaperQuickFix}
      />

      <TeacherOutlineGeneratorPanel
        classes={classes}
        outlineForm={outlineForm}
        setOutlineForm={setOutlineForm}
        outlinePoints={outlinePoints}
        loading={loading}
        outlineError={outlineError}
        outlineResult={outlineResult}
        onGenerateOutline={handleGenerateOutline}
      />

      <TeacherWrongReviewPanel
        classes={classes}
        wrongForm={wrongForm}
        setWrongForm={setWrongForm}
        loading={loading}
        wrongError={wrongError}
        wrongResult={wrongResult}
        onWrongReview={handleWrongReview}
      />

      <TeacherReviewPackPanel
        classes={classes}
        wrongForm={wrongForm}
        setWrongForm={setWrongForm}
        loading={loading}
        reviewPackError={reviewPackError}
        reviewPackResult={reviewPackResult}
        reviewPackDispatchIncludeIsolated={reviewPackDispatchIncludeIsolated}
        setReviewPackDispatchIncludeIsolated={setReviewPackDispatchIncludeIsolated}
        reviewPackAssigningAll={reviewPackAssigningAll}
        reviewPackRetryingFailed={reviewPackRetryingFailed}
        reviewPackAssigningId={reviewPackAssigningId}
        reviewPackAssignMessage={reviewPackAssignMessage}
        reviewPackAssignError={reviewPackAssignError}
        reviewPackFailedItems={reviewPackFailedItems}
        reviewPackRelaxedItems={reviewPackRelaxedItems}
        reviewPackDispatchQuality={reviewPackDispatchQuality}
        onReviewPack={handleReviewPack}
        onAssignAllReviewSheets={handleAssignAllReviewSheets}
        onRetryFailedReviewSheets={handleRetryFailedReviewSheets}
        onAssignReviewSheet={handleAssignReviewSheet}
      />

      <TeacherQuestionCheckPanel
        checkForm={checkForm}
        setCheckForm={setCheckForm}
        checkPreviewOptions={checkPreviewOptions}
        hasCheckPreview={hasCheckPreview}
        checkError={checkError}
        checkResult={checkResult}
        loading={loading}
        onCheckQuestion={handleCheckQuestion}
      />
    </div>
  );
}
