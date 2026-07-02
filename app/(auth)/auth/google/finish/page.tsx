"use client";

import Link from "next/link";
import { Suspense, useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useI18n } from "@/lib/i18/i18n-context";
import { AuthCard, AuthLogo } from "@/components/auth/auth-card";
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
      <AuthCard title={t("auth.google_complete_title")} logo={<AuthLogo />}>
        <div className="space-y-6 text-center py-6">
          <div className="flex justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]" />
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-lg text-foreground font-orbitron">{t("auth.google_deeplink_opening")}</h3>
            <p className="text-sm text-muted-foreground font-sans">
              {t("auth.google_deeplink_success")}
            </p>
          </div>
          <button 
            type="button"
            className="w-full py-3 rounded-xl border border-border hover:border-muted-foreground/50 bg-background hover:bg-muted text-foreground transition-all duration-200 font-sans font-medium mt-4" 
            onClick={() => setDeepLinkFailed(true)}
          >
            {t("auth.google_show_code_manually")}
          </button>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={t("auth.google_complete_title")} logo={<AuthLogo />}>
      <div className="space-y-5">
        <p className="text-sm text-muted-foreground font-sans text-center">
          {loginCode 
            ? (returnTo && deepLinkFailed ? t("auth.google_deeplink_failed") : t("auth.google_code_received")) 
            : t("auth.google_code_missing")}
        </p>
        
        {loginCode && (
          <div className="flex flex-col gap-4 items-stretch">
            <div className="relative">
              <pre className="w-full text-center tracking-widest text-xl font-bold bg-background border border-border hover:border-muted-foreground/50 focus:border-primary rounded-xl py-4 px-4 text-amber-500 outline-none transition-colors overflow-x-auto shadow-inner" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                {loginCode}
              </pre>
            </div>
            <button 
              onClick={handleCopy} 
              className="w-full bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 text-white font-bold py-3 rounded-xl shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_30px_rgba(34,211,238,0.5)] transition-all flex justify-center items-center font-orbitron tracking-wide"
            >
              {copied ? t("auth.copy_success") : t("auth.copy")}
            </button>
          </div>
        )}

        {copied && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-green-500/10 border border-green-500/30">
            <p className="text-green-400 text-sm font-sans">
              {t("auth.copied_to_clipboard")}
            </p>
          </div>
        )}

        <Link 
          href="/"
          className="w-full mt-4 py-3 rounded-xl border border-border hover:border-muted-foreground/50 bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-200 flex items-center justify-center font-sans text-sm font-medium"
        >
          {t("common.back_to_home")}
        </Link>
      </div>
    </AuthCard>
  );
}

export default function GoogleFinishPage() {
  const { t } = useI18n();
  return (
    <Suspense
      fallback={
        <AuthCard title={t("auth.google_complete_title")} logo={<AuthLogo />}>
          <div className="flex justify-center py-6">
            <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
          </div>
        </AuthCard>
      }
    >
      <GoogleFinishContent />
    </Suspense>
  );
}
