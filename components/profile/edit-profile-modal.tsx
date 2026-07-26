"use client";

import { useState, useRef, useEffect } from "react";
import { useI18n } from "@/lib/i18/i18n-context";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, syncProfile } from "@/lib/api/api-client";
import { Loader2, Upload, X, Check } from "lucide-react";
import { toast } from "react-toastify";

interface EditProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: any;
}

export function EditProfileModal({ open, onOpenChange, user }: EditProfileModalProps) {
  const { t } = useI18n();

  const [displayName, setDisplayName] = useState("");
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [equippedAchievementId, setEquippedAchievementId] = useState<string | null>(null);

  const [achievements, setAchievements] = useState<any[]>([]);

  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Local file for preview before save
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  // The R2 object key after upload
  const [uploadedKey, setUploadedKey] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Init state when modal opens
  useEffect(() => {
    if (open && user) {
      setDisplayName(user.displayName || "");
      setImgUrl(user.imgUrl || null);
      setEquippedAchievementId(user.equippedAchievementId?.id || user.equippedAchievement?.id || null);
      setSelectedFile(null);
      setPreviewUrl(null);
      setUploadedKey(null);

      // Fetch user achievements for frames
      api.get("/auth/me?include=achievements").then((res) => {
        const data = res.data ?? res;
        if (data?.achievements) {
          setAchievements(data.achievements);
        }
      }).catch(console.error);
    }
  }, [open, user]);

  // Create/revoke object URL for local preview
  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedFile]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error(t("profile.edit.validation.avatar_too_large"));
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error(t("profile.edit.validation.avatar_invalid_type"));
      return;
    }

    try {
      setIsUploading(true);
      setSelectedFile(file);

      // 1. Get presigned URL from backend
      const res = await api.post("/account/avatar-upload-url", {
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
      });
      const uploadData = res.data;

      // 2. Upload directly to R2 (no Authorization header)
      const uploadRes = await fetch(uploadData.uploadUrl, {
        method: uploadData.method,
        body: file,
        headers: { ...uploadData.headers },
      });

      if (!uploadRes.ok) {
        throw new Error("Upload failed");
      }

      // Store the R2 object key to use on save
      setUploadedKey(uploadData.key);
      // Do not set imgUrl to publicUrl to prevent UI from fetching it
    } catch (err) {
      console.error(err);
      toast.error(t("profile.edit.error"));
      setSelectedFile(null);
      setUploadedKey(null);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveAvatar = () => {
    setImgUrl(null);
    setSelectedFile(null);
    setUploadedKey(null);
  };

  const handleSave = async () => {
    if (displayName.trim().length < 2) {
      toast.error(t("profile.edit.validation.display_name_too_short"));
      return;
    }
    if (displayName.trim().length > 50) {
      toast.error(t("profile.edit.validation.display_name_too_long") || "Name must be under 50 characters");
      return;
    }

    try {
      setIsSaving(true);
      const payload: any = {
        displayName: displayName.trim(),
        equippedAchievementId,
      };

      if (uploadedKey !== null) {
        payload.imgUrl = uploadedKey;
      } else if (imgUrl === null) {
        payload.imgUrl = null;
      }

      await api.patch("/account/profile", payload);

      // Sync profile → broadcasts api:profile-updated event
      await syncProfile();

      toast.success(t("profile.edit.success"));
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || t("profile.edit.error"));
    } finally {
      setIsSaving(false);
    }
  };

  // Determine which avatar src to display in the modal
  const displayAvatarSrc = previewUrl || imgUrl || null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px] bg-background dark:bg-[#0f0f1a] border-border dark:border-[#1e1e3a] text-foreground dark:text-white">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">{t("profile.edit.title")}</DialogTitle>
          <DialogDescription className="text-muted-foreground dark:text-gray-400">
            {t("profile.edit.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Avatar Section */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative h-24 w-24 rounded-full overflow-hidden border-2 border-amber-500/30 bg-muted dark:bg-white/5 flex items-center justify-center">
              {isUploading ? (
                <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
              ) : displayAvatarSrc ? (
                <img src={displayAvatarSrc} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <span className="text-2xl font-semibold uppercase text-muted-foreground dark:text-gray-500">
                  {displayName?.substring(0, 2) || "?"}
                </span>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || isSaving}
                className="border-amber-500/30 hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-400"
              >
                <Upload className="w-4 h-4 mr-2" />
                {t("profile.edit.change_avatar")}
              </Button>
              {(imgUrl || previewUrl) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRemoveAvatar}
                  disabled={isUploading || isSaving}
                  className="border-red-500/30 hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400"
                >
                  <X className="w-4 h-4 mr-2" />
                  {t("profile.edit.remove_avatar")}
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground dark:text-gray-500">{t("profile.edit.avatar_hint")}</p>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
            />
          </div>

          {/* Display Name */}
          <div className="grid gap-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="displayName" className="text-foreground dark:text-white font-medium">
                {t("profile.edit.display_name")}
              </Label>
              <span className={`text-xs ${displayName.length >= 50 ? 'text-red-500 font-bold' : 'text-muted-foreground dark:text-gray-500'}`}>
                {displayName.length}/50
              </span>
            </div>
            <Input
              id="displayName"
              value={displayName}
              maxLength={50}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={isSaving}
              placeholder={t("profile.edit.display_name_placeholder")}
              className={`bg-background dark:bg-white/5 focus-visible:ring-amber-500/50 transition-colors ${
                displayName.length >= 50
                  ? 'border-red-500/50 dark:border-red-500/50 focus-visible:ring-red-500/50'
                  : 'border-border dark:border-[#1e1e3a]'
              }`}
            />
          </div>

          {/* Frame Picker */}
          <div className="grid gap-2">
            <Label className="text-foreground dark:text-white font-medium">
              {t("profile.edit.frame")}
            </Label>
            <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto p-1">
              {/* No Frame option */}
              <button
                type="button"
                className={`relative cursor-pointer rounded-lg border-2 flex items-center justify-center p-2 h-16 transition-colors ${
                  equippedAchievementId === null
                    ? "border-amber-500 bg-amber-500/10"
                    : "border-border dark:border-[#1e1e3a] hover:border-amber-500/50"
                }`}
                onClick={() => setEquippedAchievementId(null)}
              >
                <span className="text-xs text-center font-medium leading-tight text-muted-foreground dark:text-gray-400">
                  {t("profile.edit.no_frame")}
                </span>
                {equippedAchievementId === null && (
                  <Check className="absolute top-1 right-1 w-3 h-3 text-amber-500" />
                )}
              </button>

              {achievements.map((ach) => {
                const isExpired = ach.isExpired === true;
                return (
                  <button
                    type="button"
                    key={ach.id}
                    disabled={isExpired}
                    className={`relative cursor-pointer rounded-lg border-2 flex items-center justify-center p-2 h-16 transition-colors ${
                      isExpired
                        ? "opacity-50 border-dashed border-red-500/20 cursor-not-allowed bg-black/20"
                        : equippedAchievementId === ach.id
                        ? "border-amber-500 bg-amber-500/10"
                        : "border-border dark:border-[#1e1e3a] hover:border-amber-500/50"
                    }`}
                    onClick={() => setEquippedAchievementId(ach.id)}
                    title={isExpired ? `${ach.name} (${t("profile.achievements.expired_label") || "Expired"})` : ach.name}
                  >
                    {ach.badgeImageUrl ? (
                      <img src={ach.badgeImageUrl} alt={ach.name} className={`h-full w-auto object-contain ${isExpired ? "grayscale" : ""}`} />
                    ) : (
                      <span className="text-xs text-center truncate w-full text-muted-foreground dark:text-gray-400">{ach.name}</span>
                    )}
                    {equippedAchievementId === ach.id && !isExpired && (
                      <Check className="absolute top-1 right-1 w-3 h-3 text-amber-500" />
                    )}
                    {isExpired && (
                      <span className="absolute -top-1.5 -right-1.5 rounded-full bg-red-500 px-1 py-0.5 text-[8px] font-bold text-white uppercase tracking-wide">
                        Lock
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {achievements.length === 0 && (
              <p className="text-xs text-muted-foreground dark:text-gray-500 italic">
                {t("profile.edit.no_frames_description")}
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving || isUploading}
            className="border-border dark:border-[#1e1e3a]"
          >
            {t("profile.edit.cancel")}
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || isUploading}
            className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("profile.edit.saving")}
              </>
            ) : (
              t("profile.edit.save")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
