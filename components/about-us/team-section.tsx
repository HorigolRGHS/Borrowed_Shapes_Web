"use client";

import { useI18n } from "@/lib/i18/i18n-context";
import Image from "next/image";
import { User, Sparkles } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function AboutUsTeam() {
  const { t } = useI18n();

  const members = [
    {
      id: "sm",
      abbr: "SM",
      name: "Nguyễn Tấn Minh",
      image: "Scrum Master.jpg",
      color: "amber",
    },
    {
      id: "tl",
      abbr: "TL",
      name: "Lê Khắc Huy",
      image: "Technical Leader.jpg",
      color: "blue",
    },
    {
      id: "doc",
      abbr: "DOC",
      name: "Võ Trương Nhật Đăng",
      image: "Document Lead.jpg",
      color: "emerald",
    },
    {
      id: "dl",
      abbr: "DL",
      name: "Mai Hoàng Ân",
      image: "Diagram Lead.jpg",
      color: "violet",
    },
    {
      id: "qa",
      abbr: "QA",
      name: "Dương Nhật Anh",
      image: "Quality Assurance.jpg",
      color: "rose",
    },
    {
      id: "des",
      abbr: "DES",
      name: "Nguyễn Tấn Minh",
      image: "Designer Lead.jpg",
      color: "pink",
    },
  ];

  return (
    <section className="relative py-24 bg-background dark:bg-[#07070f] overflow-hidden">
      {/* Subtle Background Elements */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-bl from-amber-500/5 to-transparent rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-blue-500/5 to-transparent rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-20">
          <div className="flex items-center gap-3 mb-4">
            <Sparkles className="w-6 h-6 text-amber-500" />
            <h2 className="text-3xl md:text-5xl font-bold text-foreground dark:text-white">
              {t("about_us.team.title") || "Meet the Crew"}
            </h2>
          </div>
          <p className="text-lg md:text-xl text-muted-foreground dark:text-gray-400 max-w-2xl">
            {t("about_us.team.subtitle") || "Each member carries a role, a responsibility, and a piece of the world we built together."}
          </p>
        </div>

        <div className="flex flex-col gap-12 md:gap-20">
          {members.map((member, index) => (
            <TeamRow key={member.id} member={member} t={t} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}

function TeamRow({ member, t, index }: { member: any; t: any; index: number }) {
  const R2_BASE = process.env.NEXT_PUBLIC_R2_URL || "https://pub-4a3e334f734f4b669489b78b2a739715.r2.dev";
  const imageUrl = `${R2_BASE}/${encodeURI(member.image)}`;
  const [imgError, setImgError] = useState(false);

  const isEven = index % 2 === 0;

  // Premium glow colors based on role
  const glowColors: Record<string, string> = {
    amber: "shadow-[0_0_40px_-10px_rgba(245,158,11,0.3)]",
    blue: "shadow-[0_0_40px_-10px_rgba(59,130,246,0.3)]",
    emerald: "shadow-[0_0_40px_-10px_rgba(16,185,129,0.3)]",
    violet: "shadow-[0_0_40px_-10px_rgba(139,92,246,0.3)]",
    rose: "shadow-[0_0_40px_-10px_rgba(243,113,153,0.3)]",
    pink: "shadow-[0_0_40px_-10px_rgba(236,72,153,0.3)]",
  };

  const textColors: Record<string, string> = {
    amber: "text-amber-500",
    blue: "text-blue-500",
    emerald: "text-emerald-500",
    violet: "text-violet-500",
    rose: "text-rose-500",
    pink: "text-pink-500",
  };

  const borderColors: Record<string, string> = {
    amber: "border-amber-500/20",
    blue: "border-blue-500/20",
    emerald: "border-emerald-500/20",
    violet: "border-violet-500/20",
    rose: "border-rose-500/20",
    pink: "border-pink-500/20",
  };

  return (
    <div 
      className={cn(
        "group flex flex-col md:flex-row items-stretch gap-6 md:gap-0 bg-card/40 dark:bg-white/[0.02] border border-border/50 dark:border-white/[0.05] rounded-3xl overflow-hidden transition-all duration-500 hover:bg-card/80 dark:hover:bg-white/[0.05]",
        glowColors[member.color],
        !isEven && "md:flex-row-reverse"
      )}
    >
      {/* Image Side */}
      <div className="relative w-full md:w-2/5 aspect-[4/3] md:aspect-auto md:min-h-[350px] overflow-hidden bg-muted">
        {!imgError ? (
          <Image
            src={imageUrl}
            alt={member.name}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 40vw"
            onError={() => setImgError(true)}
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/80">
            <User className="w-20 h-20 text-muted-foreground opacity-30" />
          </div>
        )}
        
        {/* Overlay Gradient on image depending on side */}
        <div 
          className={cn(
            "absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-background/80 md:from-background/0 via-transparent to-transparent pointer-events-none transition-opacity duration-500 group-hover:opacity-50",
            isEven ? "md:to-background/80" : "md:bg-gradient-to-l md:to-background/80"
          )}
        />
      </div>

      {/* Info Side */}
      <div className="flex-1 p-6 md:p-10 lg:p-12 flex flex-col justify-center relative">
        {/* Decorative Watermark */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[120px] font-black text-foreground/[0.03] dark:text-white/[0.02] pointer-events-none select-none">
          {member.abbr}
        </div>

        <div className="relative z-10 flex flex-col items-start h-full justify-between gap-6">
          <div className="space-y-3 w-full">
            <div className="flex items-center justify-between w-full">
              <span className={cn(
                "px-3 py-1 text-xs font-bold uppercase tracking-widest rounded-full border bg-background/50 backdrop-blur-sm",
                borderColors[member.color],
                textColors[member.color]
              )}>
                {t(`about_us.team.roles.${member.id}`) || member.abbr}
              </span>
              <span className="text-2xl font-black text-muted-foreground/30 dark:text-white/10">
                {String(index + 1).padStart(2, '0')}
              </span>
            </div>

            <h3 className="text-3xl lg:text-4xl font-bold text-foreground dark:text-white group-hover:text-amber-500 transition-colors">
              {member.name}
            </h3>
            
            <p className={cn("font-medium tracking-wide", textColors[member.color])}>
              {t(`about_us.team.specialties.${member.id}`) || member.abbr}
            </p>
          </div>

          <p className="text-muted-foreground dark:text-gray-400 text-base lg:text-lg leading-relaxed md:line-clamp-4 lg:line-clamp-none group-hover:text-foreground dark:group-hover:text-gray-300 transition-colors">
            {t(`about_us.team.descriptions.${member.id}`)}
          </p>
        </div>
      </div>
    </div>
  );
}
