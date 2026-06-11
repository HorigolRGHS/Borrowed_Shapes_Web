"use client";

import * as React from "react";
import { useI18n } from "@/lib/i18/i18n-context";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";

interface MonthPickerProps {
  value?: string; // Format: YYYY-MM
  onChange: (value: string) => void;
  onBlur?: () => void;
  className?: string;
  disabled?: boolean;
}

const MONTHS_VI = [
  "Th. 1", "Th. 2", "Th. 3", "Th. 4",
  "Th. 5", "Th. 6", "Th. 7", "Th. 8",
  "Th. 9", "Th. 10", "Th. 11", "Th. 12"
];

const MONTHS_EN = [
  "Jan", "Feb", "Mar", "Apr",
  "May", "Jun", "Jul", "Aug",
  "Sep", "Oct", "Nov", "Dec"
];

export function MonthPicker({ value, onChange, onBlur, className, disabled }: MonthPickerProps) {
  const { locale } = useI18n() as { locale: "vi" | "en" };
  const [open, setOpen] = React.useState(false);

  // Parse current year/month from value, or default to current date
  const parsedDate = React.useMemo(() => {
    if (value && /^\d{4}-\d{2}$/.test(value)) {
      const [y, m] = value.split("-").map(Number);
      return { year: y, month: m };
    }
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  }, [value]);

  const [currentYear, setCurrentYear] = React.useState(parsedDate.year);

  // Keep currentYear in sync with value updates
  React.useEffect(() => {
    setCurrentYear(parsedDate.year);
  }, [parsedDate.year]);

  const months = locale === "vi" ? MONTHS_VI : MONTHS_EN;

  const handleMonthSelect = (monthIndex: number) => {
    const formattedMonth = String(monthIndex + 1).padStart(2, "0");
    onChange(`${currentYear}-${formattedMonth}`);
    setOpen(false);
  };

  const handleClear = () => {
    onChange("");
    setOpen(false);
  };

  const handleThisMonth = () => {
    const now = new Date();
    const formattedMonth = String(now.getMonth() + 1).padStart(2, "0");
    setCurrentYear(now.getFullYear());
    onChange(`${now.getFullYear()}-${formattedMonth}`);
    setOpen(false);
  };

  const triggerLabel = React.useMemo(() => {
    if (!value || !/^\d{4}-\d{2}$/.test(value)) {
      return locale === "vi" ? "Chọn tháng..." : "Select month...";
    }
    const [y, m] = value.split("-").map(Number);
    const monthName = months[m - 1];
    return locale === "vi" ? `${monthName}, ${y}` : `${monthName} ${y}`;
  }, [value, locale, months]);

  return (
    <Popover open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen && onBlur) onBlur();
    }}>
      <PopoverTrigger asChild>
        <Button
          disabled={disabled}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between text-left font-normal bg-slate-950 border-slate-800 text-slate-100 hover:bg-slate-900/60 hover:text-white h-10 px-3 py-2 rounded-md",
            !value && "text-slate-500",
            className
          )}
        >
          <span className="truncate">{triggerLabel}</span>
          <Calendar className="ml-2 h-4 w-4 shrink-0 opacity-55 text-slate-400" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3 bg-slate-950 border border-slate-800 text-slate-100">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-slate-400 hover:text-white"
            onClick={() => setCurrentYear((prev) => prev - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-semibold text-sm">{currentYear}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-slate-400 hover:text-white"
            onClick={() => setCurrentYear((prev) => prev + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-2 py-3">
          {months.map((month, index) => {
            const isSelected = value === `${currentYear}-${String(index + 1).padStart(2, "0")}`;
            return (
              <Button
                key={month}
                type="button"
                variant={isSelected ? "default" : "ghost"}
                className={cn(
                  "h-9 text-xs justify-center font-normal hover:bg-slate-800 hover:text-white",
                  isSelected
                    ? "bg-amber-500 hover:bg-amber-600 text-white font-medium"
                    : "text-slate-300"
                )}
                onClick={() => handleMonthSelect(index)}
              >
                {month}
              </Button>
            );
          })}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
          <Button
            type="button"
            variant="ghost"
            className="h-7 px-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 text-xs"
            onClick={handleClear}
          >
            {locale === "vi" ? "Xóa" : "Clear"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="h-7 px-2 text-slate-400 hover:text-sky-400 hover:bg-sky-500/10 text-xs"
            onClick={handleThisMonth}
          >
            {locale === "vi" ? "Tháng này" : "This month"}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
