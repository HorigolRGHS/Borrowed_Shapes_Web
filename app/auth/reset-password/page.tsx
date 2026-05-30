"use client";

import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { toast } from "react-toastify";
import { Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18/i18n-context";
import {
  resetPasswordSchema,
  ResetPasswordFormValues,
} from "@/models/dtos/auth.dto";
import { ApiResponse } from "@/models/dtos/api-response.dto";
import { AuthCard } from "@/components/auth/auth-card";
import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { email: emailParam, otp: "", newPassword: "", confirmPassword: "" },
  });

  const onSubmit = async (data: ResetPasswordFormValues) => {
    setLoading(true);
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
        toast.error(res.message || t("auth.reset_password_failed"));
      }
    } catch (error: any) {
      toast.error(
        error.response?.data?.message ||
          error.message ||
          t("auth.reset_password_failed"),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard
      title={t("auth.reset_password_title")}
      description={t("auth.reset_password_subtitle")}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("auth.email")}</FormLabel>
                <FormControl>
                  <Input type="email" {...field} />
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
                <FormLabel>{t("auth.otp")}</FormLabel>
                <FormControl>
                  <Input placeholder={t("auth.otp_placeholder")} {...field} />
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
                <FormLabel>{t("auth.new_password")}</FormLabel>
                <FormControl>
                  <PasswordInput {...field} />
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
                <FormLabel>{t("auth.confirm_password")}</FormLabel>
                <FormControl>
                  <PasswordInput {...field} />
                </FormControl>
                <I18nFormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("auth.resetting_password")}
              </>
            ) : (
              t("auth.reset_password")
            )}
          </Button>
        </form>
      </Form>
    </AuthCard>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="text-muted-foreground">Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
