import Card from "@/components/Card";
import EduIcon from "@/components/EduIcon";
import ParentActionItemsList from "./ParentActionItemsList";
import type {
  AssignmentListItem,
  AssignmentSummary,
  EffectSummary,
  ExecutionSummary,
  ParentActionItem,
  ReceiptSource,
  ReceiptStatus
} from "../types";

type ParentAssignmentsCardProps = {
  assignmentSummary: AssignmentSummary | null;
  assignmentEstimatedMinutes: number;
  assignmentActionItems: ParentActionItem[];
  assignmentExecution: ExecutionSummary | null;
  assignmentEffect: EffectSummary | null;
  assignmentList: AssignmentListItem[];
  assignmentReminder: string;
  assignmentParentTips: string[];
  assignmentCopied: boolean;
  receiptError: string | null;
  receiptNotes: Record<string, string>;
  receiptLoadingKey: string | null;
  onNoteChange: (key: string, value: string) => void;
  onSubmitReceipt: (source: ReceiptSource, item: ParentActionItem, status: ReceiptStatus) => void | Promise<void>;
  onCopyReminder: () => void | Promise<void>;
};

export default function ParentAssignmentsCard({
  assignmentSummary,
  assignmentEstimatedMinutes,
  assignmentActionItems,
  assignmentExecution,
  assignmentEffect,
  assignmentList,
  assignmentReminder,
  assignmentParentTips,
  assignmentCopied,
  receiptError,
  receiptNotes,
  receiptLoadingKey,
  onNoteChange,
  onSubmitReceipt,
  onCopyReminder
}: ParentAssignmentsCardProps) {
  return (
    <Card title="作业提醒" tag="作业">
      <div className="feature-card">
        <EduIcon name="board" />
        <p>汇总老师布置作业与到期提醒。</p>
      </div>
      <div className="grid grid-2">
        <div className="card">
          <div className="section-title">待完成</div>
          <p>{assignmentSummary?.pending ?? 0} 份</p>
        </div>
        <div className="card">
          <div className="section-title">逾期</div>
          <p>{assignmentSummary?.overdue ?? 0} 份</p>
        </div>
        <div className="card">
          <div className="section-title">2 天内到期</div>
          <p>{assignmentSummary?.dueSoon ?? 0} 份</p>
        </div>
        <div className="card">
          <div className="section-title">已完成</div>
          <p>{assignmentSummary?.completed ?? 0} 份</p>
        </div>
      </div>
      <div style={{ marginTop: 12 }}>
        <div className="section-title">作业行动卡（预计 {assignmentEstimatedMinutes} 分钟）</div>
        <ParentActionItemsList
          source="assignment_plan"
          items={assignmentActionItems}
          receiptNotes={receiptNotes}
          receiptLoadingKey={receiptLoadingKey}
          error={receiptError}
          notePlaceholder="例如：本周外出，周末补做"
          emptyText="暂无行动卡。"
          onNoteChange={onNoteChange}
          onSubmitReceipt={onSubmitReceipt}
        />
      </div>
      <div style={{ marginTop: 10, fontSize: 12, color: "var(--ink-1)" }}>
        执行闭环：建议 {assignmentExecution?.suggestedCount ?? 0} 项 · 已打卡 {assignmentExecution?.completedCount ?? 0} 项 · 完成率 {assignmentExecution?.completionRate ?? 0}% · 已跳过 {assignmentExecution?.skippedCount ?? 0} 项 · 待执行 {assignmentExecution?.pendingCount ?? 0} 项 · 连续执行 {assignmentExecution?.streakDays ?? 0} 天 · 累计执行时长 {assignmentExecution?.doneMinutes ?? 0} 分钟 · 净效果分 {assignmentEffect?.receiptEffectScore ?? 0}（最近7日 {assignmentEffect?.last7dEffectScore ?? 0}，平均每次 {assignmentEffect?.avgEffectScore ?? 0}，完成贡献 {assignmentEffect?.doneEffectScore ?? 0}，跳过影响 {assignmentEffect?.skippedPenaltyScore ?? 0}）
      </div>
      <div style={{ marginTop: 12 }}>
        <div className="section-title">作业清单</div>
        {assignmentList.length ? (
          <div className="grid" style={{ gap: 8 }}>
            {assignmentList.slice(0, 5).map((item) => (
              <div className="card" key={item.id}>
                <div className="section-title">{item.title}</div>
                <p>{item.className}</p>
                <p>截止 {new Date(item.dueDate).toLocaleDateString("zh-CN")}</p>
                <p>{item.status === "completed" ? "已完成" : "待完成"}</p>
              </div>
            ))}
          </div>
        ) : (
          <p>暂无作业。</p>
        )}
      </div>
      <div style={{ marginTop: 12 }}>
        <div className="section-title">提醒文案</div>
        <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, color: "var(--ink-1)" }}>{assignmentReminder}</pre>
      </div>
      {assignmentParentTips.length ? (
        <div style={{ marginTop: 12 }}>
          <div className="section-title">监督提示</div>
          <div className="grid" style={{ gap: 6 }}>
            {assignmentParentTips.map((item, idx) => (
              <div key={`${item}-${idx}`} style={{ fontSize: 12, color: "var(--ink-1)" }}>
                {item}
              </div>
            ))}
          </div>
        </div>
      ) : null}
      <div className="cta-row">
        <button className="button secondary" type="button" onClick={onCopyReminder}>
          {assignmentCopied ? "已复制" : "复制作业提醒"}
        </button>
      </div>
    </Card>
  );
}
