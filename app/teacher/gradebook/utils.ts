import type {
  GradebookAssignment,
  GradebookProgressCell,
  GradebookStudent,
  GradebookStudentProgress
} from "./types";

export function getTierLabel(avgScore: number) {
  if (avgScore >= 85) return "A";
  if (avgScore >= 70) return "B";
  return "C";
}

export function getAssignmentProgressCell(
  assignment: GradebookAssignment,
  progress: GradebookStudentProgress | undefined,
  now: number
): GradebookProgressCell {
  const status = progress?.status ?? "pending";
  const dueTime = new Date(assignment.dueDate).getTime();
  const isOverdue = status !== "completed" && dueTime < now;

  if (status === "completed") {
    if (assignment.submissionType === "quiz" && progress?.total) {
      return {
        label: `${progress.score ?? 0}/${progress.total ?? 0}`,
        state: "done"
      };
    }

    return {
      label: "已交",
      state: "done"
    };
  }

  if (isOverdue) {
    return {
      label: "逾期",
      state: "overdue"
    };
  }

  return {
    label: "待交",
    state: "pending"
  };
}

export function getProgressPillClassName(state: GradebookProgressCell["state"]) {
  if (state === "done") return "gradebook-pill done";
  if (state === "overdue") return "gradebook-pill overdue";
  return "gradebook-pill pending";
}

export function buildGradebookExportMatrix(
  students: GradebookStudent[],
  assignments: GradebookAssignment[],
  now: number
) {
  const header = [
    "学生",
    "邮箱",
    "完成",
    "待交",
    "逾期",
    "迟交",
    "平均分",
    ...assignments.map((item) => `${item.title}(${new Date(item.dueDate).toLocaleDateString("zh-CN")})`)
  ];

  const rows = students.map((student) => {
    const base = [
      student.name,
      student.email,
      String(student.stats.completed),
      String(student.stats.pending),
      String(student.stats.overdue),
      String(student.stats.late),
      String(student.stats.avgScore)
    ];

    const assignmentCells = assignments.map((assignment) => {
      const progress = student.progress[assignment.id];
      return getAssignmentProgressCell(assignment, progress, now).label;
    });

    return [...base, ...assignmentCells];
  });

  return { header, rows };
}

export function downloadTextFile(fileName: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
