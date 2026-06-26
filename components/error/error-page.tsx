"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

type ErrorPageProps = {
  code: "404" | "500";
  title: string;
  description: string;
  actionLabel: string;
  showReset?: boolean;
  onReset?: () => void;
  resetLabel?: string;
};

export function ErrorPage({
  code,
  title,
  description,
  actionLabel,
  showReset,
  onReset,
  resetLabel,
}: ErrorPageProps) {
  const R2_BASE =
    process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL ||
    "https://pub-4a3e334f734f4b669489b78b2a739715.r2.dev";
  const errorImageUrl = `${R2_BASE}/Designer%20Lead.jpg`;

  return (
    <section className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-16 bg-background dark:bg-[#07070f] font-sans">
      <div className="grid w-full max-w-5xl gap-8 rounded-[2rem] border border-border dark:border-white/10 bg-card/70 p-6 shadow-2xl backdrop-blur-xl md:grid-cols-2 md:p-10 relative overflow-hidden">
        
        {/* Glow effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-amber-500/20 via-purple-500/20 to-orange-500/20 rounded-[2rem] blur-xl opacity-50 pointer-events-none" />

        <div className="relative overflow-hidden rounded-2xl border border-border dark:border-white/10 bg-muted/30 shadow-inner">
          <img
            src={errorImageUrl}
            alt="Borrowed Shapes error illustration"
            className="h-full min-h-[260px] w-full object-cover"
          />
        </div>

        <div className="relative flex flex-col justify-center space-y-6">
          <div className="space-y-2">
            <span className="inline-block rounded-full bg-amber-500/10 px-3 py-1 text-sm font-bold text-amber-500 dark:text-amber-400 uppercase tracking-widest border border-amber-500/20">
              Error {code}
            </span>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground dark:text-white">
              {title}
            </h1>
          </div>
          <p className="text-lg text-muted-foreground leading-relaxed">
            {description}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Button asChild className="h-12 px-8 text-base font-bold bg-gradient-to-r from-amber-500 to-orange-500 hover:brightness-110 text-white border-none transition-all shadow-[0_0_15px_rgba(245,158,11,0.3)] hover:shadow-[0_0_25px_rgba(245,158,11,0.5)] w-full sm:w-auto">
              <Link href="/">{actionLabel}</Link>
            </Button>
            
            {showReset && onReset && (
              <Button
                variant="outline"
                onClick={onReset}
                className="h-12 px-8 text-base font-bold w-full sm:w-auto"
              >
                {resetLabel || "Try again"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
