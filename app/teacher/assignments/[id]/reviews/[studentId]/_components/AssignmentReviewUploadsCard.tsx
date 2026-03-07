import Image from "next/image";
import Card from "@/components/Card";
import type { TeacherAssignmentUpload } from "../types";

type AssignmentReviewUploadsCardProps = {
  uploads: TeacherAssignmentUpload[];
};

export default function AssignmentReviewUploadsCard({ uploads }: AssignmentReviewUploadsCardProps) {
  return (
    <Card title="学生上传作业" tag="附件">
      <div className="grid" style={{ gap: 10 }}>
        {uploads.map((item) => (
          <div className="card" key={item.id}>
            <div className="section-title">{item.fileName}</div>
            <div style={{ fontSize: 12, color: "var(--ink-1)" }}>
              {Math.round(item.size / 1024)} KB · {new Date(item.createdAt).toLocaleString("zh-CN")}
            </div>
            {item.mimeType.startsWith("image/") ? (
              <Image
                src={`data:${item.mimeType};base64,${item.contentBase64}`}
                alt={item.fileName}
                width={640}
                height={420}
                sizes="(max-width: 768px) 100vw, 420px"
                style={{ width: "100%", height: "auto", maxWidth: 420, marginTop: 8, borderRadius: 12 }}
                unoptimized
              />
            ) : (
              <a
                href={`data:${item.mimeType};base64,${item.contentBase64}`}
                download={item.fileName}
                style={{ marginTop: 8, display: "inline-block" }}
              >
                下载附件
              </a>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
