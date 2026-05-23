"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18/i18n-context";

interface Row {
  key: string;
  value: string;
}

interface Props {
  value: Record<string, number>;
  onChange: (next: Record<string, number>) => void;
  className?: string;
}

function rowsFromValue(v: Record<string, number>): Row[] {
  return Object.entries(v).map(([key, value]) => ({
    key,
    value: String(value),
  }));
}

function rowsToValue(rows: Row[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows) {
    const k = r.key.trim();
    if (!k) continue;
    const n = Number(r.value);
    if (!Number.isFinite(n)) continue;
    out[k] = n;
  }
  return out;
}

export function StatsInput({ value, onChange, className }: Props) {
  const { t } = useI18n();
  const [rows, setRows] = React.useState<Row[]>(() => rowsFromValue(value));

  React.useEffect(() => {
    const externalKeys = Object.keys(value).sort().join("|");
    const internalKeys = rows
      .map((r) => r.key.trim())
      .filter(Boolean)
      .sort()
      .join("|");
    if (externalKeys !== internalKeys) {
      setRows(rowsFromValue(value));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const update = (next: Row[]) => {
    setRows(next);
    onChange(rowsToValue(next));
  };

  const updateRow = (i: number, patch: Partial<Row>) => {
    const next = [...rows];
    next[i] = { ...next[i], ...patch };
    update(next);
  };

  const addRow = () => update([...rows, { key: "", value: "" }]);
  const removeRow = (i: number) => {
    const next = [...rows];
    next.splice(i, 1);
    update(next);
  };

  const seenKeys = new Map<string, number>();
  rows.forEach((r, i) => {
    const k = r.key.trim().toLowerCase();
    if (k && !seenKeys.has(k)) seenKeys.set(k, i);
  });

  return (
    <div className={className}>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t("wiki.metadata.no_stats")}
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map((row, i) => {
            const k = row.key.trim().toLowerCase();
            const dup = k && seenKeys.get(k) !== i;
            return (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={row.key}
                  onChange={(e) => updateRow(i, { key: e.target.value })}
                  placeholder={t("wiki.metadata.stat_key_placeholder")}
                  maxLength={40}
                  className={dup ? "border-destructive" : undefined}
                  aria-invalid={dup ? true : undefined}
                />
                <Input
                  type="number"
                  step="any"
                  value={row.value}
                  onChange={(e) => updateRow(i, { value: e.target.value })}
                  placeholder={t("wiki.metadata.stat_value_placeholder")}
                  className="max-w-40"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeRow(i)}
                  aria-label="Remove stat"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addRow}
        className="mt-3"
      >
        <Plus className="h-4 w-4 mr-1" />
        {t("wiki.metadata.add_stat")}
      </Button>
    </div>
  );
}
