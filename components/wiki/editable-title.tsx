"use client";

import * as React from "react";
import { Pencil } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Props {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  error?: string | null;
  className?: string;
}

export function EditableTitle({
  value,
  onChange,
  placeholder,
  error,
  className,
}: Props) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(value);
  const originalRef = React.useRef(value);

  React.useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  const enterEdit = () => {
    originalRef.current = value;
    setDraft(value);
    setEditing(true);
  };

  const commit = () => {
    const trimmed = draft.trim();
    if (!trimmed) {
      onChange("");
      return;
    }
    onChange(trimmed);
    setEditing(false);
  };

  const revert = () => {
    setDraft(originalRef.current);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className={cn("space-y-1", className)}>
        <Input
          value={draft}
          autoFocus
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            } else if (e.key === "Escape") {
              e.preventDefault();
              revert();
            }
          }}
          placeholder={placeholder}
          className="text-2xl font-bold tracking-tight h-auto py-1"
          aria-invalid={error ? true : undefined}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <div className={cn("group flex items-center gap-2", className)}>
      <h1
        onClick={enterEdit}
        className="text-2xl font-bold tracking-tight cursor-text hover:bg-muted/40 rounded px-1 -mx-1"
      >
        {value || (
          <span className="text-muted-foreground italic">
            {placeholder ?? "…"}
          </span>
        )}
      </h1>
      <button
        type="button"
        onClick={enterEdit}
        className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 text-muted-foreground hover:text-foreground transition"
        aria-label="Edit title"
      >
        <Pencil className="h-4 w-4" />
      </button>
    </div>
  );
}
