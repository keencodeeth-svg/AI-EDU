"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Card from "@/components/Card";
import EduIcon from "@/components/EduIcon";
import { ASSIGNMENT_TYPE_LABELS } from "@/lib/constants";
import type { StudentModuleDetailData, StudentModuleDetailResponse } from "./types";

export default function StudentModuleDetailPage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<StudentModuleDetailData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setError(null);
      const res = await fetch(`/api/student/modules/${params.id}`);
      const payload = (await res.json()) as StudentModuleDetailResponse;

      if (!res.ok || payload.error) {
        setError(payload.error ?? "加载失败");
        return;
      }

      if (!payload.data) {
        setError("模块数据缺失");
        return;
      }

      setData(payload.data);
    }

    void load();
  }, [params.id]);

  if (error) {
    return <Card title="模块详情">{error}</Card>;
  }
  if (!data) {
    return <Card title="模块详情">加载中...</Card>;
  }

  return (
    <div className="grid" style={{ gap: 18 }}>
      <div className="section-head">
        <div>
          <h2>{data.module.title}</h2>
          <div className="section-sub">{data.module.description || "模块详情"}</div>
        </div>
        <span className="chip">模块学习</span>
      </div>

      <Card title="资源列表" tag="课件">
        <div className="feature-card">
          <EduIcon name="board" />
          <p>老师上传的课件与参考资料。</p>
        </div>
        {data.resources.length ? (
          <div className="grid" style={{ gap: 10 }}>
            {data.resources.map((item) => (
              <div className="card" key={item.id}>
                <div className="section-title">{item.title}</div>
                {item.resourceType === "link" ? (
                  <a href={item.linkUrl} target="_blank" rel="noreferrer">
                    打开链接
                  </a>
                ) : (
                  <a href={`data:${item.mimeType};base64,${item.contentBase64}`} download={item.fileName}>
                    下载 {item.fileName}
                  </a>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p>暂无资源。</p>
        )}
      </Card>

      <Card title="模块作业" tag="作业">
        {data.assignments.length ? (
          <div className="grid" style={{ gap: 10 }}>
            {data.assignments.map((assignment) => (
              <div className="card" key={assignment.id}>
                <div className="section-title">{assignment.title}</div>
                <div style={{ fontSize: 12, color: "var(--ink-1)" }}>
                  截止 {new Date(assignment.dueDate).toLocaleDateString("zh-CN")} ·{" "}
                  {ASSIGNMENT_TYPE_LABELS[assignment.submissionType ?? "quiz"]}
                </div>
                <div className="pill-list" style={{ marginTop: 8 }}>
                  <span className="pill">{assignment.status === "completed" ? "已完成" : "待完成"}</span>
                </div>
                <Link className="button secondary" href={`/student/assignments/${assignment.id}`} style={{ marginTop: 8 }}>
                  进入作业
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <p>暂无作业。</p>
        )}
      </Card>
    </div>
  );
}
