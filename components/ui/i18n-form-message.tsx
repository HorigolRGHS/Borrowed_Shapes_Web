"use client";

import * as React from "react";
import { useFormField } from "@/components/ui/form";
import { useI18n } from "@/lib/i18/i18n-context";
import { cn } from "@/lib/utils";

const I18nFormMessage = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, children, ...props }, ref) => {
  const { error, formMessageId } = useFormField();
  const { t } = useI18n();
  const raw = error ? String(error?.message ?? "") : children;
  if (!raw) return null;
  const display = typeof raw === "string" ? t(raw) : raw;
  return (
    <p
      ref={ref}
      id={formMessageId}
      className={cn("text-sm font-medium text-destructive", className)}
      {...props}
    >
      {display}
    </p>
  );
});
I18nFormMessage.displayName = "I18nFormMessage";

export { I18nFormMessage };
