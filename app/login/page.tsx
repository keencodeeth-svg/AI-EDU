"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/Card";
import { trackEvent } from "@/lib/analytics-client";

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<"student" | "teacher" | "parent" | "admin">("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const roleOptions = [
    { value: "student" as const, label: "学生", desc: "学习/练习/作业" },
    { value: "teacher" as const, label: "教师", desc: "作业发布/批改/分析" },
    { value: "parent" as const, label: "家长", desc: "周报/监督/提醒" },
    { value: "admin" as const, label: "管理员", desc: "题库/知识点/日志" }
  ];

  const placeholderMap: Record<typeof role, string> = {
    student: "student@demo.com",
    teacher: "teacher@demo.com",
    parent: "parent@demo.com",
    admin: "admin@demo.com"
  };

  useEffect(() => {
    trackEvent({
      eventName: "login_page_view",
      page: "/login",
      props: { entry: "direct" }
    });
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error ?? "登录失败");
      }

      trackEvent({
        eventName: "login_success",
        page: "/login",
        entityId: data.role ?? role,
        props: {
          selectedRole: role,
          actualRole: data.role ?? role
        }
      });

      if (data.role === "admin") {
        router.push("/admin");
      } else if (data.role === "teacher") {
        router.push("/teacher");
      } else if (data.role === "parent") {
        router.push("/parent");
      } else {
        router.push("/student");
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid" style={{ gap: 18, maxWidth: 520 }}>
      <div className="section-head">
        <div>
          <h2>登录航科AI教育</h2>
          <div className="section-sub">进入学生、教师、家长与管理端的学习空间。</div>
        </div>
        <span className="chip">账号中心</span>
      </div>
      <Card title="登录" tag="入口">
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
          <div>
            <div className="section-title">选择身份</div>
            <div className="role-grid">
              {roleOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`role-card${role === option.value ? " active" : ""}`}
                  onClick={() => setRole(option.value)}
                >
                  <div className="role-title">{option.label}</div>
                  <div className="role-desc">{option.desc}</div>
                </button>
              ))}
            </div>
          </div>
          <label>
            <div className="section-title">邮箱</div>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={placeholderMap[role]}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
            />
          </label>
          <label>
            <div className="section-title">密码</div>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Student123"
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
            />
          </label>
          {error ? <div style={{ color: "#b42318", fontSize: 13 }}>{error}</div> : null}
          <button className="button primary" type="submit" disabled={loading}>
            {loading ? "登录中..." : "登录"}
          </button>
        </form>
        <div style={{ marginTop: 12, fontSize: 13, color: "var(--ink-1)" }}>
          演示账号：student@demo.com / Student123（可切换身份后登录）
        </div>
        <div className="pill-list" style={{ marginTop: 12 }}>
          <span className="pill">学生注册</span>
          <span className="pill">家长注册</span>
          <span className="pill">教师注册</span>
          <span className="pill">管理员注册</span>
        </div>
        <div style={{ marginTop: 8, fontSize: 13, color: "var(--ink-1)" }}>
          没有账号？<a href="/register">去注册</a>
        </div>
        <div style={{ marginTop: 6, fontSize: 13, color: "var(--ink-1)" }}>
          教师注册：<a href="/teacher/register">去注册</a>
        </div>
        <div style={{ marginTop: 6, fontSize: 13, color: "var(--ink-1)" }}>
          管理员注册：<a href="/admin/register">去注册</a>
        </div>
      </Card>
    </div>
  );
}
