"use client";

import { useCallback, useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { CourseModule } from "@/lib/modules";
import type {
  AssignmentFormState,
  AssignmentItem,
  ClassItem,
  KnowledgePoint,
  StudentFormState,
  TeacherInsightsData,
  TeacherJoinRequest
} from "./types";

export function useTeacherDataLoader({
  setUnauthorized,
  setLoading,
  setError,
  setMessage,
  setClasses,
  setAssignments,
  setInsights,
  setJoinRequests,
  setKnowledgePoints
}: {
  setUnauthorized: Dispatch<SetStateAction<boolean>>;
  setLoading: Dispatch<SetStateAction<boolean>>;
  setError: Dispatch<SetStateAction<string | null>>;
  setMessage: Dispatch<SetStateAction<string | null>>;
  setClasses: Dispatch<SetStateAction<ClassItem[]>>;
  setAssignments: Dispatch<SetStateAction<AssignmentItem[]>>;
  setInsights: Dispatch<SetStateAction<TeacherInsightsData | null>>;
  setJoinRequests: Dispatch<SetStateAction<TeacherJoinRequest[]>>;
  setKnowledgePoints: Dispatch<SetStateAction<KnowledgePoint[]>>;
}) {
  const loadAll = useCallback(async () => {
    setUnauthorized(false);
    setLoading(true);
    setError(null);
    setMessage(null);
    const classRes = await fetch("/api/teacher/classes");
    if (classRes.status === 401) {
      setUnauthorized(true);
      setLoading(false);
      return;
    }
    const classData = (await classRes.json()) as { data?: ClassItem[] };
    setClasses(classData.data ?? []);

    const assignmentRes = await fetch("/api/teacher/assignments");
    const assignmentData = (await assignmentRes.json()) as { data?: AssignmentItem[] };
    setAssignments(assignmentData.data ?? []);

    const insightRes = await fetch("/api/teacher/insights");
    const insightData = (await insightRes.json()) as TeacherInsightsData;
    if (insightRes.ok) {
      setInsights(insightData);
    }

    const joinRes = await fetch("/api/teacher/join-requests");
    const joinData = (await joinRes.json()) as { data?: TeacherJoinRequest[] };
    if (joinRes.ok) {
      setJoinRequests(joinData.data ?? []);
    }

    setLoading(false);
  }, [setAssignments, setClasses, setError, setInsights, setJoinRequests, setLoading, setMessage, setUnauthorized]);

  const loadKnowledgePoints = useCallback(async () => {
    const res = await fetch("/api/knowledge-points");
    const data = (await res.json()) as { data?: KnowledgePoint[] };
    setKnowledgePoints(data.data ?? []);
  }, [setKnowledgePoints]);

  useEffect(() => {
    void loadAll();
    void loadKnowledgePoints();
  }, [loadAll, loadKnowledgePoints]);

  return { loadAll };
}

export function useTeacherDefaultSelections({
  classes,
  studentFormClassId,
  assignmentFormClassId,
  setStudentForm,
  setAssignmentForm
}: {
  classes: ClassItem[];
  studentFormClassId: StudentFormState["classId"];
  assignmentFormClassId: AssignmentFormState["classId"];
  setStudentForm: Dispatch<SetStateAction<StudentFormState>>;
  setAssignmentForm: Dispatch<SetStateAction<AssignmentFormState>>;
}) {
  useEffect(() => {
    if (!studentFormClassId && classes.length) {
      setStudentForm((prev) => ({ ...prev, classId: classes[0].id }));
    }
    if (!assignmentFormClassId && classes.length) {
      const defaultDue = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      setAssignmentForm((prev) => ({ ...prev, classId: classes[0].id, dueDate: prev.dueDate || defaultDue }));
    }
  }, [assignmentFormClassId, classes, setAssignmentForm, setStudentForm, studentFormClassId]);
}

export function useTeacherAssignmentModules({
  classId,
  setModules,
  setAssignmentForm
}: {
  classId: AssignmentFormState["classId"];
  setModules: Dispatch<SetStateAction<CourseModule[]>>;
  setAssignmentForm: Dispatch<SetStateAction<AssignmentFormState>>;
}) {
  useEffect(() => {
    if (!classId) return;
    setModules([]);
    setAssignmentForm((prev) => ({ ...prev, moduleId: "" }));
    fetch(`/api/teacher/modules?classId=${classId}`)
      .then((res) => res.json())
      .then((data: { data?: CourseModule[] }) => {
        const list = data.data ?? [];
        setModules(list);
        if (list.length) {
          setAssignmentForm((prev) => ({ ...prev, moduleId: list[0].id }));
        }
      });
  }, [classId, setAssignmentForm, setModules]);
}
