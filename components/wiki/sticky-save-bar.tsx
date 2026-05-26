"use client";

import { Circle } from "lucide-react";
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
    <div className="sticky bottom-0 z-10 border-t bg-background/95 px-4 py-3 backdrop-blur supports-backdrop-filter:bg-background/80">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {isDirty && (
            <>
              <Circle className="h-2 w-2 fill-current" />
              <span>{t("wiki.edit.unsaved_indicator")}</span>
            </>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={saving}
          >
            {t("wiki.edit.cancel_button")}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onSaveDraft}
            disabled={!canSubmitDraft || saving}
          >
            {t("wiki.save_draft_button")}
          </Button>
          <Button
            type="button"
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
