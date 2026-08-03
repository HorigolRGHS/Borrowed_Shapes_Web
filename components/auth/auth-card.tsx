"use client";

import * as React from "react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { AlertCircle } from "lucide-react";

interface Props {
  logo?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  error?: string | null;
  shake?: boolean;
}

export function AuthCard({ logo, title, description, children, footer, className, error, shake }: Props) {
  return (
    <div className={cn("relative w-full max-w-md mx-4", shake && "animate-shake", className)}>
      <div className="bg-card/90 backdrop-blur-xl border border-border rounded-2xl shadow-xl overflow-hidden">
        {/* Top gradient line */}
        <div className="h-0.5 w-full bg-gradient-to-r from-violet-600 via-cyan-400 to-blue-500" />
        
        <div className="px-8 py-8">
          {logo && <div className="flex justify-center mb-6">{logo}</div>}
          
          <div className="mb-6 text-center">
            <h2 className="text-foreground font-orbitron text-[22px] font-bold">
              {title}
            </h2>
            {description && (
              <p className="text-muted-foreground text-sm mt-2 font-sans">
                {description}
              </p>
            )}
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/30 mb-4">
              <AlertCircle size={15} className="text-destructive mt-0.5 shrink-0" />
              <p className="text-destructive text-sm font-sans">{error}</p>
            </div>
          )}

          {children}

          {footer && (
            <div className="text-center text-muted-foreground text-sm mt-5 font-sans">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";

export function AuthLogo() {
  const [imgError, setImgError] = useState(false);
  
  const R2_BASE = process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL || "https://pub-4a3e334f734f4b669489b78b2a739715.r2.dev";
  const logoUrl = `${R2_BASE}/Logo.jpg`;

  return (
    <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
      {!imgError ? (
        <div className="w-9 h-9 rounded-xl shadow-[0_0_20px_rgba(139,92,246,0.5)] overflow-hidden shrink-0">
          <img src={logoUrl} alt="Borrowed Shapes Logo" className="w-full h-full object-cover" onError={() => setImgError(true)} />
        </div>
      ) : (
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center shadow-lg shrink-0">
          <span className="text-white font-bold font-orbitron text-[14px]">B</span>
        </div>
      )}
      <span className="text-foreground font-orbitron text-[11px] tracking-[0.08em]">
        BORROWED<span className="text-cyan-500"> SHAPES</span>
      </span>
    </Link>
  );
}
