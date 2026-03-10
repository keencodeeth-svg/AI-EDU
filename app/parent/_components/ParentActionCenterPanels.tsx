import Link from "next/link";
import type { ReactNode } from "react";
import Card from "@/components/Card";
import EduIcon from "@/components/EduIcon";
import type {
  AssignmentSummary,
  CorrectionSummary,
  ExecutionSummary,
  ParentActionItem,
  WeeklyReport
} from "../types";

type ParentActionCenterPanelsProps = {
  report: WeeklyReport;
  correctionSummary: CorrectionSummary | null;
  assignmentSummary: AssignmentSummary | null;
  assignmentActionItems: ParentActionItem[];
  assignmentExecution: ExecutionSummary | null;
  pendingCorrectionCount: number;
  overdueCorrectionCount: number;
  dueSoonCorrectionCount: number;
  favoritesCount: number;
};

type ActionTone = "critical" | "primary" | "steady";

type ParentPrimaryAction = {
  id: string;
  title: string;
  description: string;
  href: string;
  ctaLabel: string;
  badgeLabel: string;
  tone: ActionTone;
};

const ACTION_TONE_META: Record<ActionTone, { background: string; border: string; color: string }> = {
  critical: {
    background: "rgba(240, 68, 56, 0.08)",
    border: "rgba(240, 68, 56, 0.22)",
    color: "#b42318"
  },
  primary: {
    background: "rgba(105, 65, 198, 0.08)",
    border: "rgba(105, 65, 198, 0.22)",
    color: "#6941c6"
  },
  steady: {
    background: "rgba(18, 183, 106, 0.08)",
    border: "rgba(18, 183, 106, 0.22)",
    color: "#027a48"
  }
};

function ActionLink({ href, className, children }: { href: string; className: string; children: ReactNode }) {
  if (href.startsWith("#")) {
    return (
      <a className={className} href={href}>
        {children}
      </a>
    );
  }

  return (
    <Link className={className} href={href}>
      {children}
    </Link>
  );
}

function getPendingItems(items: ParentActionItem[]) {
  return items.filter((item) => item.receipt?.status !== "done");
}

function getCompletedItems(items: ParentActionItem[]) {
  return items.filter((item) => item.receipt?.status === "done");
}

function buildParentPrimaryActions({
  report,
  correctionSummary,
  assignmentSummary,
  assignmentActionItems,
  pendingCorrectionCount,
  overdueCorrectionCount,
  dueSoonCorrectionCount,
  favoritesCount
}: ParentActionCenterPanelsProps): ParentPrimaryAction[] {
  const weeklyActionItems = report.actionItems ?? [];
  const pendingWeeklyActionItems = getPendingItems(weeklyActionItems);
  const pendingAssignmentActionItems = getPendingItems(assignmentActionItems);
  const overdueAssignmentCount = assignmentSummary?.overdue ?? 0;
  const dueSoonAssignmentCount = assignmentSummary?.dueSoon ?? 0;
  const mustFollowUpCount = overdueCorrectionCount + overdueAssignmentCount;
  const weakPoints = report.weakPoints ?? [];
  const actions: ParentPrimaryAction[] = [];

  if (mustFollowUpCount > 0) {
    actions.push({
      id: "must-follow-up",
      title: `今晚先处理 ${mustFollowUpCount} 项逾期学习事项`,
      description: `当前有 ${overdueCorrectionCount} 项逾期订正和 ${overdueAssignmentCount} 份逾期作业待跟进，这类任务最容易拖成长期积压。`,
      href: overdueCorrectionCount >= overdueAssignmentCount ? "#parent-corrections" : "#parent-assignments",
      ctaLabel: overdueCorrectionCount >= overdueAssignmentCount ? "先看订正任务" : "先看作业提醒",
      badgeLabel: "今晚必做",
      tone: "critical"
    });
  }

  if (pendingWeeklyActionItems.length > 0) {
    actions.push({
      id: "weekly-actions",
      title: `先完成 ${pendingWeeklyActionItems.length} 项周报行动卡`,
      description: `这些是老师和系统已经拆好的陪伴动作，优先完成能让今晚的陪伴更具体，不会只停留在“提醒一下”。`,
      href: "#parent-weekly-report",
      ctaLabel: "去打卡周报行动",
      badgeLabel: "家长动作",
      tone: "primary"
    });
  }

  if (pendingAssignmentActionItems.length > 0) {
    actions.push({
      id: "assignment-actions",
      title: `跟进 ${pendingAssignmentActionItems.length} 项作业行动卡`,
      description: "作业行动卡更贴近今晚执行，适合在孩子开始写作业前先约定好陪伴方式和检查节奏。",
      href: "#parent-assignments",
      ctaLabel: "去看作业行动",
      badgeLabel: "作业跟进",
      tone: "primary"
    });
  }

  if (dueSoonCorrectionCount + dueSoonAssignmentCount > 0) {
    actions.push({
      id: "due-soon",
      title: `关注未来 2 天内到期的 ${dueSoonCorrectionCount + dueSoonAssignmentCount} 项任务`,
      description: `其中订正 ${correctionSummary?.dueSoon ?? dueSoonCorrectionCount} 项，作业 ${dueSoonAssignmentCount} 份，今天顺手清一部分，后面会轻松很多。`,
      href: dueSoonCorrectionCount >= dueSoonAssignmentCount ? "#parent-corrections" : "#parent-assignments",
      ctaLabel: "查看临期任务",
      badgeLabel: "临近截止",
      tone: "steady"
    });
  }

  if (weakPoints.length > 0) {
    actions.push({
      id: "weak-points",
      title: `围绕 ${weakPoints[0].title} 做一次针对性陪练`,
      description: `孩子当前最需要补的是“${weakPoints[0].title}”，与其泛泛提醒，不如直接围绕薄弱点做一次短陪练。`,
      href: "#parent-weak-points",
      ctaLabel: "查看薄弱点建议",
      badgeLabel: "针对提升",
      tone: "steady"
    });
  }

  if (!pendingCorrectionCount && !pendingWeeklyActionItems.length && !pendingAssignmentActionItems.length && favoritesCount > 0) {
    actions.push({
      id: "favorites-review",
      title: "今晚没有硬任务，适合复盘收藏题",
      description: "趁任务压力较低，带孩子把收藏题再看一轮，能把容易反复出错的点提前压住。",
      href: "#parent-favorites",
      ctaLabel: "查看收藏题",
      badgeLabel: "轻陪伴",
      tone: "steady"
    });
  }

  if (!actions.length) {
    actions.push({
      id: "weekly-review",
      title: "本周节奏稳定，先看一次周报和建议",
      description: "当前没有明显阻塞项，适合先快速过一遍周报，把本周陪伴重点提前定下来。",
      href: "#parent-weekly-report",
      ctaLabel: "查看家长周报",
      badgeLabel: "稳定推进",
      tone: "steady"
    });
  }

  return actions;
}

export function ParentNextStepCard(props: ParentActionCenterPanelsProps) {
  const actions = buildParentPrimaryActions(props);
  const primaryAction = actions[0];
  const secondaryActions = actions.slice(1, 3);
  const meta = ACTION_TONE_META[primaryAction.tone];

  return (
    <Card title="今晚先做什么" tag={primaryAction.badgeLabel}>
      <div className="grid" style={{ gap: 12 }}>
        <div className="feature-card" style={{ alignItems: "flex-start" }}>
          <EduIcon name="rocket" />
          <div>
            <div className="section-title">现在先做：{primaryAction.title}</div>
            <p style={{ marginTop: 6, lineHeight: 1.7 }}>{primaryAction.description}</p>
          </div>
        </div>

        <div className="card" style={{ border: `1px solid ${meta.border}`, background: meta.background }}>
          <div className="cta-row" style={{ justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginTop: 0 }}>
            <div>
              <div className="section-title">为什么先做这一项</div>
              <div className="meta-text" style={{ marginTop: 6, lineHeight: 1.7 }}>
                家长端最怕“看了很多但没行动”，所以默认先推最容易影响今晚学习节奏的一步。
              </div>
            </div>
            <span className="pill" style={{ color: meta.color, borderColor: meta.color }}>
              {primaryAction.badgeLabel}
            </span>
          </div>

          <div className="cta-row" style={{ marginTop: 12, flexWrap: "wrap" }}>
            <ActionLink href={primaryAction.href} className="button primary">
              {primaryAction.ctaLabel}
            </ActionLink>
            <a className="button ghost" href="#parent-weekly-report">
              看本周周报
            </a>
            <a className="button ghost" href="#parent-assignments">
              看作业跟进
            </a>
          </div>
        </div>

        {secondaryActions.length ? (
          <div className="grid" style={{ gap: 10 }}>
            <div className="section-title">接下来顺手做</div>
            {secondaryActions.map((item) => {
              const secondaryMeta = ACTION_TONE_META[item.tone];
              return (
                <div className="card" key={item.id}>
                  <div className="cta-row" style={{ justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginTop: 0 }}>
                    <div>
                      <div className="section-title">{item.title}</div>
                      <div className="meta-text" style={{ marginTop: 6, lineHeight: 1.7 }}>{item.description}</div>
                    </div>
                    <span className="pill" style={{ color: secondaryMeta.color, borderColor: secondaryMeta.color }}>
                      {item.badgeLabel}
                    </span>
                  </div>
                  <div className="cta-row" style={{ marginTop: 10, justifyContent: "space-between", alignItems: "center" }}>
                    <div className="meta-text">做完第一项后，建议立刻衔接，不让今晚陪伴节奏断掉。</div>
                    <ActionLink href={item.href} className="button ghost">
                      {item.ctaLabel}
                    </ActionLink>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </Card>
  );
}

export function ParentExecutionSummaryCard({
  report,
  correctionSummary,
  assignmentSummary,
  assignmentActionItems,
  assignmentExecution,
  pendingCorrectionCount,
  overdueCorrectionCount,
  dueSoonCorrectionCount,
  favoritesCount
}: ParentActionCenterPanelsProps) {
  const weeklyActionItems = report.actionItems ?? [];
  const pendingWeeklyActionItems = getPendingItems(weeklyActionItems);
  const completedWeeklyActionItems = getCompletedItems(weeklyActionItems);
  const pendingAssignmentActionItems = getPendingItems(assignmentActionItems);
  const completedAssignmentActionItems = getCompletedItems(assignmentActionItems);
  const mustFollowUpCount = overdueCorrectionCount + (assignmentSummary?.overdue ?? 0);
  const dueSoonTotal = dueSoonCorrectionCount + (assignmentSummary?.dueSoon ?? 0);
  const completedReceipts = completedWeeklyActionItems.length + completedAssignmentActionItems.length;
  const doneMinutes = (report.execution?.doneMinutes ?? 0) + (assignmentExecution?.doneMinutes ?? 0);

  let focusMessage = "今晚没有明显阻塞项，适合按周报建议做轻量陪伴和复盘。";
  if (mustFollowUpCount > 0) {
    focusMessage = "今晚先清逾期事项，再谈鼓励和计划；不然孩子容易一直被旧任务拖住。";
  } else if (pendingWeeklyActionItems.length + pendingAssignmentActionItems.length > 0) {
    focusMessage = "行动卡还没回执，建议把“做什么、做多久、做到什么程度”先说清楚。";
  } else if (dueSoonTotal > 0) {
    focusMessage = "虽然还没逾期，但临近截止的任务已经出现，今天顺手清一部分会更稳。";
  } else if ((report.weakPoints ?? []).length > 0) {
    focusMessage = "本周更适合围绕薄弱点做短时、具体的陪练，不必一上来就拉长战线。";
  } else if (favoritesCount > 0) {
    focusMessage = "可以选一道收藏题做复盘，让孩子讲出思路，比单纯催促更有效。";
  }

  return (
    <Card title="行动摘要" tag="Tonight">
      <div className="grid" style={{ gap: 12 }}>
        <div className="feature-card" style={{ alignItems: "flex-start" }}>
          <EduIcon name="chart" />
          <div>
            <div className="section-title">今晚陪伴重点</div>
            <p style={{ marginTop: 6, lineHeight: 1.7 }}>{focusMessage}</p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
          <div className="card">
            <div className="section-title">今晚必跟进</div>
            <div style={{ fontSize: 24, fontWeight: 700, marginTop: 6 }}>{mustFollowUpCount}</div>
            <div className="meta-text" style={{ marginTop: 6 }}>逾期订正 {correctionSummary?.overdue ?? overdueCorrectionCount} · 逾期作业 {assignmentSummary?.overdue ?? 0}</div>
          </div>
          <div className="card">
            <div className="section-title">待打卡动作</div>
            <div style={{ fontSize: 24, fontWeight: 700, marginTop: 6 }}>{pendingWeeklyActionItems.length + pendingAssignmentActionItems.length}</div>
            <div className="meta-text" style={{ marginTop: 6 }}>周报 {pendingWeeklyActionItems.length} · 作业 {pendingAssignmentActionItems.length}</div>
          </div>
          <div className="card">
            <div className="section-title">2 天内到期</div>
            <div style={{ fontSize: 24, fontWeight: 700, marginTop: 6 }}>{dueSoonTotal}</div>
            <div className="meta-text" style={{ marginTop: 6 }}>订正 {correctionSummary?.dueSoon ?? dueSoonCorrectionCount} · 作业 {assignmentSummary?.dueSoon ?? 0}</div>
          </div>
          <div className="card">
            <div className="section-title">已完成回执</div>
            <div style={{ fontSize: 24, fontWeight: 700, marginTop: 6 }}>{completedReceipts}</div>
            <div className="meta-text" style={{ marginTop: 6 }}>累计陪伴时长 {doneMinutes} 分钟</div>
          </div>
        </div>

        <div className="cta-row" style={{ flexWrap: "wrap" }}>
          <a className="button secondary" href="#parent-corrections">
            去看订正任务
          </a>
          <a className="button ghost" href="#parent-assignments">
            去看作业提醒
          </a>
          <a className="button ghost" href="#parent-weak-points">
            去看薄弱点建议
          </a>
        </div>
      </div>
    </Card>
  );
}
