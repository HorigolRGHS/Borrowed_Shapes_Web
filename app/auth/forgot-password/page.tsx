"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { toast } from "react-toastify";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18/i18n-context";
import {
  forgotPasswordSchema,
  ForgotPasswordFormValues,
} from "@/models/dtos/auth.dto";
import { ApiResponse } from "@/models/dtos/api-response.dto";
import { AuthCard } from "@/components/auth/auth-card";
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

export default function ForgotPasswordPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    setLoading(true);
    try {
      const response = await axios.post<ApiResponse<unknown>>(
        "/api/auth/forgot-password",
        data,
      );
      const res = response.data;
      if (res.success) {
        toast.success(t("auth.otp_sent_success"));
        router.push(`/auth/reset-password?email=${encodeURIComponent(data.email)}`);
      } else {
        toast.error(res.message || t("auth.request_failed"));
      }
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || error.message || t("auth.request_failed"),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard
      title={t("auth.forgot_password_title")}
      description={t("auth.forgot_password_subtitle")}
      footer={
        <Link href="/auth/login" className="inline-flex items-center gap-1 text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" />
          {t("auth.back_to_login")}
        </Link>
      }
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("auth.email")}</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="name@example.com" {...field} />
                </FormControl>
                <I18nFormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("auth.sending_otp")}
              </>
            ) : (
              t("auth.send_otp")
            )}
          </Button>
        </form>
      </Form>
    </AuthCard>
  );
}
