"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { api, getAccessToken, handleLogout } from "@/lib/api/api-client";
import { useI18n } from "@/lib/i18/i18n-context";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function AccountStatusWatcher() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useI18n();
  
  const [statusError, setStatusError] = useState<any>(null);
  
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // If we are on login/register pages, do not run the watcher or show dialog
  const isAuthPage = pathname?.startsWith("/auth/login") || pathname?.startsWith("/auth/register");

  useEffect(() => {
    if (isAuthPage || statusError) {
      if (pollingRef.current) clearInterval(pollingRef.current);
      return;
    }

    const checkStatus = async () => {
      // Only check if user seems logged in
      if (!getAccessToken()) return;

      try {
        await api.get("/auth/me");
      } catch (err: any) {
        // Interceptor will catch ACCOUNT_BANNED / ACCOUNT_DELETED and dispatch the event
      }
    };

    // Poll every 30 seconds
    pollingRef.current = setInterval(checkStatus, 30000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [isAuthPage, statusError]);

  useEffect(() => {
    if (isAuthPage) return;

    const handleStatusEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      const info = customEvent.detail;
      
      setStatusError(info);
      
      if (pollingRef.current) clearInterval(pollingRef.current);
    };

    window.addEventListener("account:status_error", handleStatusEvent);
    
    return () => {
      window.removeEventListener("account:status_error", handleStatusEvent);
    };
  }, [isAuthPage]);

  const handleClose = () => {
    // Save to session storage before redirect
    if (statusError) {
      sessionStorage.setItem("lastAccountStatusError", JSON.stringify(statusError));
    }
    
    // Clear tokens
    handleLogout();
    
    // Redirect
    router.replace(`/auth/login?reason=${statusError?.code === "ACCOUNT_DELETED" ? "deleted" : "banned"}`);
  };

  if (isAuthPage || !statusError) return null;

  const isBanned = statusError.code === "ACCOUNT_BANNED";
  const banInfo = statusError.ban;
  const deletedInfo = statusError.deleted;

  return (
    <Dialog open={!!statusError} onOpenChange={handleClose}>
      <DialogContent className="max-w-md bg-background border-border">
        <DialogHeader>
          <DialogTitle className="text-red-500 text-xl font-bold">
            {isBanned 
              ? (t("auth.status.banned_title") || "Account Banned")
              : (t("auth.status.deleted_title") || "Account Deleted")}
          </DialogTitle>
          <DialogDescription className="text-base text-foreground">
            {isBanned 
              ? (t("auth.status.banned_message") || "Your account has been banned.")
              : (t("auth.status.deleted_message") || "Your account has been deleted.")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-md space-y-3">
            {isBanned ? (
              <>
                <div>
                  <span className="text-sm font-semibold text-red-500 mb-1 block">
                    {t("auth.status.reason") || "Reason"}:
                  </span>
                  <p className="text-sm text-foreground">
                    {banInfo?.reason || t("auth.status.no_reason") || "No reason provided."}
                  </p>
                </div>
                
                <div className="border-t border-red-500/10 pt-3">
                  <span className="text-sm font-semibold text-red-500 mb-1 block">
                    {banInfo?.isPermanent || !banInfo?.banExpiresAt
                      ? (t("auth.status.duration") || "Duration") + ":"
                      : (t("auth.status.expires_at") || "Expires At") + ":"}
                  </span>
                  <p className="text-sm font-mono text-foreground">
                    {banInfo?.isPermanent || !banInfo?.banExpiresAt
                      ? t("auth.status.permanent") || "Permanent"
                      : new Date(banInfo?.banExpiresAt).toLocaleDateString()}
                  </p>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-foreground mb-3">
                  {t("auth.status.deleted_description") || "This account can no longer access the system."}
                </p>
                {deletedInfo?.deletedAt && (
                  <div className="border-t border-red-500/10 pt-3">
                    <span className="text-sm font-semibold text-red-500 mb-1 block">
                      {t("auth.status.deleted_at") || "Deleted At"}:
                    </span>
                    <p className="text-sm font-mono text-foreground">
                      {new Date(deletedInfo.deletedAt).toLocaleString()}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="destructive" onClick={handleClose} className="w-full">
            {t("auth.status.go_to_login") || "Go to Login"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
