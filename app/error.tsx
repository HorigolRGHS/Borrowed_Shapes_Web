"use client";

import { useEffect } from "react";
import { useI18n } from "@/lib/i18/i18n-context";
import { ErrorPage } from "@/components/error/error-page";
import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useI18n();

  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Application Error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background dark:bg-[#07070f] flex flex-col font-sans">
      <PublicHeader />
      <main className="flex-1 pt-16">
        <ErrorPage
          code="500"
          title={t("errors.serverError.title") || "Something went wrong"}
          description={
            t("errors.serverError.description") ||
            "Borrowed Shapes ran into an unexpected problem. Please try again later or return to the home page."
          }
          actionLabel={t("errors.common.backToHome") || "Back to Home"}
          showReset={true}
          onReset={reset}
          resetLabel={t("errors.common.tryAgain") || "Try again"}
        />
      </main>
      <PublicFooter />
    </div>
  );
}
