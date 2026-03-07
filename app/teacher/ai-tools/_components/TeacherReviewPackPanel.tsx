import type { Dispatch, FormEventHandler, SetStateAction } from "react";
import Card from "@/components/Card";
import MathText from "@/components/MathText";
import { SUBJECT_LABELS } from "@/lib/constants";
import { aiRiskLabel } from "../utils";
import type {
  ClassItem,
  ReviewPackDispatchQuality,
  ReviewPackFailedItem,
  ReviewPackRelaxedItem,
  ReviewPackResult,
  ReviewPackReviewSheetItem,
  WrongReviewFormState
} from "../types";
import TeacherAiQualityCard from "./TeacherAiQualityCard";

const fieldStyle = {
  width: "100%",
  padding: 10,
  borderRadius: 10,
  border: "1px solid var(--stroke)"
} as const;

type TeacherReviewPackPanelProps = {
  classes: ClassItem[];
  wrongForm: WrongReviewFormState;
  setWrongForm: Dispatch<SetStateAction<WrongReviewFormState>>;
  loading: boolean;
  reviewPackError: string | null;
  reviewPackResult: ReviewPackResult | null;
  reviewPackDispatchIncludeIsolated: boolean;
  setReviewPackDispatchIncludeIsolated: Dispatch<SetStateAction<boolean>>;
  reviewPackAssigningAll: boolean;
  reviewPackRetryingFailed: boolean;
  reviewPackAssigningId: string | null;
  reviewPackAssignMessage: string | null;
  reviewPackAssignError: string | null;
  reviewPackFailedItems: ReviewPackFailedItem[];
  reviewPackRelaxedItems: ReviewPackRelaxedItem[];
  reviewPackDispatchQuality: ReviewPackDispatchQuality | null;
  onReviewPack: FormEventHandler<HTMLFormElement>;
  onAssignAllReviewSheets: () => void;
  onRetryFailedReviewSheets: () => void;
  onAssignReviewSheet: (item: ReviewPackReviewSheetItem) => void;
};

export default function TeacherReviewPackPanel({
  classes,
  wrongForm,
  setWrongForm,
  loading,
  reviewPackError,
  reviewPackResult,
  reviewPackDispatchIncludeIsolated,
  setReviewPackDispatchIncludeIsolated,
  reviewPackAssigningAll,
  reviewPackRetryingFailed,
  reviewPackAssigningId,
  reviewPackAssignMessage,
  reviewPackAssignError,
  reviewPackFailedItems,
  reviewPackRelaxedItems,
  reviewPackDispatchQuality,
  onReviewPack,
  onAssignAllReviewSheets,
  onRetryFailedReviewSheets,
  onAssignReviewSheet
}: TeacherReviewPackPanelProps) {
  return (
    <Card title="班级共性错因讲评包" tag="讲评包">
      <form onSubmit={onReviewPack} style={{ display: "grid", gap: 12 }}>
        <label>
          <div className="section-title">选择班级</div>
          <select value={wrongForm.classId} onChange={(event) => setWrongForm((prev) => ({ ...prev, classId: event.target.value }))} style={fieldStyle}>
            {classes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} · {SUBJECT_LABELS[item.subject] ?? item.subject} · {item.grade} 年级
              </option>
            ))}
          </select>
        </label>
        <label>
          <div className="section-title">统计范围（天）</div>
          <input
            type="number"
            min={3}
            max={60}
            value={wrongForm.rangeDays}
            onChange={(event) => setWrongForm((prev) => ({ ...prev, rangeDays: Number(event.target.value) }))}
            style={fieldStyle}
          />
        </label>
        <button className="button primary" type="submit" disabled={loading}>
          {loading ? "生成中..." : "生成讲评包"}
        </button>
      </form>
      {reviewPackError ? <div className="status-note error" style={{ marginTop: 8 }}>{reviewPackError}</div> : null}

      {reviewPackResult ? (
        <div className="grid" style={{ gap: 12, marginTop: 12 }}>
          {reviewPackResult.qualityGovernance ? (
            <div className="card">
              <div className="section-title">题库质量治理联动</div>
              <div className="pill-list" style={{ marginTop: 8 }}>
                <span className="pill">
                  错题去重覆盖 {reviewPackResult.qualityGovernance.trackedWrongQuestionCount}/{reviewPackResult.qualityGovernance.totalWrongQuestionCount}
                </span>
                <span className="pill">高风险错题 {reviewPackResult.qualityGovernance.highRiskWrongCount}</span>
                <span className="pill">隔离池命中 {reviewPackResult.qualityGovernance.isolatedWrongCount}</span>
              </div>
              {reviewPackResult.qualityGovernance.recommendedAction ? (
                <div style={{ marginTop: 8, fontSize: 12, color: "#b54708" }}>{reviewPackResult.qualityGovernance.recommendedAction}</div>
              ) : null}
            </div>
          ) : null}

          <div className="card">
            <div className="section-title">共性错因统计</div>
            {(reviewPackResult.commonCauseStats ?? []).length ? (
              <div className="grid" style={{ gap: 8, marginTop: 8 }}>
                {(reviewPackResult.commonCauseStats ?? []).map((item) => (
                  <div className="card" key={item.causeKey}>
                    <div className="section-title">
                      {item.causeTitle} · {item.level}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--ink-1)" }}>错题 {item.count} 次，占比 {item.ratio}%</div>
                    <div style={{ fontSize: 12, marginTop: 6 }}>
                      关联知识点：{(item.linkedKnowledgePoints ?? []).length ? item.linkedKnowledgePoints?.map((kp) => kp.title).join("、") : "暂无"}
                    </div>
                    <div style={{ fontSize: 12, marginTop: 6 }}>讲评策略：{item.remediationTip}</div>
                    <div style={{ fontSize: 12, marginTop: 4, color: "var(--ink-1)" }}>课堂动作：{item.classAction}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ marginTop: 8, fontSize: 12, color: "var(--ink-1)" }}>暂无可统计的共性错因。</div>
            )}
          </div>

          <div className="card">
            <div className="section-title">讲评顺序</div>
            <ol style={{ margin: "8px 0 0 16px" }}>
              {(reviewPackResult.reviewOrder ?? []).map((item) => (
                <li key={`${item.order}-${item.knowledgePointId}`}>
                  {item.title} · 错题占比 {item.wrongRatio}% · {item.teachFocus}
                </li>
              ))}
            </ol>
          </div>

          <div className="card">
            <div className="section-title">例题清单</div>
            {Boolean((reviewPackResult.exemplarQuestions ?? []).some((item) => item?.isolated)) ? (
              <div style={{ marginTop: 8, fontSize: 12, color: "#b54708" }}>检测到隔离池命中示例题，建议课堂讲评优先改用低风险变式题。</div>
            ) : null}
            <ul style={{ margin: "8px 0 0 16px" }}>
              {(reviewPackResult.exemplarQuestions ?? []).map((item) => (
                <li key={`${item.knowledgePointId}-${item.questionId ?? "fallback"}`}>
                  {item.title}：<MathText text={item.stem} />
                  {item.questionId ? (
                    <div className="pill-list" style={{ marginTop: 4 }}>
                      <span className="pill">风险 {aiRiskLabel(item.qualityRiskLevel)}</span>
                      <span className="pill">{item.isolated ? "隔离池命中" : "可直接使用"}</span>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>

          <div className="card">
            <div className="section-title">课堂任务</div>
            <ul style={{ margin: "8px 0 0 16px" }}>
              {(reviewPackResult.classTasks ?? []).map((item) => (
                <li key={item.id}>
                  {item.title}：{item.instruction}（目标：{item.target}）
                </li>
              ))}
            </ul>
          </div>

          <div className="card">
            <div className="section-title">课后复练单</div>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 8, marginTop: 8 }}>
              <input type="checkbox" checked={reviewPackDispatchIncludeIsolated} onChange={(event) => setReviewPackDispatchIncludeIsolated(event.target.checked)} />
              <span>下发时允许使用隔离池高风险题（默认关闭）</span>
            </label>
            <div className="cta-row" style={{ marginTop: 8 }}>
              <button
                className="button primary"
                type="button"
                disabled={reviewPackAssigningAll || reviewPackRetryingFailed || !(reviewPackResult.afterClassReviewSheet ?? []).length}
                onClick={onAssignAllReviewSheets}
              >
                {reviewPackAssigningAll ? "批量布置中..." : "一键布置全部复练单"}
              </button>
              <button
                className="button secondary"
                type="button"
                disabled={reviewPackAssigningAll || reviewPackRetryingFailed || !reviewPackFailedItems.length}
                onClick={onRetryFailedReviewSheets}
              >
                {reviewPackRetryingFailed ? "重试中..." : `重试失败项（${reviewPackFailedItems.length}）`}
              </button>
            </div>
            <div className="grid" style={{ gap: 8, marginTop: 8 }}>
              {(reviewPackResult.afterClassReviewSheet ?? []).map((item) => (
                <div className="card" key={item.id}>
                  <div className="section-title">{item.title}</div>
                  <div style={{ fontSize: 12, color: "var(--ink-1)" }}>建议 {item.suggestedCount} 题，{item.dueInDays} 天内完成</div>
                  <div className="cta-row" style={{ marginTop: 8 }}>
                    <button
                      className="button ghost"
                      type="button"
                      disabled={reviewPackAssigningAll || reviewPackRetryingFailed || reviewPackAssigningId === item.id}
                      onClick={() => onAssignReviewSheet(item)}
                    >
                      {reviewPackAssigningId === item.id ? "布置中..." : "一键布置该条复练"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {reviewPackAssignMessage ? <div style={{ marginTop: 8, fontSize: 12, color: "#027a48" }}>{reviewPackAssignMessage}</div> : null}
            {reviewPackAssignError ? <div style={{ marginTop: 8, fontSize: 12, color: "#b42318" }}>{reviewPackAssignError}</div> : null}
            {reviewPackFailedItems.length ? (
              <div className="card" style={{ marginTop: 8 }}>
                <div className="section-title">下发失败清单</div>
                <ul style={{ margin: "8px 0 0 16px" }}>
                  {reviewPackFailedItems.slice(0, 8).map((item, index) => (
                    <li key={`${item?.itemId ?? item?.title ?? "failed"}-${index}`}>
                      {(item?.title ?? "未命名复练")}：{item?.reason ?? "下发失败"}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {reviewPackRelaxedItems.length ? (
              <div className="card" style={{ marginTop: 8 }}>
                <div className="section-title">自动放宽记录</div>
                <ul style={{ margin: "8px 0 0 16px" }}>
                  {reviewPackRelaxedItems.slice(0, 8).map((item, index) => (
                    <li key={`${item?.itemId ?? item?.title ?? "relaxed"}-${index}`}>
                      {(item?.title ?? "未命名复练")}：{item?.reason ?? "已自动放宽条件"}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {reviewPackDispatchQuality ? (
              <div className="pill-list" style={{ marginTop: 8 }}>
                <span className="pill">{reviewPackDispatchQuality.includeIsolated ? "允许隔离池抽题" : "排除隔离池抽题"}</span>
                <span className="pill">班级隔离池题量 {reviewPackDispatchQuality.isolatedPoolCount}</span>
                <span className="pill">候选排除 {reviewPackDispatchQuality.isolatedExcludedCount}</span>
                {reviewPackDispatchQuality.includeIsolated ? <span className="pill">命中隔离池 {reviewPackDispatchQuality.selectedIsolatedCount}</span> : null}
              </div>
            ) : null}
          </div>

          <TeacherAiQualityCard payload={reviewPackResult} />
        </div>
      ) : null}
    </Card>
  );
}
