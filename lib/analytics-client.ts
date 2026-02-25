"use client";

type TrackEventInput = {
  eventName: string;
  eventTime?: string;
  subject?: string;
  grade?: string;
  page?: string;
  sessionId?: string;
  traceId?: string;
  entityId?: string;
  props?: Record<string, unknown>;
};

const CLIENT_SESSION_KEY = "hk_ai_analytics_session_id";
let cachedSessionId: string | null = null;

function createId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function getClientSessionId() {
  if (cachedSessionId) {
    return cachedSessionId;
  }
  if (typeof window === "undefined") {
    return createId();
  }

  try {
    const fromStorage = window.sessionStorage.getItem(CLIENT_SESSION_KEY);
    if (fromStorage) {
      cachedSessionId = fromStorage;
      return fromStorage;
    }
  } catch {
    // ignore sessionStorage access failures
  }

  const next = createId();
  cachedSessionId = next;
  try {
    window.sessionStorage.setItem(CLIENT_SESSION_KEY, next);
  } catch {
    // ignore sessionStorage access failures
  }
  return next;
}

function buildPayload(input: TrackEventInput) {
  return {
    events: [
      {
        eventName: input.eventName,
        eventTime: input.eventTime ?? new Date().toISOString(),
        subject: input.subject,
        grade: input.grade,
        page: input.page ?? (typeof window !== "undefined" ? window.location.pathname : undefined),
        sessionId: input.sessionId ?? getClientSessionId(),
        traceId: input.traceId ?? createId(),
        entityId: input.entityId,
        props: input.props
      }
    ]
  };
}

export function trackEvent(input: TrackEventInput) {
  if (typeof window === "undefined") {
    return;
  }
  if (!input.eventName?.trim()) {
    return;
  }

  const payload = buildPayload(input);
  const body = JSON.stringify(payload);

  try {
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon("/api/analytics/events", blob);
      return;
    }
  } catch {
    // fallback to fetch
  }

  void fetch("/api/analytics/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true
  }).catch(() => {
    // analytics must not block user flows
  });
}
