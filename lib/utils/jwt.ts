/**
 * Giải mã JWT Payload (không verify chữ ký - dùng cho frontend/middleware)
 */
export function decodeJwt(token: string): any {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    return null;
  }
}

/**
 * Chuẩn hóa các trường trong JWT (ví dụ: bóc tách role từ các key đặc biệt)
 */
export function normalizeJwt(decoded: any): any {
  if (!decoded) return null;
  
  // Ánh xạ role (Backend NestJS thường để role trực tiếp hoặc trong key 'role')
  const role = decoded.role || decoded.roles || decoded["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] || "";
  
  return {
    ...decoded,
    role: Array.isArray(role) ? role[0] : role
  };
}

/**
 * Các hàm tiện ích khác cho UI (nếu cần)
 */
export function cn(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}
