"use client";

import * as React from "react";
import { Pencil, X } from "lucide-react";
import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormField,
  FormItem,
} from "@/components/ui/form";
import { I18nFormMessage } from "@/components/ui/i18n-form-message";
import { useI18n } from "@/lib/i18/i18n-context";

interface Props {
  name: "slug" | "slugVi";
  prefix?: string;
  onTouchedChange?: (touched: boolean) => void;
}

export function SlugEditRow({
  name,
  prefix = "/wiki/",
  onTouchedChange,
}: Props) {
  const { control } = useFormContext();
  const { t } = useI18n();
  const [editing, setEditing] = React.useState(false);

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <div className="flex items-center gap-2">
            {editing ? (
              <>
                <FormControl>
                  <Input
                    {...field}
                    autoFocus
                    onChange={(e) => {
                      onTouchedChange?.(true);
                      field.onChange(e);
                    }}
                  />
                </FormControl>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditing(false)}
                  aria-label={t("wiki.new.confirm_slug")}
                >
                  <X className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground flex-1 truncate">
                  {t("wiki.new.url_preview")}{" "}
                  <code className="rounded bg-muted px-1 py-0.5 text-foreground">
                    {prefix}
                    {field.value || "…"}
                  </code>
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    onTouchedChange?.(true);
                    setEditing(true);
                  }}
                  aria-label={t("wiki.new.edit_slug")}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
          <I18nFormMessage />
        </FormItem>
      )}
    />
  );
}
