"use client";

import { useEffect, useState } from "react";
import { getUserProfile } from "@/lib/api/api-client";
import { DownloadCTA } from "@/components/home/download-cta";
import { HeroSection } from "@/components/home/hero-section";
import { GameIntroSection } from "@/components/home/game-intro-section";
import { KnowledgeBaseSection } from "@/components/home/knowledge-base-section";
import { AnnouncementsSection } from "@/components/home/announcements-section";

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setUser(getUserProfile());
    setMounted(true);
    const handler = (e: any) => setUser(e.detail);
    window.addEventListener("api:profile-updated" as any, handler);
    return () => window.removeEventListener("api:profile-updated" as any, handler);
  }, []);

  if (!mounted) {
    return <div className="min-h-screen bg-background" />;
  }

  return (
    <div className="min-h-screen bg-background dark:bg-[#07070f] flex flex-col font-sans">
      <HeroSection />
      <AnnouncementsSection />
      <GameIntroSection />
      <KnowledgeBaseSection />

      <main className="flex-1 flex flex-col items-center justify-center pt-16 pb-16 px-4">
        {/* New Download CTA Section */}
        <DownloadCTA user={user} />
      </main>
    </div>
  );
}
