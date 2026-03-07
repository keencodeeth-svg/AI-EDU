import Link from "next/link";
import Card from "@/components/Card";
import EduIcon from "@/components/EduIcon";
import StatePanel from "@/components/StatePanel";
import { getCurrentUser } from "@/lib/auth";
import { getDashboardOverview } from "@/lib/dashboard-overview";

const ALERT_TONE: Record<"high" | "medium" | "info", { bg: string; border: string; text: string; label: string }> = {
  high: {
    bg: "rgba(220, 38, 38, 0.08)",
    border: "rgba(220, 38, 38, 0.24)",
    text: "#b42318",
    label: "高优先级"
  },
  medium: {
    bg: "rgba(245, 158, 11, 0.08)",
    border: "rgba(245, 158, 11, 0.22)",
    text: "#b45309",
    label: "建议尽快处理"
  },
  info: {
    bg: "rgba(59, 130, 246, 0.08)",
    border: "rgba(59, 130, 246, 0.2)",
    text: "#1d4ed8",
    label: "提醒"
  }
};

const TIMELINE_ICON = {
  assignment: "board",
  notification: "rocket",
  thread: "puzzle",
  review: "brain"
} as const;

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="grid" style={{ gap: 18 }}>
        <div className="section-head">
          <div>
            <h2>学习看板</h2>
            <div className="section-sub">请先登录，再查看你的专属工作台。</div>
          </div>
          <span className="chip">Dashboard</span>
        </div>
        <Card title="登录后查看总看板" tag="登录">
          <StatePanel
            tone="info"
            title="登录后查看你的专属工作台"
            description="系统会根据身份展示最值得先做的任务、提醒和快捷入口。"
            action={
              <Link className="button primary" href="/login">
                去登录
              </Link>
            }
          />
        </Card>
      </div>
    );
  }

  const overview = await getDashboardOverview(user);

  return (
    <div className="grid" style={{ gap: 18 }}>
      <div className="section-head">
        <div>
          <h2>总看板</h2>
          <div className="section-sub">按身份汇总提醒、任务、沟通与最值得先做的动作。</div>
        </div>
        <span className="chip">{overview.roleLabel}工作台</span>
      </div>

      <Card title="今日重点" tag="Overview">
        <div className="hero" style={{ alignItems: "stretch" }}>
          <div className="hero-stage" style={{ minHeight: 220 }}>
            <div className="badge" style={{ marginBottom: 10 }}>{overview.roleLabel}模式</div>
            <h1 style={{ fontSize: "clamp(24px, 3vw, 36px)", marginBottom: 10 }}>{overview.title}</h1>
            <p>{overview.subtitle}</p>
            <div className="cta-row">
              {overview.quickActions.slice(0, 2).map((action) => (
                <Link key={action.id} className={`button ${action.tone}`} href={action.href}>
                  {action.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="grid" style={{ gap: 12 }}>
            {overview.metrics.map((metric) => (
              <div key={metric.id} className="card feature-card">
                <EduIcon name="chart" />
                <div>
                  <div className="section-title">{metric.label}</div>
                  <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.1 }}>{metric.value}</div>
                  {metric.helper ? (
                    <div style={{ marginTop: 6, fontSize: 12, color: "var(--ink-1)" }}>{metric.helper}</div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid grid-2" style={{ alignItems: "start" }}>
        <Card title="优先提醒" tag="Alerts">
          <div className="grid" style={{ gap: 10 }}>
            {overview.alerts.length ? (
              overview.alerts.map((alert) => {
                const tone = ALERT_TONE[alert.level];
                return (
                  <div
                    key={alert.id}
                    style={{
                      display: "grid",
                      gap: 8,
                      padding: 14,
                      borderRadius: 18,
                      background: tone.bg,
                      border: `1px solid ${tone.border}`
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                      <div className="section-title" style={{ margin: 0 }}>{alert.title}</div>
                      <span className="pill" style={{ color: tone.text }}>{tone.label}</span>
                    </div>
                    <div style={{ color: "var(--ink-1)", lineHeight: 1.6 }}>{alert.detail}</div>
                    {alert.href ? (
                      <div className="cta-row no-margin">
                        <Link className="button secondary" href={alert.href}>
                          {alert.actionLabel ?? "立即处理"}
                        </Link>
                      </div>
                    ) : null}
                  </div>
                );
              })
            ) : (
              <StatePanel
                tone="success"
                title="当前没有高优先级提醒"
                description="今天的关键任务和消息比较平稳，可以按计划推进。"
              />
            )}
          </div>
        </Card>

        <Card title="快捷动作" tag="Actions">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 10
            }}
          >
            {overview.quickActions.map((action) => (
              <Link key={action.id} href={action.href} className="card" style={{ textDecoration: "none", color: "inherit" }}>
                <div className="section-title" style={{ marginBottom: 6 }}>{action.label}</div>
                <div style={{ fontSize: 13, color: "var(--ink-1)", lineHeight: 1.6 }}>{action.description}</div>
                <div className="cta-row cta-row-tight">
                  <span className={`button ${action.tone}`}>立即进入</span>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      </div>

      <Card title="最近动态" tag="Timeline">
        <div className="grid" style={{ gap: 10 }}>
          {overview.timeline.length ? (
            overview.timeline.map((item) => {
              const tone = ALERT_TONE[item.status ?? "info"];
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className="card"
                  style={{
                    textDecoration: "none",
                    color: "inherit",
                    display: "grid",
                    gap: 8,
                    borderLeft: `4px solid ${tone.border}`
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ display: "flex", gap: 10 }}>
                      <div style={{ marginTop: 2 }}>
                        <EduIcon name={TIMELINE_ICON[item.type]} />
                      </div>
                      <div>
                        <div className="section-title" style={{ marginBottom: 4 }}>{item.title}</div>
                        <div style={{ color: "var(--ink-1)", lineHeight: 1.6 }}>{item.detail}</div>
                      </div>
                    </div>
                    <span className="pill" style={{ whiteSpace: "nowrap" }}>{item.meta}</span>
                  </div>
                </Link>
              );
            })
          ) : (
            <StatePanel
              tone="empty"
              title="最近没有新的动态"
              description="你可以从上方快捷动作进入核心功能，继续推进今天的任务。"
            />
          )}
        </div>
      </Card>
    </div>
  );
}
