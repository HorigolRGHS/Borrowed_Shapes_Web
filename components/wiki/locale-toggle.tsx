"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Props {
  value: "en" | "vi";
  onChange: (next: "en" | "vi") => void;
  enLabel: string;
  viLabel: string;
}

export function LocaleToggle({ value, onChange, enLabel, viLabel }: Props) {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as "en" | "vi")}>
      <TabsList className="h-8">
        <TabsTrigger value="en">{enLabel}</TabsTrigger>
        <TabsTrigger value="vi">{viLabel}</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
