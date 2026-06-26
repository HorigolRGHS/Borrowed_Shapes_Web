import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from "axios";
import { decodeJwt } from "@/lib/utils/jwt";

// Đọc API base URL ở RUNTIME, không inline lúc build.
// - Client: lấy từ window.__ENV (được layout chèn vào <head> theo request).
// - Server: đọc trực tiếp process.env (route handler / server component chạy ở runtime).
export const getApiBaseUrl = (): string => {
  if (typeof window !== "undefined") {
    const runtime = (window as unknown as { __ENV?: Record<string, string> })
      .__ENV?.NEXT_PUBLIC_API_BASE_URL;
    if (runtime) return runtime;
  }
  return process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001/api";
};

const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 30000,
  withCredentials: true,
  headers: {
    Accept: "application/json",
  },
});

let isRefreshing = false;
let failedQueue: any[] = [];
const REFRESH_SKEW_MS = 60_000;

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

const isTokenExpiringSoon = (token: string | null): boolean => {
  if (!token) return false;
  const decoded = decodeJwt(token);
  const exp = decoded?.exp;
  if (!exp) return false;
  return exp * 1000 - Date.now() <= REFRESH_SKEW_MS;
};

/**
 * Cập nhật user profile vào localStorage và thông báo cho toàn app
 */
export const syncProfile = async (accessToken?: string): Promise<any | null> => {
  if (typeof window === "undefined") return null;
  
  const token = accessToken || getAccessToken();
  if (!token) return null;

  try {
    // Sử dụng raw axios để tránh interceptor deadlock
    const response = await axios.get(`${getApiBaseUrl()}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const res = response.data;
    const user = res?.data || res;
    
    if (user) {
      setUserProfile(user);
      window.dispatchEvent(new CustomEvent("api:profile-updated", { detail: user }));
      return user;
    }
  } catch (err) {
    console.error("[apiClient] Failed to sync profile:", err);
  }
  return null;
};

const refreshSession = async (): Promise<string | null> => {
  if (isRefreshing) {
    return new Promise<string | null>((resolve, reject) => {
      failedQueue.push({ resolve, reject });
    });
  }

  isRefreshing = true;

  try {
    const response = await axios.post("/api/auth/refresh", null, { withCredentials: true });
    const data = response.data?.data ?? response.data;
    const accessToken = data?.accessToken;

    if (!accessToken) {
      throw new Error("Missing access token from refresh");
    }

    // Luôn luôn gọi syncProfile để lấy thông tin mới nhất và cập nhật browser
    await syncProfile(accessToken);
    console.debug("[apiClient] Profile synced after refresh");

    processQueue(null, accessToken);
    return accessToken;
  } catch (error) {
    processQueue(error, null);
    throw error;
  } finally {
    isRefreshing = false;
  }
};

apiClient.interceptors.request.use(
  async (config) => {
    // Resolve lại baseURL mỗi request để luôn lấy giá trị runtime (window.__ENV).
    config.baseURL = getApiBaseUrl();

    let token: string | null = null;

    if (typeof window !== "undefined") {
      token = getAccessToken();
      // Chỉ tự động refresh nếu không phải là request tới login/refresh
      const isAuthRequest = config.url?.includes("/auth/login") || config.url?.includes("/auth/refresh");
      
      if (token && isTokenExpiringSoon(token) && !isAuthRequest) {
        try {
          const refreshedToken = await refreshSession();
          token = refreshedToken ?? getAccessToken();
        } catch (e) {
          console.warn("[apiClient] Token refresh failed in request interceptor", e);
        }
      }
    } else {
      // Server-side: sử dụng next/headers
      try {
        const { cookies } = require("next/headers");
        const cookieStore = await cookies();
        token = cookieStore.get("accessToken")?.value || null;
      } catch (e) {
        // Có thể đang chạy ở nơi không có request context
      }
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (typeof window !== "undefined") {
      const lang = getCookie("NEXT_LOCALE") || "en";
      config.headers["Accept-Language"] = lang;
    } else {
      try {
        const { cookies } = require("next/headers");
        const cookieStore = await cookies();
        const lang = cookieStore.get("NEXT_LOCALE")?.value || "en";
        config.headers["Accept-Language"] = lang;
      } catch (e) {}
    }

    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest: any = error.config;

    if (typeof window !== "undefined" && error.response?.status === 403) {
      const respData = error.response.data as any;
      const errorCode = respData?.code || respData?.data?.code || respData?.error?.code;
      if (errorCode === "ACCOUNT_BANNED") {
        const banInfo = respData?.ban || respData?.data?.ban || respData?.error?.ban || respData?.details?.ban;
        window.dispatchEvent(
          new CustomEvent("account:status_error", {
            detail: { code: "ACCOUNT_BANNED", ban: banInfo },
          })
        );
      } else if (errorCode === "ACCOUNT_DELETED") {
        const deletedInfo = respData?.deleted || respData?.data?.deleted || respData?.error?.deleted || respData?.details?.deleted;
        window.dispatchEvent(
          new CustomEvent("account:status_error", {
            detail: { code: "ACCOUNT_DELETED", deleted: deletedInfo },
          })
        );
      }
    }

    if (typeof window !== "undefined" && error.response?.status === 401 && !originalRequest._retry) {
      // Nếu là request tới login/refresh bị 401 thì không retry (tránh loop)
      if (originalRequest.url?.includes("/auth/login") || originalRequest.url?.includes("/auth/refresh")) {
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      try {
        const accessToken = (await refreshSession()) ?? getAccessToken();
        if (!accessToken) {
          throw new Error("Missing refreshed access token");
        }

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        handleLogout();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export const setAccessToken = (token: string) => {
  if (typeof window === "undefined") return;
  document.cookie = `accessToken=${token}; Path=/; Max-Age=${15 * 60}; SameSite=Lax`;
};

export const setRefreshToken = (token: string) => {
  if (typeof window === "undefined") return;
  // Lưu ý: Thường refreshToken nên là HttpOnly, nhưng nếu frontend nhận được thì có thể lưu tạm
  // hoặc để backend lo việc set cookie HttpOnly. 
  // Ở đây ta set để đồng bộ với state hiện tại của browser.
  document.cookie = `refreshToken=${token}; Path=/; Max-Age=${7 * 24 * 60 * 60}; SameSite=Lax`;
};

export const setUserProfile = (user: any) => {
  if (typeof window === "undefined") return;
  localStorage.setItem("user_profile", JSON.stringify(user));
};

export const getUserProfile = (): any | null => {
  if (typeof window === "undefined") return null;
  const userStr = localStorage.getItem("user_profile");
  if (!userStr) return null;

  try {
    const user = JSON.parse(userStr);
    // Migration: If the cached user still has the raw public R2 URL, invalidate the cache.
    // This forces the frontend to fetch the fresh proxy URL from /api/auth/me.
    if (user && user.imgUrl && user.imgUrl.includes("r2.dev")) {
      localStorage.removeItem("user_profile");
      return null;
    }
    return user;
  } catch (err) {
    localStorage.removeItem("user_profile");
    return null;
  }
};

export const getAccessToken = () => getCookie("accessToken");

export const handleLogout = async () => {
  if (typeof window === "undefined") return;
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } catch (err) {
    console.error("Failed to call logout API", err);
  }
  document.cookie = "accessToken=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT";
  document.cookie = "refreshToken=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT";
  localStorage.removeItem("user_profile");
  window.dispatchEvent(new CustomEvent("api:logout"));
  if (window.location.pathname !== "/auth/login") {
    window.location.href = "/auth/login";
  }
};

function getCookie(name: string): string | null {
  if (typeof window === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : null;
}

export const api = {
  get: <T = any>(url: string, config?: AxiosRequestConfig) => 
    apiClient.get<T>(url, config).then(res => res.data),
  post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) => 
    apiClient.post<T>(url, data, config).then(res => res.data),
  put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) => 
    apiClient.put<T>(url, data, config).then(res => res.data),
  patch: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) => 
    apiClient.patch<T>(url, data, config).then(res => res.data),
  delete: <T = any>(url: string, config?: AxiosRequestConfig) => 
    apiClient.delete<T>(url, config).then(res => res.data),
};


export default apiClient;
