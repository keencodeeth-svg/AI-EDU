import Card from "@/components/Card";
import { SUBJECT_LABELS } from "@/lib/constants";
import type { AnalysisInterventionCausalityItem, AnalysisInterventionCausalitySummary } from "../types";
import { ACTION_TYPE_LABEL, formatDateTime, getAlertTypeLabel } from "../utils";

type AnalysisCausalityCardProps = {
  causalityDays: number;
  causalitySummary: AnalysisInterventionCausalitySummary | null;
  causalityItems: AnalysisInterventionCausalityItem[];
  causalityLoading: boolean;
  onCausalityDaysChange: (days: number) => void;
};

export default function AnalysisCausalityCard({
  causalityDays,
  causalitySummary,
  causalityItems,
  causalityLoading,
  onCausalityDaysChange
}: AnalysisCausalityCardProps) {
  return (
    <Card title="干预因果看板" tag="闭环">
      <div className="cta-row" style={{ marginBottom: 12 }}>
        <label style={{ minWidth: 220 }}>
          <div className="section-title">观察窗口</div>
          <select
            value={causalityDays}
            onChange={(event) => onCausalityDaysChange(Number(event.target.value))}
            style={{ width: "100%" }}
          >
            <option value={7}>近 7 天</option>
            <option value={14}>近 14 天</option>
            <option value={21}>近 21 天</option>
            <option value={30}>近 30 天</option>
          </select>
        </label>
      </div>
      {causalitySummary ? (
        <div className="grid grid-3">
          <div className="card">
            <div className="section-title">动作数（{causalityDays}天）</div>
            <div className="kpi-value">{causalitySummary.actionCount}</div>
          </div>
          <div className="card">
            <div className="section-title">平均执行率</div>
            <div className="kpi-value">{causalitySummary.avgExecutionRate}%</div>
          </div>
          <div className="card">
            <div className="section-title">平均分数变化</div>
            <div className="kpi-value">{causalitySummary.avgScoreDelta}</div>
          </div>
          <div className="card">
            <div className="section-title">正向动作数</div>
            <div className="kpi-value">{causalitySummary.improvedActionCount}</div>
          </div>
          <div className="card">
            <div className="section-title">有效样本覆盖</div>
            <div className="kpi-value">{causalitySummary.evidenceReadyRate}%</div>
            <div style={{ fontSize: 12, color: "var(--ink-1)" }}>
              {causalitySummary.evidenceReadyCount}/{causalitySummary.actionCount}
            </div>
          </div>
          <div className="card">
            <div className="section-title">学生风险动作</div>
            <div className="kpi-value">{causalitySummary.byAlertType.studentRiskActionCount}</div>
          </div>
          <div className="card">
            <div className="section-title">知识点风险动作</div>
            <div className="kpi-value">{causalitySummary.byAlertType.knowledgeRiskActionCount}</div>
          </div>
          <div className="card">
            <div className="section-title">家长参与动作</div>
            <div className="kpi-value">{causalitySummary.parentInvolvedActionCount}</div>
          </div>
          <div className="card">
            <div className="section-title">家长平均执行率</div>
            <div className="kpi-value">{causalitySummary.avgParentExecutionRate}%</div>
          </div>
          <div className="card">
            <div className="section-title">家长平均效果分</div>
            <div className="kpi-value">{causalitySummary.avgParentEffectScore}</div>
          </div>
          <div className="card">
            <div className="section-title">家长协同分差</div>
            <div className="kpi-value">{causalitySummary.parentDeltaGap ?? "-"}</div>
            <div style={{ fontSize: 12, color: "var(--ink-1)" }}>
              有家长 {causalitySummary.withParentAvgScoreDelta ?? "-"} / 无家长{" "}
              {causalitySummary.withoutParentAvgScoreDelta ?? "-"}
            </div>
          </div>
        </div>
      ) : null}
      {causalitySummary?.byActionType?.length ? (
        <div className="grid grid-2" style={{ marginTop: 12 }}>
          {causalitySummary.byActionType.map((item) => (
            <div className="card" key={item.actionType}>
              <div className="section-title">{ACTION_TYPE_LABEL[item.actionType]}</div>
              <div className="pill-list" style={{ marginTop: 8 }}>
                <span className="pill">动作数 {item.actionCount}</span>
                <span className="pill">平均执行率 {item.avgExecutionRate}%</span>
                <span className="pill">平均分数变化 {item.avgScoreDelta}</span>
                <span className="pill">正向动作 {item.improvedActionCount}</span>
                <span className="pill">家长执行率 {item.avgParentExecutionRate}%</span>
                <span className="pill">家长参与 {item.parentInvolvedActionCount}</span>
                <span className="pill">家长效果分 {item.avgParentEffectScore}</span>
              </div>
            </div>
          ))}
        </div>
      ) : null}
      <div className="grid" style={{ gap: 10, marginTop: 12 }}>
        {causalityLoading ? (
          <div className="empty-state">
            <p className="empty-state-title">加载中</p>
            <p>正在计算教师干预动作的执行与效果。</p>
          </div>
        ) : causalityItems.length === 0 ? (
          <div className="empty-state">
            <p className="empty-state-title">暂无干预数据</p>
            <p>先执行预警动作后即可看到“动作-执行-效果”追踪。</p>
          </div>
        ) : (
          causalityItems.slice(0, 8).map((item) => (
            <div className="card" key={item.actionId}>
              <div className="section-title">
                {getAlertTypeLabel(item.alertType)}干预 · {ACTION_TYPE_LABEL[item.actionType]}
              </div>
              <div style={{ fontSize: 12, color: "var(--ink-1)", marginTop: 4 }}>
                {item.className} · {SUBJECT_LABELS[item.subject] ?? item.subject} · {item.grade} 年级 ·{" "}
                {formatDateTime(item.createdAt)}
              </div>
              <div className="pill-list" style={{ marginTop: 8 }}>
                <span className="pill">
                  执行率 {item.executedStudents}/{item.targetStudents}（{item.executionRate}%）
                </span>
                <span className="pill">作业执行 {item.assignmentExecutionCount}</span>
                <span className="pill">复练执行 {item.reviewExecutionCount}</span>
                <span className="pill">
                  家长执行 {item.parentExecutedStudents}/{item.parentLinkedStudents}（{item.parentExecutionRate}%）
                </span>
                <span className="pill">家长回执完成 {item.parentReceiptDoneCount}</span>
                <span className="pill">家长回执跳过 {item.parentReceiptSkippedCount}</span>
                <span className="pill">家长效果分 {item.parentEffectScore}</span>
                <span className="pill">动作后正确率 {item.postAccuracy ?? "-"}%</span>
                <span className="pill">动作前正确率 {item.preAccuracy ?? "-"}%</span>
                <span className="pill">分数变化 {item.scoreDelta ?? "-"}</span>
              </div>
              <div style={{ marginTop: 8, fontSize: 12, color: "var(--ink-1)" }}>
                样本题次：前 {item.preAttemptCount} · 后 {item.postAttemptCount}
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
