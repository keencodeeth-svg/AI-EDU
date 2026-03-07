import type { FormEventHandler } from "react";
import Card from "@/components/Card";
import EduIcon from "@/components/EduIcon";
import type { BatchImportSummary, LibraryBatchPreview } from "../types";

type LibraryBatchImportPanelProps = {
  batchPreview: LibraryBatchPreview | null;
  batchSummary: BatchImportSummary | null;
  batchFailedPreview: string[];
  onDownloadBatchTemplate: () => void;
  onBatchFileChange: (file?: File | null) => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
};

export default function LibraryBatchImportPanel({
  batchPreview,
  batchSummary,
  batchFailedPreview,
  onDownloadBatchTemplate,
  onBatchFileChange,
  onSubmit
}: LibraryBatchImportPanelProps) {
  return (
    <Card title="全学科批量导入（教材+习题）" tag="批量">
      <div className="feature-card">
        <EduIcon name="board" />
        <p>上传 JSON 清单后，系统会批量导入教材并自动创建/质检配套习题。</p>
      </div>
      <div className="cta-row">
        <button className="button ghost" type="button" onClick={onDownloadBatchTemplate}>
          下载 JSON 模板
        </button>
      </div>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12, marginTop: 10 }}>
        <label>
          <div className="section-title">上传批量 JSON</div>
          <input type="file" accept=".json,application/json" onChange={(event) => onBatchFileChange(event.target.files?.[0] ?? null)} />
        </label>
        {batchPreview ? <div className="status-note info">预览：教材 {batchPreview.textbooks} 条，习题 {batchPreview.questions} 条</div> : null}
        <button className="button primary" type="submit">
          开始批量导入
        </button>
      </form>
      {batchSummary ? (
        <div className="grid" style={{ gap: 8, marginTop: 12 }}>
          <div className="card">教材：{batchSummary.textbooksImported}/{batchSummary.textbooksTotal}，失败 {batchSummary.textbooksFailed}</div>
          <div className="card">习题：{batchSummary.questionsImported}/{batchSummary.questionsTotal}，失败 {batchSummary.questionsFailed}</div>
          <div className="card">自动创建知识点：{batchSummary.knowledgePointsCreated}</div>
          {batchFailedPreview.length ? (
            <div className="card">
              <div className="section-title">失败样例（最多 20 条）</div>
              <div className="grid" style={{ gap: 4, marginTop: 8 }}>
                {batchFailedPreview.map((line, index) => (
                  <div key={`${line}-${index}`} style={{ fontSize: 12, color: "var(--ink-1)" }}>
                    {line}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
