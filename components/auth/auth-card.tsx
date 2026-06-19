import * as React from "react";
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
      <div className="bg-[#0a0a15]/90 backdrop-blur-xl border border-[#1e1e3a] rounded-2xl shadow-[0_20px_80px_rgba(0,0,0,0.7)] overflow-hidden">
        {/* Top gradient line */}
        <div className="h-0.5 w-full bg-gradient-to-r from-violet-600 via-cyan-400 to-blue-500" />
        
        <div className="px-8 py-8">
          {logo && <div className="flex justify-center mb-6">{logo}</div>}
          
          <div className="mb-6 text-center">
            <h2 className="text-white font-orbitron text-[22px] font-bold">
              {title}
            </h2>
            {description && (
              <p className="text-gray-400 text-sm mt-2 font-sans">
                {description}
              </p>
            )}
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 mb-4">
              <AlertCircle size={15} className="text-red-400 mt-0.5 shrink-0" />
              <p className="text-red-400 text-sm font-sans">{error}</p>
            </div>
          )}

          {children}

          {footer && (
            <div className="text-center text-gray-500 text-sm mt-5 font-sans">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function AuthLogo() {
  return (
    <div className="flex items-center gap-2">
      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.5)]">
        <span className="text-white font-bold font-orbitron text-[14px]">B</span>
      </div>
      <span className="text-white font-orbitron text-[11px] tracking-[0.08em]">
        BORROWED<span className="text-cyan-400"> SHAPES</span>
      </span>
    </div>
  );
}
