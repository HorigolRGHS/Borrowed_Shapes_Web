"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useI18n } from "@/lib/i18/i18n-context";
import { AuthCard } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

function GoogleFinishContent() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const loginCode = searchParams.get("loginCode") ?? "";
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!loginCode) return;
    void navigator.clipboard
      ?.writeText(loginCode)
      .then(() => setCopied(true))
      .catch(() => {});
  }, [loginCode]);

  return (
    <AuthCard title={t("auth.google_complete_title")}>
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {loginCode ? t("auth.google_code_received") : t("auth.google_code_missing")}
        </p>
        {loginCode && (
          <pre className="overflow-x-auto rounded-md bg-muted px-4 py-3 text-sm font-mono">
            {loginCode}
          </pre>
        )}
        <Alert>
          <AlertDescription>
            {copied ? t("auth.copied_to_clipboard") : t("auth.waiting_for_copy")}
          </AlertDescription>
        </Alert>
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
