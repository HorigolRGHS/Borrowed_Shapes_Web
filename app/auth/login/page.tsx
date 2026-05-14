"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "react-toastify";
import { useRouter, useSearchParams } from "next/navigation";
import { useI18n } from "@/lib/i18/i18n-context";
import axios from "axios";
import { 
  setUserProfile, 
  setAccessToken, 
  setRefreshToken, 
  syncProfile 
} from "@/lib/api/api-client";
import { ApiResponse } from "@/models/dtos/api-response.dto";
import { LoginResponse, loginSchema, LoginFormValues } from "@/models/dtos/auth.dto";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  React.useEffect(() => {
    const error = searchParams.get("error");
    if (error) {
      toast.error(t(error) || error);
    }
  }, [searchParams, t]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    setLoading(true);
    try {
      const response = await axios.post<ApiResponse<LoginResponse>>(
        "/api/auth/login",
        data
      );
      const res = response.data;

      if (res.success && res.data) {
        toast.success(t("auth.login_success"));
        
        const { accessToken, refreshToken, user } = res.data;
        
        // 1. Lưu token vào cookie
        if (accessToken) setAccessToken(accessToken);
        if (refreshToken) setRefreshToken(refreshToken);
        
        // 2. Lưu profile ban đầu từ response login
        if (user) {
          setUserProfile(user);
        }
        
        // 3. Chạy đồng thời syncProfile để lấy thông tin mới nhất (về Achievement, v.v.)
        void syncProfile(accessToken);
        
        router.push(user.role === "ADMIN" ? "/dashboard" : "/");
      } else {
        toast.error(res.message || t("auth.login_failed"));
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || t("auth.login_failed");
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-4 font-sans">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.05)] overflow-hidden transition-all hover:shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
        <div className="p-10">
          <div className="flex justify-center mb-8">
             <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl rotate-12 flex items-center justify-center shadow-lg shadow-blue-200">
                <span className="text-white text-3xl font-black -rotate-12">B</span>
             </div>
          </div>
          
          <h2 className="text-3xl font-extrabold text-center text-slate-900 mb-2 tracking-tight">
            {t("auth.welcome_back")}
          </h2>
          <p className="text-center text-slate-500 mb-10 text-sm">
            {t("auth.login_subtitle") || "Sign in to continue your adventure"}
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 ml-1">
                {t("auth.email")}
              </label>
              <input
                {...register("email")}
                type="email"
                autoComplete="email"
                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:bg-white focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 text-slate-900"
                placeholder="name@example.com"
              />
              {errors.email && (
                <p className="text-xs text-red-500 font-medium ml-1">
                  {t(errors.email.message as string)}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="text-sm font-semibold text-slate-700">
                  {t("auth.password")}
                </label>
                <a href="/auth/forgot-password" size="sm" className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors">
                   {t("auth.forgot_password") || "Forgot password?"}
                </a>
              </div>
              <div className="relative group">
                <input
                  {...register("password")}
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:bg-white focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 text-slate-900"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-500 font-medium ml-1">
                  {t(errors.password.message as string)}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 px-6 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl shadow-xl shadow-slate-200 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-4"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{t("auth.signing_in")}</span>
                </div>
              ) : (
                t("auth.login")
              )}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-100"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-4 text-slate-400 font-medium">
                  {t("auth.or_continue_with") || "Or continue with"}
                </span>
              </div>
            </div>

            <a
              href="/api/auth/google/start?platform=web"
              className="w-full flex items-center justify-center gap-3 py-4 px-6 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-2xl shadow-sm transition-all active:scale-[0.98]"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              <span>{t("auth.login_google") || "Sign in with Google"}</span>
            </a>
          </div>

          <div className="mt-10 text-center">
            <p className="text-sm text-slate-500">
              {t("auth.no_account") || "Don't have an account?"}{" "}
              <a href="/auth/register" className="font-bold text-blue-600 hover:text-blue-700 transition-colors underline-offset-4 hover:underline">
                {t("auth.register") || "Sign up"}
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
