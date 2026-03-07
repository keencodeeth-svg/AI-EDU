"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { type ChangeEvent, type PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { pushAppToast } from "@/components/AppToastHub";
import Card from "@/components/Card";
import StatePanel from "@/components/StatePanel";
import MathText from "@/components/MathText";
import { trackEvent } from "@/lib/analytics-client";
import { GRADE_OPTIONS, SUBJECT_LABELS, SUBJECT_OPTIONS, getGradeLabel } from "@/lib/constants";
import { TUTOR_LAUNCH_INTENTS, TUTOR_LAUNCH_PANELS, type TutorLaunchIntent, type TutorLaunchPanel } from "@/lib/tutor-launch";
import type {
  TutorAnswer,
  TutorAnswerMode,
  TutorAskResponse,
  TutorHistoryCreatePayload,
  TutorHistoryItem,
  TutorHistoryItemResponse,
  TutorHistoryListResponse,
  TutorHistoryOrigin,
  TutorHistoryOriginFilter,
  TutorShareResultResponse,
  TutorShareTarget,
  TutorShareTargetsResponse
} from "./types";

const DEFAULT_SUBJECT = "math";
const DEFAULT_GRADE = "4";
const DEFAULT_ANSWER_MODE: TutorAnswerMode = "step_by_step";
const MAX_IMAGE_SIZE_MB = 5;
const MAX_IMAGE_COUNT = 3;
const MIN_CROP_PERCENT = 2;
const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

const ANSWER_MODE_OPTIONS = [
  {
    value: "answer_only",
    label: "只要答案",
    description: "快速核对结果，不展开步骤。"
  },
  {
    value: "step_by_step",
    label: "分步讲解",
    description: "适合完整学会这道题。"
  },
  {
    value: "hints_first",
    label: "先提示后答案",
    description: "先自己思考，再看答案。"
  }
] as const;

const HISTORY_ORIGIN_OPTIONS: Array<{ value: TutorHistoryOriginFilter; label: string }> = [
  { value: "all", label: "全部来源" },
  { value: "image", label: "图片识题" },
  { value: "text", label: "文字求解" },
  { value: "refine", label: "编辑重算" }
];

const HISTORY_ORIGIN_LABELS: Record<TutorHistoryOrigin, string> = {
  text: "文字求解",
  image: "图片识题",
  refine: "编辑重算"
};

const QUALITY_RISK_LABELS = {
  low: "低风险",
  medium: "中风险",
  high: "高风险"
} as const;

type ActiveAction = "text" | "image" | "refine" | null;
type ResultOrigin = TutorHistoryOrigin | null;
type CropSelection = { x: number; y: number; width: number; height: number };
type DragState = { index: number; startX: number; startY: number } | null;
type PreviewItem = { url: string; width: number; height: number };

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

function buildSelection(startX: number, startY: number, endX: number, endY: number): CropSelection {
  const x = clampPercent(Math.min(startX, endX));
  const y = clampPercent(Math.min(startY, endY));
  const maxX = clampPercent(Math.max(startX, endX));
  const maxY = clampPercent(Math.max(startY, endY));
  return {
    x,
    y,
    width: Math.max(0, maxX - x),
    height: Math.max(0, maxY - y)
  };
}

function hasCrop(selection: CropSelection | null | undefined) {
  return Boolean(selection && selection.width >= MIN_CROP_PERCENT && selection.height >= MIN_CROP_PERCENT);
}

function shouldRenderCrop(selection: CropSelection | null | undefined) {
  return Boolean(selection && selection.width > 0.5 && selection.height > 0.5);
}

function getCropSummary(selection: CropSelection | null | undefined) {
  if (!hasCrop(selection)) {
    return "整图上传";
  }

  return `已框选 ${Math.round(selection!.width)}% × ${Math.round(selection!.height)}%`;
}

function getPointerPercent(event: ReactPointerEvent<HTMLDivElement>) {
  const rect = event.currentTarget.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * 100;
  const y = ((event.clientY - rect.top) / rect.height) * 100;
  return {
    x: clampPercent(x),
    y: clampPercent(y)
  };
}

function getAnswerSections(answer: TutorAnswer, answerMode: TutorAnswerMode) {
  if (answerMode === "answer_only") {
    return [];
  }

  if (answerMode === "hints_first") {
    return [
      { key: "hints", title: "提示", items: answer.hints ?? [] },
      { key: "steps", title: "步骤", items: answer.steps ?? [] }
    ];
  }

  return [
    { key: "steps", title: "步骤", items: answer.steps ?? [] },
    { key: "hints", title: "提示", items: answer.hints ?? [] }
  ];
}

function readImageFromFile(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new window.Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("image load failed"));
    };
    image.src = objectUrl;
  });
}

async function cropImageFile(file: File, selection: CropSelection | null | undefined) {
  if (!hasCrop(selection)) {
    return file;
  }

  const image = await readImageFromFile(file);
  const cropX = Math.floor((image.naturalWidth * selection!.x) / 100);
  const cropY = Math.floor((image.naturalHeight * selection!.y) / 100);
  const cropWidth = Math.max(1, Math.floor((image.naturalWidth * selection!.width) / 100));
  const cropHeight = Math.max(1, Math.floor((image.naturalHeight * selection!.height) / 100));

  const canvas = document.createElement("canvas");
  canvas.width = cropWidth;
  canvas.height = cropHeight;
  const context = canvas.getContext("2d");
  if (!context) {
    return file;
  }

  context.drawImage(image, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, file.type || "image/png", 0.92);
  });

  if (!blob) {
    return file;
  }

  const dotIndex = file.name.lastIndexOf(".");
  const fileName = dotIndex >= 0 ? `${file.name.slice(0, dotIndex)}-crop${file.name.slice(dotIndex)}` : `${file.name}-crop`;
  return new File([blob], fileName, {
    type: blob.type || file.type,
    lastModified: Date.now()
  });
}

async function copyToClipboard(value: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  if (typeof document === "undefined") return;
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

function getOriginLabel(origin?: TutorHistoryOrigin | null) {
  if (!origin) return "文字求解";
  return HISTORY_ORIGIN_LABELS[origin] ?? "文字求解";
}

function getQualityToneClass(riskLevel?: "low" | "medium" | "high") {
  if (riskLevel === "high") return "error";
  if (riskLevel === "medium") return "info";
  return "success";
}

function truncateText(value: string, maxLength = 140) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength)}…`;
}

function isTutorAnswerMode(value: string | null): value is TutorAnswerMode {
  return ANSWER_MODE_OPTIONS.some((item) => item.value === value);
}

function getShareTargetActionLabel(target: TutorShareTarget) {
  return target.kind === "teacher" ? `发给老师 · ${target.name}` : `发给家长 · ${target.name}`;
}

function isTutorLaunchIntent(value: string | null): value is TutorLaunchIntent {
  return Boolean(value && TUTOR_LAUNCH_INTENTS.includes(value as TutorLaunchIntent));
}

function isTutorLaunchPanel(value: string | null): value is TutorLaunchPanel {
  return Boolean(value && TUTOR_LAUNCH_PANELS.includes(value as TutorLaunchPanel));
}

export default function TutorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const questionInputRef = useRef<HTMLTextAreaElement | null>(null);
  const launchSignatureRef = useRef("");
  const [launchMessage, setLaunchMessage] = useState<string | null>(null);
  const [launchIntent, setLaunchIntent] = useState<TutorLaunchIntent | null>(null);
  const [question, setQuestion] = useState("");
  const [subject, setSubject] = useState(DEFAULT_SUBJECT);
  const [grade, setGrade] = useState(DEFAULT_GRADE);
  const [answerMode, setAnswerMode] = useState<TutorAnswerMode>(DEFAULT_ANSWER_MODE);
  const [resultAnswerMode, setResultAnswerMode] = useState<TutorAnswerMode>(DEFAULT_ANSWER_MODE);
  const [answer, setAnswer] = useState<TutorAnswer | null>(null);
  const [editableQuestion, setEditableQuestion] = useState("");
  const [activeAction, setActiveAction] = useState<ActiveAction>(null);
  const [resultOrigin, setResultOrigin] = useState<ResultOrigin>(null);
  const [history, setHistory] = useState<TutorHistoryItem[]>([]);
  const [showFavorites, setShowFavorites] = useState(false);
  const [historyKeyword, setHistoryKeyword] = useState("");
  const [historyOriginFilter, setHistoryOriginFilter] = useState<TutorHistoryOriginFilter>("all");
  const [error, setError] = useState<string | null>(null);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [cropSelections, setCropSelections] = useState<Array<CropSelection | null>>([]);
  const [dragState, setDragState] = useState<DragState>(null);
  const [previewItems, setPreviewItems] = useState<PreviewItem[]>([]);
  const [shareTargets, setShareTargets] = useState<TutorShareTarget[]>([]);
  const [shareTargetsLoaded, setShareTargetsLoaded] = useState(false);
  const [shareTargetsLoading, setShareTargetsLoading] = useState(false);
  const [shareSubmittingTargetId, setShareSubmittingTargetId] = useState("");
  const [shareError, setShareError] = useState<string | null>(null);
  const [shareSuccess, setShareSuccess] = useState<{ threadId: string; targetName: string; reused: boolean } | null>(null);

  useEffect(() => {
    let disposed = false;
    let createdUrls: string[] = [];

    async function buildPreviewItems() {
      if (!selectedImages.length) {
        setPreviewItems([]);
        return;
      }

      const nextItems = await Promise.all(
        selectedImages.map(async (file) => {
          const image = await readImageFromFile(file);
          const url = URL.createObjectURL(file);
          createdUrls.push(url);
          return {
            url,
            width: Math.max(1, image.naturalWidth || 1200),
            height: Math.max(1, image.naturalHeight || 900)
          };
        })
      );

      if (disposed) {
        createdUrls.forEach((url) => URL.revokeObjectURL(url));
        return;
      }

      setPreviewItems(nextItems);
    }

    void buildPreviewItems();

    return () => {
      disposed = true;
      createdUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [selectedImages]);

  useEffect(() => {
    fetch("/api/ai/history")
      .then((res) => res.json())
      .then((data: TutorHistoryListResponse) => setHistory(data.data ?? []))
      .catch(() => setHistory([]));
  }, []);

  useEffect(() => {
    if (!answer || shareTargetsLoaded || shareTargetsLoading) {
      return;
    }

    let cancelled = false;

    async function loadShareTargets() {
      setShareTargetsLoading(true);
      try {
        const res = await fetch("/api/ai/share-targets", { cache: "no-store" });
        const data = (await res.json().catch(() => ({}))) as TutorShareTargetsResponse;
        if (cancelled) {
          return;
        }
        if (res.ok) {
          setShareTargets(data.data ?? []);
        } else {
          setShareTargets([]);
        }
      } catch {
        if (!cancelled) {
          setShareTargets([]);
        }
      } finally {
        if (!cancelled) {
          setShareTargetsLoaded(true);
          setShareTargetsLoading(false);
        }
      }
    }

    void loadShareTargets();
    return () => {
      cancelled = true;
    };
  }, [answer, shareTargetsLoaded, shareTargetsLoading]);

  useEffect(() => {
    const rawIntent = searchParams.get("intent");
    const rawPanel = searchParams.get("panel");
    const source = searchParams.get("source")?.trim() ?? "";
    const favoritesOnly = searchParams.get("favorites") === "1";
    const nextSubject = searchParams.get("subject");
    const nextGrade = searchParams.get("grade");
    const nextAnswerMode = searchParams.get("answerMode");
    const intent = isTutorLaunchIntent(rawIntent) ? rawIntent : null;
    const panel = isTutorLaunchPanel(rawPanel) ? rawPanel : intent === "history" ? "history" : "composer";
    const signature = [intent ?? "", panel, source, favoritesOnly ? "1" : "0", nextSubject ?? "", nextGrade ?? "", nextAnswerMode ?? ""].join("|");

    if (launchSignatureRef.current === signature) {
      return;
    }
    launchSignatureRef.current = signature;

    setLaunchIntent(intent);
    setLaunchMessage(null);
    setShowFavorites(favoritesOnly);

    if (SUBJECT_OPTIONS.some((item) => item.value === nextSubject)) {
      setSubject(nextSubject!);
    }
    if (GRADE_OPTIONS.some((item) => item.value === nextGrade)) {
      setGrade(nextGrade!);
    }
    if (isTutorAnswerMode(nextAnswerMode)) {
      setAnswerMode(nextAnswerMode);
    }

    const scrollToAnchor = (anchorId: string, focusTextInput = false) => {
      requestAnimationFrame(() => {
        document.getElementById(anchorId)?.scrollIntoView({ behavior: "smooth", block: "start" });
        if (focusTextInput) {
          questionInputRef.current?.focus();
        }
      });
    };

    if (panel === "history") {
      setLaunchMessage(favoritesOnly ? "已打开历史收藏，可直接回看并复用之前的题目。" : "已打开 AI 历史，可继续回看并复用。");
      scrollToAnchor("tutor-history-anchor");
    } else if (intent === "image") {
      setLaunchMessage("已进入拍题模式：上传题图后即可开始识题。\n建议先把题干、图形和选项完整拍入。");
      scrollToAnchor("tutor-composer-anchor");
    } else if (intent === "text") {
      setLaunchMessage("已进入文字提问模式：输入题目即可开始求解。\n如有识别误差，也可以直接用文字修正。");
      scrollToAnchor("tutor-composer-anchor", true);
    } else if (source) {
      setLaunchMessage("已从快捷入口进入 AI 辅导。");
    }

    if (source || intent || panel === "history") {
      trackEvent({
        eventName: "tutor_entry_landed",
        page: "/tutor",
        subject: SUBJECT_OPTIONS.some((item) => item.value === nextSubject) ? nextSubject ?? undefined : undefined,
        grade: GRADE_OPTIONS.some((item) => item.value === nextGrade) ? nextGrade ?? undefined : undefined,
        props: {
          source: source || "direct",
          intent,
          panel,
          favoritesOnly
        }
      });
    }
  }, [searchParams]);

  async function saveHistory(payload: TutorHistoryCreatePayload) {
    const historyRes = await fetch("/api/ai/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const historyData = (await historyRes.json().catch(() => ({}))) as TutorHistoryItemResponse;
    if (historyRes.ok && historyData.data) {
      setHistory((prev) => [historyData.data!, ...prev]);
    }
  }

  function resetShareFeedback() {
    setShareError(null);
    setShareSuccess(null);
    setShareSubmittingTargetId("");
  }

  async function handleCopy(value: string, message: string) {
    if (!value.trim()) {
      pushAppToast("暂无可复制内容", "error");
      return;
    }
    try {
      await copyToClipboard(value.trim());
      pushAppToast(message);
    } catch {
      pushAppToast("复制失败，请稍后重试", "error");
    }
  }

  function updateCropSelection(index: number, selection: CropSelection | null) {
    setCropSelections((prev) => {
      const next = [...prev];
      next[index] = selection;
      return next;
    });
  }

  function handleCropPointerDown(index: number, event: ReactPointerEvent<HTMLDivElement>) {
    if (activeAction) {
      return;
    }

    const point = getPointerPercent(event);
    updateCropSelection(index, { x: point.x, y: point.y, width: 0, height: 0 });
    setDragState({ index, startX: point.x, startY: point.y });
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleCropPointerMove(index: number, event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragState || dragState.index !== index) {
      return;
    }

    const point = getPointerPercent(event);
    updateCropSelection(index, buildSelection(dragState.startX, dragState.startY, point.x, point.y));
  }

  function finishCropPointer(index: number, event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragState || dragState.index !== index) {
      return;
    }

    const point = getPointerPercent(event);
    const nextSelection = buildSelection(dragState.startX, dragState.startY, point.x, point.y);
    updateCropSelection(index, hasCrop(nextSelection) ? nextSelection : null);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDragState(null);
  }

  async function handleAsk() {
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) return;

    resetShareFeedback();
    setActiveAction("text");
    setError(null);
    setAnswer(null);

    try {
      const res = await fetch("/api/ai/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmedQuestion, subject, grade, answerMode })
      });
      const payload = (await res.json().catch(() => ({}))) as TutorAskResponse;
      if (!res.ok) {
        setError(payload.error ?? payload.message ?? "AI 辅导暂不可用，请稍后重试");
        return;
      }

      const data = payload.data ?? payload;
      setAnswer(data);
      setResultAnswerMode(answerMode);
      setEditableQuestion(trimmedQuestion);
      setResultOrigin("text");
      if (data.answer) {
        await saveHistory({
          question: trimmedQuestion,
          answer: data.answer,
          meta: {
            origin: "text",
            subject,
            grade,
            answerMode,
            provider: data.provider,
            recognizedQuestion: trimmedQuestion,
            quality: data.quality
          }
        });
      }
    } catch {
      setError("AI 辅导暂不可用，请稍后重试");
    } finally {
      setActiveAction(null);
    }
  }

  function handleImageSelect(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;

    const invalidType = files.find((file) => !ALLOWED_IMAGE_TYPES.includes(file.type));
    if (invalidType) {
      setError("请上传 PNG、JPG 或 WebP 图片");
      return;
    }

    const oversize = files.find((file) => file.size / (1024 * 1024) > MAX_IMAGE_SIZE_MB);
    if (oversize) {
      setError(`单张图片不能超过 ${MAX_IMAGE_SIZE_MB}MB`);
      return;
    }

    const slotsLeft = Math.max(0, MAX_IMAGE_COUNT - selectedImages.length);
    const acceptedFiles = files.slice(0, slotsLeft);
    if (!acceptedFiles.length) {
      setError(`最多上传 ${MAX_IMAGE_COUNT} 张图片`);
      return;
    }

    setSelectedImages((prev) => [...prev, ...acceptedFiles]);
    setCropSelections((prev) => [...prev, ...acceptedFiles.map(() => null)]);

    if (files.length > slotsLeft) {
      setError(`最多上传 ${MAX_IMAGE_COUNT} 张图片，已为你保留前 ${MAX_IMAGE_COUNT} 张。`);
    } else {
      setError(null);
    }
  }

  function clearCropSelection(index: number) {
    updateCropSelection(index, null);
  }

  function removeSelectedImage(index: number) {
    setSelectedImages((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
    setCropSelections((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
    setDragState((prev) => (prev?.index === index ? null : prev));
    setError(null);
  }

  function clearSelectedImages() {
    setSelectedImages([]);
    setCropSelections([]);
    setDragState(null);
    setError(null);
  }

  async function handleImageAsk() {
    if (!selectedImages.length) return;

    resetShareFeedback();
    setActiveAction("image");
    setError(null);
    setAnswer(null);

    try {
      const processedImages = await Promise.all(
        selectedImages.map((file, index) => cropImageFile(file, cropSelections[index]))
      );

      const formData = new FormData();
      formData.set("subject", subject);
      formData.set("grade", grade);
      formData.set("answerMode", answerMode);
      if (question.trim()) {
        formData.set("question", question.trim());
      }
      processedImages.forEach((file) => {
        formData.append("images", file);
      });

      const res = await fetch("/api/ai/solve-from-image", {
        method: "POST",
        body: formData
      });
      const payload = (await res.json().catch(() => ({}))) as TutorAskResponse;
      if (!res.ok) {
        setError(payload.error ?? payload.message ?? "拍照识题暂不可用，请稍后重试");
        return;
      }

      const data = payload.data ?? payload;
      const recognizedQuestion = data.recognizedQuestion?.trim() || question.trim();
      setAnswer(data);
      setResultAnswerMode(answerMode);
      setEditableQuestion(recognizedQuestion);
      setResultOrigin("image");
      if (data.answer) {
        const historyQuestion =
          recognizedQuestion || `${SUBJECT_LABELS[subject] ?? subject} · ${getGradeLabel(grade)} · 图片识题`;
        await saveHistory({
          question: historyQuestion,
          answer: data.answer,
          meta: {
            origin: "image",
            subject,
            grade,
            answerMode,
            provider: data.provider,
            recognizedQuestion: recognizedQuestion || undefined,
            imageCount: processedImages.length,
            quality: data.quality
          }
        });
      }
      pushAppToast("识题完成，可继续编辑题干再重算");
    } catch {
      setError("拍照识题暂不可用，请稍后重试");
    } finally {
      setActiveAction(null);
    }
  }

  async function handleRefineSolve() {
    const trimmedQuestion = editableQuestion.trim();
    if (!trimmedQuestion) return;

    resetShareFeedback();
    setActiveAction("refine");
    setError(null);

    try {
      const res = await fetch("/api/ai/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmedQuestion, subject, grade, answerMode })
      });
      const payload = (await res.json().catch(() => ({}))) as TutorAskResponse;
      if (!res.ok) {
        setError(payload.error ?? payload.message ?? "重新求解失败，请稍后重试");
        return;
      }

      const data = payload.data ?? payload;
      setAnswer({ ...data, recognizedQuestion: trimmedQuestion });
      setResultAnswerMode(answerMode);
      setEditableQuestion(trimmedQuestion);
      setResultOrigin("refine");
      if (data.answer) {
        await saveHistory({
          question: trimmedQuestion,
          answer: data.answer,
          meta: {
            origin: "refine",
            subject,
            grade,
            answerMode,
            provider: data.provider,
            recognizedQuestion: trimmedQuestion,
            quality: data.quality
          }
        });
      }
      pushAppToast("已按编辑后的题目重新求解");
    } catch {
      setError("重新求解失败，请稍后重试");
    } finally {
      setActiveAction(null);
    }
  }

  async function handleShareResult(target: TutorShareTarget) {
    if (!answer) return;

    const composedQuestion = editableQuestion.trim() || answer.recognizedQuestion?.trim() || question.trim();
    if (!composedQuestion || !answer.answer.trim()) {
      const message = "当前结果不完整，暂时无法分享";
      setShareError(message);
      pushAppToast(message, "error");
      return;
    }

    setShareSubmittingTargetId(target.id);
    setShareError(null);
    setShareSuccess(null);

    try {
      const res = await fetch("/api/ai/share-result", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetId: target.id,
          question: composedQuestion,
          recognizedQuestion: editableQuestion.trim() || answer.recognizedQuestion?.trim() || undefined,
          answer: answer.answer,
          origin: resultOrigin ?? undefined,
          subject,
          grade,
          answerMode: resultAnswerMode,
          provider: answer.provider,
          steps: answer.steps ?? [],
          hints: answer.hints ?? [],
          quality: answer.quality
        })
      });
      const data = (await res.json().catch(() => ({}))) as TutorShareResultResponse;
      if (!res.ok || !data.data) {
        const message = data.error ?? data.message ?? "分享失败，请稍后重试";
        setShareError(message);
        pushAppToast(message, "error");
        return;
      }

      setShareSuccess({
        threadId: data.data.threadId,
        targetName: data.data.target.name,
        reused: data.data.reused
      });
      pushAppToast(data.data.reused ? `已继续发送给${data.data.target.name}` : `已发送给${data.data.target.name}`);
    } catch {
      const message = "分享失败，请稍后重试";
      setShareError(message);
      pushAppToast(message, "error");
    } finally {
      setShareSubmittingTargetId("");
    }
  }

  async function toggleFavorite(item: TutorHistoryItem) {
    const res = await fetch(`/api/ai/history/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ favorite: !item.favorite })
    });
    const data = (await res.json().catch(() => ({}))) as TutorHistoryItemResponse;
    if (data.data) {
      setHistory((prev) => prev.map((historyItem) => (historyItem.id === item.id ? data.data! : historyItem)));
      pushAppToast(item.favorite ? "已取消收藏" : "已加入收藏");
      return;
    }
    pushAppToast("更新收藏状态失败", "error");
  }

  async function editTags(item: TutorHistoryItem) {
    const input = prompt("输入标签（用逗号分隔）", item.tags.join(",") ?? "");
    if (input === null) return;
    const tags = input
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    const res = await fetch(`/api/ai/history/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags })
    });
    const data = (await res.json().catch(() => ({}))) as TutorHistoryItemResponse;
    if (data.data) {
      setHistory((prev) => prev.map((historyItem) => (historyItem.id === item.id ? data.data! : historyItem)));
      pushAppToast(tags.length ? "标签已更新" : "标签已清空");
      return;
    }
    pushAppToast("标签更新失败", "error");
  }

  async function deleteHistory(item: TutorHistoryItem) {
    const confirmed = window.confirm(`确认删除这条记录？\n\n${truncateText(item.question, 60)}`);
    if (!confirmed) return;

    const res = await fetch(`/api/ai/history/${item.id}`, { method: "DELETE" });
    if (!res.ok) {
      pushAppToast("删除失败，请稍后重试", "error");
      return;
    }

    setHistory((prev) => prev.filter((historyItem) => historyItem.id !== item.id));
    pushAppToast("记录已删除");
  }

  function reuseHistoryItem(item: TutorHistoryItem) {
    const nextQuestion = item.meta?.recognizedQuestion?.trim() || item.question.trim();
    if (item.meta?.subject) {
      setSubject(item.meta.subject);
    }
    if (item.meta?.grade) {
      setGrade(item.meta.grade);
    }
    if (item.meta?.answerMode) {
      setAnswerMode(item.meta.answerMode);
    }
    resetShareFeedback();
    setQuestion(nextQuestion);
    setEditableQuestion(nextQuestion);
    setAnswer(null);
    setResultOrigin(null);
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
    pushAppToast("已回填到提问区，可继续追问或重新求解");
  }

  const filteredHistory = useMemo(() => {
    const keyword = historyKeyword.trim().toLowerCase();
    return history.filter((item) => {
      if (showFavorites && !item.favorite) {
        return false;
      }

      const origin = item.meta?.origin ?? "text";
      if (historyOriginFilter !== "all" && origin !== historyOriginFilter) {
        return false;
      }

      if (!keyword) {
        return true;
      }

      const searchable = [
        item.question,
        item.answer,
        item.tags.join(" "),
        item.meta?.recognizedQuestion ?? "",
        item.meta?.subject ?? "",
        item.meta?.provider ?? "",
        getOriginLabel(item.meta?.origin)
      ]
        .join(" ")
        .toLowerCase();

      return searchable.includes(keyword);
    });
  }, [history, historyKeyword, historyOriginFilter, showFavorites]);

  const historyImageCount = useMemo(
    () => history.filter((item) => (item.meta?.origin ?? "text") === "image").length,
    [history]
  );
  const favoriteHistoryCount = useMemo(() => history.filter((item) => item.favorite).length, [history]);
  const teacherShareTargets = useMemo(
    () => shareTargets.filter((item) => item.kind === "teacher"),
    [shareTargets]
  );
  const parentShareTargets = useMemo(
    () => shareTargets.filter((item) => item.kind === "parent"),
    [shareTargets]
  );
  const loading = activeAction !== null;
  const answerSections = answer ? getAnswerSections(answer, resultAnswerMode) : [];
  const selectedAnswerMode = ANSWER_MODE_OPTIONS.find((item) => item.value === answerMode) ?? ANSWER_MODE_OPTIONS[1];
  const resolvedAnswerMode = ANSWER_MODE_OPTIONS.find((item) => item.value === resultAnswerMode) ?? selectedAnswerMode;

  return (
    <div className="grid" style={{ gap: 18 }}>
      <div className="section-head">
        <div>
          <h2>AI 辅导</h2>
          <div className="section-sub">文字提问、拍照识题、拖拽裁题、质量提示与历史回放。</div>
        </div>
        <span className="chip">智能讲解</span>
      </div>

      {launchMessage ? (
        <div className="status-note info" style={{ whiteSpace: "pre-line" }}>
          {launchMessage}
        </div>
      ) : null}

      <div className="grid grid-3">
        <div className="card">
          <div className="section-title">拍题建议</div>
          <div style={{ fontSize: 12, color: "var(--ink-1)", marginTop: 6 }}>题干、图形、选项尽量完整入镜，避免反光和裁切。</div>
        </div>
        <div className="card">
          <div className="section-title">结果优化</div>
          <div style={{ fontSize: 12, color: "var(--ink-1)", marginTop: 6 }}>识别后可直接改题干、切换答题模式，再重新求解。</div>
        </div>
        <div className="card">
          <div className="section-title">学习闭环</div>
          <div style={{ fontSize: 12, color: "var(--ink-1)", marginTop: 6 }}>自动保留历史、来源与质量信息，方便回看和继续追问。</div>
        </div>
      </div>

      <div id="tutor-composer-anchor" />
      <Card title="AI 辅导 / 拍照识题" tag="提问">
        <div className="grid" style={{ gap: 12 }}>
          <div className="grid grid-3">
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
            <div className="card" style={{ minHeight: 84, display: "grid", alignContent: "center" }}>
              <div className="section-title">题图状态</div>
              <div style={{ fontSize: 12, color: "var(--ink-1)" }}>
                已选 {selectedImages.length} / {MAX_IMAGE_COUNT} 张题图
              </div>
              <div style={{ fontSize: 12, color: "var(--ink-1)", marginTop: 4 }}>{selectedAnswerMode.description}</div>
            </div>
          </div>

          <div className="grid" style={{ gap: 8 }}>
            <div className="section-title">答案模式</div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 8
              }}
            >
              {ANSWER_MODE_OPTIONS.map((option) => {
                const selected = option.value === answerMode;
                return (
                  <button
                    key={option.value}
                    type="button"
                    className="button secondary"
                    aria-pressed={selected}
                    onClick={() => setAnswerMode(option.value)}
                    style={{
                      minHeight: 56,
                      justifyContent: "flex-start",
                      textAlign: "left",
                      borderColor: selected ? "var(--brand, #6366f1)" : undefined,
                      background: selected ? "rgba(99, 102, 241, 0.08)" : undefined
                    }}
                  >
                    <span style={{ display: "grid", gap: 4 }}>
                      <span style={{ fontWeight: 600 }}>{option.label}</span>
                      <span style={{ fontSize: 12, color: "var(--ink-1)" }}>{option.description}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <label>
            <div className="section-title">输入你的问题或补充说明</div>
            <textarea
              ref={questionInputRef}
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              rows={4}
              placeholder="例如：如果识别有误，请以我输入的文字为准；或者要求只给答案。"
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
            />
          </label>

          <div className="status-note" style={{ marginTop: -4 }}>
            支持一题多图，适合题干较长、图形题、选项与题干分开拍摄的场景。
          </div>

          <div
            className="card"
            style={{
              display: "grid",
              gap: 12,
              borderColor: launchIntent === "image" ? "rgba(99, 102, 241, 0.36)" : undefined,
              boxShadow: launchIntent === "image" ? "0 16px 40px rgba(99, 102, 241, 0.08)" : undefined
            }}
          >
            <div>
              <div className="section-title">拍照或上传题目图片</div>
              <div style={{ fontSize: 12, color: "var(--ink-1)", marginTop: 4 }}>
                在图片上按住并拖拽框出题目区域；不框选时默认上传原图。
              </div>
            </div>

            <div className="cta-row">
              <label className="button secondary" style={{ cursor: "pointer", minHeight: 44 }}>
                {selectedImages.length ? "继续添加图片" : "选择图片"}
                <input
                  type="file"
                  multiple
                  accept={ALLOWED_IMAGE_TYPES.join(",")}
                  capture="environment"
                  onChange={handleImageSelect}
                  style={{ display: "none" }}
                />
              </label>
              <button className="button secondary" onClick={clearSelectedImages} disabled={loading || !selectedImages.length}>
                清空图片
              </button>
              <span style={{ fontSize: 12, color: "var(--ink-1)" }}>
                最多 {MAX_IMAGE_COUNT} 张，每张不超过 {MAX_IMAGE_SIZE_MB}MB
              </span>
            </div>

            {previewItems.length ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                  gap: 12
                }}
              >
                {previewItems.map((previewItem, index) => {
                  const selection = cropSelections[index] ?? null;
                  return (
                    <div key={`${selectedImages[index]?.name ?? "preview"}-${index}`} className="card">
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                        <div className="section-title">第 {index + 1} 张 · {selectedImages[index]?.name ?? "题图"}</div>
                        <span className="pill">{getCropSummary(selection)}</span>
                      </div>

                      <div style={{ fontSize: 12, color: "var(--ink-1)", marginTop: 6, marginBottom: 8 }}>
                        可重复拖拽重新框选；如果不满意，点击“清除框选”后再试一次。
                      </div>

                      <div
                        style={{
                          position: "relative",
                          borderRadius: 16,
                          overflow: "hidden",
                          border: "1px solid var(--stroke)",
                          background: "rgba(255,255,255,0.72)"
                        }}
                      >
                        <Image
                          src={previewItem.url}
                          alt={`待识别题目预览 ${index + 1}`}
                          width={previewItem.width}
                          height={previewItem.height}
                          unoptimized
                          style={{ width: "100%", height: "auto", display: "block" }}
                        />
                        <div
                          role="presentation"
                          onPointerDown={(event) => handleCropPointerDown(index, event)}
                          onPointerMove={(event) => handleCropPointerMove(index, event)}
                          onPointerUp={(event) => finishCropPointer(index, event)}
                          onPointerCancel={(event) => finishCropPointer(index, event)}
                          style={{
                            position: "absolute",
                            inset: 0,
                            cursor: loading ? "not-allowed" : "crosshair",
                            touchAction: "none"
                          }}
                        />
                        {shouldRenderCrop(selection) ? (
                          <div
                            style={{
                              position: "absolute",
                              left: `${selection!.x}%`,
                              top: `${selection!.y}%`,
                              width: `${selection!.width}%`,
                              height: `${selection!.height}%`,
                              borderRadius: 12,
                              border: "2px solid var(--brand, #6366f1)",
                              background: "rgba(99, 102, 241, 0.14)",
                              boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.22)",
                              pointerEvents: "none"
                            }}
                          />
                        ) : null}
                      </div>

                      <div className="cta-row" style={{ marginTop: 10 }}>
                        <button
                          className="button secondary"
                          onClick={() => clearCropSelection(index)}
                          disabled={loading || !hasCrop(selection)}
                        >
                          清除框选
                        </button>
                        <button className="button secondary" onClick={() => removeSelectedImage(index)} disabled={loading}>
                          移除这张
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>

          <div className="cta-row">
            <button className={launchIntent === "image" ? "button secondary" : "button primary"} onClick={handleAsk} disabled={loading || !question.trim()}>
              {activeAction === "text" ? "思考中..." : "文字提问"}
            </button>
            <button className={launchIntent === "image" ? "button primary" : "button secondary"} onClick={handleImageAsk} disabled={loading || !selectedImages.length}>
              {activeAction === "image" ? "识题中..." : `拍照识题（${selectedImages.length}）`}
            </button>
          </div>

          {error ? (
            <div className="status-note error" style={{ marginTop: 4 }}>
              {error}
            </div>
          ) : null}
        </div>
      </Card>

      {answer ? (
        <Card title="AI 讲解" tag="讲解">
          <div className="cta-row" style={{ marginBottom: 10 }}>
            <span className="pill">{SUBJECT_LABELS[subject] ?? subject}</span>
            <span className="pill">{getGradeLabel(grade)}</span>
            <span className="pill">{resolvedAnswerMode.label}</span>
            <span className="pill">{getOriginLabel(resultOrigin)}</span>
            {answer.provider ? <span className="pill">模型：{answer.provider}</span> : null}
          </div>

          {answer.quality ? (
            <>
              <div className={`status-note ${getQualityToneClass(answer.quality.riskLevel)}`} style={{ marginBottom: 10 }}>
                可信度 {answer.quality.confidenceScore}/100 · {QUALITY_RISK_LABELS[answer.quality.riskLevel]} · {answer.quality.fallbackAction}
              </div>
              {answer.quality.reasons.length ? (
                <div className="pill-list" style={{ marginBottom: 12 }}>
                  {answer.quality.reasons.map((reason) => (
                    <span className="pill" key={reason}>
                      {reason}
                    </span>
                  ))}
                </div>
              ) : null}
            </>
          ) : null}

          <label style={{ display: "grid", gap: 6, marginBottom: 12 }}>
            <div className="badge">识别到的题目 / 可编辑后再求解</div>
            <textarea
              value={editableQuestion}
              onChange={(event) => setEditableQuestion(event.target.value)}
              rows={4}
              placeholder="识别后的题目会显示在这里，你可以手动修正后重新求解。"
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
            />
          </label>

          <div className="cta-row" style={{ marginBottom: 12 }}>
            <button className="button secondary" onClick={handleRefineSolve} disabled={loading || !editableQuestion.trim()}>
              {activeAction === "refine" ? "重新求解中..." : "按编辑题目重新求解"}
            </button>
            <button className="button secondary" onClick={() => setQuestion(editableQuestion.trim())} disabled={!editableQuestion.trim()}>
              同步到提问框
            </button>
            <button className="button secondary" onClick={() => void handleCopy(editableQuestion, "已复制题目")}>复制题目</button>
            <button className="button secondary" onClick={() => void handleCopy(answer.answer, "已复制答案")}>复制答案</button>
          </div>

          <div className="card" style={{ marginBottom: 12 }}>
            <div className="section-title">一键同步给老师 / 家长</div>
            <div style={{ fontSize: 12, color: "var(--ink-1)", marginTop: 6 }}>
              将题目、答案、关键步骤和可信度同步到站内信，方便老师继续答疑或家长及时跟进。
            </div>

            {shareTargetsLoading && !shareTargetsLoaded ? (
              <div className="status-note info" style={{ marginTop: 10 }}>
                正在加载可分享对象...
              </div>
            ) : null}

            {shareTargetsLoaded && !shareTargets.length ? (
              <div style={{ marginTop: 12 }}>
                <StatePanel
                  compact
                  tone="info"
                  title="当前没有可分享对象"
                  description="加入班级或绑定家长后，这里会自动开放老师 / 家长分享。"
                />
              </div>
            ) : null}

            {teacherShareTargets.length ? (
              <div className="grid" style={{ gap: 8, marginTop: 12 }}>
                <div className="badge">发给老师</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8 }}>
                  {teacherShareTargets.map((target) => {
                    const submitting = shareSubmittingTargetId === target.id;
                    return (
                      <button
                        key={target.id}
                        type="button"
                        className="button secondary"
                        onClick={() => void handleShareResult(target)}
                        disabled={loading || Boolean(shareSubmittingTargetId)}
                        style={{ minHeight: 56, justifyContent: "flex-start", textAlign: "left", whiteSpace: "normal" }}
                      >
                        <span style={{ display: "grid", gap: 4 }}>
                          <span style={{ fontWeight: 600 }}>{submitting ? "发送中..." : getShareTargetActionLabel(target)}</span>
                          <span style={{ fontSize: 12, color: "var(--ink-1)" }}>
                            {target.description}
                            {target.contextLabels.length ? ` · ${target.contextLabels.join("、")}` : ""}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {parentShareTargets.length ? (
              <div className="grid" style={{ gap: 8, marginTop: 12 }}>
                <div className="badge">发给家长</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8 }}>
                  {parentShareTargets.map((target) => {
                    const submitting = shareSubmittingTargetId === target.id;
                    return (
                      <button
                        key={target.id}
                        type="button"
                        className="button secondary"
                        onClick={() => void handleShareResult(target)}
                        disabled={loading || Boolean(shareSubmittingTargetId)}
                        style={{ minHeight: 56, justifyContent: "flex-start", textAlign: "left", whiteSpace: "normal" }}
                      >
                        <span style={{ display: "grid", gap: 4 }}>
                          <span style={{ fontWeight: 600 }}>{submitting ? "发送中..." : getShareTargetActionLabel(target)}</span>
                          <span style={{ fontSize: 12, color: "var(--ink-1)" }}>
                            {target.description}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {shareError ? (
              <div className="status-note error" style={{ marginTop: 10 }}>
                {shareError}
              </div>
            ) : null}

            {shareSuccess ? (
              <>
                <div className="status-note success" style={{ marginTop: 10 }}>
                  已{shareSuccess.reused ? "继续" : ""}发送给 {shareSuccess.targetName}，可前往站内信继续沟通。
                </div>
                <div className="cta-row" style={{ marginTop: 10 }}>
                  <button
                    type="button"
                    className="button secondary"
                    onClick={() => router.push(`/inbox?threadId=${encodeURIComponent(shareSuccess.threadId)}`)}
                  >
                    查看站内信
                  </button>
                </div>
              </>
            ) : null}
          </div>

          <div className="grid" style={{ gap: 8 }}>
            <div className="badge">答案</div>
            <MathText as="div" text={answer.answer} />
          </div>

          {answerSections.map((section) =>
            section.items.length ? (
              <div key={section.key} className="grid" style={{ gap: 6, marginTop: 12 }}>
                <div className="badge">{section.title}</div>
                {section.items.map((item) => (
                  <MathText as="div" key={`${section.key}-${item}`} text={item} />
                ))}
              </div>
            ) : null
          )}

          {answer.source?.length ? (
            <div className="grid" style={{ gap: 6, marginTop: 12 }}>
              <div className="badge">参考来源</div>
              <div className="pill-list">
                {answer.source.map((item) => (
                  <span className="pill" key={item}>
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </Card>
      ) : null}

      <div id="tutor-history-anchor" />
      <Card title="AI 对话历史" tag="记录">
        <div className="grid grid-3" style={{ marginBottom: 12 }}>
          <label>
            <div className="section-title">搜索历史</div>
            <input
              value={historyKeyword}
              onChange={(event) => setHistoryKeyword(event.target.value)}
              placeholder="搜索题目、答案、标签或来源"
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
            />
          </label>
          <div className="card">
            <div className="section-title">来源筛选</div>
            <div className="cta-row cta-row-tight" style={{ marginTop: 8 }}>
              {HISTORY_ORIGIN_OPTIONS.map((option) => {
                const selected = historyOriginFilter === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    className={selected ? "button secondary" : "button ghost"}
                    onClick={() => setHistoryOriginFilter(option.value)}
                    aria-pressed={selected}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="card">
            <div className="section-title">历史概览</div>
            <div style={{ fontSize: 12, color: "var(--ink-1)", marginTop: 8, display: "grid", gap: 4 }}>
              <div>总记录 {history.length} 条</div>
              <div>图片识题 {historyImageCount} 条</div>
              <div>收藏记录 {favoriteHistoryCount} 条</div>
            </div>
          </div>
        </div>

        <div className="cta-row" style={{ marginBottom: 12 }}>
          <button className="button secondary" onClick={() => setShowFavorites((prev) => !prev)}>
            {showFavorites ? "查看全部" : "只看收藏"}
          </button>
          <span className="chip">当前结果 {filteredHistory.length} 条</span>
          {historyKeyword.trim() ? <span className="chip">关键词：{historyKeyword.trim()}</span> : null}
        </div>

        <div className="grid" style={{ gap: 10 }}>
          {filteredHistory.length === 0 ? <p>暂无匹配记录，换个关键词或调整筛选试试。</p> : null}
          {filteredHistory.map((item) => {
            const meta = item.meta;
            return (
              <div className="card" key={item.id}>
                <div className="workflow-card-meta" style={{ marginBottom: 8 }}>
                  <span className="chip">{getOriginLabel(meta?.origin)}</span>
                  {meta?.subject ? <span className="chip">{SUBJECT_LABELS[meta.subject] ?? meta.subject}</span> : null}
                  {meta?.grade ? <span className="chip">{getGradeLabel(meta.grade)}</span> : null}
                  {meta?.answerMode ? (
                    <span className="chip">{ANSWER_MODE_OPTIONS.find((option) => option.value === meta.answerMode)?.label ?? meta.answerMode}</span>
                  ) : null}
                  {meta?.imageCount ? <span className="chip">题图 {meta.imageCount} 张</span> : null}
                  {meta?.quality ? <span className="chip">可信度 {meta.quality.confidenceScore}</span> : null}
                </div>

                <div className="section-title">
                  <MathText as="div" text={item.question} />
                </div>
                <div style={{ color: "var(--ink-1)", marginTop: 8 }}>
                  <MathText as="div" text={truncateText(item.answer)} />
                </div>

                {meta?.quality ? (
                  <div className={`status-note ${getQualityToneClass(meta.quality.riskLevel)}`} style={{ marginTop: 10 }}>
                    {QUALITY_RISK_LABELS[meta.quality.riskLevel]} · {meta.quality.fallbackAction}
                  </div>
                ) : null}

                {item.tags.length ? <div style={{ marginTop: 8, fontSize: 12 }}>标签：{item.tags.join("、")}</div> : null}

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10, alignItems: "center" }}>
                  <button className="button secondary" onClick={() => reuseHistoryItem(item)}>
                    复用到提问框
                  </button>
                  <button className="button secondary" onClick={() => toggleFavorite(item)}>
                    {item.favorite ? "已收藏" : "收藏"}
                  </button>
                  <button className="button secondary" onClick={() => editTags(item)}>
                    编辑标签
                  </button>
                  <button className="button ghost" onClick={() => void handleCopy(item.answer, "已复制历史答案")}>
                    复制答案
                  </button>
                  <button className="button ghost" onClick={() => deleteHistory(item)}>
                    删除
                  </button>
                  <div style={{ fontSize: 12, color: "var(--ink-1)" }}>{new Date(item.createdAt).toLocaleString("zh-CN")}</div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
