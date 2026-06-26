"use client";

import { useI18n } from "@/lib/i18/i18n-context";
import { ErrorPage } from "@/components/error/error-page";
import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";

export default function NotFound() {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-background dark:bg-[#07070f] flex flex-col font-sans">
      <PublicHeader />
      <main className="flex-1 pt-16">
        <ErrorPage
          code="404"
          title={t("errors.notFound.title") || "Page not found"}
          description={
            t("errors.notFound.description") ||
            "The page you are looking for may have been moved, deleted, or never existed in Borrowed Shapes."
          }
          actionLabel={t("errors.common.backToHome") || "Back to Home"}
        />
      </main>
      <PublicFooter />
    </div>
  );
}
