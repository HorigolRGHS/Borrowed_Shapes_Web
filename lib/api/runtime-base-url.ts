const LOCAL_API_BASE_URL = "http://localhost:3001/api";

function normalizeApiBaseUrl(raw: string): string {
  return `${raw.replace(/\/+$/, "").replace(/(?:\/api)+$/, "")}/api`;
}

export function getPublicApiBaseUrl(runtimeUrl?: string): string {
  return normalizeApiBaseUrl(
    runtimeUrl || process.env.NEXT_PUBLIC_API_BASE_URL || LOCAL_API_BASE_URL,
  );
}

export function getBackendBaseUrl(): string {
  return normalizeApiBaseUrl(
    process.env.INTERNAL_API_BASE_URL ||
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      LOCAL_API_BASE_URL,
  );
}
