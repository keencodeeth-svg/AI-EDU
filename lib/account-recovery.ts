import { addAdminLog, getAdminLogs } from "./admin-log";
import { getUserByEmail } from "./auth";

export type AccountRecoveryRole = "student" | "teacher" | "parent" | "admin" | "school_admin";
export type AccountRecoveryIssueType = "forgot_password" | "forgot_account" | "account_locked";

export type AccountRecoveryRequestInput = {
  role: AccountRecoveryRole;
  email: string;
  name?: string;
  issueType: AccountRecoveryIssueType;
  note?: string;
  studentEmail?: string;
  schoolName?: string;
};

type AccountRecoveryLogDetail = {
  role: AccountRecoveryRole;
  email: string;
  name?: string;
  issueType: AccountRecoveryIssueType;
  note?: string;
  studentEmail?: string;
  schoolName?: string;
  matchedUserId?: string | null;
  matchedUserRole?: string | null;
};

const DUPLICATE_WINDOW_MS = 15 * 60 * 1000;

function normalizeEmail(value?: string | null) {
  return (value ?? "").trim().toLowerCase();
}

function parseRecoveryDetail(detail?: string | null): AccountRecoveryLogDetail | null {
  if (!detail) return null;
  try {
    const payload = JSON.parse(detail) as AccountRecoveryLogDetail;
    if (!payload || typeof payload !== "object") return null;
    return payload;
  } catch {
    return null;
  }
}

export async function createAccountRecoveryRequest(input: AccountRecoveryRequestInput) {
  const email = normalizeEmail(input.email);
  const studentEmail = normalizeEmail(input.studentEmail);
  const matchedUser = email ? await getUserByEmail(email) : null;
  const logs = await getAdminLogs(200);
  const now = Date.now();

  const duplicate = logs.find((item) => {
    if (item.action !== "auth_recovery_request") return false;
    const detail = parseRecoveryDetail(item.detail);
    if (!detail) return false;
    const sameUser = normalizeEmail(detail.email) === email && detail.role === input.role && detail.issueType === input.issueType;
    if (!sameUser) return false;
    const createdAt = new Date(item.createdAt).getTime();
    return Number.isFinite(createdAt) && now - createdAt <= DUPLICATE_WINDOW_MS;
  });

  if (duplicate) {
    return {
      ticketId: duplicate.id,
      submittedAt: duplicate.createdAt,
      duplicate: true,
      matched: Boolean(matchedUser && matchedUser.role === input.role)
    };
  }

  const detail: AccountRecoveryLogDetail = {
    role: input.role,
    email,
    name: input.name?.trim() || undefined,
    issueType: input.issueType,
    note: input.note?.trim() || undefined,
    studentEmail: studentEmail || undefined,
    schoolName: input.schoolName?.trim() || undefined,
    matchedUserId: matchedUser?.id ?? null,
    matchedUserRole: matchedUser?.role ?? null
  };

  const entry = await addAdminLog({
    adminId: null,
    action: "auth_recovery_request",
    entityType: "auth_recovery",
    entityId: matchedUser?.id ?? null,
    detail: JSON.stringify(detail)
  });

  return {
    ticketId: entry.id,
    submittedAt: entry.createdAt,
    duplicate: false,
    matched: Boolean(matchedUser && matchedUser.role === input.role)
  };
}
