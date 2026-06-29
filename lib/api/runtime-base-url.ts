// Đọc backend base URL ở RUNTIME (route handler chạy trên server, đọc process.env mỗi request).
// Chuẩn hoá để luôn kết thúc bằng "/api":
//   http://bs_be:3001            -> http://bs_be:3001/api   (docker-compose default)
//   https://api.example.com/api  -> giữ nguyên
//   undefined                    -> http://localhost:3001/api (local fallback)
export function getBackendBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001/api";
  const trimmed = raw.replace(/\/+$/, "");
  return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
}
