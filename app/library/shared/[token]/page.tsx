"use client";

import { useEffect, useState } from "react";
import Card from "@/components/Card";
import { SUBJECT_LABELS } from "@/lib/constants";

export default function SharedLibraryPage({ params }: { params: { token: string } }) {
  const [item, setItem] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/library/shared/${params.token}`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.error) {
          setError(data.error);
        } else {
          setItem(data?.data ?? null);
        }
      });
  }, [params.token]);

  if (error) {
    return <Card title="分享阅读">{error}</Card>;
  }
  if (!item) {
    return <Card title="分享阅读">加载中...</Card>;
  }

  return (
    <div className="grid" style={{ gap: 18 }}>
      <div className="section-head">
        <div>
          <h2>{item.title}</h2>
          <div className="section-sub">
            {SUBJECT_LABELS[item.subject] ?? item.subject} · {item.grade} 年级
          </div>
        </div>
        <span className="chip">分享</span>
      </div>

      <Card title="内容" tag="只读">
        {item.description ? <p>{item.description}</p> : null}
        {item.sourceType === "link" && item.linkUrl ? (
          <a href={item.linkUrl} target="_blank" rel="noreferrer">
            打开外部链接
          </a>
        ) : null}
        {item.sourceType === "file" && item.contentBase64 ? (
          <div className="grid" style={{ gap: 10 }}>
            <a
              className="button secondary"
              href={`data:${item.mimeType};base64,${item.contentBase64}`}
              download={item.fileName || item.title}
            >
              下载文件
            </a>
            {item.mimeType?.includes("pdf") ? (
              <iframe
                title="pdf-preview"
                src={`data:${item.mimeType};base64,${item.contentBase64}`}
                style={{ width: "100%", minHeight: 520, border: "1px solid var(--stroke)", borderRadius: 12 }}
              />
            ) : null}
          </div>
        ) : null}
        {item.sourceType === "text" ? (
          <div className="card" style={{ whiteSpace: "pre-wrap", lineHeight: 1.7 }}>
            {item.textContent || "暂无内容"}
          </div>
        ) : null}
      </Card>
    </div>
  );
}
