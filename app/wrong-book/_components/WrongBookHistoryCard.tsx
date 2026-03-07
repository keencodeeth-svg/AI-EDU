import Card from "@/components/Card";
import MathText from "@/components/MathText";
import type { WrongBookItem } from "../types";
import { formatDateTime } from "../utils";

type WrongBookHistoryCardProps = {
  list: WrongBookItem[];
};

export default function WrongBookHistoryCard({ list }: WrongBookHistoryCardProps) {
  return (
    <Card title="错题本" tag="复盘">
      <div className="grid" style={{ gap: 12 }}>
        {list.length === 0 ? <p>暂无错题，继续保持！</p> : null}
        {list.map((item) => (
          <div className="card" key={item.id}>
            <div className="section-title">
              <MathText text={item.stem} />
            </div>
            <MathText as="p" text={item.explanation} />
            <div style={{ fontSize: 12, color: "var(--ink-1)" }}>
              最近答题：{formatDateTime(item.lastAttemptAt)} · 上次复练结果：{item.lastReviewResult ?? "-"} · 下次复练：{formatDateTime(item.nextReviewAt)}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
