import * as z from "zod";

export const loginSchema = z.object({
  email: z.string().email("validation.invalid_email"),
  password: z.string().min(1, "validation.password_required"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  email: z.string().email("validation.invalid_email"),
  password: z
    .string()
    .min(8, "validation.password_min_8")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]).*$/, "validation.password_complex"),
  confirmPassword: z.string().min(1, "validation.password_required"),
  displayName: z
    .string()
    .min(3, "validation.display_name_min_3")
    .max(20, "validation.display_name_max_20")
    .regex(/^[a-zA-Z0-9 _-]+$/, "validation.display_name_invalid"),
}).superRefine(({ confirmPassword, password }, ctx) => {
  if (confirmPassword !== password) {
    ctx.addIssue({
      code: "custom",
      message: "validation.passwords_do_not_match",
      path: ["confirmPassword"],
    });
  }
});

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
}

export const changePasswordSchema = z
  .object({
    oldPassword: z.string().min(1, "validation.password_required"),
    newPassword: z
      .string()
      .min(8, "validation.password_min_8")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]).*$/,
        "validation.password_complex"
      ),
    confirmPassword: z.string().min(1, "validation.password_required"),
  })
  .superRefine(({ confirmPassword, newPassword }, ctx) => {
    if (confirmPassword !== newPassword) {
      ctx.addIssue({
        code: "custom",
        message: "validation.passwords_do_not_match",
        path: ["confirmPassword"],
      });
    }
  });

export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

export const loginRequestSchema = loginSchema.extend({
  platform: z.literal("web").default("web"),
  deviceInfo: z.string().optional(),
});

export interface LoginRequest {
  email: string;
  password: string;
  platform: 'web';
  deviceInfo?: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  expiresAt: string;
  user: UserMeResponse;
}

export interface RegisterRequest {
  email: string;
  password: string;
  displayName: string;
  deviceInfo?: string;
}

export interface RegisterResponse {
  userId: string;
  gameProfileId: string;
  email: string;
  displayName: string | null;
  role: string;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user?: UserMeResponse;
}

export interface EquippedAchievement {
  id: string;
  name: string;
  badgeImageUrl: string;
}

export interface UserMeResponse {
  id: string;
  gameProfileId: string;
  email: string;
  displayName: string | null;
  imgUrl: string | null;
  role: string;
  isBanned: boolean;
  bannedAt: string | null;
  banReason: string | null;
  banExpiresAt: string | null;
  equippedAchievement: EquippedAchievement | null;
}


export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface GoogleExchangeRequest {
  code: string;
  codeVerifier: string;
  redirectUri: string;
  platform: 'web';
  deviceInfo?: string;
}

export interface GoogleExchangeResponse {
  loginCode: string;
  user: UserMeResponse;
}

export interface GoogleCompleteRequest {
  loginCode: string;
  platform: 'web';
  deviceInfo?: string;
}

export const forgotPasswordSchema = z.object({
  email: z.string().email("validation.invalid_email"),
});

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    email: z.string().email("validation.invalid_email"),
    otp: z.string().min(1, "validation.otp_required"),
    newPassword: z
      .string()
      .min(8, "validation.password_min_8")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]).*$/,
        "validation.password_complex"
      ),
    confirmPassword: z.string().min(1, "validation.password_required"),
  })
  .superRefine(({ confirmPassword, newPassword }, ctx) => {
    if (confirmPassword !== newPassword) {
      ctx.addIssue({
        code: "custom",
        message: "validation.passwords_do_not_match",
        path: ["confirmPassword"],
      });
    }
  });

export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;
