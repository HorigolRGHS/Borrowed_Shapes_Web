"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { WikiFormValue } from "@/models/dtos/wiki-form.dto";

export function EditableStatsField() {
  const form = useFormContext<WikiFormValue>();
  const stats =
    useWatch({ control: form.control, name: "metadata.stats" }) ?? {};
  const entries = Object.entries(stats);

  const setStats = (next: Record<string, string>) =>
    form.setValue("metadata.stats", next, { shouldDirty: true });

  const renameKey = (oldKey: string, newKey: string) => {
    if (newKey === oldKey) return;
    const next: Record<string, string> = {};
    for (const [k, v] of entries) {
      next[k === oldKey ? newKey : k] = v as string;
    }
    setStats(next);
  };

  const setValue = (key: string, value: string) => {
    setStats({ ...stats, [key]: value });
  };

  const remove = (key: string) => {
    const next = { ...stats };
    delete next[key];
    setStats(next);
  };

  const add = () => {
    let i = 1;
    let key = `stat${i}`;
    while (Object.prototype.hasOwnProperty.call(stats, key)) {
      i++;
      key = `stat${i}`;
    }
    setStats({ ...stats, [key]: "" });
  };

  return (
    <div className="space-y-1">
      {entries.map(([k, v]) => (
        <div key={k} className="flex items-center gap-1 group">
          <Input
            value={k}
            onChange={(e) => renameKey(k, e.target.value)}
            className="h-7 text-sm flex-1"
          />
          <Input
            value={v as string}
            onChange={(e) => setValue(k, e.target.value)}
            className="h-7 text-sm flex-1 text-right tabular-nums"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 opacity-0 group-hover:opacity-100"
            onClick={() => remove(k)}
            aria-label="Remove stat"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs"
        onClick={add}
      >
        <Plus className="h-3 w-3 mr-1" />
        Add stat
      </Button>
    </div>
  );
}
