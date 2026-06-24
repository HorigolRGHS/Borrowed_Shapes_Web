"use client";

import { Check, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18/i18n-context";

interface Props {
  isDirty: boolean;
  saving: boolean;
  canSubmitDraft: boolean;
  canPublish: boolean;
  onSaveDraft: () => void;
  onPublish: () => void;
  onCancel: () => void;
}

export function StickySaveBar({
  isDirty,
  saving,
  canSubmitDraft,
  canPublish,
  onSaveDraft,
  onPublish,
  onCancel,
}: Props) {
  const { t } = useI18n();

  return (
    <div className="pointer-events-none sticky bottom-4 z-10 mt-6 flex justify-center px-4">
      <div className="pointer-events-auto flex w-full max-w-2xl items-center justify-between gap-4 rounded-full border border-border/60 bg-background/80 py-2 pl-5 pr-2 shadow-lg shadow-black/20 backdrop-blur-md supports-backdrop-filter:bg-background/60">
        <div className="flex items-center gap-2 text-sm">
          {isDirty ? (
            <span className="flex items-center gap-2 text-amber-500">
              <Circle className="h-2 w-2 fill-current animate-pulse" />
              <span className="font-medium">
                {t("wiki.edit.unsaved_indicator")}
              </span>
            </span>
          ) : (
            <span className="flex items-center gap-2 text-muted-foreground">
              <Check className="h-3.5 w-3.5" />
              <span>{t("wiki.edit.saved_indicator")}</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={saving}
          >
            {t("wiki.edit.cancel_button")}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={onSaveDraft}
            disabled={!canSubmitDraft || saving}
          >
            {t("wiki.save_draft_button")}
          </Button>
          <Button
            type="button"
            size="sm"
            className="rounded-full"
            onClick={onPublish}
            disabled={!canPublish || saving}
          >
            {t("wiki.save_publish_button")}
          </Button>
        </div>
      </div>
    </div>
  );
}
