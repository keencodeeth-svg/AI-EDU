import Card from "@/components/Card";
import MathText from "@/components/MathText";
import type { AssignmentStatsQuestionStat } from "../types";

type AssignmentStatsQuestionsCardProps = {
  questionStats: AssignmentStatsQuestionStat[];
};

export default function AssignmentStatsQuestionsCard({ questionStats }: AssignmentStatsQuestionsCardProps) {
  if (!questionStats.length) {
    return (
      <Card title="题目正确率" tag="题目">
        <p>该作业非在线作答，暂无题目统计。</p>
      </Card>
    );
  }

  return (
    <Card title="题目正确率" tag="题目">
      <div className="grid" style={{ gap: 10 }}>
        {questionStats.map((item) => (
          <div className="card" key={item.id}>
            <div className="section-title">
              <MathText text={item.stem} />
            </div>
            <div style={{ fontSize: 12, color: "var(--ink-1)" }}>
              正确 {item.correct}/{item.total} · 正确率 {item.ratio}%
            </div>
            <div
              style={{
                marginTop: 6,
                height: 8,
                borderRadius: 999,
                background: "#f1f5f9",
                overflow: "hidden"
              }}
            >
              <div
                style={{
                  width: `${item.ratio}%`,
                  height: "100%",
                  background: "linear-gradient(90deg, #16a34a, #65a30d)"
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
