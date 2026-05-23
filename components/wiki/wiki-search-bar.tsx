"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { useI18n } from "@/lib/i18/i18n-context";
import { Input } from "@/components/ui/input";

interface Props {
  initialQuery?: string;
}

export function WikiSearchBar({ initialQuery = "" }: Props) {
  const { t } = useI18n();
  const router = useRouter();
  const [value, setValue] = useState(initialQuery);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  const triggerNavigate = (q: string) => {
    const trimmed = q.trim();
    if (trimmed.length === 0) router.push("/wiki");
    else router.push(`/wiki/search?q=${encodeURIComponent(trimmed)}`);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setValue(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => triggerNavigate(next), 300);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    triggerNavigate(value);
  };

  return (
    <form onSubmit={handleSubmit} className="relative w-full">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        value={value}
        onChange={handleChange}
        placeholder={t("wiki.search_placeholder")}
        className="pl-9"
      />
    </form>
  );
}
