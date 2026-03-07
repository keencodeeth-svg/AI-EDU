"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Card from "@/components/Card";
import { ASSIGNMENT_TYPE_LABELS, SUBJECT_LABELS } from "@/lib/constants";
import AssignmentStatsDistributionCard from "./_components/AssignmentStatsDistributionCard";
import AssignmentStatsOverviewCard from "./_components/AssignmentStatsOverviewCard";
import AssignmentStatsQuestionsCard from "./_components/AssignmentStatsQuestionsCard";
import type { AssignmentStatsData } from "./types";
import { getDistributionMaxCount } from "./utils";

export default function AssignmentStatsPage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<AssignmentStatsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/teacher/assignments/${params.id}/stats`)
      .then((res) => res.json())
      .then((payload: AssignmentStatsData & { error?: string }) => {
        if (payload?.error) {
          setError(payload.error);
        } else {
          setData(payload);
        }
      });
  }, [params.id]);

  const maxCount = useMemo(() => getDistributionMaxCount(data?.distribution ?? []), [data?.distribution]);

  if (error) {
    return (
      <Card title="作业统计">
        <p>{error}</p>
        <Link className="button secondary" href={`/teacher/assignments/${params.id}`} style={{ marginTop: 12 }}>
          返回作业详情
        </Link>
      </Card>
    );
  }

  if (!data) {
    return <Card title="作业统计">加载中...</Card>;
  }

  return (
    <div className="grid" style={{ gap: 18 }}>
      <div className="section-head">
        <div>
          <h2>作业统计</h2>
          <div className="section-sub">
            {data.class.name} · {SUBJECT_LABELS[data.class.subject] ?? data.class.subject} · {data.class.grade} 年级
          </div>
        </div>
        <span className="chip">{ASSIGNMENT_TYPE_LABELS[data.assignment.submissionType ?? "quiz"]}</span>
      </div>

      <AssignmentStatsOverviewCard assignmentId={params.id} summary={data.summary} />
      <AssignmentStatsDistributionCard distribution={data.distribution} maxCount={maxCount} />
      <AssignmentStatsQuestionsCard questionStats={data.questionStats} />
    </div>
  );
}
