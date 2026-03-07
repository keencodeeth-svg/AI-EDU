"use client";

import { useEffect, useMemo, useState } from "react";
import AnalysisAlertsCard from "./_components/AnalysisAlertsCard";
import AnalysisCausalityCard from "./_components/AnalysisCausalityCard";
import AnalysisFavoritesCard from "./_components/AnalysisFavoritesCard";
import AnalysisFiltersCard from "./_components/AnalysisFiltersCard";
import AnalysisHeatmapCard from "./_components/AnalysisHeatmapCard";
import AnalysisReportCard from "./_components/AnalysisReportCard";
import type {
  AnalysisAlertImpactData,
  AnalysisAlertItem,
  AnalysisAlertSummary,
  AnalysisClassItem,
  AnalysisFavoriteItem,
  AnalysisHeatItem,
  AnalysisInterventionCausalityItem,
  AnalysisInterventionCausalitySummary,
  AnalysisParentCollaborationSummary,
  AnalysisReportData,
  AnalysisStudentItem,
  TeacherAlertActionType
} from "./types";

export default function TeacherAnalysisPage() {
  const [classes, setClasses] = useState<AnalysisClassItem[]>([]);
  const [classId, setClassId] = useState("");
  const [heatmap, setHeatmap] = useState<AnalysisHeatItem[]>([]);
  const [report, setReport] = useState<AnalysisReportData | null>(null);
  const [heatmapLoading, setHeatmapLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [students, setStudents] = useState<AnalysisStudentItem[]>([]);
  const [studentId, setStudentId] = useState("");
  const [favorites, setFavorites] = useState<AnalysisFavoriteItem[]>([]);
  const [alerts, setAlerts] = useState<AnalysisAlertItem[]>([]);
  const [alertSummary, setAlertSummary] = useState<AnalysisAlertSummary | null>(null);
  const [parentCollaboration, setParentCollaboration] = useState<AnalysisParentCollaborationSummary | null>(null);
  const [acknowledgingAlertId, setAcknowledgingAlertId] = useState<string | null>(null);
  const [actingAlertKey, setActingAlertKey] = useState<string | null>(null);
  const [alertActionMessage, setAlertActionMessage] = useState<string | null>(null);
  const [impactByAlertId, setImpactByAlertId] = useState<Record<string, AnalysisAlertImpactData>>({});
  const [loadingImpactId, setLoadingImpactId] = useState<string | null>(null);
  const [causalitySummary, setCausalitySummary] = useState<AnalysisInterventionCausalitySummary | null>(null);
  const [causalityItems, setCausalityItems] = useState<AnalysisInterventionCausalityItem[]>([]);
  const [causalityLoading, setCausalityLoading] = useState(false);
  const [causalityDays, setCausalityDays] = useState(14);

  useEffect(() => {
    fetch("/api/teacher/classes")
      .then((res) => res.json())
      .then((data) => setClasses(data.data ?? []));
  }, []);

  useEffect(() => {
    if (!classId && classes.length) {
      setClassId(classes[0].id);
    }
  }, [classes, classId]);

  async function loadHeatmap(targetId: string) {
    setHeatmapLoading(true);
    const res = await fetch(`/api/teacher/insights/heatmap?classId=${targetId}`);
    const data = await res.json();
    setHeatmap(data?.data?.items ?? []);
    setHeatmapLoading(false);
  }

  async function loadAlerts(targetId: string) {
    const res = await fetch(`/api/teacher/alerts?classId=${targetId}&includeAcknowledged=true`);
    const data = await res.json();
    setAlerts(data?.data?.alerts ?? []);
    setAlertSummary(data?.data?.summary ?? null);
  }

  async function loadTeacherSummary() {
    const res = await fetch("/api/teacher/insights");
    const data = await res.json();
    setParentCollaboration(data?.summary?.parentCollaboration ?? null);
  }

  async function loadInterventionCausality(targetId: string, days: number) {
    setCausalityLoading(true);
    const res = await fetch(`/api/teacher/insights/intervention-causality?classId=${targetId}&days=${days}`);
    const data = await res.json();
    setCausalitySummary(data?.data?.summary ?? null);
    setCausalityItems(data?.data?.items ?? []);
    setCausalityLoading(false);
  }

  useEffect(() => {
    if (classId) {
      loadHeatmap(classId);
      loadAlerts(classId);
      loadTeacherSummary();
      loadInterventionCausality(classId, causalityDays);
    }
  }, [classId, causalityDays]);

  async function acknowledgeAlert(alertId: string) {
    setAcknowledgingAlertId(alertId);
    const res = await fetch(`/api/teacher/alerts/${alertId}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actionType: "mark_done" })
    });
    if (res.ok && classId) {
      await loadAlerts(classId);
    }
    setAcknowledgingAlertId(null);
  }

  async function runAlertAction(alertId: string, actionType: TeacherAlertActionType) {
    const actionKey = `${alertId}:${actionType}`;
    setActingAlertKey(actionKey);
    setAlertActionMessage(null);
    const res = await fetch(`/api/teacher/alerts/${alertId}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actionType })
    });
    const data = await res.json();
    if (!res.ok) {
      setAlertActionMessage(data?.error ?? "执行失败");
      setActingAlertKey(null);
      return;
    }
    setAlertActionMessage(data?.data?.result?.message ?? "动作已执行");
    if (classId) {
      await loadAlerts(classId);
    }
    await loadAlertImpact(alertId, true);
    setActingAlertKey(null);
  }

  async function loadAlertImpact(alertId: string, force = false) {
    if (!force && impactByAlertId[alertId]) return;
    setLoadingImpactId(alertId);
    const res = await fetch(`/api/teacher/alerts/${alertId}/impact`);
    const data = await res.json();
    if (res.ok && data?.data) {
      setImpactByAlertId((prev) => ({ ...prev, [alertId]: data.data }));
    }
    setLoadingImpactId(null);
  }

  useEffect(() => {
    if (!classId) return;
    fetch(`/api/teacher/classes/${classId}/students`)
      .then((res) => res.json())
      .then((data) => {
        const list = data.data ?? [];
        setStudents(list);
        if (list.length) {
          setStudentId(list[0].id);
        } else {
          setStudentId("");
        }
      });
  }, [classId]);

  useEffect(() => {
    if (!studentId) {
      setFavorites([]);
      return;
    }
    fetch(`/api/teacher/favorites?studentId=${studentId}`)
      .then((res) => res.json())
      .then((data) => setFavorites(data.data ?? []));
  }, [studentId]);

  async function generateReport() {
    if (!classId) return;
    setReportLoading(true);
    setReportError(null);
    const res = await fetch("/api/teacher/insights/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classId })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setReportError(data?.error ?? data?.message ?? "学情报告生成失败");
      setReportLoading(false);
      return;
    }
    setReport(data?.data ?? null);
    setReportLoading(false);
  }

  const sortedHeatmap = useMemo(() => heatmap.slice(0, 40), [heatmap]);
  const showHeatmapSkeleton = heatmapLoading && sortedHeatmap.length === 0;
  const showReportSkeleton = reportLoading && !report;

  return (
    <div className="grid" style={{ gap: 18 }}>
      <div className="section-head">
        <div>
          <h2>班级学情分析</h2>
          <div className="section-sub">掌握热力图 + 学情报告。</div>
        </div>
        <span className="chip">数据面板</span>
      </div>

      <AnalysisFiltersCard classes={classes} classId={classId} onClassChange={setClassId} />
      <AnalysisAlertsCard
        alerts={alerts}
        alertActionMessage={alertActionMessage}
        alertSummary={alertSummary}
        parentCollaboration={parentCollaboration}
        actingAlertKey={actingAlertKey}
        acknowledgingAlertId={acknowledgingAlertId}
        loadingImpactId={loadingImpactId}
        impactByAlertId={impactByAlertId}
        onRunAlertAction={runAlertAction}
        onAcknowledgeAlert={acknowledgeAlert}
        onLoadAlertImpact={loadAlertImpact}
      />
      <AnalysisCausalityCard
        causalityDays={causalityDays}
        causalitySummary={causalitySummary}
        causalityItems={causalityItems}
        causalityLoading={causalityLoading}
        onCausalityDaysChange={setCausalityDays}
      />
      <AnalysisHeatmapCard items={sortedHeatmap} showHeatmapSkeleton={showHeatmapSkeleton} />
      <AnalysisReportCard
        classId={classId}
        report={report}
        reportLoading={reportLoading}
        reportError={reportError}
        showReportSkeleton={showReportSkeleton}
        onGenerateReport={generateReport}
      />
      <AnalysisFavoritesCard
        studentId={studentId}
        students={students}
        favorites={favorites}
        onStudentChange={setStudentId}
      />
    </div>
  );
}
