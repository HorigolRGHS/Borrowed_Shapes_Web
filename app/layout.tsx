import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/providers/toast";
import { I18nProvider } from "@/lib/i18/i18n-context";
import AuthSessionHandler from "@/components/handlers/auth-session-handler";
import "react-toastify/dist/ReactToastify.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Borrowed Shapes Wiki",
  description: "Wiki for Borrowed Shapes game",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <I18nProvider>
          <AuthSessionHandler />
          <ToastProvider />
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
