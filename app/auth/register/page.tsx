"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { toast } from "react-toastify";
import { Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18/i18n-context";
import {
  RegisterResponse,
  registerSchema,
  RegisterFormValues,
} from "@/models/dtos/auth.dto";
import { ApiResponse } from "@/models/dtos/api-response.dto";
import { AuthCard, AuthLogo } from "@/components/auth/auth-card";
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

export default function RegisterPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: "", password: "", confirmPassword: "", displayName: "" },
  });

  const onSubmit = async (data: RegisterFormValues) => {
    setLoading(true);
    try {
      const { confirmPassword: _ignored, ...payload } = data;
      const response = await axios.post<ApiResponse<RegisterResponse>>(
        "/api/auth/register",
        payload,
      );
      const res = response.data;
      if (res.success) {
        toast.success(t("auth.register_success"));
        router.push("/auth/login");
      } else {
        toast.error(res.message || t("auth.register_failed"));
      }
    } catch (error: any) {
      toast.error(
        error.response?.data?.message ||
          error.message ||
          t("auth.register_failed"),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard
      logo={<AuthLogo />}
      title={t("auth.create_account")}
      description={t("auth.register_subtitle")}
      footer={
        <span className="text-muted-foreground">
          {t("auth.already_have_account")}{" "}
          <Link href="/auth/login" className="font-semibold text-primary hover:underline">
            {t("auth.login")}
          </Link>
        </span>
      }
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="displayName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("auth.display_name")}</FormLabel>
                <FormControl>
                  <Input placeholder="John Doe" {...field} />
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
                <FormLabel>{t("auth.email")}</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="name@example.com" {...field} />
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
                <FormLabel>{t("auth.password")}</FormLabel>
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
                <FormLabel>{t("auth.confirm_password")}</FormLabel>
                <FormControl>
                  <PasswordInput placeholder="••••••••" {...field} />
                </FormControl>
                <I18nFormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={loading} className="w-full" size="lg">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("auth.signing_up")}
              </>
            ) : (
              t("auth.register")
            )}
          </Button>
        </form>
      </Form>
    </AuthCard>
  );
}
