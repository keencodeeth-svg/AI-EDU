"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Card from "@/components/Card";
import MathViewControls from "@/components/MathViewControls";
import { trackEvent } from "@/lib/analytics-client";
import { useMathViewSettings } from "@/lib/math-view-settings";
import PracticeGuideCard from "./_components/PracticeGuideCard";
import PracticeMobileActionBar from "./_components/PracticeMobileActionBar";
import PracticeQuestionCard from "./_components/PracticeQuestionCard";
import PracticeResultCard from "./_components/PracticeResultCard";
import PracticeSettingsCard from "./_components/PracticeSettingsCard";
import { PracticeVariantAnalysisCard, PracticeVariantTrainingCard } from "./_components/PracticeVariantCards";
import { PRACTICE_MODE_LABELS, STUDENT_PRACTICE_GUIDE_KEY } from "./config";
import type {
  ExplainPack,
  KnowledgePoint,
  KnowledgePointGroup,
  PracticeMode,
  PracticeQuickFixAction,
  PracticeResult,
  Question,
  VariantPack
} from "./types";
import { usePracticeGuide } from "./usePracticeGuide";

export default function PracticePage() {
  const searchParams = useSearchParams();
  const trackedPracticePageView = useRef(false);
  const questionCardRef = useRef<HTMLDivElement | null>(null);
  const resultCardRef = useRef<HTMLDivElement | null>(null);
  const [subject, setSubject] = useState("math");
  const [grade, setGrade] = useState("4");
  const [knowledgePoints, setKnowledgePoints] = useState<KnowledgePoint[]>([]);
  const [knowledgePointId, setKnowledgePointId] = useState<string | undefined>(undefined);
  const [knowledgeSearch, setKnowledgeSearch] = useState("");
  const [mode, setMode] = useState<PracticeMode>("normal");
  const [question, setQuestion] = useState<Question | null>(null);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<PracticeResult | null>(null);
  const [challengeCount, setChallengeCount] = useState(0);
  const [challengeCorrect, setChallengeCorrect] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [questionLoading, setQuestionLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [autoFixing, setAutoFixing] = useState(false);
  const [autoFixHint, setAutoFixHint] = useState<string | null>(null);
  const [variantPack, setVariantPack] = useState<VariantPack | null>(null);
  const [variantAnswers, setVariantAnswers] = useState<Record<number, string>>({});
  const [variantResults, setVariantResults] = useState<Record<number, boolean | null>>({});
  const [loadingVariants, setLoadingVariants] = useState(false);
  const [favorite, setFavorite] = useState<{ tags: string[] } | null>(null);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [explainMode, setExplainMode] = useState<"text" | "visual" | "analogy">("text");
  const [explainPack, setExplainPack] = useState<ExplainPack | null>(null);
  const [explainLoading, setExplainLoading] = useState(false);
  const mathView = useMathViewSettings("student-practice");
  const { showPracticeGuide, hidePracticeGuide, showPracticeGuideAgain } = usePracticeGuide(STUDENT_PRACTICE_GUIDE_KEY);

  useEffect(() => {
    fetch("/api/knowledge-points")
      .then((res) => res.json())
      .then((data) => setKnowledgePoints(data.data ?? []));
  }, []);

  useEffect(() => {
    if (trackedPracticePageView.current) return;
    trackEvent({
      eventName: "practice_page_view",
      page: "/practice",
      subject,
      grade,
      props: { mode }
    });
    trackedPracticePageView.current = true;
  }, [subject, grade, mode]);

  useEffect(() => {
    const next = searchParams.get("mode");
    if (!next) return;
    if (["normal", "challenge", "timed", "wrong", "adaptive", "review"].includes(next)) {
      setMode(next as typeof mode);
    }
  }, [searchParams]);

  async function requestQuestion(next: { subject: string; grade: string; knowledgePointId?: string; mode: PracticeMode }) {
    if (next.mode === "timed" && timeLeft === 0) {
      setTimeLeft(60);
      setTimerRunning(true);
    }
    const res = await fetch("/api/practice/next", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next)
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data?.error ?? "暂无题目");
      setQuestion(null);
      return false;
    }
    setError(null);
    setQuestion(data.question ?? null);
    setAnswer("");
    setResult(null);
    setFavorite(null);
    setVariantPack(null);
    setVariantAnswers({});
    setVariantResults({});
    setExplainPack(null);
    setExplainMode("text");
    return true;
  }

  async function loadQuestion() {
    if (questionLoading || submitting || autoFixing) return;
    setQuestionLoading(true);
    try {
      await requestQuestion({
        subject,
        grade,
        knowledgePointId,
        mode
      });
    } finally {
      setQuestionLoading(false);
    }
  }

  async function applyPracticeQuickFix(action: PracticeQuickFixAction) {
    if (autoFixing) return;
    const next = {
      subject,
      grade,
      knowledgePointId,
      mode
    };
    let hint = "";
    if (action === "clear_filters") {
      next.knowledgePointId = undefined;
      setKnowledgePointId(undefined);
      setKnowledgeSearch("");
      hint = "已清空知识点筛选，正在重新获取题目。";
    } else if (action === "switch_normal") {
      next.mode = "normal";
      setMode("normal");
      setTimeLeft(0);
      setTimerRunning(false);
      hint = "已切换到普通练习模式，正在重新获取题目。";
    } else if (action === "switch_adaptive") {
      next.mode = "adaptive";
      setMode("adaptive");
      setTimeLeft(0);
      setTimerRunning(false);
      hint = "已切换到自适应推荐模式，正在重新获取题目。";
    }
    setAutoFixHint(hint);
    setAutoFixing(true);
    try {
      await requestQuestion(next);
    } finally {
      setAutoFixing(false);
    }
  }

  async function submitAnswer() {
    if (!question || !answer || submitting || questionLoading) return;
    const startedAt = Date.now();
    setSubmitting(true);
    try {
      const res = await fetch("/api/practice/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: question.id, answer })
      });
      const data = await res.json();

      if (!res.ok) {
        const errorMessage = data?.error ?? "提交失败";
        setError(errorMessage);
        trackEvent({
          eventName: "practice_submit_fail",
          page: "/practice",
          subject,
          grade,
          entityId: question.id,
          props: {
            mode,
            status: res.status,
            error: errorMessage,
            durationMs: Date.now() - startedAt
          }
        });
        return;
      }

      setError(null);
      setResult({
        correct: data.correct,
        explanation: data.explanation,
        answer: data.answer,
        masteryScore: data.masteryScore,
        masteryDelta: data.masteryDelta,
        confidenceScore: data?.mastery?.confidenceScore,
        recencyWeight: data?.mastery?.recencyWeight,
        masteryTrend7d: data?.mastery?.masteryTrend7d,
        weaknessRank: data?.weaknessRank ?? data?.mastery?.weaknessRank ?? null
      });
      trackEvent({
        eventName: "practice_submit_success",
        page: "/practice",
        subject,
        grade,
        entityId: question.id,
        props: {
          mode,
          correct: Boolean(data.correct),
          durationMs: Date.now() - startedAt
        }
      });

      if (mode === "challenge") {
        setChallengeCount((prev) => prev + 1);
        setChallengeCorrect((prev) => prev + (data.correct ? 1 : 0));
      }
    } catch {
      setError("提交失败");
      trackEvent({
        eventName: "practice_submit_fail",
        page: "/practice",
        subject,
        grade,
        entityId: question.id,
        props: {
          mode,
          error: "network error",
          durationMs: Date.now() - startedAt
        }
      });
    } finally {
      setSubmitting(false);
    }
  }

  const loadExplainPack = useCallback(async (questionId: string) => {
    setExplainLoading(true);
    const res = await fetch("/api/practice/explanation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setExplainPack(null);
      setError(data?.error ?? data?.message ?? "AI 讲解生成失败");
      setExplainLoading(false);
      return;
    }
    setExplainPack(data?.data ?? null);
    setExplainLoading(false);
  }, []);

  const loadFavorite = useCallback(async (questionId: string) => {
    const res = await fetch(`/api/favorites/${questionId}`);
    const data = await res.json();
    setFavorite(data?.data ? { tags: data.data.tags ?? [] } : null);
  }, []);

  async function toggleFavorite() {
    if (!question) return;
    setFavoriteLoading(true);
    if (favorite) {
      await fetch(`/api/favorites/${question.id}`, { method: "DELETE" });
      setFavorite(null);
    } else {
      const res = await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: question.id, tags: [] })
      });
      const data = await res.json();
      setFavorite(data?.data ? { tags: data.data.tags ?? [] } : null);
    }
    setFavoriteLoading(false);
  }

  async function editFavoriteTags() {
    if (!question) return;
    const input = prompt("输入标签（用逗号分隔）", favorite?.tags?.join(",") ?? "");
    if (input === null) return;
    const tags = input
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    const res = await fetch(`/api/favorites/${question.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags })
    });
    const data = await res.json();
    setFavorite(data?.data ? { tags: data.data.tags ?? [] } : null);
  }

  async function loadVariants() {
    if (!question) return;
    setLoadingVariants(true);
    const res = await fetch("/api/practice/variants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId: question.id, studentAnswer: answer })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data?.error ?? data?.message ?? "变式生成失败，请稍后重试");
      setLoadingVariants(false);
      return;
    }
    setVariantPack({
      analysis: data?.data?.explanation?.analysis ?? "",
      hints: data?.data?.explanation?.hints ?? [],
      variants: data?.data?.variants ?? []
    });
    setVariantAnswers({});
    setVariantResults({});
    setLoadingVariants(false);
  }

  const filtered = useMemo(
    () =>
      knowledgePoints
        .filter((kp) => kp.subject === subject && kp.grade === grade)
        .sort((a, b) => {
          const unitA = a.unit ?? "未分单元";
          const unitB = b.unit ?? "未分单元";
          if (unitA !== unitB) return unitA.localeCompare(unitB, "zh-CN");
          const chapterA = a.chapter ?? "未分章节";
          const chapterB = b.chapter ?? "未分章节";
          if (chapterA !== chapterB) return chapterA.localeCompare(chapterB, "zh-CN");
          return a.title.localeCompare(b.title, "zh-CN");
        }),
    [knowledgePoints, subject, grade]
  );

  const filteredKnowledgePoints = useMemo(() => {
    const keyword = knowledgeSearch.trim().toLowerCase();
    if (!keyword) return filtered;
    return filtered.filter((kp) => {
      const title = kp.title.toLowerCase();
      const chapter = (kp.chapter ?? "").toLowerCase();
      const unit = (kp.unit ?? "").toLowerCase();
      return title.includes(keyword) || chapter.includes(keyword) || unit.includes(keyword);
    });
  }, [filtered, knowledgeSearch]);

  const groupedKnowledgePoints = useMemo(() => {
    const groupMap = new Map<string, KnowledgePointGroup>();
    filteredKnowledgePoints.forEach((kp) => {
      const unit = kp.unit ?? "未分单元";
      const chapter = kp.chapter ?? "未分章节";
      const key = `${unit}__${chapter}`;
      const current = groupMap.get(key) ?? { unit, chapter, items: [] };
      current.items.push(kp);
      groupMap.set(key, current);
    });
    return Array.from(groupMap.values());
  }, [filteredKnowledgePoints]);

  useEffect(() => {
    if (!knowledgePointId) return;
    if (!filtered.find((kp) => kp.id === knowledgePointId)) {
      setKnowledgePointId(undefined);
    }
  }, [filtered, knowledgePointId]);

  useEffect(() => {
    if (!timerRunning) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setTimerRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timerRunning]);

  const questionId = question?.id;
  const resultAnswer = result?.answer;

  useEffect(() => {
    if (!questionId) return;
    loadFavorite(questionId);
  }, [loadFavorite, questionId]);

  useEffect(() => {
    if (!questionId || !resultAnswer) return;
    loadExplainPack(questionId);
  }, [loadExplainPack, questionId, resultAnswer]);

  useEffect(() => {
    if (!questionId || questionLoading) return;
    questionCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [questionId, questionLoading]);

  useEffect(() => {
    if (!result) return;
    resultCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [result]);

  function resetChallenge() {
    setChallengeCount(0);
    setChallengeCorrect(0);
  }

  const selectedKnowledgeTitle = useMemo(() => {
    if (!knowledgePointId) return "全部知识点";
    const current = filtered.find((kp) => kp.id === knowledgePointId);
    return current?.title ?? "全部知识点";
  }, [filtered, knowledgePointId]);

  const canSubmitCurrentQuestion = Boolean(question && answer && !result && !(mode === "timed" && timeLeft === 0));

  const stageTitle = result
    ? result.correct
      ? "这题已经吃透，继续下一题最省时间"
      : "先把这题吸收掉，再继续往前推"
    : questionLoading
      ? "正在按你的设置准备题目"
      : question
        ? "题目已准备好，选答案后就能提交"
        : "先选模式与知识点，再开始练习";

  const stageDescription = result
    ? result.correct
      ? "建议保持答题节奏，继续下一题；如果想更稳，也可以做一组变式巩固。"
      : "建议先看 AI 讲解，再做变式训练；错题不要急着跳过，吸收后进步更快。"
    : questionLoading
      ? "系统会根据当前模式、学科、年级和知识点重新生成更合适的题目。"
      : question
        ? "这一步只需要完成一次选择并提交，系统会自动给出解析和掌握度变化。"
        : "最顺手的练习节奏是：选模式 → 获取题目 → 提交答案 → 看解析 → 做变式训练。";

  const stageBusy = questionLoading || submitting || autoFixing;

  function handleModeChange(next: PracticeMode) {
    setMode(next);
    setResult(null);
    setQuestion(null);
    setAnswer("");
    setTimeLeft(0);
    setTimerRunning(false);
    setVariantPack(null);
    setVariantAnswers({});
    setVariantResults({});
    resetChallenge();
  }

  return (
    <div className="grid math-view-surface practice-page" style={{ gap: 18, ...mathView.style }}>
      <div className="section-head">
        <div>
          <h2>智能练习</h2>
          <div className="section-sub">个性化练习 + AI 讲解 + 变式训练。</div>
        </div>
        <span className="chip">{PRACTICE_MODE_LABELS[mode] ?? "练习模式"}</span>
      </div>
      <MathViewControls
        fontScale={mathView.fontScale}
        lineMode={mathView.lineMode}
        onDecrease={mathView.decreaseFontScale}
        onIncrease={mathView.increaseFontScale}
        onReset={mathView.resetView}
        onLineModeChange={mathView.setLineMode}
      />

      <PracticeGuideCard visible={showPracticeGuide} onHide={hidePracticeGuide} onShow={showPracticeGuideAgain} />

      <div id="practice-settings">
        <PracticeSettingsCard
          subject={subject}
          grade={grade}
          mode={mode}
          knowledgeSearch={knowledgeSearch}
          knowledgePointId={knowledgePointId}
          groupedKnowledgePoints={groupedKnowledgePoints}
          filteredKnowledgePointsCount={filteredKnowledgePoints.length}
          filteredCount={filtered.length}
          selectedKnowledgeTitle={selectedKnowledgeTitle}
          error={error}
          autoFixHint={autoFixHint}
          autoFixing={autoFixing}
          questionLoading={questionLoading}
          submitting={submitting}
          questionVisible={Boolean(question)}
          resultVisible={Boolean(result)}
          stageTitle={stageTitle}
          stageDescription={stageDescription}
          timeLeft={timeLeft}
          challengeCount={challengeCount}
          challengeCorrect={challengeCorrect}
          onSubjectChange={setSubject}
          onGradeChange={setGrade}
          onModeChange={handleModeChange}
          onKnowledgeSearchChange={setKnowledgeSearch}
          onKnowledgePointChange={setKnowledgePointId}
          onLoadQuestion={loadQuestion}
          onQuickFix={applyPracticeQuickFix}
        />
      </div>

      {question ? (
        <div id="practice-question" ref={questionCardRef}>
          <PracticeQuestionCard
            question={question}
            answer={answer}
            favorite={favorite}
            favoriteLoading={favoriteLoading}
            canSubmit={canSubmitCurrentQuestion}
            questionLoading={questionLoading}
            submitting={submitting}
            onAnswerChange={setAnswer}
            onToggleFavorite={toggleFavorite}
            onEditFavoriteTags={editFavoriteTags}
            onLoadQuestion={loadQuestion}
            onSubmit={submitAnswer}
          />
        </div>
      ) : null}

      {result ? (
        <div id="practice-result" ref={resultCardRef}>
          <PracticeResultCard
            result={result}
            explainMode={explainMode}
            explainPack={explainPack}
            explainLoading={explainLoading}
            loadingVariants={loadingVariants}
            questionLoading={questionLoading}
            hasVariants={Boolean(variantPack?.variants?.length)}
            onExplainModeChange={setExplainMode}
            onLoadVariants={loadVariants}
            onLoadNextQuestion={loadQuestion}
          />
        </div>
      ) : null}

      {variantPack ? <PracticeVariantAnalysisCard variantPack={variantPack} /> : null}

      {variantPack?.variants?.length ? (
        <PracticeVariantTrainingCard
          variantPack={variantPack}
          variantAnswers={variantAnswers}
          variantResults={variantResults}
          onAnswerChange={(index, value) =>
            setVariantAnswers((prev) => ({
              ...prev,
              [index]: value
            }))
          }
          onSubmit={(index, selected, correctAnswer) =>
            setVariantResults((prev) => ({
              ...prev,
              [index]: selected === correctAnswer
            }))
          }
        />
      ) : null}

      {mode === "challenge" && challengeCount >= 5 ? (
        <Card title="闯关结果" tag="成果">
          <p className="practice-challenge-result">本次闯关正确 {challengeCorrect} / 5</p>
          <button className="button secondary" type="button" onClick={resetChallenge}>
            再来一次
          </button>
        </Card>
      ) : null}

      <PracticeMobileActionBar
        questionVisible={Boolean(question)}
        resultVisible={Boolean(result)}
        canSubmit={canSubmitCurrentQuestion}
        timedMode={mode === "timed"}
        busy={stageBusy}
        loadingVariants={loadingVariants}
        hasVariants={Boolean(variantPack?.variants?.length)}
        onLoadQuestion={loadQuestion}
        onSubmit={submitAnswer}
        onLoadVariants={loadVariants}
      />
    </div>
  );
}
