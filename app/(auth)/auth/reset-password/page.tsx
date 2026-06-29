"use client";

import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { toast } from "react-toastify";
import { Loader2, Mail, Hash, ArrowLeft } from "lucide-react";
import { useI18n } from "@/lib/i18/i18n-context";
import {
  resetPasswordSchema,
  ResetPasswordFormValues,
} from "@/models/dtos/auth.dto";
import { ApiResponse } from "@/models/dtos/api-response.dto";
import { AuthCard, AuthLogo } from "@/components/auth/auth-card";
import { PasswordInput } from "@/components/auth/password-input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { I18nFormMessage } from "@/components/ui/i18n-form-message";

function ResetPasswordForm() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email") || "";
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

  const triggerShake = () => {
    setShake(false);
    setTimeout(() => setShake(true), 10);
    setTimeout(() => setShake(false), 600);
  };

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { email: emailParam, otp: "", newPassword: "", confirmPassword: "" },
  });

  const onSubmit = async (data: ResetPasswordFormValues) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const response = await axios.post<ApiResponse<unknown>>(
        "/api/auth/reset-password",
        { email: data.email, otp: data.otp, newPassword: data.newPassword },
      );
      const res = response.data;
      if (res.success) {
        toast.success(t("auth.reset_password_success"));
        router.push("/auth/login");
      } else {
        setErrorMsg(res.message || t("auth.reset_password_failed"));
        triggerShake();
      }
    } catch (error: any) {
      setErrorMsg(
        error.response?.data?.message ||
          error.message ||
          t("auth.reset_password_failed"),
      );
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard
      logo={<AuthLogo />}
      title={t("auth.reset_password_title")}
      description={t("auth.reset_password_subtitle")}
      error={errorMsg}
      shake={shake}
      footer={
        <Link href="/auth/login" className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          {t("auth.back_to_login")}
        </Link>
      }
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-foreground font-sans">{t("auth.email")}</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input 
                      type="email" 
                      className="w-full bg-background border border-border hover:border-muted-foreground/50 focus:border-primary rounded-xl py-2.5 pl-9 pr-4 text-foreground placeholder-muted-foreground text-sm outline-none transition-colors font-sans"
                      {...field} 
                    />
                  </div>
                </FormControl>
                <I18nFormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="otp"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-foreground font-sans">{t("auth.otp")}</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Hash size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input 
                      type="text" 
                      placeholder={t("auth.otp_placeholder")}
                      className="w-full bg-background border border-border hover:border-muted-foreground/50 focus:border-primary rounded-xl py-2.5 pl-9 pr-4 text-foreground placeholder-muted-foreground text-sm outline-none transition-colors font-sans"
                      {...field} 
                    />
                  </div>
                </FormControl>
                <I18nFormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="newPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-foreground font-sans">{t("auth.new_password")}</FormLabel>
                <FormControl>
                  <PasswordInput placeholder="••••••••" {...field} />
                </FormControl>
                <I18nFormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-foreground font-sans">{t("auth.confirm_password")}</FormLabel>
                <FormControl>
                  <PasswordInput placeholder="••••••••" {...field} />
                </FormControl>
                <I18nFormMessage />
              </FormItem>
            )}
          />
          <div className="pt-2">
            <button 
              type="submit" 
              disabled={loading} 
              className="w-full bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 text-white font-bold py-3 rounded-xl shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_30px_rgba(34,211,238,0.5)] transition-all flex justify-center items-center font-orbitron tracking-wide"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  {t("auth.resetting_password")}
                </>
              ) : (
                t("auth.reset_password")
              )}
            </button>
          </div>
        </form>
      </Form>
    </AuthCard>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="text-muted-foreground flex justify-center py-10"><Loader2 className="animate-spin" /></div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
