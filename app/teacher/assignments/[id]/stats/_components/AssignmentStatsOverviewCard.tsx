import Link from "next/link";
import Card from "@/components/Card";
import type { AssignmentStatsData } from "../types";

type AssignmentStatsOverviewCardProps = {
  assignmentId: string;
  summary: AssignmentStatsData["summary"];
};

export default function AssignmentStatsOverviewCard({ assignmentId, summary }: AssignmentStatsOverviewCardProps) {
  return (
    <Card title="统计概览" tag="概览">
      <div className="grid grid-2">
        <div className="card">
          <div className="section-title">学生数</div>
          <p>{summary.students}</p>
        </div>
        <div className="card">
          <div className="section-title">已完成</div>
          <p>{summary.completed}</p>
        </div>
        <div className="card">
          <div className="section-title">待交</div>
          <p>{summary.pending}</p>
        </div>
        <div className="card">
          <div className="section-title">逾期</div>
          <p>{summary.overdue}</p>
        </div>
        <div className="card">
          <div className="section-title">平均分</div>
          <p>{summary.avgScore}</p>
        </div>
        <div className="card">
          <div className="section-title">最高/最低</div>
          <p>
            {summary.maxScore} / {summary.minScore}
          </p>
        </div>
      </div>
      <Link className="button ghost" href={`/teacher/assignments/${assignmentId}`} style={{ marginTop: 12 }}>
        返回作业详情
      </Link>
    </Card>
  );
}
