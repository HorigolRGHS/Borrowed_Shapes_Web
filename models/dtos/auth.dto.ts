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
  platform: 'web';
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

export interface ChangePasswordRequest {
  oldPassword?: string;
  newPassword: string;
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
