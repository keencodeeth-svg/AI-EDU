import type { ChangeEvent, FormEvent } from "react";
import Card from "@/components/Card";
import MathText from "@/components/MathText";
import type { AssignmentDetail, AssignmentReviewPayload, UploadItem } from "../types";

type AssignmentSubmissionCardProps = {
  data: AssignmentDetail;
  review: AssignmentReviewPayload | null;
  alreadyCompleted: boolean;
  isUpload: boolean;
  isEssay: boolean;
  uploads: UploadItem[];
  uploading: boolean;
  submissionText: string;
  answers: Record<string, string>;
  loading: boolean;
  error: string | null;
  hasUploads: boolean;
  hasText: boolean;
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void | Promise<void>;
  onDeleteUpload: (uploadId: string) => void | Promise<void>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  onSubmissionTextChange: (value: string) => void;
  onAnswerChange: (questionId: string, value: string) => void;
};

export default function AssignmentSubmissionCard({
  data,
  review,
  alreadyCompleted,
  isUpload,
  isEssay,
  uploads,
  uploading,
  submissionText,
  answers,
  loading,
  error,
  hasUploads,
  hasText,
  onUpload,
  onDeleteUpload,
  onSubmit,
  onSubmissionTextChange,
  onAnswerChange
}: AssignmentSubmissionCardProps) {
  return (
    <Card title="作业作答" tag="作答">
      {alreadyCompleted ? (
        isUpload || isEssay ? (
          <div className="grid" style={{ gap: 10 }}>
            <p>已提交作业，等待老师批改。</p>
            {review?.submission?.submissionText ? (
              <div className="card">
                <div className="section-title">{isEssay ? "作文内容" : "作业备注"}</div>
                <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.7 }}>{review.submission.submissionText}</div>
              </div>
            ) : null}
            {uploads.length ? (
              uploads.map((item) => (
                <div className="card" key={item.id}>
                  <div className="section-title">{item.fileName}</div>
                  <div style={{ fontSize: 12, color: "var(--ink-1)" }}>
                    {Math.round(item.size / 1024)} KB · {new Date(item.createdAt).toLocaleString("zh-CN")}
                  </div>
                </div>
              ))
            ) : (
              <p>暂无上传记录。</p>
            )}
          </div>
        ) : (
          <p>已提交作业，如需再次练习可联系老师重新布置。</p>
        )
      ) : (
        <form onSubmit={onSubmit} style={{ display: "grid", gap: 16 }}>
          {isUpload || isEssay ? (
            <div className="grid" style={{ gap: 12 }}>
              <div className="card">
                <div className="section-title">{isEssay ? "上传作业图片（可选）" : "上传作业"}</div>
                <div style={{ fontSize: 12, color: "var(--ink-1)" }}>
                  支持图片或 PDF，最多 {data.assignment.maxUploads ?? 3} 份，每份不超过 3MB。
                </div>
                <input type="file" multiple onChange={onUpload} disabled={uploading} />
                {uploads.length ? (
                  <div className="grid" style={{ gap: 8, marginTop: 10 }}>
                    {uploads.map((item) => (
                      <div className="card" key={item.id}>
                        <div className="section-title">{item.fileName}</div>
                        <div style={{ fontSize: 12, color: "var(--ink-1)" }}>
                          {Math.round(item.size / 1024)} KB · {new Date(item.createdAt).toLocaleString("zh-CN")}
                        </div>
                        <div className="cta-row" style={{ marginTop: 8 }}>
                          <button className="button secondary" type="button" onClick={() => onDeleteUpload(item.id)}>
                            删除
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ marginTop: 8 }}>尚未上传任何作业。</p>
                )}
              </div>
              <label>
                <div className="section-title">{isEssay ? "作文内容" : "作业备注（可选）"}</div>
                <textarea
                  value={submissionText}
                  onChange={(event) => onSubmissionTextChange(event.target.value)}
                  rows={isEssay ? 10 : 3}
                  placeholder={isEssay ? "请在此输入作文/主观题作答内容" : "写下本次作业的思路或遇到的问题"}
                  style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
                />
              </label>
            </div>
          ) : (
            data.questions.map((question, index) => (
              <div className="card" key={question.id}>
                <div className="section-title">
                  {index + 1}. <MathText text={question.stem} showCopyActions />
                </div>
                <div style={{ display: "grid", gap: 6 }}>
                  {question.options.map((option) => (
                    <label key={option} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input
                        type="radio"
                        name={question.id}
                        value={option}
                        checked={answers[question.id] === option}
                        onChange={(event) => onAnswerChange(question.id, event.target.value)}
                      />
                      <MathText text={option} />
                    </label>
                  ))}
                </div>
              </div>
            ))
          )}
          {error ? <div style={{ color: "#b42318", fontSize: 13 }}>{error}</div> : null}
          {isUpload && !hasUploads ? <div style={{ fontSize: 12, color: "var(--ink-1)" }}>请先上传作业文件。</div> : null}
          <button
            className="button primary"
            type="submit"
            disabled={loading || (isUpload && !hasUploads) || (isEssay && !hasUploads && !hasText)}
          >
            {loading ? "提交中..." : "提交作业"}
          </button>
        </form>
      )}
    </Card>
  );
}
