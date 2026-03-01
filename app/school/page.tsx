"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Card from "@/components/Card";
import Stat from "@/components/Stat";
import EduIcon from "@/components/EduIcon";

type Overview = {
  schoolId: string;
  teacherCount: number;
  studentCount: number;
  parentCount: number;
  classCount: number;
  assignmentCount: number;
};

type ClassItem = {
  id: string;
  name: string;
  subject: string;
  grade: string;
  studentCount: number;
  assignmentCount: number;
};

type UserItem = {
  id: string;
  name: string;
  email: string;
  role: "teacher" | "student" | "parent" | "school_admin";
  grade?: string;
};

export default function SchoolPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [teachers, setTeachers] = useState<UserItem[]>([]);
  const [students, setStudents] = useState<UserItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setError(null);
      const [overviewRes, classRes, teacherRes, studentRes] = await Promise.all([
        fetch("/api/school/overview"),
        fetch("/api/school/classes"),
        fetch("/api/school/users?role=teacher"),
        fetch("/api/school/users?role=student")
      ]);

      const [overviewData, classData, teacherData, studentData] = await Promise.all([
        overviewRes.json(),
        classRes.json(),
        teacherRes.json(),
        studentRes.json()
      ]);

      if (!overviewRes.ok) {
        setError(overviewData?.error ?? "加载学校概览失败");
        return;
      }

      setOverview(overviewData.data ?? null);
      setClasses(classData.data ?? []);
      setTeachers(teacherData.data ?? []);
      setStudents(studentData.data ?? []);
    })();
  }, []);

  if (error) {
    return <Card title="学校控制台">{error}</Card>;
  }

  if (!overview) {
    return <Card title="学校控制台">加载中...</Card>;
  }

  return (
    <div className="grid" style={{ gap: 18 }}>
      <div className="section-head">
        <div>
          <h2>学校控制台</h2>
          <div className="section-sub">学校管理员可见的组织数据与教学执行视图。</div>
        </div>
        <span className="chip">School Admin</span>
      </div>

      <Card title="组织概览" tag="租户隔离">
        <div className="feature-card">
          <EduIcon name="chart" />
          <p>当前学校ID：{overview.schoolId}</p>
        </div>
        <div className="grid grid-3">
          <Stat label="教师数" value={String(overview.teacherCount)} helper="学校范围" />
          <Stat label="学生数" value={String(overview.studentCount)} helper="学校范围" />
          <Stat label="家长数" value={String(overview.parentCount)} helper="学校范围" />
          <Stat label="班级数" value={String(overview.classCount)} helper="学校范围" />
          <Stat label="作业数" value={String(overview.assignmentCount)} helper="学校范围" />
        </div>
      </Card>

      <div className="grid grid-2">
        <Card title="班级管理" tag="组织">
          <div className="section-sub">按学校隔离的班级列表与作业负载。</div>
          <div className="grid" style={{ gap: 8, marginTop: 8 }}>
            {classes.slice(0, 6).map((item) => (
              <div className="card" key={item.id}>
                <div className="section-title">{item.name}</div>
                <div style={{ fontSize: 12, color: "var(--ink-1)" }}>
                  {item.subject} · {item.grade}年级 · {item.studentCount}人 · {item.assignmentCount}份作业
                </div>
              </div>
            ))}
          </div>
          <Link className="button secondary" href="/school/classes" style={{ marginTop: 12 }}>
            查看全部班级
          </Link>
        </Card>

        <Card title="教师与学生" tag="成员">
          <div className="grid" style={{ gap: 8 }}>
            <div className="card">
              <div className="section-title">教师（前5）</div>
              {teachers.slice(0, 5).map((teacher) => (
                <div key={teacher.id} style={{ fontSize: 13, marginTop: 4 }}>
                  {teacher.name} · {teacher.email}
                </div>
              ))}
            </div>
            <div className="card">
              <div className="section-title">学生（前5）</div>
              {students.slice(0, 5).map((student) => (
                <div key={student.id} style={{ fontSize: 13, marginTop: 4 }}>
                  {student.name} · {student.grade ? `${student.grade}年级` : "未设置年级"}
                </div>
              ))}
            </div>
          </div>
          <div className="cta-row" style={{ marginTop: 12 }}>
            <Link className="button secondary" href="/school/teachers">
              教师管理
            </Link>
            <Link className="button ghost" href="/school/students">
              学生管理
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
