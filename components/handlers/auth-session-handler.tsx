"use client";

import { useEffect } from "react";
import { getAccessToken, getUserProfile, setUserProfile, api } from "@/lib/api/api-client";

export default function AuthSessionHandler() {
  useEffect(() => {
    const syncSession = async () => {
      const token = getAccessToken();
      const profile = getUserProfile();

      // Nếu có token nhưng chưa có profile (vừa login bằng Google xong)
      if (token && !profile) {
        try {
          console.debug("[AuthSessionHandler] Syncing session...");
          const res = await api.get("/auth/me");
          if (res && res.success && res.data) {
            setUserProfile(res.data);
            // Phát sự kiện để các component khác biết profile đã được cập nhật
            window.dispatchEvent(new CustomEvent("api:profile-updated", { detail: res.data }));
            console.debug("[AuthSessionHandler] Session synced successfully");
          }
        } catch (err) {
          console.error("[AuthSessionHandler] Failed to sync session:", err);
        }
      }
    };

    syncSession();
  }, []);

  return null;
}
