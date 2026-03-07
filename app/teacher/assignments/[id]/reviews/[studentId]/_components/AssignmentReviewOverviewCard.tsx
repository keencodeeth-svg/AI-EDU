import Link from "next/link";
import Card from "@/components/Card";
import EduIcon from "@/components/EduIcon";
import { ASSIGNMENT_TYPE_LABELS } from "@/lib/constants";
import type {
  TeacherAssignmentReviewAssignment,
  TeacherAssignmentReviewSubmission
} from "../types";

type AssignmentReviewOverviewCardProps = {
  assignment: TeacherAssignmentReviewAssignment;
  submission?: TeacherAssignmentReviewSubmission | null;
  wrongQuestionsCount: number;
  isQuiz: boolean;
  backHref: string;
};

export default function AssignmentReviewOverviewCard({
  assignment,
  submission,
  wrongQuestionsCount,
  isQuiz,
  backHref
}: AssignmentReviewOverviewCardProps) {
  return (
    <Card title="作业概览" tag="概览">
      <div className="grid grid-2">
        <div className="card feature-card">
          <EduIcon name="board" />
          <div className="section-title">{assignment.title}</div>
          <p>截止日期：{new Date(assignment.dueDate).toLocaleDateString("zh-CN")}</p>
        </div>
        <div className="card feature-card">
          <EduIcon name="chart" />
          <div className="section-title">作业成绩</div>
          <p>{isQuiz ? `得分：${submission?.score ?? 0}/${submission?.total ?? 0}` : "待评分"}</p>
          <div className="pill-list">
            <span className="pill">错题 {wrongQuestionsCount} 题</span>
            <span className="pill">{ASSIGNMENT_TYPE_LABELS[assignment.submissionType ?? "quiz"]}</span>
          </div>
          {submission?.submissionText ? (
            <div style={{ marginTop: 8, fontSize: 12, color: "var(--ink-1)" }}>
              {assignment.submissionType === "essay" ? "作文内容" : "学生备注"}：{submission.submissionText}
            </div>
          ) : null}
        </div>
      </div>
      <Link className="button ghost" href={backHref} style={{ marginTop: 12 }}>
        返回作业详情
      </Link>
    </Card>
  );
}
