import Link from "next/link";
import Card from "@/components/Card";

type StudentDashboardGuideCardProps = {
  showDashboardGuide: boolean;
  onHide: () => void;
  onShow: () => void;
};

export default function StudentDashboardGuideCard({ showDashboardGuide, onHide, onShow }: StudentDashboardGuideCardProps) {
  if (!showDashboardGuide) {
    return (
      <div className="cta-row">
        <button className="button ghost" type="button" onClick={onShow}>
          显示功能引导
        </button>
      </div>
    );
  }

  return (
    <Card title="功能引导（学生控制台）" tag="上手">
      <div className="grid" style={{ gap: 8 }}>
        <div style={{ fontSize: 13, color: "var(--ink-1)" }}>
          建议先完成“今日高优先任务”，再进入“学习工具”，最后看“成长与反馈”。
        </div>
        <div className="pill-list">
          <span className="pill">先做 TOP 任务，提分效率最高</span>
          <span className="pill">练习页支持失败后一键修复与重试</span>
          <span className="pill">每天至少完成 1 次练习可稳步提升掌握度</span>
        </div>
        <div className="cta-row">
          <Link className="button secondary" href="/practice">
            进入智能练习
          </Link>
          <button className="button ghost" type="button" onClick={onHide}>
            我已了解，隐藏引导
          </button>
        </div>
      </div>
    </Card>
  );
}
