"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18/i18n-context";
import axios from "axios";
import { setUserProfile } from "@/lib/api/api-client";
import { ApiResponse } from "@/models/dtos/api-response.dto";
import { LoginResponse, loginSchema, LoginFormValues } from "@/models/dtos/auth.dto";

export default function LoginPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

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

      if (res.success) {
        toast.success(t("auth.login_success"));
        if (res.data.user) {
          setUserProfile(res.data.user);
        }
        router.push(res.data.user.role === "ADMIN" ? "/dashboard" : "/");
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
                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:bg-white focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 text-slate-700"
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
              <input
                {...register("password")}
                type="password"
                autoComplete="current-password"
                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:bg-white focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 text-slate-700"
                placeholder="••••••••"
              />
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
              ) : t("auth.login")}
            </button>
          </form>

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
