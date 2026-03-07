import Card from "@/components/Card";
import MathText from "@/components/MathText";
import type { AnalysisFavoriteItem, AnalysisStudentItem } from "../types";

type AnalysisFavoritesCardProps = {
  studentId: string;
  students: AnalysisStudentItem[];
  favorites: AnalysisFavoriteItem[];
  onStudentChange: (value: string) => void;
};

export default function AnalysisFavoritesCard({
  studentId,
  students,
  favorites,
  onStudentChange
}: AnalysisFavoritesCardProps) {
  return (
    <Card title="学生收藏题目" tag="收藏">
      <div className="grid grid-2">
        <label>
          <div className="section-title">选择学生</div>
          <select value={studentId} onChange={(event) => onStudentChange(event.target.value)} style={{ width: "100%" }}>
            {!students.length ? <option value="">暂无学生</option> : null}
            {students.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} · {item.grade ?? "-"} 年级
              </option>
            ))}
          </select>
        </label>
        <div className="card" style={{ alignSelf: "end" }}>
          <div className="section-title">收藏数量</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{favorites.length}</div>
        </div>
      </div>
      <div className="grid" style={{ gap: 10, marginTop: 12 }}>
        {favorites.length === 0 ? (
          <div className="empty-state">
            <p className="empty-state-title">暂无收藏记录</p>
            <p>该学生还没有收藏题目。</p>
          </div>
        ) : null}
        {favorites.slice(0, 6).map((item) => (
          <div className="card" key={item.id}>
            <div className="section-title">
              <MathText text={item.question?.stem ?? "题目"} />
            </div>
            <div style={{ fontSize: 12, color: "var(--ink-1)" }}>
              {item.question?.knowledgePointTitle ?? "知识点"} · {item.question?.grade ?? "-"} 年级
            </div>
            <div style={{ fontSize: 12, color: "var(--ink-1)", marginTop: 6 }}>
              标签：{item.tags?.length ? item.tags.join("、") : "未设置"}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
