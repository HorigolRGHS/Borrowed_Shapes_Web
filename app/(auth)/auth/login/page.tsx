"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "react-toastify";
import axios from "axios";
import { Loader2, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18/i18n-context";
import {
  setUserProfile,
  setAccessToken,
  setRefreshToken,
  syncProfile,
} from "@/lib/api/api-client";
import { ApiResponse } from "@/models/dtos/api-response.dto";
import {
  LoginResponse,
  loginSchema,
  LoginFormValues,
} from "@/models/dtos/auth.dto";
import { AuthCard, AuthLogo } from "@/components/auth/auth-card";
import { PasswordInput } from "@/components/auth/password-input";
import { GoogleButton } from "@/components/auth/google-button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { I18nFormMessage } from "@/components/ui/i18n-form-message";

export default function LoginPage() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<any>(null);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    const error = searchParams.get("error");
    if (error) {
      setErrorMsg(t(error) || error);
      triggerShake();
    }
  }, [searchParams, t]);

  const triggerShake = () => {
    setShake(false);
    setTimeout(() => setShake(true), 10);
    setTimeout(() => setShake(false), 600);
  };

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const response = await axios.post<ApiResponse<LoginResponse>>(
        "/api/auth/login",
        data,
      );
      const res = response.data;
      if (res.success && res.data) {
        toast.success(t("auth.login_success"));
        const { accessToken, refreshToken, user } = res.data;
        if (accessToken) setAccessToken(accessToken);
        if (refreshToken) setRefreshToken(refreshToken);
        if (user) setUserProfile(user);
        void syncProfile(accessToken);
        router.push(user.role === "ADMIN" ? "/dashboard" : "/");
      } else {
        setErrorMsg(res.message || t("auth.login_failed"));
        triggerShake();
      }
    } catch (error: any) {
      setErrorMsg(
        error.response?.data?.message ||
          error.message ||
          t("auth.login_failed"),
      );
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard
      logo={<AuthLogo />}
      title={t("auth.welcome_back")}
      description={t("auth.login_subtitle")}
      error={errorMsg}
      shake={shake}
      footer={
        <span>
          {t("auth.no_account")}{" "}
          <Link href="/auth/register" className="text-amber-500 hover:text-amber-400 font-medium transition-colors">
            {t("auth.register")}
          </Link>
        </span>
      }
    >
      {statusError && (
        <div className={cn("mb-4 border p-4 rounded-md space-y-3", statusError.code === "ACCOUNT_BANNED" && statusError.ban?.reason === "auth.unverified_email_ban_reason" ? "bg-amber-500/10 border-amber-500/20" : "bg-destructive/10 border-destructive/20")}>
          {statusError.code === "ACCOUNT_BANNED" && statusError.ban?.reason === "auth.unverified_email_ban_reason" ? (
            <>
              <div className="font-bold text-amber-500 mb-2">
                {t("auth.unverified_email_status") || "Unverified Email"}
              </div>
              <p className="text-sm text-foreground">
                {t("auth.unverified_email_ban_reason") || "Unverified email. Please check your inbox to verify your account."}
              </p>
            </>
          ) : (
            <>
              <div className="font-bold text-destructive mb-2">
                {statusError.code === "ACCOUNT_BANNED" 
                    ? (t("auth.status.banned_message") || "Your account has been banned.")
                    : (t("auth.status.deleted_message") || "Your account has been deleted.")}
              </div>
              
              {statusError.code === "ACCOUNT_BANNED" ? (
                <>
                  <div>
                    <span className="text-sm font-semibold text-destructive mb-1 block">
                      {t("auth.status.reason") || "Reason"}:
                    </span>
                    <p className="text-sm text-foreground">
                      {statusError.ban?.reason || t("auth.status.no_reason") || "No reason provided."}
                    </p>
                  </div>
                  
                  <div className="border-t border-destructive/10 pt-3">
                    <span className="text-sm font-semibold text-destructive mb-1 block">
                      {statusError.ban?.isPermanent || !statusError.ban?.banExpiresAt
                        ? (t("auth.status.duration") || "Duration") + ":"
                        : (t("auth.status.expires_at") || "Expires At") + ":"}
                    </span>
                    <p className="text-sm font-mono text-foreground">
                      {statusError.ban?.isPermanent || !statusError.ban?.banExpiresAt
                        ? t("auth.status.permanent") || "Permanent"
                        : new Date(statusError.ban?.banExpiresAt).toLocaleDateString()}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-foreground mb-2">
                    {t("auth.status.deleted_description") || "This account can no longer access the system."}
                  </p>
                  {statusError.deleted?.deletedAt && (
                    <div className="border-t border-destructive/10 pt-3">
                      <span className="text-sm font-semibold text-destructive mb-1 block">
                        {t("auth.status.deleted_at") || "Deleted At"}:
                      </span>
                      <p className="text-sm font-mono text-foreground">
                        {new Date(statusError.deleted.deletedAt).toLocaleString()}
                      </p>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      )}

      <GoogleButton href="/api/auth/google/start?platform=web" className="mb-3">
        {t("auth.continue_with_google")}
      </GoogleButton>

      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 h-px bg-border" />
        <span className="text-muted-foreground text-xs font-sans">
          {t("auth.or_continue_with")}
        </span>
        <div className="flex-1 h-px bg-border" />
      </div>

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
                      tabIndex={1}
                      type="email" 
                      autoComplete="email" 
                      placeholder="name@example.com" 
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
            name="password"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel className="text-foreground font-sans">{t("auth.password")}</FormLabel>
                  <Link
                    href="/auth/forgot-password"
                    tabIndex={4}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {t("auth.forgot_password")}
                  </Link>
                </div>
                <FormControl>
                  <PasswordInput autoComplete="current-password" placeholder="••••••••" tabIndex={2} {...field} />
                </FormControl>
                <I18nFormMessage />
              </FormItem>
            )}
          />
          
          <div className="pt-2">
            <button 
              tabIndex={3}
              type="submit" 
              disabled={loading} 
              className="w-full bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 text-white font-bold py-3 rounded-xl shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_30px_rgba(34,211,238,0.5)] transition-all flex justify-center items-center font-orbitron tracking-wide"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  {t("auth.signing_in")}
                </>
              ) : (
                t("auth.login")
              )}
            </button>
          </div>
        </form>
      </Form>

    </AuthCard>
  );
}
