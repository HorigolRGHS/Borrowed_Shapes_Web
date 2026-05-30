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
import { AuthCard } from "@/components/auth/auth-card";
import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
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

  useEffect(() => {
    if (!getUserProfile()) router.push("/auth/login");
  }, [router]);

  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { oldPassword: "", newPassword: "", confirmPassword: "" },
  });

  const onSubmit = async (data: ChangePasswordFormValues) => {
    setLoading(true);
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
        toast.error(response.data?.message || "Change password failed");
      }
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || error.message || "Change password failed",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard title={t("auth.change_password")}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="oldPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("auth.old_password")}</FormLabel>
                <FormControl>
                  <PasswordInput autoComplete="current-password" {...field} />
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
                  <PasswordInput autoComplete="new-password" {...field} />
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
                  <PasswordInput autoComplete="new-password" {...field} />
                </FormControl>
                <I18nFormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("auth.changing_password")}
              </>
            ) : (
              t("auth.change_password")
            )}
          </Button>
        </form>
      </Form>
    </AuthCard>
  );
}
