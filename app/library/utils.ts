import type { LibraryItem, LibraryFacets, LibraryMeta, LibrarySummary } from "./types";

export const DEFAULT_META: LibraryMeta = {
  total: 0,
  page: 1,
  pageSize: 24,
  totalPages: 0,
  hasPrev: false,
  hasNext: false
};

export const DEFAULT_FACETS: LibraryFacets = {
  subjects: [],
  grades: [],
  contentTypes: []
};

export const DEFAULT_SUMMARY: LibrarySummary = {
  textbookCount: 0,
  coursewareCount: 0,
  lessonPlanCount: 0
};

export function buildBatchImportTemplate() {
  return {
    options: {
      autoCreateKnowledgePoint: true,
      skipExistingQuestionStem: true
    },
    textbooks: [
      {
        title: "四年级数学 上册 第一单元",
        description: "教材导入示例（文件）",
        contentType: "textbook",
        subject: "math",
        grade: "4",
        sourceType: "file",
        fileName: "四年级数学-第一单元.txt",
        mimeType: "text/plain",
        contentBase64: "56ys5LiA5Y2V5YWD77ya5Zub5YiZ6L+Q566X56S65L6L5YaF5a65",
        accessScope: "global"
      }
    ],
    questions: [
      {
        subject: "math",
        grade: "4",
        knowledgePointTitle: "四则运算",
        chapter: "第一单元",
        stem: "12 + 18 = ?",
        options: ["20", "28", "30", "32"],
        answer: "30",
        explanation: "把十位和个位分别相加。",
        difficulty: "easy",
        questionType: "choice",
        tags: ["计算", "基础"],
        abilities: ["运算能力"]
      }
    ]
  };
}

export function contentTypeLabel(type: string) {
  if (type === "courseware") return "课件";
  if (type === "lesson_plan") return "教案";
  return "教材";
}

export function contentTypeRank(type: LibraryItem["contentType"]) {
  if (type === "textbook") return 0;
  if (type === "courseware") return 1;
  return 2;
}

export function toBase64(file: File) {
  return new Promise<{ base64: string; mimeType: string; fileName: string; size: number }>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve({
        base64,
        mimeType: file.type || "application/octet-stream",
        fileName: file.name,
        size: file.size
      });
    };
    reader.onerror = () => reject(new Error("read file failed"));
    reader.readAsDataURL(file);
  });
}
