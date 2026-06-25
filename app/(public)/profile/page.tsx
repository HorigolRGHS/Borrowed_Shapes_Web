"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";
import { useI18n } from "@/lib/i18/i18n-context";
import { getUserProfile } from "@/lib/api/api-client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DownloadHistory } from "@/components/profile/download-history";
import { ProfileAchievements } from "@/components/profile/profile-achievements";
import { PlayHistory } from "@/components/profile/play-history";
import { EditProfileModal } from "@/components/profile/edit-profile-modal";
import { Button } from "@/components/ui/button";
import { Trophy, History, ShieldAlert, Download, User as UserIcon, Edit } from "lucide-react";

export default function ProfilePage() {
  const { t } = useI18n();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    const profile = getUserProfile();
    if (!profile) {
      router.push("/auth/login");
      return;
    }
    setUser(profile);
    setMounted(true);

    const handleProfileUpdated = (e: any) => {
      setUser(e.detail);
    };
    window.addEventListener("api:profile-updated", handleProfileUpdated);
    return () => window.removeEventListener("api:profile-updated", handleProfileUpdated);
  }, [router]);

  if (!mounted || !user) {
    return <div className="min-h-screen bg-background dark:bg-[#07070f]" />;
  }

  return (
    <>
      <main className="flex-1 container mx-auto px-4 pt-32 pb-16 max-w-6xl">
        <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6 mb-12">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="relative w-24 h-24 rounded-full flex items-center justify-center shadow-lg shadow-amber-500/20 bg-muted border-2 border-border overflow-hidden">
              {user.imgUrl ? (
                <img src={user.imgUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="w-12 h-12 text-muted-foreground" />
              )}
              {user.equippedAchievement && (
                <div className="absolute -inset-3 border-4 border-amber-500/50 rounded-full z-10 pointer-events-none" />
              )}
              {user.equippedAchievement?.badgeImageUrl && (
                <div className="absolute -bottom-3 -right-3 w-10 h-10 bg-background rounded-full border-2 border-amber-500 flex items-center justify-center overflow-hidden z-20">
                  <img src={user.equippedAchievement.badgeImageUrl} alt="Frame" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
            <div className="text-center md:text-left">
              <h1 className="text-4xl font-extrabold tracking-tight">{user.displayName}</h1>
              <p className="text-muted-foreground mt-1">{user.email}</p>
              <span className="inline-block mt-2 text-xs font-semibold px-3 py-1 rounded-full bg-muted dark:bg-white/10 text-muted-foreground dark:text-white/80 border border-border dark:border-white/20">
                {user.role}
              </span>
            </div>
          </div>
          <Button variant="outline" className="border-amber-500/50 hover:bg-amber-500/10" onClick={() => setIsEditModalOpen(true)}>
            <Edit className="w-4 h-4 mr-2" />
            {t("profile.edit.button")}
          </Button>
        </div>

        <EditProfileModal open={isEditModalOpen} onOpenChange={setIsEditModalOpen} user={user} />

        <Tabs defaultValue="achievements" className="w-full">
          <TabsList className="bg-card/50 border border-border dark:border-white/10 mb-8 flex flex-wrap h-auto p-1 rounded-xl w-full justify-start overflow-x-auto">
            <TabsTrigger value="achievements" className="gap-2 data-[state=active]:bg-amber-500 data-[state=active]:text-black py-2.5 px-4 rounded-lg">
              <Trophy className="w-4 h-4" />
              {t("common.achievements")}
            </TabsTrigger>
            <TabsTrigger value="play_history" className="gap-2 data-[state=active]:bg-amber-500 data-[state=active]:text-black py-2.5 px-4 rounded-lg">
              <History className="w-4 h-4" />
              {t("profile.play_history")}
            </TabsTrigger>
            <TabsTrigger value="downloads" className="gap-2 data-[state=active]:bg-amber-500 data-[state=active]:text-black py-2.5 px-4 rounded-lg">
              <Download className="w-4 h-4" />
              {t("profile.download_history.tab")}
            </TabsTrigger>
            <TabsTrigger value="reports" className="gap-2 data-[state=active]:bg-amber-500 data-[state=active]:text-black py-2.5 px-4 rounded-lg">
              <ShieldAlert className="w-4 h-4" />
              {t("profile.reports")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="downloads" className="focus-visible:outline-none">
            <DownloadHistory />
          </TabsContent>

          <TabsContent value="achievements" className="focus-visible:outline-none">
            <ProfileAchievements equippedAchievementId={user.equippedAchievement?.id || user.equippedAchievementId?.id || null} />
          </TabsContent>

          <TabsContent value="play_history" className="focus-visible:outline-none">
            <PlayHistory />
          </TabsContent>

          <TabsContent value="reports" className="focus-visible:outline-none">
            <div className="p-12 text-center border border-border dark:border-white/10 border-dashed rounded-2xl bg-card/20 text-muted-foreground">
              {t("common.coming_soon") || "Coming Soon..."}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </>
  );
}
