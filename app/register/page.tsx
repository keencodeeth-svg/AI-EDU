"use client";

import { useState } from "react";
import Link from "next/link";
import Card from "@/components/Card";
import { GRADE_OPTIONS } from "@/lib/constants";

export default function RegisterPage() {
  const [role, setRole] = useState<"student" | "parent">("student");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [grade, setGrade] = useState("4");
  const [schoolCode, setSchoolCode] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [observerCode, setObserverCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const payload: any = { role, name, email, password };
    if (role === "student") {
      payload.grade = grade;
      payload.schoolCode = schoolCode || undefined;
    }
    if (role === "parent") {
      payload.observerCode = observerCode;
      payload.studentEmail = studentEmail;
    }

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data?.error ?? "注册失败");
    } else {
      setMessage("注册成功，请登录。");
      setName("");
      setEmail("");
      setPassword("");
      setSchoolCode("");
      setStudentEmail("");
      setObserverCode("");
    }
    setLoading(false);
  }

  return (
    <div className="grid auth-page" style={{ gap: 18 }}>
      <div className="section-head">
        <div>
          <h2>账号注册</h2>
          <div className="section-sub">创建学生或家长账号，进入学习空间。</div>
        </div>
        <span className="chip">学生/家长</span>
      </div>
      <Card title="注册" tag="账户">
        <form onSubmit={handleSubmit} className="auth-form">
          <label className="form-field">
            <div className="section-title">角色</div>
            <select
              className="form-control"
              value={role}
              onChange={(event) => setRole(event.target.value as "student" | "parent")}
            >
              <option value="student">学生</option>
              <option value="parent">家长</option>
            </select>
          </label>
          <label className="form-field">
            <div className="section-title">姓名</div>
            <input
              className="form-control"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label className="form-field">
            <div className="section-title">邮箱</div>
            <input
              className="form-control"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label className="form-field">
            <div className="section-title">密码</div>
            <input
              className="form-control"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <div className="form-note">
              默认建议至少 8 位，包含大写字母、小写字母和数字（以系统配置为准）。
            </div>
          </label>
          {role === "student" ? (
            <>
              <label className="form-field">
                <div className="section-title">年级</div>
                <select
                  className="form-control"
                  value={grade}
                  onChange={(event) => setGrade(event.target.value)}
                >
                  {GRADE_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                <div className="section-title">学校编码（可选）</div>
                <input
                  className="form-control"
                  value={schoolCode}
                  onChange={(event) => setSchoolCode(event.target.value)}
                  placeholder="例如 HKHS01，不填则归入默认学校"
                />
              </label>
            </>
          ) : (
            <>
              <label className="form-field">
                <div className="section-title">绑定码（推荐）</div>
                <input
                  className="form-control"
                  value={observerCode}
                  onChange={(event) => setObserverCode(event.target.value)}
                  placeholder="学生资料页获取绑定码"
                />
              </label>
              <label className="form-field">
                <div className="section-title">绑定学生邮箱（可选）</div>
                <input
                  className="form-control"
                  value={studentEmail}
                  onChange={(event) => setStudentEmail(event.target.value)}
                  placeholder="student@demo.com"
                />
              </label>
            </>
          )}

          {error ? <div className="status-note error">{error}</div> : null}
          {message ? <div className="status-note success">{message}</div> : null}

          <button className="button primary" type="submit" disabled={loading}>
            {loading ? "提交中..." : "注册"}
          </button>
        </form>
        <div className="auth-footnote">
          已有账号？<Link href="/login">去登录</Link>
        </div>
        <div className="pill-list" style={{ marginTop: 10 }}>
          <span className="pill">支持 K12 学段</span>
          <span className="pill">多学科同步</span>
          <span className="pill">家校协同</span>
        </div>
      </Card>
    </div>
  );
}
