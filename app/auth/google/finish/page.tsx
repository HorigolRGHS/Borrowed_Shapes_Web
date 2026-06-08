"use client";

import Link from "next/link";
import { Suspense, useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useI18n } from "@/lib/i18/i18n-context";
import { AuthCard } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

function GoogleFinishContent() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const loginCode = searchParams.get("loginCode") ?? "";
  const returnTo = searchParams.get("returnTo");
  
  const [copied, setCopied] = useState(false);
  const [deepLinkAttempted, setDeepLinkAttempted] = useState(false);
  const [deepLinkFailed, setDeepLinkFailed] = useState(false);
  
  const hasAttemptedDeepLink = useRef(false);
  
  const handleCopy = () => {
    if (!loginCode) return;
    void navigator.clipboard
      ?.writeText(loginCode)
      .then(() => setCopied(true))
      .catch(() => {});
  };

  useEffect(() => {
    if (!loginCode) return;
    
    if (returnTo && !hasAttemptedDeepLink.current) {
      hasAttemptedDeepLink.current = true;
      setDeepLinkAttempted(true);
      
      try {
        const url = new URL(returnTo);
        url.searchParams.set("loginCode", loginCode);
        window.location.href = url.toString();
        
        // After 3.5 seconds, if the page is still visible, assume deeplink failed
        setTimeout(() => {
          if (!document.hidden) {
            setDeepLinkFailed(true);
          }
        }, 3500);
      } catch (e) {
        setDeepLinkFailed(true);
      }
      return;
    }

    if (!returnTo || deepLinkFailed) {
      void navigator.clipboard
        ?.writeText(loginCode)
        .then(() => setCopied(true))
        .catch(() => {});
    }
  }, [loginCode, returnTo, deepLinkFailed]);

  // If deeplink is in progress and hasn't failed yet
  if (returnTo && deepLinkAttempted && !deepLinkFailed) {
    return (
      <AuthCard title={t("auth.google_complete_title")}>
        <div className="space-y-6 text-center py-6">
          <div className="flex justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-lg">{t("auth.google_deeplink_opening")}</h3>
            <p className="text-sm text-muted-foreground">
              {t("auth.google_deeplink_success")}
            </p>
          </div>
          <Button 
            variant="outline" 
            className="w-full mt-4" 
            onClick={() => setDeepLinkFailed(true)}
          >
            {t("auth.google_show_code_manually")}
          </Button>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={t("auth.google_complete_title")}>
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {loginCode 
            ? (returnTo && deepLinkFailed ? t("auth.google_deeplink_failed") : t("auth.google_code_received")) 
            : t("auth.google_code_missing")}
        </p>
        
        {loginCode && (
          <div className="flex gap-2 items-stretch">
            <pre className="flex-1 overflow-x-auto rounded-md bg-muted px-4 py-3 text-sm font-mono flex items-center">
              {loginCode}
            </pre>
            <Button onClick={handleCopy} variant="outline" className="px-4">
              {copied ? t("auth.copy_success") : t("auth.copy")}
            </Button>
          </div>
        )}

        {copied && (
          <Alert className="border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400">
            <AlertDescription>
              {t("auth.copied_to_clipboard")}
            </AlertDescription>
          </Alert>
        )}

        <Button asChild className="w-full">
          <Link href="/">{t("common.back_to_home")}</Link>
        </Button>
      </div>
    </AuthCard>
  );
}

export default function GoogleFinishPage() {
  const { t } = useI18n();
  return (
    <Suspense
      fallback={
        <AuthCard title={t("auth.google_complete_title")}>
          <p className="text-muted-foreground">{t("common.loading")}</p>
        </AuthCard>
      }
    >
      <GoogleFinishContent />
    </Suspense>
  );
}
