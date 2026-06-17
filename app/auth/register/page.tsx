"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { toast } from "react-toastify";
import { Loader2, Mail, User, CheckCircle2, RefreshCw } from "lucide-react";
import { useI18n } from "@/lib/i18/i18n-context";
import {
  RegisterResponse,
  registerSchema,
  RegisterFormValues,
} from "@/models/dtos/auth.dto";
import { ApiResponse } from "@/models/dtos/api-response.dto";
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

export default function RegisterPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [submittedData, setSubmittedData] = useState<RegisterFormValues | null>(null);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isSubmitted && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isSubmitted, countdown]);

  const triggerShake = () => {
    setShake(false);
    setTimeout(() => setShake(true), 10);
    setTimeout(() => setShake(false), 600);
  };

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: "", password: "", confirmPassword: "", displayName: "" },
  });

  const onSubmit = async (data: RegisterFormValues) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const { confirmPassword: _ignored, ...payload } = data;
      const response = await axios.post<ApiResponse<RegisterResponse>>(
        "/api/auth/register",
        payload,
      );
      const res = response.data;
      if (res.success) {
        setIsSubmitted(true);
        setSubmittedData(data);
        setCountdown(60);
      } else {
        setErrorMsg(res.message || t("auth.register_failed"));
        triggerShake();
      }
    } catch (error: any) {
      setErrorMsg(
        error.response?.data?.message ||
          error.message ||
          t("auth.register_failed"),
      );
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  if (isSubmitted && submittedData) {
    return (
      <AuthCard
        logo={<AuthLogo />}
        title="Check Your Email"
        description="We've sent a verification link to your email address."
        error={errorMsg}
        shake={shake}
      >
        <div className="flex flex-col items-center justify-center space-y-6 mt-4">
          <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center">
            <CheckCircle2 size={40} className="text-green-400" />
          </div>
          
          <div className="text-center">
            <p className="text-white font-sans font-medium bg-white/5 px-4 py-2 rounded-lg border border-[#1e1e3a]">
              {submittedData.email}
            </p>
          </div>

          <p className="text-gray-400 text-sm text-center font-sans max-w-[280px]">
            Please click the link in the email to verify your account and continue.
          </p>

          <div className="w-full pt-4">
            <button
              type="button"
              onClick={() => onSubmit(submittedData)}
              disabled={countdown > 0 || loading}
              className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed border border-[#1e1e3a] hover:border-gray-500 rounded-xl py-3 text-white text-sm font-medium transition-all font-sans"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <RefreshCw size={16} />
              )}
              {countdown > 0 ? `Resend Email (${countdown}s)` : 'Resend Email'}
            </button>
          </div>

          <button
            onClick={() => {
              setIsSubmitted(false);
              router.push("/auth/login");
            }}
            className="text-amber-500 hover:text-amber-400 text-sm font-medium transition-colors"
          >
            Back to Login
          </button>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      logo={<AuthLogo />}
      title={t("auth.create_account")}
      description={t("auth.register_subtitle")}
      error={errorMsg}
      shake={shake}
      footer={
        <span>
          {t("auth.already_have_account")}{" "}
          <Link href="/auth/login" className="text-amber-500 hover:text-amber-400 font-medium transition-colors">
            {t("auth.login")}
          </Link>
        </span>
      }
    >
      <GoogleButton href="/api/auth/google/start?platform=web" className="mb-3">
        Continue with Google
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
            name="displayName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-300 font-sans">{t("auth.display_name")}</FormLabel>
                <FormControl>
                  <div className="relative">
                    <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input 
                      type="text" 
                      placeholder="John Doe" 
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
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-300 font-sans">{t("auth.email")}</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input 
                      type="email" 
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
                <FormLabel className="text-gray-300 font-sans">{t("auth.password")}</FormLabel>
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
                <FormLabel className="text-gray-300 font-sans">{t("auth.confirm_password")}</FormLabel>
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
                  {t("auth.signing_up")}
                </>
              ) : (
                t("auth.register")
              )}
            </button>
          </div>
        </form>
      </Form>
    </AuthCard>
  );
}
