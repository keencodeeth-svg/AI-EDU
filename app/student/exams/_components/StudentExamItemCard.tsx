import Link from "next/link";
import EduIcon from "@/components/EduIcon";
import { SUBJECT_LABELS } from "@/lib/constants";
import type { StudentExamItem } from "../types";
import { getExamCtaLabel, getExamStageLabel, getExamSubmissionLabel } from "../utils";

type StudentExamItemCardProps = {
  item: StudentExamItem;
};

export default function StudentExamItemCard({ item }: StudentExamItemCardProps) {
  return (
    <div className="card exams-item-card">
      <div className="card-header">
        <div className="section-title">{item.title}</div>
        <span className="card-tag">{getExamSubmissionLabel(item.status)}</span>
      </div>
      <div className="feature-card">
        <EduIcon name="pencil" />
        <p>
          {item.className} · {SUBJECT_LABELS[item.classSubject] ?? item.classSubject} · {item.classGrade} 年级
        </p>
      </div>
      <div className="pill-list" style={{ marginTop: 8 }}>
        <span className="pill">{getExamStageLabel(item)}</span>
        <span className="pill">发布 {item.publishMode === "teacher_assigned" ? "班级统一" : "定向"}</span>
        <span className="pill">监测 {item.antiCheatLevel === "basic" ? "开启" : "关闭"}</span>
        {item.startAt ? (
          <span className="pill">开始 {new Date(item.startAt).toLocaleString("zh-CN")}</span>
        ) : (
          <span className="pill">可立即开始</span>
        )}
        <span className="pill">截止 {new Date(item.endAt).toLocaleString("zh-CN")}</span>
        <span className="pill">时长 {item.durationMinutes ? `${item.durationMinutes} 分钟` : "不限"}</span>
        {item.status === "submitted" ? (
          <span className="pill">
            得分 {item.score ?? 0}/{item.total ?? 0}
          </span>
        ) : null}
      </div>
      {item.status !== "submitted" && item.lockReason ? (
        <div style={{ marginTop: 8, fontSize: 12, color: "#b42318" }}>{item.lockReason}</div>
      ) : null}
      <Link className="button secondary" href={`/student/exams/${item.id}`} style={{ marginTop: 10 }}>
        {getExamCtaLabel(item)}
      </Link>
    </div>
  );
}
