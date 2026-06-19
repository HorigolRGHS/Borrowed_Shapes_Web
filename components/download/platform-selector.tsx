"use client";

import { Monitor, Apple, Terminal } from "lucide-react";
import { useI18n } from "@/lib/i18/i18n-context";

interface PlatformSelectorProps {
  selectedPlatform: string;
  onSelectPlatform: (platform: string) => void;
}

export function PlatformSelector({ selectedPlatform, onSelectPlatform }: PlatformSelectorProps) {
  const { t } = useI18n();

  const platforms = [
    { id: "windows", label: "Windows", icon: Monitor, available: true },
    { id: "macos", label: "macOS", icon: Apple, available: false },
    { id: "linux", label: "Linux", icon: Terminal, available: false },
  ];

  return (
    <div className="flex flex-wrap items-center justify-center gap-4 my-6">
      {platforms.map((platform) => {
        const isSelected = selectedPlatform === platform.id;
        const Icon = platform.icon;
        
        return (
          <button
            key={platform.id}
            disabled={!platform.available}
            onClick={() => onSelectPlatform(platform.id)}
            className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-all border ${
              isSelected 
                ? "bg-primary/10 border-primary text-primary" 
                : platform.available
                  ? "bg-card/50 border-border dark:border-white/5 text-muted-foreground hover:bg-accent/50 dark:hover:bg-white/5 hover:text-foreground dark:hover:text-white"
                  : "bg-card/20 border-border dark:border-white/5 text-muted-foreground/30 cursor-not-allowed"
            }`}
          >
            <Icon className={`w-8 h-8 ${isSelected ? "text-primary" : ""}`} />
            <span className="text-xs font-semibold uppercase tracking-wider">
              {platform.label}
            </span>
            {!platform.available && (
              <span className="text-[10px] absolute -top-2 bg-background dark:bg-[#07070f] px-2 py-0.5 rounded-full border border-border dark:border-white/10 opacity-80">
                {t("download.coming_soon")}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
