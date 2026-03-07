import Link from "next/link";
import Card from "@/components/Card";
import EduIcon from "@/components/EduIcon";
import { ASSIGNMENT_TYPE_LABELS } from "@/lib/constants";
import type { AssignmentDetail } from "../types";

type AssignmentOverviewCardProps = {
  data: AssignmentDetail;
  isUpload: boolean;
  isEssay: boolean;
};

export default function AssignmentOverviewCard({ data, isUpload, isEssay }: AssignmentOverviewCardProps) {
  return (
    <Card title="作业信息" tag="概览">
      <div className="grid grid-2">
        <div className="card feature-card">
          <EduIcon name="board" />
          <div className="section-title">{data.assignment.title}</div>
          <p>{data.assignment.description || "暂无作业说明。"}</p>
          {data.assignment.gradingFocus ? (
            <div style={{ marginTop: 6, fontSize: 12, color: "var(--ink-1)" }}>批改重点：{data.assignment.gradingFocus}</div>
          ) : null}
          {data.module ? (
            <div style={{ marginTop: 6, fontSize: 12, color: "var(--ink-1)" }}>关联模块：{data.module.title}</div>
          ) : null}
        </div>
        <div className="card feature-card">
          <EduIcon name="chart" />
          <div className="section-title">截止日期</div>
          <p>{new Date(data.assignment.dueDate).toLocaleDateString("zh-CN")}</p>
          {data.progress?.status === "completed" ? (
            <div className="pill-list">
              {isUpload || isEssay ? (
                <span className="pill">已提交待批改</span>
              ) : (
                <span className="pill">得分 {data.progress?.score ?? 0}/{data.progress?.total ?? 0}</span>
              )}
              <span className="pill">{ASSIGNMENT_TYPE_LABELS[data.assignment.submissionType ?? "quiz"]}</span>
            </div>
          ) : (
            <div className="pill-list">
              <span className="pill">等待提交</span>
              <span className="pill">{ASSIGNMENT_TYPE_LABELS[data.assignment.submissionType ?? "quiz"]}</span>
            </div>
          )}
        </div>
      </div>
      <Link className="button ghost" href="/student/assignments" style={{ marginTop: 12 }}>
        返回作业中心
      </Link>
    </Card>
  );
}
