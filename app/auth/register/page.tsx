"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18/i18n-context";
import axios from "axios";
import { ApiResponse } from "@/models/dtos/api-response.dto";
import {
  RegisterResponse,
  registerSchema,
  RegisterFormValues,
} from "@/models/dtos/auth.dto";
import { Eye, EyeOff } from "lucide-react";

export default function RegisterPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormValues) => {
    setLoading(true);
    try {
      const { confirmPassword, ...registerData } = data;
      const response = await axios.post<ApiResponse<RegisterResponse>>(
        "/api/auth/register",
        registerData,
      );
      const res = response.data;

      if (res.success) {
        toast.success(t("auth.register_success"));
        router.push("/auth/login");
      } else {
        toast.error(res.message || t("auth.register_failed"));
      }
    } catch (error: any) {
      const msg =
        error.response?.data?.message ||
        error.message ||
        t("auth.register_failed");
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
            <div className="w-16 h-16 bg-gradient-to-tr from-green-600 to-emerald-600 rounded-2xl rotate-12 flex items-center justify-center shadow-lg shadow-green-200">
              <span className="text-white text-3xl font-black -rotate-12">
                B
              </span>
            </div>
          </div>

          <h2 className="text-3xl font-extrabold text-center text-slate-900 mb-2 tracking-tight">
            {t("auth.create_account") || "Create Account"}
          </h2>
          <p className="text-center text-slate-500 mb-10 text-sm">
            {t("auth.register_subtitle") || "Join our community today"}
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Display Name */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 ml-1">
                {t("auth.display_name") || "Display Name"}
              </label>
              <input
                {...register("displayName")}
                type="text"
                className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-green-100 focus:bg-white focus:border-green-500 outline-none transition-all placeholder:text-slate-400 text-slate-900"
                placeholder="John Doe"
              />
              {errors.displayName && (
                <p className="text-xs text-red-500 font-medium ml-1">
                  {t(errors.displayName.message as string)}
                </p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 ml-1">
                {t("auth.email")}
              </label>
              <input
                {...register("email")}
                type="email"
                className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-green-100 focus:bg-white focus:border-green-500 outline-none transition-all placeholder:text-slate-400 text-slate-900"
                placeholder="name@example.com"
              />
              {errors.email && (
                <p className="text-xs text-red-500 font-medium ml-1">
                  {t(errors.email.message as string)}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 ml-1">
                {t("auth.password")}
              </label>
              <div className="relative group">
                <input
                  {...register("password")}
                  type={showPassword ? "text" : "password"}
                  className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-green-100 focus:bg-white focus:border-green-500 outline-none transition-all placeholder:text-slate-400 text-slate-900"
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

            {/* Confirm Password */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 ml-1">
                {t("auth.confirm_password") || "Confirm Password"}
              </label>
              <div className="relative group">
                <input
                  {...register("confirmPassword")}
                  type={showConfirmPassword ? "text" : "password"}
                  className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-green-100 focus:bg-white focus:border-green-500 outline-none transition-all placeholder:text-slate-400 text-slate-900"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-xs text-red-500 font-medium ml-1">
                  {t(errors.confirmPassword.message as string)}
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
                  <span>{t("auth.signing_up") || "Creating account..."}</span>
                </div>
              ) : (
                t("auth.register")
              )}
            </button>
          </form>

          <div className="mt-10 text-center">
            <p className="text-sm text-slate-500">
              {t("auth.already_have_account") || "Already have an account?"}{" "}
              <a
                href="/auth/login"
                className="font-bold text-blue-600 hover:text-blue-700 transition-colors underline-offset-4 hover:underline"
              >
                {t("auth.login")}
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
