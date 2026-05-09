import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from "axios";

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001/api",
  timeout: 30000,
  withCredentials: true,
  headers: {
    Accept: "application/json",
  },
});

let isRefreshing = false;
let failedQueue: any[] = [];

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

apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = getAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      const lang = getCookie("NEXT_LOCALE") || "en";
      config.headers["Accept-Language"] = lang;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest: any = error.config;

    if (typeof window !== "undefined" && error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // 1. Gọi về Route Handler nội bộ để refresh
        const response = await axios.post("/api/auth/refresh");
        const { accessToken, user } = response.data.data;
        
        // 2. CƠ CHẾ LƯU THÔNG TIN: Tự động cập nhật user profile nếu có trả về
        if (user) {
          localStorage.setItem("user_profile", JSON.stringify(user));
          console.debug("[apiClient] Profile updated after refresh");
        }

        processQueue(null, accessToken);
        isRefreshing = false;

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;
        handleLogout();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export const setUserProfile = (user: any) => {
  if (typeof window === "undefined") return;
  localStorage.setItem("user_profile", JSON.stringify(user));
};

export const getUserProfile = (): any | null => {
  if (typeof window === "undefined") return null;
  const user = localStorage.getItem("user_profile");
  return user ? JSON.parse(user) : null;
};

export const getAccessToken = () => getCookie("accessToken");

export const handleLogout = () => {
  if (typeof window === "undefined") return;
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
