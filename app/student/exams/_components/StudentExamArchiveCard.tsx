import Card from "@/components/Card";
import type { StudentExamItem } from "../types";
import StudentExamItemCard from "./StudentExamItemCard";

type StudentExamArchiveCardProps = {
  finished: StudentExamItem[];
  locked: StudentExamItem[];
  showPastExams: boolean;
  onToggle: () => void;
};

export default function StudentExamArchiveCard({
  finished,
  locked,
  showPastExams,
  onToggle
}: StudentExamArchiveCardProps) {
  return (
    <Card title="历史与截止考试" tag="归档">
      <div className="cta-row no-margin">
        <button className="button ghost" type="button" onClick={onToggle}>
          {showPastExams ? "收起历史记录" : `展开历史记录（${finished.length + locked.length}）`}
        </button>
      </div>
      {showPastExams ? (
        <div className="grid" style={{ gap: 12, marginTop: 10 }}>
          <div className="card exams-subsection-card">
            <div className="card-header">
              <div className="section-title">已完成</div>
              <span className="card-tag">{finished.length} 场</span>
            </div>
            {finished.length === 0 ? <p>暂无已提交考试记录。</p> : null}
            {finished.length ? (
              <div className="grid exams-list" style={{ gap: 12 }}>
                {finished.map((item) => (
                  <StudentExamItemCard item={item} key={item.id} />
                ))}
              </div>
            ) : null}
          </div>
          <div className="card exams-subsection-card">
            <div className="card-header">
              <div className="section-title">已截止/关闭</div>
              <span className="card-tag">{locked.length} 场</span>
            </div>
            {locked.length === 0 ? <p>暂无已截止但未提交的考试。</p> : null}
            {locked.length ? (
              <div className="grid exams-list" style={{ gap: 12 }}>
                {locked.map((item) => (
                  <StudentExamItemCard item={item} key={item.id} />
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <div style={{ marginTop: 10, fontSize: 12, color: "var(--ink-1)" }}>
          已完成 {finished.length} 场，已截止 {locked.length} 场。
        </div>
      )}
    </Card>
  );
}
