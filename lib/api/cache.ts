export type ApiCachePreset = "public-static" | "public-short" | "private-short" | "private-realtime";

const CACHE_CONTROL_BY_PRESET: Record<ApiCachePreset, string> = {
  "public-static": "public, max-age=600, s-maxage=3600, stale-while-revalidate=86400",
  "public-short": "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
  "private-short": "private, max-age=30, must-revalidate",
  "private-realtime": "no-store, max-age=0"
};

export function buildCacheHeaders(preset: ApiCachePreset): Record<string, string> {
  const cacheControl = CACHE_CONTROL_BY_PRESET[preset];
  const headers: Record<string, string> = {
    "cache-control": cacheControl
  };

  if (preset === "private-realtime") {
    headers.pragma = "no-cache";
    headers.expires = "0";
  }

  return headers;
}

export function withCachePreset(headers: Headers, preset: ApiCachePreset) {
  const cacheHeaders = buildCacheHeaders(preset);
  Object.entries(cacheHeaders).forEach(([key, value]) => {
    headers.set(key, value);
  });
  return headers;
}

