import type { FormEvent } from "react";
import Link from "next/link";
import type { EntryItem, JoinMessage } from "../types";

type StudentEntryCompactCardProps = {
  item: EntryItem;
  joinCode: string;
  joinMessage: JoinMessage | null;
  onJoinClass: (event: FormEvent<HTMLFormElement>) => void;
  onJoinCodeChange: (value: string) => void;
};

export default function StudentEntryCompactCard({ item, joinCode, joinMessage, onJoinClass, onJoinCodeChange }: StudentEntryCompactCardProps) {
  if (item.kind === "join") {
    return (
      <div
        style={{
          border: "1px solid var(--stroke)",
          borderRadius: 12,
          background: "rgba(255,255,255,0.72)",
          padding: 10,
          display: "grid",
          gap: 8
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{item.title}</div>
            <div style={{ fontSize: 12, color: "var(--ink-1)" }}>{item.description}</div>
          </div>
          <span className="badge">{item.tag}</span>
        </div>
        <form className="compact-form" onSubmit={onJoinClass}>
          <input
            className="form-control"
            value={joinCode}
            onChange={(event) => onJoinCodeChange(event.target.value)}
            placeholder="输入老师提供的邀请码"
          />
          <button className="button secondary" type="submit">
            {item.cta}
          </button>
        </form>
        {joinMessage ? <div className={`status-note ${joinMessage.tone}`}>{joinMessage.text}</div> : null}
      </div>
    );
  }

  if (!item.href) {
    return null;
  }

  return (
    <div
      style={{
        border: "1px solid var(--stroke)",
        borderRadius: 12,
        background: "rgba(255,255,255,0.72)",
        padding: 10
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{item.title}</div>
          <div
            style={{
              marginTop: 4,
              fontSize: 12,
              color: "var(--ink-1)",
              display: "-webkit-box",
              WebkitLineClamp: 1,
              WebkitBoxOrient: "vertical",
              overflow: "hidden"
            }}
          >
            {item.description}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="badge">{item.tag}</span>
          <Link className="button secondary" href={item.href}>
            {item.cta}
          </Link>
        </div>
      </div>
    </div>
  );
}
