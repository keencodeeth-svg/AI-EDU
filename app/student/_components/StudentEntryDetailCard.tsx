import type { FormEvent } from "react";
import Link from "next/link";
import Card from "@/components/Card";
import EduIcon from "@/components/EduIcon";
import type { EntryItem, JoinMessage } from "../types";

type StudentEntryDetailCardProps = {
  item: EntryItem;
  joinCode: string;
  joinMessage: JoinMessage | null;
  pendingJoinCount: number;
  onJoinClass: (event: FormEvent<HTMLFormElement>) => void;
  onJoinCodeChange: (value: string) => void;
};

export default function StudentEntryDetailCard({
  item,
  joinCode,
  joinMessage,
  pendingJoinCount,
  onJoinClass,
  onJoinCodeChange
}: StudentEntryDetailCardProps) {
  if (item.kind === "join") {
    return (
      <Card title={item.title} tag={item.tag}>
        <div className="feature-card">
          <EduIcon name={item.icon} />
          <p>{item.description}</p>
        </div>
        <form className="compact-form" onSubmit={onJoinClass}>
          <input
            className="form-control"
            value={joinCode}
            onChange={(event) => onJoinCodeChange(event.target.value)}
            placeholder="输入老师提供的邀请码"
          />
          <button className="button primary" type="submit">
            {item.cta}
          </button>
        </form>
        {joinMessage ? <div className={`status-note ${joinMessage.tone}`}>{joinMessage.text}</div> : null}
        {pendingJoinCount ? <p className="meta-note">已有 {pendingJoinCount} 条待审核申请。</p> : null}
      </Card>
    );
  }

  if (!item.href) {
    return null;
  }

  return (
    <Card title={item.title} tag={item.tag}>
      <div className="feature-card">
        <EduIcon name={item.icon} />
        <p>{item.description}</p>
      </div>
      <div className="cta-row entry-card-actions">
        <Link className="button secondary" href={item.href}>
          {item.cta}
        </Link>
      </div>
    </Card>
  );
}
