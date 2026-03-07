import type {
  TeacherAssignmentReviewRubricState,
  TeacherAssignmentRubric
} from "../types";

type AssignmentReviewRubricEditorCardProps = {
  rubric: TeacherAssignmentRubric;
  rubricState: TeacherAssignmentReviewRubricState[string] | undefined;
  onScoreChange: (rubricId: string, value: number) => void;
  onCommentChange: (rubricId: string, value: string) => void;
};

export default function AssignmentReviewRubricEditorCard({
  rubric,
  rubricState,
  onScoreChange,
  onCommentChange
}: AssignmentReviewRubricEditorCardProps) {
  return (
    <div className="card">
      <div className="section-title">{rubric.title}</div>
      {rubric.description ? <div style={{ fontSize: 12, color: "var(--ink-1)" }}>{rubric.description}</div> : null}
      <div style={{ fontSize: 12, color: "var(--ink-1)", marginTop: 4 }}>
        权重 {rubric.weight} · 满分 {rubric.maxScore}
      </div>
      {rubric.levels?.length ? (
        <div style={{ marginTop: 8 }}>
          <div className="section-sub">分档参考</div>
          <div className="grid" style={{ gap: 6, marginTop: 6 }}>
            {rubric.levels.map((level, index) => (
              <div key={`${rubric.id}-level-${index}`} className="card">
                <div className="section-title">
                  {level.label}（{level.score}）
                </div>
                <div style={{ fontSize: 12, color: "var(--ink-1)" }}>{level.description}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
        <label>
          <div className="section-title">评分（满分 {rubric.maxScore}）</div>
          <input
            type="number"
            min={0}
            max={rubric.maxScore}
            value={rubricState?.score ?? 0}
            onChange={(event) => onScoreChange(rubric.id, Number(event.target.value))}
            style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
          />
        </label>
        <label>
          <div className="section-title">点评</div>
          <textarea
            value={rubricState?.comment ?? ""}
            onChange={(event) => onCommentChange(rubric.id, event.target.value)}
            rows={2}
            style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
          />
        </label>
      </div>
    </div>
  );
}
