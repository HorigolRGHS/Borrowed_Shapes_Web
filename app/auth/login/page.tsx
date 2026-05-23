"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "react-toastify";
import axios from "axios";
import { Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18/i18n-context";
import {
  setUserProfile,
  setAccessToken,
  setRefreshToken,
  syncProfile,
} from "@/lib/api/api-client";
import { ApiResponse } from "@/models/dtos/api-response.dto";
import {
  LoginResponse,
  loginSchema,
  LoginFormValues,
} from "@/models/dtos/auth.dto";
import { AuthCard, AuthLogo } from "@/components/auth/auth-card";
import { PasswordInput } from "@/components/auth/password-input";
import { GoogleButton } from "@/components/auth/google-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { I18nFormMessage } from "@/components/ui/i18n-form-message";

export default function LoginPage() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const error = searchParams.get("error");
    if (error) toast.error(t(error) || error);
  }, [searchParams, t]);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setLoading(true);
    try {
      const response = await axios.post<ApiResponse<LoginResponse>>(
        "/api/auth/login",
        data,
      );
      const res = response.data;
      if (res.success && res.data) {
        toast.success(t("auth.login_success"));
        const { accessToken, refreshToken, user } = res.data;
        if (accessToken) setAccessToken(accessToken);
        if (refreshToken) setRefreshToken(refreshToken);
        if (user) setUserProfile(user);
        void syncProfile(accessToken);
        router.push(user.role === "ADMIN" ? "/dashboard" : "/");
      } else {
        toast.error(res.message || t("auth.login_failed"));
      }
    } catch (error: any) {
      toast.error(
        error.response?.data?.message ||
          error.message ||
          t("auth.login_failed"),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard
      logo={<AuthLogo />}
      title={t("auth.welcome_back")}
      description={t("auth.login_subtitle")}
      footer={
        <span className="text-muted-foreground">
          {t("auth.no_account")}{" "}
          <Link href="/auth/register" className="font-semibold text-primary hover:underline">
            {t("auth.register")}
          </Link>
        </span>
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
                  <Input type="email" autoComplete="email" placeholder="name@example.com" {...field} />
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
                <div className="flex items-center justify-between">
                  <FormLabel>{t("auth.password")}</FormLabel>
                  <Link
                    href="/auth/forgot-password"
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    {t("auth.forgot_password")}
                  </Link>
                </div>
                <FormControl>
                  <PasswordInput autoComplete="current-password" placeholder="••••••••" {...field} />
                </FormControl>
                <I18nFormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={loading} className="w-full" size="lg">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("auth.signing_in")}
              </>
            ) : (
              t("auth.login")
            )}
          </Button>
        </form>
      </Form>

      <div className="relative my-6">
        <Separator />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-xs uppercase text-muted-foreground">
          {t("auth.or_continue_with")}
        </span>
      </div>

      <GoogleButton href="/api/auth/google/start?platform=web">
        {t("auth.login_google")}
      </GoogleButton>
    </AuthCard>
  );
}
