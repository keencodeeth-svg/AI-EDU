import zlib from "zlib";

type ExtractOptions = {
  mimeType?: string;
  fileName?: string;
  maxChars?: number;
};

type ZipEntry = {
  name: string;
  data: Buffer;
};

const ZIP_LOCAL_FILE_HEADER_SIG = 0x04034b50;
const ZIP_CENTRAL_DIR_HEADER_SIG = 0x02014b50;
const ZIP_END_SIG = 0x06054b50;

function normalizeMimeType(value?: string) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function normalizeFileName(value?: string) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function normalizeWhitespace(value: string) {
  return value
    .replace(/\0/g, "")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function isTextMimeType(mimeType: string) {
  if (!mimeType) return false;
  return (
    mimeType.includes("text") ||
    mimeType.includes("json") ||
    mimeType.includes("xml") ||
    mimeType.includes("markdown") ||
    mimeType.includes("csv")
  );
}

function decodeXmlEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, num: string) => String.fromCharCode(Number(num) || 0))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCharCode(parseInt(hex, 16) || 0));
}

function xmlToPlainText(xml: string) {
  const cleaned = xml
    .replace(/<w:tab\/>/g, "\t")
    .replace(/<w:br\/>/g, "\n")
    .replace(/<w:p[^>]*>/g, "\n")
    .replace(/<a:p[^>]*>/g, "\n")
    .replace(/<a:br\/>/g, "\n")
    .replace(/<[^>]+>/g, " ");
  return normalizeWhitespace(decodeXmlEntities(cleaned));
}

function readZipEntries(buffer: Buffer) {
  const entries: ZipEntry[] = [];
  const searchStart = Math.max(0, buffer.length - 0x10000);
  let eocdOffset = -1;
  for (let cursor = buffer.length - 22; cursor >= searchStart; cursor -= 1) {
    if (buffer.readUInt32LE(cursor) === ZIP_END_SIG) {
      eocdOffset = cursor;
      break;
    }
  }
  if (eocdOffset < 0 || eocdOffset + 22 > buffer.length) {
    return entries;
  }

  const totalEntries = buffer.readUInt16LE(eocdOffset + 10);
  const centralDirOffset = buffer.readUInt32LE(eocdOffset + 16);
  let cursor = centralDirOffset;

  for (let index = 0; index < totalEntries; index += 1) {
    if (cursor + 46 > buffer.length) break;
    if (buffer.readUInt32LE(cursor) !== ZIP_CENTRAL_DIR_HEADER_SIG) break;

    const compressionMethod = buffer.readUInt16LE(cursor + 10);
    const compressedSize = buffer.readUInt32LE(cursor + 20);
    const fileNameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);
    const localHeaderOffset = buffer.readUInt32LE(cursor + 42);
    const fileNameStart = cursor + 46;
    const fileNameEnd = fileNameStart + fileNameLength;
    if (fileNameEnd > buffer.length) break;

    const fileName = buffer.slice(fileNameStart, fileNameEnd).toString("utf-8");
    const localHeaderStart = localHeaderOffset;
    if (localHeaderStart + 30 > buffer.length) {
      cursor += 46 + fileNameLength + extraLength + commentLength;
      continue;
    }
    if (buffer.readUInt32LE(localHeaderStart) !== ZIP_LOCAL_FILE_HEADER_SIG) {
      cursor += 46 + fileNameLength + extraLength + commentLength;
      continue;
    }

    const localFileNameLength = buffer.readUInt16LE(localHeaderStart + 26);
    const localExtraLength = buffer.readUInt16LE(localHeaderStart + 28);
    const dataStart = localHeaderStart + 30 + localFileNameLength + localExtraLength;
    const dataEnd = dataStart + compressedSize;
    if (dataEnd > buffer.length || dataStart < 0) {
      cursor += 46 + fileNameLength + extraLength + commentLength;
      continue;
    }

    const payload = buffer.slice(dataStart, dataEnd);
    let content: Buffer | null = null;
    if (compressionMethod === 0) {
      content = payload;
    } else if (compressionMethod === 8) {
      try {
        content = zlib.inflateRawSync(payload);
      } catch {
        content = null;
      }
    }
    if (content) {
      entries.push({
        name: fileName,
        data: content
      });
    }

    cursor += 46 + fileNameLength + extraLength + commentLength;
  }

  return entries;
}

function decodePdfStringToken(token: string) {
  return token
    .replace(/\\([\\()])/g, "$1")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\b/g, "")
    .replace(/\\f/g, "");
}

function extractPdfText(buffer: Buffer) {
  const textSource = buffer.toString("latin1");
  const textBlocks: string[] = [];
  const btEtBlocks = textSource.match(/BT[\s\S]*?ET/g) ?? [];
  btEtBlocks.forEach((block) => {
    const direct = block.match(/\((?:\\.|[^\\)])+\)\s*Tj/g) ?? [];
    direct.forEach((item) => {
      const raw = item.slice(1, item.lastIndexOf(")"));
      const decoded = decodePdfStringToken(raw);
      if (decoded.trim()) {
        textBlocks.push(decoded);
      }
    });

    const arrays = block.match(/\[(.*?)\]\s*TJ/gs) ?? [];
    arrays.forEach((item) => {
      const inside = item.slice(item.indexOf("[") + 1, item.lastIndexOf("]"));
      const parts = inside.match(/\((?:\\.|[^\\)])+\)/g) ?? [];
      const decoded = parts
        .map((part) => decodePdfStringToken(part.slice(1, -1)))
        .filter(Boolean)
        .join("");
      if (decoded.trim()) {
        textBlocks.push(decoded);
      }
    });
  });

  if (!textBlocks.length) {
    // Fallback for some PDFs storing visible text in plain objects.
    const fallback = textSource.match(/[\u4e00-\u9fa5A-Za-z0-9，。！？；：,.!?;:()（）\-=+×÷*/%^]{4,}/g) ?? [];
    return normalizeWhitespace(fallback.join(" "));
  }
  return normalizeWhitespace(textBlocks.join("\n"));
}

function sortByNumericSuffix(left: string, right: string) {
  const leftNum = Number((left.match(/(\d+)(?!.*\d)/)?.[1] ?? "0").trim());
  const rightNum = Number((right.match(/(\d+)(?!.*\d)/)?.[1] ?? "0").trim());
  if (leftNum !== rightNum) return leftNum - rightNum;
  return left.localeCompare(right);
}

function extractDocxText(buffer: Buffer) {
  const entries = readZipEntries(buffer);
  if (!entries.length) return "";
  const candidates = entries
    .filter((item) => /^word\/(document|header\d+|footer\d+|footnotes|endnotes).*\.xml$/i.test(item.name))
    .sort((a, b) => sortByNumericSuffix(a.name, b.name));
  if (!candidates.length) return "";
  return normalizeWhitespace(
    candidates
      .map((item) => xmlToPlainText(item.data.toString("utf-8")))
      .filter(Boolean)
      .join("\n")
  );
}

function extractPptxText(buffer: Buffer) {
  const entries = readZipEntries(buffer);
  if (!entries.length) return "";
  const candidates = entries
    .filter(
      (item) =>
        /^ppt\/slides\/slide\d+\.xml$/i.test(item.name) || /^ppt\/notesSlides\/notesSlide\d+\.xml$/i.test(item.name)
    )
    .sort((a, b) => sortByNumericSuffix(a.name, b.name));
  if (!candidates.length) return "";
  return normalizeWhitespace(
    candidates
      .map((item) => xmlToPlainText(item.data.toString("utf-8")))
      .filter(Boolean)
      .join("\n")
  );
}

function truncateText(value: string, maxChars: number) {
  const text = normalizeWhitespace(value);
  if (!text) return "";
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars).trim()}...`;
}

export function extractReadableTextFromBase64(contentBase64?: string, options: ExtractOptions = {}) {
  if (!contentBase64?.trim()) return "";
  const mimeType = normalizeMimeType(options.mimeType);
  const fileName = normalizeFileName(options.fileName);
  const maxChars = Number.isFinite(options.maxChars) ? Math.max(300, Number(options.maxChars)) : 16000;
  let buffer: Buffer;
  try {
    buffer = Buffer.from(contentBase64, "base64");
  } catch {
    return "";
  }

  if (isTextMimeType(mimeType)) {
    return truncateText(buffer.toString("utf-8"), maxChars);
  }

  const isPdf = mimeType.includes("pdf") || fileName.endsWith(".pdf");
  if (isPdf) {
    return truncateText(extractPdfText(buffer), maxChars);
  }

  const isDocx =
    mimeType.includes("officedocument.wordprocessingml.document") || fileName.endsWith(".docx");
  if (isDocx) {
    return truncateText(extractDocxText(buffer), maxChars);
  }

  const isPptx =
    mimeType.includes("officedocument.presentationml.presentation") || fileName.endsWith(".pptx");
  if (isPptx) {
    return truncateText(extractPptxText(buffer), maxChars);
  }

  return "";
}
