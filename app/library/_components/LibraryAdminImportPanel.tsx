import type { Dispatch, FormEventHandler, SetStateAction } from "react";
import Card from "@/components/Card";
import { SUBJECT_LABELS } from "@/lib/constants";
import type { LibraryImportFormState } from "../types";

const fieldStyle = {
  width: "100%",
  padding: 10,
  borderRadius: 10,
  border: "1px solid var(--stroke)"
} as const;

type LibraryAdminImportPanelProps = {
  importForm: LibraryImportFormState;
  setImportForm: Dispatch<SetStateAction<LibraryImportFormState>>;
  setImportFile: Dispatch<SetStateAction<File | null>>;
  onSubmit: FormEventHandler<HTMLFormElement>;
};

export default function LibraryAdminImportPanel({
  importForm,
  setImportForm,
  setImportFile,
  onSubmit
}: LibraryAdminImportPanelProps) {
  return (
    <Card title="管理端导入教材" tag="管理">
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <label>
          <div className="section-title">标题</div>
          <input value={importForm.title} onChange={(event) => setImportForm((prev) => ({ ...prev, title: event.target.value }))} style={fieldStyle} />
        </label>
        <label>
          <div className="section-title">简介</div>
          <textarea rows={2} value={importForm.description} onChange={(event) => setImportForm((prev) => ({ ...prev, description: event.target.value }))} style={fieldStyle} />
        </label>
        <div className="grid grid-3">
          <label>
            <div className="section-title">学科</div>
            <select value={importForm.subject} onChange={(event) => setImportForm((prev) => ({ ...prev, subject: event.target.value }))} style={fieldStyle}>
              {Object.entries(SUBJECT_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <div className="section-title">年级</div>
            <input value={importForm.grade} onChange={(event) => setImportForm((prev) => ({ ...prev, grade: event.target.value }))} style={fieldStyle} />
          </label>
          <label>
            <div className="section-title">类型</div>
            <select
              value={importForm.contentType}
              onChange={(event) =>
                setImportForm((prev) => {
                  const nextContentType = event.target.value as LibraryImportFormState["contentType"];
                  if (nextContentType === "textbook") {
                    return {
                      ...prev,
                      contentType: nextContentType,
                      sourceType: "file",
                      textContent: "",
                      linkUrl: ""
                    };
                  }
                  return { ...prev, contentType: nextContentType };
                })
              }
              style={fieldStyle}
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
            value={importForm.contentType === "textbook" ? "file" : importForm.sourceType}
            onChange={(event) => setImportForm((prev) => ({ ...prev, sourceType: event.target.value as LibraryImportFormState["sourceType"] }))}
            disabled={importForm.contentType === "textbook"}
            style={fieldStyle}
          >
            {importForm.contentType === "textbook" ? (
              <option value="file">上传文件（教材必选）</option>
            ) : (
              <>
                <option value="text">粘贴文本</option>
                <option value="file">上传文件</option>
                <option value="link">外部链接</option>
              </>
            )}
          </select>
        </label>
        {importForm.contentType === "textbook" ? <div style={{ fontSize: 12, color: "var(--ink-1)" }}>教材仅支持文件导入，已禁用外链和文本录入。</div> : null}
        {importForm.sourceType === "text" && importForm.contentType !== "textbook" ? (
          <label>
            <div className="section-title">教材文本</div>
            <textarea rows={6} value={importForm.textContent} onChange={(event) => setImportForm((prev) => ({ ...prev, textContent: event.target.value }))} style={fieldStyle} />
          </label>
        ) : null}
        {importForm.sourceType === "file" ? (
          <label>
            <div className="section-title">上传文件</div>
            <input type="file" onChange={(event) => setImportFile(event.target.files?.[0] ?? null)} />
          </label>
        ) : null}
        {importForm.sourceType === "link" && importForm.contentType !== "textbook" ? (
          <label>
            <div className="section-title">链接地址</div>
            <input value={importForm.linkUrl} onChange={(event) => setImportForm((prev) => ({ ...prev, linkUrl: event.target.value }))} style={fieldStyle} />
          </label>
        ) : null}
        <button className="button primary" type="submit">
          导入资料
        </button>
      </form>
    </Card>
  );
}
