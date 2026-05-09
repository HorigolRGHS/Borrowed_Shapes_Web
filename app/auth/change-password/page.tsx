"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18/i18n-context";
import axios from "axios";
import { getUserProfile } from "@/lib/api/api-client";
import {
  changePasswordSchema,
  ChangePasswordFormValues,
} from "@/models/dtos/auth.dto";
import { Eye, EyeOff, Lock } from "lucide-react";

export default function ChangePasswordPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
  });

  const onSubmit = async (data: ChangePasswordFormValues) => {
    setLoading(true);
    try {
      const response = await axios.post("/api/auth/change-password", {
        oldPassword: data.oldPassword,
        newPassword: data.newPassword,
      });

      if (response.data.success) {
        toast.success(t("auth.password_changed_success"));
        reset();
        router.push("/");
      } else {
        toast.error(t(response.data.message) || response.data.message);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message;
      toast.error(t(msg) || msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 border border-slate-100">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl mb-4">
            <Lock className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {t("auth.change_password")}
          </h1>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Old Password */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              {t("auth.old_password")}
            </label>
            <div className="relative group">
              <input
                {...register("oldPassword")}
                type={showOldPassword ? "text" : "password"}
                className={`w-full py-4 px-5 bg-slate-50 border-2 rounded-2xl outline-none text-slate-900 transition-all ${
                  errors.oldPassword
                    ? "border-red-400 focus:border-red-500"
                    : "border-transparent group-hover:bg-slate-100 focus:bg-white focus:border-blue-500"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowOldPassword(!showOldPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
              >
                {showOldPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
            {errors.oldPassword && (
              <p className="mt-2 text-sm text-red-500 font-medium">
                {t(errors.oldPassword.message as string)}
              </p>
            )}
          </div>

          {/* New Password */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              {t("auth.new_password")}
            </label>
            <div className="relative group">
              <input
                {...register("newPassword")}
                type={showNewPassword ? "text" : "password"}
                className={`w-full py-4 px-5 bg-slate-50 border-2 rounded-2xl outline-none text-slate-900 transition-all ${
                  errors.newPassword
                    ? "border-red-400 focus:border-red-500"
                    : "border-transparent group-hover:bg-slate-100 focus:bg-white focus:border-blue-500"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
              >
                {showNewPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
            {errors.newPassword && (
              <p className="mt-2 text-sm text-red-500 font-medium">
                {t(errors.newPassword.message as string)}
              </p>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              {t("auth.confirm_password")}
            </label>
            <div className="relative group">
              <input
                {...register("confirmPassword")}
                type={showConfirmPassword ? "text" : "password"}
                className={`w-full py-4 px-5 bg-slate-50 border-2 rounded-2xl outline-none text-slate-900 transition-all ${
                  errors.confirmPassword
                    ? "border-red-400 focus:border-red-500"
                    : "border-transparent group-hover:bg-slate-100 focus:bg-white focus:border-blue-500"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="mt-2 text-sm text-red-500 font-medium">
                {t(errors.confirmPassword.message as string)}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 px-6 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl shadow-xl shadow-slate-200 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-8"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>{t("auth.changing_password")}</span>
              </div>
            ) : (
              t("auth.change_password")
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button
            onClick={() => router.push("/")}
            className="text-sm text-slate-500 hover:text-slate-800 font-medium transition-all"
          >
            {t("common.back_to_home")}
          </button>
        </div>
      </div>
    </main>
  );
}
