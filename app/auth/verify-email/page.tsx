"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { AuthCard } from "@/components/auth/auth-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18/i18n-context";

type VerifyState = "loading" | "success" | "error";

function VerifyEmailContent() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get("token") ?? "", [searchParams]);
  const [state, setState] = useState<VerifyState>("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    const run = async () => {
      if (!token) {
        if (!active) return;
        setState("error");
        setMessage(t("auth.missing_token"));
        return;
      }
      try {
        const res = await fetch(
          `/api/auth/verify-email?token=${encodeURIComponent(token)}`,
          { method: "POST" },
        );
        const data = await res.json().catch(() => ({}));
        if (!active) return;
        if (res.ok) {
          setState("success");
          setMessage(data?.message ?? t("auth.email_verified_successfully"));
        } else {
          setState("error");
          setMessage(data?.message ?? t("auth.verification_failed_expired"));
        }
      } catch {
        if (!active) return;
        setState("error");
        setMessage(t("auth.cannot_connect_server"));
      }
    };
    run();
    return () => {
      active = false;
    };
  }, [token]);

  // Handle translation for dynamic messages that might be translation keys
  const getDisplayMessage = (msg: string) => {
    if (!msg) return "";
    // If it looks like a translation key from backend, e.g., auth.email_verified
    if (msg.startsWith("auth.") || msg.startsWith("validation.")) {
      return t(msg as any);
    }
    return msg;
  };

  return (
    <AuthCard title={t("auth.email_verification_title")}>
      {state === "loading" && (
        <Alert>
          <Loader2 className="h-4 w-4 animate-spin" />
          <AlertTitle>{t("auth.verifying")}</AlertTitle>
          <AlertDescription>{t("auth.please_wait")}</AlertDescription>
        </Alert>
      )}
      {state === "success" && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>{t("auth.verified")}</AlertTitle>
          <AlertDescription>{getDisplayMessage(message)}</AlertDescription>
        </Alert>
      )}
      {state === "error" && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>{t("auth.verification_failed")}</AlertTitle>
          <AlertDescription>{getDisplayMessage(message)}</AlertDescription>
        </Alert>
      )}
      {state !== "loading" && (
        <div className="mt-6 flex gap-2 justify-center">
          <Button asChild>
            <Link href="/">{t("common.back_to_home")}</Link>
          </Button>
          {state === "error" && (
            <Button asChild variant="outline">
              <Link href="/auth/reset-password">{t("auth.open_reset_page")}</Link>
            </Button>
          )}
        </div>
      )}
    </AuthCard>
  );
}

export default function VerifyEmailPage() {
  const { t } = useI18n();
  return (
    <Suspense
      fallback={
        <AuthCard title={t("auth.email_verification_title")}>
          <p className="text-muted-foreground">{t("common.loading")}</p>
        </AuthCard>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
