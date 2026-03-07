import Card from "@/components/Card";

type TeacherAiGuideCardProps = {
  showGuideCard: boolean;
  onHideGuideCard: () => void;
  onShowGuideAgain: () => void;
};

export default function TeacherAiGuideCard({ showGuideCard, onHideGuideCard, onShowGuideAgain }: TeacherAiGuideCardProps) {
  if (!showGuideCard) {
    return (
      <div className="cta-row">
        <button className="button ghost" type="button" onClick={onShowGuideAgain}>
          显示功能引导
        </button>
      </div>
    );
  }

  return (
    <Card title="功能引导（教师版）" tag="上手">
      <div className="grid" style={{ gap: 8 }}>
        <div style={{ fontSize: 13, color: "var(--ink-1)" }}>推荐使用顺序：AI组卷 → 课堂讲稿 → 讲评包下发 → 题目纠错。</div>
        <div className="pill-list">
          <span className="pill">先选班级，再选知识点（可不选）</span>
          <span className="pill">筛选越多，题量越可能不足</span>
          <span className="pill">组卷失败优先清空筛选后重试</span>
          <span className="pill">讲评包可直接一键下发给学生和家长</span>
        </div>
        <div className="cta-row">
          <button className="button ghost" type="button" onClick={onHideGuideCard}>
            我已了解，隐藏引导
          </button>
        </div>
      </div>
    </Card>
  );
}
