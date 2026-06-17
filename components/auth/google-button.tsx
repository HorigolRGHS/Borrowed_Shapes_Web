
import { cn } from "@/lib/utils";

interface Props {
  href: string;
  children: React.ReactNode;
  className?: string;
}

export function GoogleButton({ href, children, className }: Props) {
  return (
    <a
      href={href}
      className={cn(
        "w-full flex items-center justify-center gap-3 py-2.5 rounded-xl border border-[#1e1e3a] hover:border-gray-500 bg-white/5 hover:bg-white/10 text-white transition-all duration-200",
        className
      )}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><line x1="21.17" x2="12" y1="8" y2="8"/><line x1="3.95" x2="8.54" y1="6.06" y2="14"/><line x1="10.88" x2="15.46" y1="21.94" y2="14"/></svg>
      <span className="text-sm font-sans font-medium">{children}</span>
    </a>
  );
}
