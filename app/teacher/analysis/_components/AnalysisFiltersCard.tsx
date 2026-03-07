import Card from "@/components/Card";
import { SUBJECT_LABELS } from "@/lib/constants";
import type { AnalysisClassItem } from "../types";

type AnalysisFiltersCardProps = {
  classes: AnalysisClassItem[];
  classId: string;
  onClassChange: (value: string) => void;
};

export default function AnalysisFiltersCard({ classes, classId, onClassChange }: AnalysisFiltersCardProps) {
  return (
    <Card title="班级学情分析" tag="筛选">
      <div className="grid grid-2">
        <label>
          <div className="section-title">选择班级</div>
          <select value={classId} onChange={(event) => onClassChange(event.target.value)} style={{ width: "100%" }}>
            {!classes.length ? <option value="">暂无班级</option> : null}
            {classes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} · {SUBJECT_LABELS[item.subject] ?? item.subject} · {item.grade} 年级
              </option>
            ))}
          </select>
        </label>
        <div className="feature-card" style={{ alignSelf: "end" }}>
          <div className="section-title">说明</div>
          <div style={{ fontSize: 12, color: "var(--ink-1)" }}>
            颜色越偏红表示掌握度越低，可优先安排讲评与补救。
          </div>
        </div>
      </div>
      {!classes.length ? (
        <div className="empty-state">
          <p className="empty-state-title">暂无班级数据</p>
          <p>请先在教师端创建班级后再查看分析面板。</p>
        </div>
      ) : null}
    </Card>
  );
}
