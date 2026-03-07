import Link from "next/link";
import EduIcon from "@/components/EduIcon";
import { ASSIGNMENT_TYPE_LABELS, SUBJECT_LABELS } from "@/lib/constants";
import type { StudentAssignmentItem } from "../types";
import {
  getStudentAssignmentCompletionText,
  getStudentAssignmentCtaLabel,
  getStudentAssignmentStatusLabel,
  getStudentAssignmentUrgencyLabel
} from "../utils";

type StudentAssignmentDetailedCardProps = {
  item: StudentAssignmentItem;
};

export default function StudentAssignmentDetailedCard({ item }: StudentAssignmentDetailedCardProps) {
  const urgencyLabel = getStudentAssignmentUrgencyLabel(item);

  return (
    <div className="card assignment-detail-card">
      <div className="card-header">
        <div className="section-title">{item.title}</div>
        <span className="card-tag">{getStudentAssignmentStatusLabel(item.status)}</span>
      </div>
      <div className="feature-card">
        <EduIcon name="pencil" />
        <p>
          {item.className} · {SUBJECT_LABELS[item.classSubject] ?? item.classSubject} · {item.classGrade} 年级
        </p>
        {item.moduleTitle ? <div style={{ fontSize: 12, color: "var(--ink-1)" }}>模块：{item.moduleTitle}</div> : null}
      </div>
      <div className="pill-list" style={{ marginTop: 8 }}>
        <span className="pill">截止 {new Date(item.dueDate).toLocaleDateString("zh-CN")}</span>
        <span className="pill">{ASSIGNMENT_TYPE_LABELS[item.submissionType ?? "quiz"]}</span>
        <span className="pill">{getStudentAssignmentCompletionText(item)}</span>
        {urgencyLabel ? <span className="pill">{urgencyLabel}</span> : null}
      </div>
      <Link className="button secondary" href={`/student/assignments/${item.id}`} style={{ marginTop: 8 }}>
        {getStudentAssignmentCtaLabel(item.status)}
      </Link>
    </div>
  );
}
