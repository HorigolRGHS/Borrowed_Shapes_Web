import type { Metadata } from "next";
import { Inter, Orbitron, Rajdhani } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/providers/toast";
import { I18nProvider } from "@/lib/i18/i18n-context";
import AuthSessionHandler from "@/components/handlers/auth-session-handler";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { AccountStatusWatcher } from "@/components/auth/account-status-watcher";
import "react-toastify/dist/ReactToastify.css";
import { cookies } from "next/headers";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const orbitron = Orbitron({ subsets: ["latin"], variable: "--font-orbitron" });
const rajdhani = Rajdhani({ weight: ["400", "500", "600", "700"], subsets: ["latin"], variable: "--font-rajdhani" });

export const metadata: Metadata = {
  title: "Borrowed Shapes",
  description: "Wiki for Borrowed Shapes game",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const locale = (cookieStore.get("NEXT_LOCALE")?.value as any) || "en";

  // Chèn biến công khai theo RUNTIME (đọc process.env mỗi request, không inline lúc build).
  const runtimeEnv = {
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL ?? "",
  };

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            // Escape "<" để giá trị env không thể phá vỡ thẻ <script> (vd: chuỗi chứa </script>).
            __html: `window.__ENV = ${JSON.stringify(runtimeEnv).replace(/</g, "\\u003c")};`,
          }}
        />
      </head>
      <body
        className={cn(
          inter.variable,
          orbitron.variable,
          rajdhani.variable,
          "min-h-screen bg-background text-foreground font-sans antialiased",
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <I18nProvider initialLocale={locale}>
            <AuthSessionHandler />
            <AccountStatusWatcher />
            <ToastProvider />
            {children}
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
