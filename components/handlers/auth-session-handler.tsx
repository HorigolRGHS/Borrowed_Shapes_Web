"use client";

import { useEffect } from "react";
import { getAccessToken, syncProfile, api } from "@/lib/api/api-client";

export default function AuthSessionHandler() {
  useEffect(() => {
    const syncSession = async () => {
      const token = getAccessToken();

      // Luôn đồng bộ profile khi component mount nếu có token
      // để đảm bảo thông tin mới nhất (đáp ứng yêu cầu "lấy thông tin người dùng xem họ có cập nhật gì không")
      if (token) {
        console.debug("[AuthSessionHandler] Syncing session on mount...");
        await syncProfile(token);
      }
    };

    syncSession();

    const heartbeatIntervalMs =
      Number(process.env.NEXT_PUBLIC_HEARTBEAT_INTERVAL_MS) || 10_000;
    let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

    const sendHeartbeat = async () => {
      const token = getAccessToken();
      if (!token) return;
      try {
        await api.put("/presence/me");
      } catch (err) {
        console.error("[AuthSessionHandler] Heartbeat failed:", err);
      }
    };

    const startHeartbeat = () => {
      if (heartbeatTimer) return;
      heartbeatTimer = setInterval(sendHeartbeat, heartbeatIntervalMs);
    };

    const stopHeartbeat = () => {
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void sendHeartbeat();
        startHeartbeat();
      } else {
        stopHeartbeat();
      }
    };

    handleVisibility();
    document.addEventListener("visibilitychange", handleVisibility);

    const handleLogout = () => stopHeartbeat();
    window.addEventListener("api:logout" as any, handleLogout);

    return () => {
      stopHeartbeat();
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("api:logout" as any, handleLogout);
    };
  }, []);

  return null;
}
