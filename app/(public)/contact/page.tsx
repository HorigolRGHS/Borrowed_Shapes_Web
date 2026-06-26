"use client";

import { useI18n } from "@/lib/i18/i18n-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, Mail, Users, ExternalLink, Info } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function ContactPage() {
  const { t } = useI18n();

  return (
    <main className="max-w-4xl mx-auto px-4 py-16">
      <div className="mb-8">
        <div className="mb-4">
          <Badge variant="outline" className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border-amber-500/20">{t("legal.contact.badge")}</Badge>
        </div>
        <h1 className="text-4xl font-bold tracking-tight mb-4">{t("legal.contact.title")}</h1>
        <p className="text-lg text-muted-foreground leading-relaxed">
          {t("legal.contact.description")}
        </p>
      </div>

      <div className="mb-12">
        <p className="text-foreground leading-relaxed">{t("legal.contact.intro")}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        <Card className="bg-card/50 backdrop-blur-sm border-border/50 rounded-2xl">
          <CardHeader>
            <MessageCircle className="h-6 w-6 text-blue-500 mb-2" />
            <CardTitle>{t("legal.contact.methods.facebook.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-4">{t("legal.contact.methods.facebook.description")}</CardDescription>
            <Link href="#" className="text-sm font-medium text-amber-500 hover:underline">{t("legal.common.comingSoon")}</Link>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50 rounded-2xl">
          <CardHeader>
            <Mail className="h-6 w-6 text-rose-500 mb-2" />
            <CardTitle>{t("legal.contact.methods.email.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-4">{t("legal.contact.methods.email.description")}</CardDescription>
            <Link href="#" className="text-sm font-medium text-amber-500 hover:underline">{t("legal.common.comingSoon")}</Link>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50 rounded-2xl">
          <CardHeader>
            <Users className="h-6 w-6 text-indigo-500 mb-2" />
            <CardTitle>{t("legal.contact.methods.community.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-4">{t("legal.contact.methods.community.description")}</CardDescription>
            <Link href="#" className="text-sm font-medium text-amber-500 hover:underline">{t("legal.common.comingSoon")}</Link>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50 rounded-2xl">
          <CardHeader>
            <ExternalLink className="h-6 w-6 text-emerald-500 mb-2" />
            <CardTitle>{t("legal.contact.methods.project.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-4">{t("legal.contact.methods.project.description")}</CardDescription>
            <Link href="#" className="text-sm font-medium text-amber-500 hover:underline">{t("legal.common.comingSoon")}</Link>
          </CardContent>
        </Card>
      </div>

      <Alert className="rounded-2xl border-border/50">
        <Info className="h-4 w-4" />
        <AlertTitle>{t("legal.contact.noteTitle")}</AlertTitle>
        <AlertDescription className="text-muted-foreground mt-2">
          {t("legal.contact.note")}
        </AlertDescription>
      </Alert>
    </main>
  );
}
