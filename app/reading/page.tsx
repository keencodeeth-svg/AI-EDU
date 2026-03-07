"use client";

import { useEffect, useRef, useState } from "react";
import Card from "@/components/Card";
import EduIcon from "@/components/EduIcon";
import type {
  ReadingSubject,
  ReadingWindow,
  SpeechRecognitionConstructor,
  SpeechRecognitionEventLike,
  SpeechRecognitionLike
} from "./types";

function normalizeText(text: string) {
  return text
    .toLowerCase()
    .replace(/[，。！？、,.!?;:]/g, "")
    .replace(/\s+/g, "");
}

function levenshtein(a: string, b: string) {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i += 1) dp[i][0] = i;
  for (let j = 0; j <= n; j += 1) dp[0][j] = j;
  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

function calcScore(target: string, spoken: string) {
  const cleanTarget = normalizeText(target);
  const cleanSpoken = normalizeText(spoken);
  if (!cleanTarget || !cleanSpoken) return 0;
  const distance = levenshtein(cleanTarget, cleanSpoken);
  const maxLen = Math.max(cleanTarget.length, cleanSpoken.length);
  if (maxLen === 0) return 0;
  return Math.max(0, Math.round((1 - distance / maxLen) * 100));
}

function getSpeechRecognitionConstructor(currentWindow: ReadingWindow): SpeechRecognitionConstructor | null {
  return currentWindow.SpeechRecognition ?? currentWindow.webkitSpeechRecognition ?? null;
}

export default function ReadingPage() {
  const [subject, setSubject] = useState<ReadingSubject>("chinese");
  const [targetText, setTargetText] = useState("春眠不觉晓，处处闻啼鸟。");
  const [transcript, setTranscript] = useState("");
  const [score, setScore] = useState<number | null>(null);
  const [supported, setSupported] = useState(true);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    const SpeechRecognition = getSpeechRecognitionConstructor(window as ReadingWindow);
    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      const text = event.results?.[0]?.[0]?.transcript ?? "";
      setTranscript(text);
      setScore(calcScore(targetText, text));
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
  }, [targetText]);

  function handleStart() {
    if (!recognitionRef.current) return;
    recognitionRef.current.lang = subject === "english" ? "en-US" : "zh-CN";
    setListening(true);
    recognitionRef.current.start();
  }

  function handleStop() {
    if (!recognitionRef.current) return;
    recognitionRef.current.stop();
    setListening(false);
  }

  function handleManualScore() {
    setScore(calcScore(targetText, transcript));
  }

  useEffect(() => {
    if (subject === "english") {
      setTargetText("Reading aloud helps us practice pronunciation and rhythm.");
    } else {
      setTargetText("春眠不觉晓，处处闻啼鸟。");
    }
    setTranscript("");
    setScore(null);
  }, [subject]);

  return (
    <div className="grid" style={{ gap: 18 }}>
      <div className="section-head">
        <div>
          <h2>朗读跟读评分</h2>
          <div className="section-sub">口语表达、发音清晰度与语感训练。</div>
        </div>
        <span className="chip">语音训练</span>
      </div>

      <Card title="朗读跟读评分" tag="录音">
        <div className="feature-card">
          <EduIcon name="book" />
          <p>选择科目，开始朗读或跟读。</p>
        </div>
        <div className="grid grid-2">
          <label>
            <div className="section-title">科目</div>
            <select
              value={subject}
              onChange={(event) => setSubject(event.target.value as ReadingSubject)}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
            >
              <option value="chinese">语文</option>
              <option value="english">英语</option>
            </select>
          </label>
          <label>
            <div className="section-title">跟读文本</div>
            <input
              value={targetText}
              onChange={(event) => setTargetText(event.target.value)}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
            />
          </label>
        </div>
        <div className="cta-row" style={{ marginTop: 12 }}>
          <button className="button primary" onClick={handleStart} disabled={!supported || listening}>
            {supported ? (listening ? "录音中..." : "开始朗读") : "浏览器不支持"}
          </button>
          <button className="button secondary" onClick={handleStop} disabled={!listening}>
            停止
          </button>
        </div>
        <div style={{ marginTop: 10, fontSize: 12, color: "var(--ink-1)" }}>
          提示：首次使用需要授权麦克风。若浏览器不支持，请手动输入跟读文本。
        </div>
      </Card>

      <Card title="跟读结果" tag="评分">
        <div className="feature-card">
          <EduIcon name="chart" />
          <p>自动识别文本并给出分数。</p>
        </div>
        <label>
          <div className="section-title">识别文本</div>
          <textarea
            value={transcript}
            onChange={(event) => setTranscript(event.target.value)}
            rows={3}
            placeholder="自动识别或手动输入"
            style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
          />
        </label>
        <div className="cta-row" style={{ marginTop: 12 }}>
          <button className="button secondary" onClick={handleManualScore}>
            重新评分
          </button>
        </div>
        <div style={{ marginTop: 12 }}>
          <div className="badge">评分</div>
          <div style={{ fontSize: 20, fontWeight: 600 }}>{score ?? 0} 分</div>
          <div style={{ marginTop: 6, fontSize: 12, color: "var(--ink-1)" }}>
            建议：注意停顿、重音和语速，读完后再对照原文。
          </div>
        </div>
      </Card>
    </div>
  );
}
