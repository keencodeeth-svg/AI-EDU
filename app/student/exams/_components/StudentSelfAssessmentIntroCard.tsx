import Link from "next/link";
import Card from "@/components/Card";
import EduIcon from "@/components/EduIcon";

export default function StudentSelfAssessmentIntroCard() {
  return (
    <Card title="自主测评入口" tag="自主学习">
      <div className="feature-card">
        <EduIcon name="brain" />
        <p>自主测评结果用于个人学习计划与错题复练，不计入老师发布考试成绩。</p>
      </div>
      <div className="cta-row" style={{ marginTop: 10 }}>
        <Link className="button secondary" href="/diagnostic">
          进入诊断测评
        </Link>
        <Link className="button ghost" href="/practice">
          进入日常练习
        </Link>
        <Link className="button ghost" href="/wrong-book">
          进入错题复练
        </Link>
      </div>
    </Card>
  );
}
