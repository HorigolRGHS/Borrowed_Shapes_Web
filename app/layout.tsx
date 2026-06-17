import type { Metadata } from "next";
import { Inter, Orbitron, Rajdhani } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/providers/toast";
import { I18nProvider } from "@/lib/i18/i18n-context";
import AuthSessionHandler from "@/components/handlers/auth-session-handler";
import { ThemeProvider } from "@/components/providers/theme-provider";
import "react-toastify/dist/ReactToastify.css";
import { cookies } from "next/headers";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const orbitron = Orbitron({ subsets: ["latin"], variable: "--font-orbitron" });
const rajdhani = Rajdhani({ weight: ["400", "500", "600", "700"], subsets: ["latin"], variable: "--font-rajdhani" });

export const metadata: Metadata = {
  title: "Borrowed Shapes Wiki",
  description: "Wiki for Borrowed Shapes game",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const locale = (cookieStore.get("NEXT_LOCALE")?.value as any) || "en";

  return (
    <html lang={locale} suppressHydrationWarning>
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
            <ToastProvider />
            {children}
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
