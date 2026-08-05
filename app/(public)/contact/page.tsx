"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18/i18n-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, Info, Copy, Check, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "react-toastify";

const EMAIL = "borrowedshapes09@gmail.com";
const GMAIL_URL = `https://mail.google.com/mail/?view=cm&fs=1&to=${EMAIL}&su=Support%20Request%20-%20Borrowed%20Shapes`;

export default function ContactPage() {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(EMAIL);
      setCopied(true);
      toast.success(t("legal.contact.copied") || "Đã sao chép vào bộ nhớ tạm!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  return (
    <main className="max-w-3xl mx-auto px-4 py-16">
      <div className="mb-8">
        <div className="mb-4">
          <Badge variant="outline" className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border-amber-500/20">
            {t("legal.contact.badge")}
          </Badge>
        </div>
        <h1 className="text-4xl font-bold tracking-tight mb-4">{t("legal.contact.title")}</h1>
        <p className="text-lg text-muted-foreground leading-relaxed">
          {t("legal.contact.description")}
        </p>
      </div>

      <div className="mb-10">
        <p className="text-foreground leading-relaxed">{t("legal.contact.intro")}</p>
      </div>

      <div className="mb-10">
        <Card className="bg-card/50 backdrop-blur-sm border-border/50 rounded-2xl shadow-sm">
          <CardHeader>
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 flex items-center justify-center mb-2">
              <Mail className="h-6 w-6 text-rose-500" />
            </div>
            <CardTitle className="text-2xl">{t("legal.contact.methods.email.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <CardDescription className="text-base text-muted-foreground leading-relaxed">
              {t("legal.contact.methods.email.description")}
            </CardDescription>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-background/60 border border-border/60">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-amber-500 shrink-0" />
                <span className="font-mono text-base font-semibold text-foreground select-all">
                  {EMAIL}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyEmail}
                  className="gap-1.5 cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 text-emerald-500" />
                      <span>{t("legal.contact.copied") || "Đã chép"}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      <span>{t("legal.contact.copyEmail") || "Sao chép"}</span>
                    </>
                  )}
                </Button>

                <Button
                  size="sm"
                  asChild
                  className="bg-amber-500 hover:bg-amber-600 text-black font-medium gap-1.5 cursor-pointer"
                >
                  <a
                    href={GMAIL_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span>{t("legal.contact.openGmail") || "Mở Gmail"}</span>
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Alert className="rounded-2xl border-border/50">
        <Info className="h-4 w-4" />
        <AlertTitle>{t("legal.contact.noteTitle")}</AlertTitle>
        <AlertDescription className="text-muted-foreground mt-2 leading-relaxed">
          {t("legal.contact.note")}
        </AlertDescription>
      </Alert>
    </main>
  );
}
