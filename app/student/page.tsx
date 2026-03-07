"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { trackEvent } from "@/lib/analytics-client";
import StudentDashboardGuideCard from "./_components/StudentDashboardGuideCard";
import StudentEntryCompactCard from "./_components/StudentEntryCompactCard";
import StudentEntryDetailCard from "./_components/StudentEntryDetailCard";
import StudentQuickTutorCard from "./_components/StudentQuickTutorCard";
import StudentMotivationCard from "./_components/StudentMotivationCard";
import StudentPriorityTasksCard from "./_components/StudentPriorityTasksCard";
import StudentTaskOverviewCard from "./_components/StudentTaskOverviewCard";
import type {
  EntryCategory,
  EntryViewMode,
  JoinMessage,
  JoinRequest,
  MotivationPayload,
  PlanItem,
  TodayTask,
  TodayTaskEventName,
  TodayTaskPayload
} from "./types";
import { CATEGORY_META, ENTRY_CATEGORIES, ENTRY_ITEMS, STUDENT_DASHBOARD_GUIDE_KEY } from "./utils";

export default function StudentPage() {
  const trackedTaskExposureRef = useRef<string | null>(null);
  const [plan, setPlan] = useState<PlanItem[]>([]);
  const [motivation, setMotivation] = useState<MotivationPayload | null>(null);
  const [todayTasks, setTodayTasks] = useState<TodayTaskPayload | null>(null);
  const [todayTaskError, setTodayTaskError] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [joinMessage, setJoinMessage] = useState<JoinMessage | null>(null);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState<EntryCategory>("priority");
  const [showAllEntries, setShowAllEntries] = useState(false);
  const [entryViewMode, setEntryViewMode] = useState<EntryViewMode>("compact");
  const [showDashboardGuide, setShowDashboardGuide] = useState(true);

  const loadTodayTasks = useCallback(async () => {
    setTodayTaskError(null);
    const res = await fetch("/api/student/today-tasks");
    const payload = await res.json();
    if (!res.ok) {
      setTodayTaskError(payload?.error ?? "加载今日任务失败");
      return;
    }
    setTodayTasks(payload?.data ?? null);
  }, []);

  useEffect(() => {
    fetch("/api/plan")
      .then((res) => res.json())
      .then((data) => {
        const items = data.data?.items ?? [];
        setPlan(items);
      });
    fetch("/api/student/motivation")
      .then((res) => res.json())
      .then((data) => setMotivation(data?.data ?? data ?? null));
    fetch("/api/student/join-requests")
      .then((res) => res.json())
      .then((data) => setJoinRequests(data.data ?? []));
    loadTodayTasks();
  }, [loadTodayTasks]);

  useEffect(() => {
    try {
      const hidden = window.localStorage.getItem(STUDENT_DASHBOARD_GUIDE_KEY) === "hidden";
      setShowDashboardGuide(!hidden);
    } catch {
      setShowDashboardGuide(true);
    }
  }, []);

  useEffect(() => {
    setShowAllEntries(false);
  }, [activeCategory]);

  const pendingJoinCount = useMemo(
    () => joinRequests.filter((item) => item.status === "pending").length,
    [joinRequests]
  );

  const totalPlanCount = useMemo(
    () => plan.reduce((sum, item) => sum + (Number(item.targetCount) || 0), 0),
    [plan]
  );

  const weakPlanCount = useMemo(() => plan.filter((item) => item.masteryLevel === "weak").length, [plan]);

  const topTodayTasks = useMemo(() => {
    if (!todayTasks) return [];
    if (todayTasks.topTasks?.length) return todayTasks.topTasks.slice(0, 3);
    return todayTasks.tasks.slice(0, 3);
  }, [todayTasks]);

  const visiblePriorityTasks = useMemo(() => {
    if (!todayTasks) return topTodayTasks;
    if (todayTasks.groups?.mustDo?.length) {
      return todayTasks.groups.mustDo.slice(0, 5);
    }
    return todayTasks.tasks.slice(0, 5);
  }, [todayTasks, topTodayTasks]);

  const hiddenTodayTaskCount = useMemo(
    () => Math.max(0, (todayTasks?.tasks?.length ?? 0) - visiblePriorityTasks.length),
    [todayTasks, visiblePriorityTasks.length]
  );

  useEffect(() => {
    if (!todayTasks?.generatedAt || topTodayTasks.length === 0) return;
    if (trackedTaskExposureRef.current === todayTasks.generatedAt) return;
    trackedTaskExposureRef.current = todayTasks.generatedAt;
    topTodayTasks.forEach((task, index) => {
      trackEvent({
        eventName: "task_exposed",
        page: "/student",
        props: {
          taskId: task.id,
          source: task.source,
          rank: index + 1,
          priority: task.priority,
          impactScore: task.impactScore,
          urgencyScore: task.urgencyScore,
          effortMinutes: task.effortMinutes
        }
      });
    });
  }, [todayTasks?.generatedAt, topTodayTasks]);

  const handleTaskEvent = useCallback((task: TodayTask, eventName: TodayTaskEventName) => {
    trackEvent({
      eventName,
      page: "/student",
      props: {
        taskId: task.id,
        source: task.source,
        status: task.status,
        priority: task.priority,
        impactScore: task.impactScore,
        urgencyScore: task.urgencyScore,
        effortMinutes: task.effortMinutes
      }
    });
  }, []);

  const categoryCounts = useMemo(() => {
    return ENTRY_ITEMS.reduce<Record<EntryCategory, number>>(
      (acc, item) => {
        acc[item.category] += 1;
        return acc;
      },
      { priority: 0, practice: 0, growth: 0 }
    );
  }, []);

  const entriesByCategory = useMemo(() => {
    return ENTRY_ITEMS.filter((item) => item.category === activeCategory).sort((a, b) => a.order - b.order);
  }, [activeCategory]);

  const visibleEntries = useMemo(() => {
    if (showAllEntries) return entriesByCategory;
    return entriesByCategory.slice(0, CATEGORY_META[activeCategory].defaultCount);
  }, [activeCategory, entriesByCategory, showAllEntries]);

  async function handleJoinClass(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setJoinMessage(null);
    if (!joinCode.trim()) {
      setJoinMessage({ text: "请输入邀请码后再提交。", tone: "error" });
      return;
    }
    const res = await fetch("/api/student/join-class", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: joinCode.trim() })
    });
    const data = await res.json();
    setJoinMessage({
      text: data?.message ?? (res.ok ? "已提交" : "加入失败"),
      tone: res.ok ? "success" : "error"
    });
    setJoinCode("");
    fetch("/api/student/join-requests")
      .then((resp) => resp.json())
      .then((payload) => setJoinRequests(payload.data ?? []));
  }

  async function refreshPlan() {
    setRefreshing(true);
    const res = await fetch("/api/plan/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject: "all" })
    });
    const data = await res.json();
    const items = data?.data?.items ?? data?.data?.plan?.items ?? [];
    if (Array.isArray(items)) {
      setPlan(items);
    }
    await loadTodayTasks();
    setRefreshing(false);
  }

  function hideDashboardGuide() {
    setShowDashboardGuide(false);
    try {
      window.localStorage.setItem(STUDENT_DASHBOARD_GUIDE_KEY, "hidden");
    } catch {
      // ignore localStorage errors
    }
  }

  function showDashboardGuideAgain() {
    setShowDashboardGuide(true);
    try {
      window.localStorage.removeItem(STUDENT_DASHBOARD_GUIDE_KEY);
    } catch {
      // ignore localStorage errors
    }
  }

  return (
    <div className="grid dashboard-stack">
      <div className="section-head">
        <div>
          <h2>学习控制台</h2>
          <div className="section-sub">今日任务、成长激励与学习入口。</div>
        </div>
        <span className="chip">学期进行中</span>
      </div>

      <StudentDashboardGuideCard
        showDashboardGuide={showDashboardGuide}
        onHide={hideDashboardGuide}
        onShow={showDashboardGuideAgain}
      />

      <StudentQuickTutorCard
        mustDoCount={todayTasks?.summary?.mustDo ?? visiblePriorityTasks.length}
        weakPlanCount={weakPlanCount}
      />

      <div className="student-overview-grid">
        <StudentPriorityTasksCard
          todayTaskError={todayTaskError}
          visiblePriorityTasks={visiblePriorityTasks}
          hiddenTodayTaskCount={hiddenTodayTaskCount}
          onTaskEvent={handleTaskEvent}
        />

        <div className="grid" style={{ gap: 10 }}>
          <StudentTaskOverviewCard
            todayTasks={todayTasks}
            totalPlanCount={totalPlanCount}
            weakPlanCount={weakPlanCount}
            refreshing={refreshing}
            onRefreshPlan={refreshPlan}
          />
          <StudentMotivationCard motivation={motivation} />
        </div>
      </div>

      <div className="section-head">
        <div>
          <h2>学习入口</h2>
          <div className="section-sub">{CATEGORY_META[activeCategory].description}</div>
        </div>
        <span className="chip">{CATEGORY_META[activeCategory].label}</span>
      </div>

      <div className="cta-row no-margin">
        {ENTRY_CATEGORIES.map((category) => (
          <button
            key={category}
            className={activeCategory === category ? "button secondary" : "button ghost"}
            type="button"
            onClick={() => setActiveCategory(category)}
          >
            {CATEGORY_META[category].label} ({categoryCounts[category]})
          </button>
        ))}
        <button className="button ghost" type="button" onClick={() => setShowAllEntries((prev) => !prev)}>
          {showAllEntries ? "收起入口" : `展开全部（${entriesByCategory.length}）`}
        </button>
        <button
          className={entryViewMode === "compact" ? "button secondary" : "button ghost"}
          type="button"
          onClick={() => setEntryViewMode("compact")}
        >
          紧凑视图
        </button>
        <button
          className={entryViewMode === "detailed" ? "button secondary" : "button ghost"}
          type="button"
          onClick={() => setEntryViewMode("detailed")}
        >
          详细视图
        </button>
      </div>

      {entryViewMode === "detailed" ? (
        <div className="grid grid-3">
          {visibleEntries.map((item) => (
            <StudentEntryDetailCard
              key={item.id}
              item={item}
              joinCode={joinCode}
              joinMessage={joinMessage}
              pendingJoinCount={pendingJoinCount}
              onJoinClass={handleJoinClass}
              onJoinCodeChange={setJoinCode}
            />
          ))}
        </div>
      ) : (
        <div className="grid" style={{ gap: 8 }}>
          {visibleEntries.map((item) => (
            <StudentEntryCompactCard
              key={item.id}
              item={item}
              joinCode={joinCode}
              joinMessage={joinMessage}
              onJoinClass={handleJoinClass}
              onJoinCodeChange={setJoinCode}
            />
          ))}
        </div>
      )}
    </div>
  );
}
