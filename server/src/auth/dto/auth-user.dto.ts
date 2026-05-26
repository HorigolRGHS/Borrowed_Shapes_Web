export class AuthUserResponseDto {
  id!: string;
  gameProfileId!: string;
  email!: string;
  displayName!: string | null;
  imgUrl!: string | null;
  role!: string;
  isBanned!: boolean;
  bannedAt!: string | null;
  banReason!: string | null;
  banExpiresAt!: string | null;
}
