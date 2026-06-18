"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "react-toastify";
import axios from "axios";
import { Loader2, Mail } from "lucide-react";
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
      <GoogleButton href="/api/auth/google/start?platform=web" className="mb-3">
        {t("auth.continue_with_google")}
      </GoogleButton>

      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 h-px bg-[#1e1e3a]" />
        <span className="text-gray-600 text-xs font-sans">
          {t("auth.or_continue_with")}
        </span>
        <div className="flex-1 h-px bg-[#1e1e3a]" />
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-300 font-sans">{t("auth.email")}</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input 
                      type="email" 
                      autoComplete="email" 
                      placeholder="name@example.com" 
                      className="w-full bg-white/5 border border-[#1e1e3a] hover:border-gray-600 focus:border-amber-500 rounded-xl py-2.5 pl-9 pr-4 text-white placeholder-gray-600 text-sm outline-none transition-colors font-sans"
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
                  <FormLabel className="text-gray-300 font-sans">{t("auth.password")}</FormLabel>
                  <Link
                    href="/auth/forgot-password"
                    className="text-xs text-gray-400 hover:text-white transition-colors"
                  >
                    {t("auth.forgot_password")}
                  </Link>
                </div>
                <FormControl>
                  <PasswordInput autoComplete="current-password" placeholder="••••••••" {...field} />
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
