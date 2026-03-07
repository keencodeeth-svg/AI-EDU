import Card from "@/components/Card";
import type { AssignmentReviewRubric, AssignmentRubric } from "../types";

type AssignmentRubricsCardProps = {
  rubrics: AssignmentRubric[];
  reviewRubrics: AssignmentReviewRubric[];
};

export default function AssignmentRubricsCard({ rubrics, reviewRubrics }: AssignmentRubricsCardProps) {
  return (
    <Card title="评分维度" tag="Rubric">
      <div className="grid" style={{ gap: 12 }}>
        {rubrics.map((rubric) => {
          const record = reviewRubrics.find((item) => item.rubricId === rubric.id);
          return (
            <div className="card" key={rubric.id}>
              <div className="section-title">{rubric.title}</div>
              {rubric.description ? (
                <div style={{ fontSize: 12, color: "var(--ink-1)" }}>{rubric.description}</div>
              ) : null}
              {rubric.levels?.length ? (
                <div style={{ marginTop: 6, fontSize: 12, color: "var(--ink-1)" }}>
                  评分档：{rubric.levels.map((level) => `${level.label}(${level.score})`).join(" / ")}
                </div>
              ) : null}
              <div className="pill-list" style={{ marginTop: 8 }}>
                <span className="pill">得分 {record?.score ?? 0}/{rubric.maxScore}</span>
              </div>
              <p style={{ marginTop: 8 }}>点评：{record?.comment || "暂无"}</p>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
