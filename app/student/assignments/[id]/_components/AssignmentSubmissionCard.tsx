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
  deletingUploadId: string | null;
  submissionText: string;
  answers: Record<string, string>;
  answeredCount: number;
  loading: boolean;
  error: string | null;
  message: string | null;
  hasUploads: boolean;
  hasText: boolean;
  maxUploads: number;
  canSubmit: boolean;
  stageTitle: string;
  stageDescription: string;
  hasFeedback: boolean;
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
  deletingUploadId,
  submissionText,
  answers,
  answeredCount,
  loading,
  error,
  message,
  hasUploads,
  hasText,
  maxUploads,
  canSubmit,
  stageTitle,
  stageDescription,
  hasFeedback,
  onUpload,
  onDeleteUpload,
  onSubmit,
  onSubmissionTextChange,
  onAnswerChange
}: AssignmentSubmissionCardProps) {
  const actionBusy = loading || uploading || Boolean(deletingUploadId);
  const totalQuestions = data.questions.length;
  const uploadHelper = uploads.length >= maxUploads
    ? "已达到上传上限，如需替换请先删除已有文件。"
    : uploads.length > 0
      ? `已上传 ${uploads.length} 份，还可再上传 ${maxUploads - uploads.length} 份。`
      : isEssay
        ? "可以直接输入作文正文，也可以补充图片或 PDF 作为附件。"
        : "请先上传作业文件后再提交。";

  return (
    <Card title="作业作答" tag="作答">
      <div className="assignment-submit-banner">
        <div className="assignment-submit-kicker">当前阶段</div>
        <div className="assignment-submit-title">{stageTitle}</div>
        <p className="assignment-submit-description">{stageDescription}</p>
        <div className="pill-list">
          {isUpload || isEssay ? <span className="pill">已上传 {uploads.length}/{maxUploads} 份</span> : null}
          {isEssay ? <span className="pill">{hasText ? "已填写文字内容" : "未填写文字内容"}</span> : null}
          {!isUpload && !isEssay ? <span className="pill">已作答 {answeredCount}/{totalQuestions} 题</span> : null}
          <span className="pill">{canSubmit || alreadyCompleted ? "当前可继续下一步" : "先补齐作答再提交"}</span>
        </div>
      </div>

      {message ? <div className="status-note success">{message}</div> : null}
      {error ? <div className="status-note error">{error}</div> : null}
      {hasFeedback ? (
        <div className="cta-row assignment-inline-actions">
          <a className="button ghost" href="#assignment-feedback">
            查看下方反馈
          </a>
        </div>
      ) : null}

      {alreadyCompleted ? (
        isUpload || isEssay ? (
          <div className="grid" style={{ gap: 10 }}>
            <p>{review ? "已提交作业，下方可继续查看老师反馈。" : "已提交作业，等待老师批改。"}</p>
            {review?.submission?.submissionText ? (
              <div className="card">
                <div className="section-title">{isEssay ? "作文内容" : "作业备注"}</div>
                <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.7 }}>{review.submission.submissionText}</div>
              </div>
            ) : null}
            {uploads.length ? (
              uploads.map((item) => (
                <div className="card assignment-upload-card" key={item.id}>
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
          <p>已提交作业，下方可以继续查看得分、错题解析和老师反馈。</p>
        )
      ) : (
        <form className="assignment-submit-form" onSubmit={onSubmit} aria-busy={actionBusy}>
          {isUpload || isEssay ? (
            <div className="grid" style={{ gap: 12 }}>
              <div className="card">
                <div className="section-title">{isEssay ? "上传作业图片（可选）" : "上传作业"}</div>
                <div className="assignment-submit-helper">支持图片或 PDF，最多 {maxUploads} 份，每份不超过 3MB。</div>
                <input
                  type="file"
                  multiple
                  onChange={onUpload}
                  disabled={actionBusy || uploads.length >= maxUploads}
                  style={{ marginTop: 10 }}
                />
                <div className="assignment-submit-helper" style={{ marginTop: 8 }}>
                  {uploadHelper}
                </div>
                {uploads.length ? (
                  <div className="assignment-upload-list">
                    {uploads.map((item) => (
                      <div className="card assignment-upload-card" key={item.id}>
                        <div className="section-title">{item.fileName}</div>
                        <div style={{ fontSize: 12, color: "var(--ink-1)" }}>
                          {Math.round(item.size / 1024)} KB · {new Date(item.createdAt).toLocaleString("zh-CN")}
                        </div>
                        <div className="cta-row" style={{ marginTop: 8 }}>
                          <button
                            className="button secondary"
                            type="button"
                            onClick={() => onDeleteUpload(item.id)}
                            disabled={actionBusy}
                          >
                            {deletingUploadId === item.id ? "删除中..." : "删除"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
              <label>
                <div className="section-title">{isEssay ? "作文内容" : "作业备注（可选）"}</div>
                <textarea
                  className="form-control assignment-textarea"
                  value={submissionText}
                  onChange={(event) => onSubmissionTextChange(event.target.value)}
                  rows={isEssay ? 10 : 3}
                  placeholder={isEssay ? "请在此输入作文/主观题作答内容" : "写下本次作业的思路或遇到的问题"}
                  disabled={actionBusy}
                />
                <div className="assignment-submit-helper" style={{ marginTop: 8 }}>
                  {isEssay
                    ? hasText
                      ? "正文已填写完成，可以直接提交；如需补充手写稿，可继续上传图片。"
                      : "如果暂时不上传文件，也可以直接输入作文正文后提交。"
                    : "备注不会影响得分，但能帮助老师更快理解你的思路。"}
                </div>
              </label>
            </div>
          ) : (
            <>
              <div className="assignment-submit-helper">
                {canSubmit
                  ? "已全部完成作答，提交后会立即展示得分与解析。"
                  : `已作答 ${answeredCount}/${totalQuestions} 题，建议补齐后再统一提交。`}
              </div>
              {data.questions.map((question, index) => (
                <div className="card assignment-question-card" key={question.id}>
                  <div className="section-title">
                    {index + 1}. <MathText text={question.stem} showCopyActions />
                  </div>
                  <div className="assignment-question-options">
                    {question.options.map((option) => (
                      <label className="assignment-question-option" key={option}>
                        <input
                          type="radio"
                          name={question.id}
                          value={option}
                          checked={answers[question.id] === option}
                          onChange={(event) => onAnswerChange(question.id, event.target.value)}
                          disabled={actionBusy}
                        />
                        <MathText text={option} />
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}
          <div className="cta-row assignment-inline-actions">
            <button className="button primary" type="submit" disabled={actionBusy || !canSubmit}>
              {loading ? "提交中..." : isUpload || isEssay ? "提交作业" : "提交并查看结果"}
            </button>
            {hasFeedback ? (
              <a className="button ghost" href="#assignment-feedback">
                查看反馈
              </a>
            ) : null}
          </div>
        </form>
      )}
    </Card>
  );
}
