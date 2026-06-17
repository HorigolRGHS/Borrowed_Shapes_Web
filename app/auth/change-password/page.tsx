"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "react-toastify";
import { Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18/i18n-context";
import { getUserProfile } from "@/lib/api/api-client";
import {
  changePasswordSchema,
  ChangePasswordFormValues,
} from "@/models/dtos/auth.dto";
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

export default function ChangePasswordPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

  const triggerShake = () => {
    setShake(false);
    setTimeout(() => setShake(true), 10);
    setTimeout(() => setShake(false), 600);
  };

  useEffect(() => {
    if (!getUserProfile()) router.push("/auth/login");
  }, [router]);

  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { oldPassword: "", newPassword: "", confirmPassword: "" },
  });

  const onSubmit = async (data: ChangePasswordFormValues) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const { confirmPassword: _ignored, ...payload } = data;
      const response = await axios.post(
        "/api/auth/change-password",
        payload,
        { withCredentials: true },
      );
      if (response.data?.success) {
        toast.success(t("auth.password_changed_success"));
        form.reset();
      } else {
        setErrorMsg(response.data?.message || "Change password failed");
        triggerShake();
      }
    } catch (error: any) {
      setErrorMsg(
        error.response?.data?.message || error.message || "Change password failed",
      );
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard 
      logo={<AuthLogo />}
      title={t("auth.change_password")}
      error={errorMsg}
      shake={shake}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="oldPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-300 font-sans">{t("auth.old_password")}</FormLabel>
                <FormControl>
                  <PasswordInput autoComplete="current-password" placeholder="••••••••" {...field} />
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
                <FormLabel className="text-gray-300 font-sans">{t("auth.new_password")}</FormLabel>
                <FormControl>
                  <PasswordInput autoComplete="new-password" placeholder="••••••••" {...field} />
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
                  <PasswordInput autoComplete="new-password" placeholder="••••••••" {...field} />
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
                  {t("auth.changing_password")}
                </>
              ) : (
                t("auth.change_password")
              )}
            </button>
          </div>
        </form>
      </Form>
    </AuthCard>
  );
}
