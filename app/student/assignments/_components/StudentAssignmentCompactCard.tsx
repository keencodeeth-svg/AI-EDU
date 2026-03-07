import Link from "next/link";
import { ASSIGNMENT_TYPE_LABELS, SUBJECT_LABELS } from "@/lib/constants";
import type { StudentAssignmentItem } from "../types";
import {
  getStudentAssignmentCompactCtaLabel,
  getStudentAssignmentCompletionText,
  getStudentAssignmentStatusLabel,
  getStudentAssignmentUrgencyLabel
} from "../utils";

type StudentAssignmentCompactCardProps = {
  item: StudentAssignmentItem;
};

export default function StudentAssignmentCompactCard({ item }: StudentAssignmentCompactCardProps) {
  const urgencyLabel = getStudentAssignmentUrgencyLabel(item);

  return (
    <div
      className="card assignment-compact-card"
      style={{
        padding: 10,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <div className="section-title" style={{ fontSize: 14 }}>
            {item.title}
          </div>
          <span className="card-tag">{getStudentAssignmentStatusLabel(item.status)}</span>
          {urgencyLabel ? <span className="pill">{urgencyLabel}</span> : null}
        </div>
        <div
          style={{
            marginTop: 4,
            fontSize: 12,
            color: "var(--ink-1)",
            display: "flex",
            flexWrap: "wrap",
            gap: 8
          }}
        >
          <span>
            {item.className} · {SUBJECT_LABELS[item.classSubject] ?? item.classSubject}
          </span>
          <span>截止 {new Date(item.dueDate).toLocaleDateString("zh-CN")}</span>
          <span>{ASSIGNMENT_TYPE_LABELS[item.submissionType ?? "quiz"]}</span>
          <span>{getStudentAssignmentCompletionText(item)}</span>
        </div>
      </div>
      <Link className="button secondary assignment-compact-action" href={`/student/assignments/${item.id}`}>
        {getStudentAssignmentCompactCtaLabel(item.status)}
      </Link>
    </div>
  );
}
