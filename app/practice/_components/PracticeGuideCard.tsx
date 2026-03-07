import Card from "@/components/Card";

type PracticeGuideCardProps = {
  visible: boolean;
  onHide: () => void;
  onShow: () => void;
};

export default function PracticeGuideCard({ visible, onHide, onShow }: PracticeGuideCardProps) {
  if (!visible) {
    return (
      <div className="cta-row">
        <button className="button ghost" type="button" onClick={onShow}>
          显示功能引导
        </button>
      </div>
    );
  }

  return (
    <Card title="功能引导（学生版）" tag="上手">
      <div className="grid" style={{ gap: 8 }}>
        <div style={{ fontSize: 13, color: "var(--ink-1)" }}>
          推荐顺序：选择模式与知识点 → 获取题目 → 提交答案 → 看 AI 讲解 → 做变式训练。
        </div>
        <div className="pill-list">
          <span className="pill">遇到“暂无题目”优先清空知识点筛选</span>
          <span className="pill">卡住时可切回普通/自适应模式再试</span>
          <span className="pill">解析页可切文字/图解/类比三种讲法</span>
        </div>
        <div className="cta-row">
          <button className="button ghost" type="button" onClick={onHide}>
            我已了解，隐藏引导
          </button>
        </div>
      </div>
    </Card>
  );
}
