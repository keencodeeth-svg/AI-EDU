import type { ReactNode } from "react";
import EduIcon from "@/components/EduIcon";

type StateTone = "loading" | "empty" | "info" | "error" | "success";

const TONE_META: Record<StateTone, { icon: "book" | "rocket" | "chart" | "puzzle" | "trophy"; badge: string }> = {
  loading: { icon: "rocket", badge: "加载中" },
  empty: { icon: "book", badge: "空状态" },
  info: { icon: "chart", badge: "提示" },
  error: { icon: "puzzle", badge: "异常" },
  success: { icon: "trophy", badge: "完成" }
};

export default function StatePanel({
  title,
  description,
  tone = "info",
  compact = false,
  action,
  children
}: {
  title: string;
  description?: string;
  tone?: StateTone;
  compact?: boolean;
  action?: ReactNode;
  children?: ReactNode;
}) {
  const meta = TONE_META[tone];

  return (
    <div className={`state-panel state-panel-${tone}${compact ? " compact" : ""}`}>
      <div className="state-panel-icon" aria-hidden="true">
        <EduIcon name={meta.icon} />
      </div>
      <div className="state-panel-content">
        <div className="state-panel-badge">{meta.badge}</div>
        <div className="state-panel-title">{title}</div>
        {description ? <div className="state-panel-description">{description}</div> : null}
        {children ? <div className="state-panel-children">{children}</div> : null}
        {action ? <div className="state-panel-action">{action}</div> : null}
      </div>
    </div>
  );
}
