"use client";

import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { toast } from "react-toastify";
import { ArrowLeft, Loader2, Mail, Hash } from "lucide-react";
import { useI18n } from "@/lib/i18/i18n-context";
import { z } from "zod";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  ResetPasswordFormValues,
} from "@/models/dtos/auth.dto";
import { ApiResponse } from "@/models/dtos/api-response.dto";
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

export default function ForgotPasswordPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

  const triggerShake = () => {
    setShake(false);
    setTimeout(() => setShake(true), 10);
    setTimeout(() => setShake(false), 600);
  };

  const [otpArray, setOtpArray] = useState<string[]>(Array(6).fill(""));
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otpArray];
    if (value.length > 1) {
      const pastedData = value.slice(0, 6).split("");
      for (let i = 0; i < pastedData.length; i++) {
        if (index + i < 6) newOtp[index + i] = pastedData[i];
      }
      setOtpArray(newOtp);
      form.setValue("otp", newOtp.join(""), { shouldValidate: true });
      otpRefs.current[Math.min(index + pastedData.length, 5)]?.focus();
      return;
    }
    newOtp[index] = value;
    setOtpArray(newOtp);
    form.setValue("otp", newOtp.join(""), { shouldValidate: true });
    if (value !== "" && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && otpArray[index] === "" && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { email: "", otp: "", newPassword: "", confirmPassword: "" },
    mode: "onChange",
  });

  const email = form.watch("email");
  const otp = form.watch("otp");

  const handleSendOTP = async () => {
    const isValid = await form.trigger("email");
    if (!isValid) return;

    setLoading(true);
    setErrorMsg(null);
    try {
      const response = await axios.post<ApiResponse<unknown>>(
        "/api/auth/forgot-password",
        { email },
      );
      if (response.data.success) {
        toast.success(t("auth.otp_sent_success"));
        setStep(2);
      } else {
        setErrorMsg(response.data.message || t("auth.request_failed"));
        triggerShake();
      }
    } catch (error: any) {
      setErrorMsg(
        error.response?.data?.message || error.message || t("auth.request_failed"),
      );
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    const isValid = await form.trigger("otp");
    if (!isValid) return;
    // Since there's no separate verify OTP endpoint, we just move to step 3.
    setStep(3);
  };

  const handleResetPassword = async (data: ResetPasswordFormValues) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const response = await axios.post<ApiResponse<unknown>>(
        "/api/auth/reset-password",
        { email: data.email, otp: data.otp, newPassword: data.newPassword },
      );
      if (response.data.success) {
        toast.success(t("auth.reset_password_success"));
        router.push("/auth/login");
      } else {
        setErrorMsg(response.data.message || t("auth.reset_password_failed"));
        triggerShake();
      }
    } catch (error: any) {
      setErrorMsg(
        error.response?.data?.message || error.message || t("auth.reset_password_failed"),
      );
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard
      logo={<AuthLogo />}
      title={
        step === 1
          ? t("auth.forgot_password_title")
          : step === 2
          ? t("auth.verification_code_title")
          : t("auth.reset_password_title")
      }
      description={
        step === 1
          ? t("auth.forgot_password_subtitle")
          : step === 2
          ? (
            <>
              {t("auth.otp_sent_desc_1")} <span className="text-amber-400 font-medium">{email}</span>{t("auth.otp_sent_desc_2")}
            </>
          )
          : t("auth.reset_password_desc")
      }
      error={errorMsg}
      shake={shake}
      footer={
        <Link href="/auth/login" className="inline-flex items-center gap-1 text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="h-4 w-4" />
          {t("auth.back_to_login")}
        </Link>
      }
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleResetPassword)} className="space-y-4">
          
          {step === 1 && (
            <>
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-300 font-sans">{t("auth.email")}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input 
                          type="email" 
                          placeholder="name@example.com" 
                          className="w-full bg-white/5 border border-[#1e1e3a] hover:border-gray-600 focus:border-amber-500 rounded-xl py-2.5 pl-9 pr-4 text-white placeholder-gray-600 text-sm outline-none transition-colors font-sans"
                          {...field} 
                        />
                      </div>
                    </FormControl>
                    <I18nFormMessage />
                  </FormItem>
                )}
              />
              <div className="pt-2">
                <button 
                  type="button" 
                  onClick={handleSendOTP}
                  disabled={loading} 
                  className="w-full bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 text-white font-bold py-3 rounded-xl shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_30px_rgba(34,211,238,0.5)] transition-all flex justify-center items-center font-orbitron tracking-wide"
                >
                  {loading ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : null}
                  {t("auth.send_otp")}
                </button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <FormField
                control={form.control}
                name="otp"
                render={() => (
                  <FormItem>
                    <FormLabel className="text-gray-300 font-sans">{t("auth.otp")}</FormLabel>
                    <FormControl>
                      <div className="flex justify-between gap-2">
                        {otpArray.map((digit, index) => (
                          <input
                            key={index}
                            ref={(el) => { otpRefs.current[index] = el; }}
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            value={digit}
                            onChange={(e) => handleOtpChange(index, e.target.value)}
                            onKeyDown={(e) => handleOtpKeyDown(index, e)}
                            className="w-12 h-14 bg-white/5 border border-[#1e1e3a] hover:border-gray-600 focus:border-amber-500 rounded-xl text-center text-white outline-none transition-colors"
                            style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "20px", fontWeight: 700 }}
                          />
                        ))}
                      </div>
                    </FormControl>
                    <I18nFormMessage />
                  </FormItem>
                )}
              />
              <div className="pt-2">
                <button 
                  type="button" 
                  onClick={handleVerifyOTP}
                  className="w-full bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 text-white font-bold py-3 rounded-xl shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_30px_rgba(34,211,238,0.5)] transition-all flex justify-center items-center font-orbitron tracking-wide"
                >
                  {t("auth.verify_code")}
                </button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-300 font-sans">{t("auth.new_password")}</FormLabel>
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
                    <FormLabel className="text-gray-300 font-sans">{t("auth.confirm_password")}</FormLabel>
                    <FormControl>
                      <PasswordInput placeholder="••••••••" {...field} />
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
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : null}
                  {t("auth.reset_password")}
                </button>
              </div>
            </>
          )}

        </form>
      </Form>
    </AuthCard>
  );
}
