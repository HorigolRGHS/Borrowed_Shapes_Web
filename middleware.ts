import { NextRequest, NextResponse } from "next/server";
import { decodeJwt, normalizeJwt } from "@/lib/utils/jwt";

// ======== ROUTE CONFIG ========

const protectedRoutes = [
  { path: "/dashboard", roles: ["ADMIN"] },
  { path: "/profile", roles: ["ADMIN", "USER"] },
  { path: "/admin", roles: ["ADMIN"] },
  { path: "/auth/change-password", roles: ["ADMIN", "USER"] },
];

const guestOnlyRoutes = [
  "/auth/login",
  "/auth/register",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/verify-email",
];

// ======== UTILITY FUNCTIONS ========

function isStaticAsset(pathname: string): boolean {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/static") ||
    pathname.match(/\.(.*)$/) !== null
  );
}

function isGuestOnlyRoute(pathname: string): boolean {
  return guestOnlyRoutes.some((path) => pathname.startsWith(path));
}

function getMatchedProtectedRoute(pathname: string) {
  return protectedRoutes.find((route) => pathname.startsWith(route.path));
}

function redirectTo(path: string, req: NextRequest): NextResponse {
  const url = new URL(path, req.url);
  return NextResponse.redirect(url);
}

function isTokenExpired(decoded: any): boolean {
  const exp = decoded?.exp;
  if (!exp || typeof exp !== "number") return true;
  return exp * 1000 <= Date.now();
}

async function tryRefreshInMiddleware(req: NextRequest) {
  const refreshToken = req.cookies.get("refreshToken")?.value;
  if (!refreshToken) return null;

  try {
    const refreshRes = await fetch(`${req.nextUrl.origin}/api/auth/refresh`, {
      method: "POST",
      headers: {
        Cookie: req.headers.get("cookie") ?? "",
      },
      cache: "no-store",
    });

    if (!refreshRes.ok) return null;

    const payload = await refreshRes.json().catch(() => null);
    const data = payload?.data ?? null;
    const accessToken = data?.accessToken ?? null;
    const newRefreshToken = data?.refreshToken ?? null;
    if (!accessToken) return null;

    const decoded = decodeJwt(accessToken);
    const normalized = decoded ? normalizeJwt(decoded) : null;
    if (!normalized) return null;

    return {
      accessToken,
      refreshToken: newRefreshToken,
      role: normalized.role ?? "",
      normalized,
    };
  } catch {
    return null;
  }
}

// ======== MAIN MIDDLEWARE ========

export function middleware(req: NextRequest) {
  return handleMiddleware(req);
}

async function handleMiddleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isStaticAsset(pathname)) {
    return NextResponse.next();
  }

  const accessToken = req.cookies.get("accessToken")?.value || null;
  let decoded = accessToken ? decodeJwt(accessToken) : null;
  let normalized = decoded ? normalizeJwt(decoded) : null;
  let role = normalized?.role ?? "";

  const shouldRefresh = !normalized || isTokenExpired(decoded);
  let refreshed: Awaited<ReturnType<typeof tryRefreshInMiddleware>> = null;
  if (shouldRefresh) {
    refreshed = await tryRefreshInMiddleware(req);
    if (refreshed) {
      decoded = refreshed.normalized;
      normalized = refreshed.normalized;
      role = refreshed.role;
    }
  }

  const isAuthenticated = !!normalized && !isTokenExpired(decoded);

  // Guest-only pages (cannot access if already logged in)
  if (isGuestOnlyRoute(pathname)) {
    if (isAuthenticated) {
      return redirectTo("/", req);
    }
    return NextResponse.next();
  }

  // Protected routes (login required)
  const matchedProtected = getMatchedProtectedRoute(pathname);
  // Thêm các API cần bảo vệ vào đây
  const isProtectedApi = pathname.startsWith("/api/auth/change-password") || pathname.startsWith("/api/auth/me");

  if (matchedProtected || isProtectedApi) {
    if (!isAuthenticated) {
      if (pathname.startsWith("/api")) {
        return NextResponse.json(
          { success: false, message: "Unauthorized" },
          { status: 401 }
        );
      }
      return redirectTo("/auth/login", req);
    }

    // Role-based check (chỉ áp dụng cho trang giao diện có cấu hình roles)
    if (matchedProtected && !matchedProtected.roles.includes(role)) {
      return redirectTo("/", req);
    }
  }

  const response = NextResponse.next();
  if (refreshed?.accessToken) {
    response.cookies.set("accessToken", refreshed.accessToken, {
      path: "/",
      maxAge: 60 * 15,
      httpOnly: false,
      sameSite: "lax",
    });
    if (refreshed.refreshToken) {
      response.cookies.set("refreshToken", refreshed.refreshToken, {
        path: "/",
        maxAge: 7 * 24 * 60 * 60,
        httpOnly: true,
        sameSite: "lax",
      });
    }
  }

  return response;
}

// ======== CONFIG ========

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
