import Card from "@/components/Card";
import { GRADE_OPTIONS, SUBJECT_OPTIONS } from "@/lib/constants";
import { PRACTICE_MODE_LABELS, PRACTICE_MODE_OPTIONS } from "../config";
import type { KnowledgePointGroup, PracticeMode, PracticeQuickFixAction } from "../types";

type PracticeSettingsCardProps = {
  subject: string;
  grade: string;
  mode: PracticeMode;
  knowledgeSearch: string;
  knowledgePointId?: string;
  groupedKnowledgePoints: KnowledgePointGroup[];
  filteredKnowledgePointsCount: number;
  filteredCount: number;
  selectedKnowledgeTitle: string;
  error: string | null;
  autoFixHint: string | null;
  autoFixing: boolean;
  timeLeft: number;
  challengeCount: number;
  challengeCorrect: number;
  onSubjectChange: (value: string) => void;
  onGradeChange: (value: string) => void;
  onModeChange: (mode: PracticeMode) => void;
  onKnowledgeSearchChange: (value: string) => void;
  onKnowledgePointChange: (value?: string) => void;
  onLoadQuestion: () => void;
  onQuickFix: (action: PracticeQuickFixAction) => void;
};

export default function PracticeSettingsCard({
  subject,
  grade,
  mode,
  knowledgeSearch,
  knowledgePointId,
  groupedKnowledgePoints,
  filteredKnowledgePointsCount,
  filteredCount,
  selectedKnowledgeTitle,
  error,
  autoFixHint,
  autoFixing,
  timeLeft,
  challengeCount,
  challengeCorrect,
  onSubjectChange,
  onGradeChange,
  onModeChange,
  onKnowledgeSearchChange,
  onKnowledgePointChange,
  onLoadQuestion,
  onQuickFix
}: PracticeSettingsCardProps) {
  return (
    <Card title="练习设置" tag="配置">
      <details className="practice-settings-panel">
        <summary>
          设置筛选 · {PRACTICE_MODE_LABELS[mode] ?? "练习模式"} · {selectedKnowledgeTitle}
        </summary>
        <div className="practice-settings-panel-body">
          <div className="grid grid-3 practice-settings-grid">
            <label>
              <div className="section-title">学科</div>
              <select className="select-control" value={subject} onChange={(event) => onSubjectChange(event.target.value)}>
                {SUBJECT_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <div className="section-title">年级</div>
              <select className="select-control" value={grade} onChange={(event) => onGradeChange(event.target.value)}>
                {GRADE_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <div className="section-title">模式</div>
              <select className="select-control" value={mode} onChange={(event) => onModeChange(event.target.value as PracticeMode)}>
                {PRACTICE_MODE_OPTIONS.map((item) => (
                  <option value={item.value} key={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <div className="section-title">知识点检索</div>
              <input
                className="form-control"
                value={knowledgeSearch}
                onChange={(event) => onKnowledgeSearchChange(event.target.value)}
                placeholder="按知识点/章节/单元搜索"
              />
            </label>
            <label>
              <div className="section-title">知识点</div>
              <select
                className="select-control"
                value={knowledgePointId}
                onChange={(event) => onKnowledgePointChange(event.target.value || undefined)}
              >
                <option value="">全部</option>
                {groupedKnowledgePoints.map((group) => (
                  <optgroup key={`${group.unit}-${group.chapter}`} label={`${group.unit} / ${group.chapter}（${group.items.length}）`}>
                    {group.items.map((kp) => (
                      <option value={kp.id} key={kp.id}>
                        {kp.title}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
          </div>
          <div className="meta-note practice-filter-meta">已显示 {filteredKnowledgePointsCount}/{filteredCount} 个知识点</div>
          <button className="button primary practice-settings-load" type="button" onClick={onLoadQuestion}>
            {mode === "timed" ? "开始限时" : "获取题目"}
          </button>
        </div>
      </details>
      {error ? <div className="practice-error-message">{error}</div> : null}
      {autoFixHint ? <div className="status-note info practice-status-inline">{autoFixHint}</div> : null}
      {error ? (
        <div className="cta-row practice-quickfix-row">
          <button className="button secondary" type="button" disabled={autoFixing} onClick={() => onQuickFix("clear_filters")}>
            清空筛选并重试
          </button>
          <button className="button secondary" type="button" disabled={autoFixing} onClick={() => onQuickFix("switch_normal")}>
            切到普通模式重试
          </button>
          <button className="button ghost" type="button" disabled={autoFixing} onClick={() => onQuickFix("switch_adaptive")}>
            切到自适应模式重试
          </button>
        </div>
      ) : null}
      {mode === "timed" ? <div className="practice-mode-status">剩余时间：{timeLeft}s</div> : null}
      {mode === "challenge" ? (
        <div className="practice-mode-status">闯关进度：{challengeCount}/5，正确 {challengeCorrect}</div>
      ) : null}
    </Card>
  );
}
