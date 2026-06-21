import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageDropdown } from "@/components/language-dropdown";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <LanguageDropdown />
        <ThemeToggle />
      </div>
      {children}
    </div>
  );
}
