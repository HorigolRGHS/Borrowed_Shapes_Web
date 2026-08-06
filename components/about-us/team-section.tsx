"use client";

import { useI18n } from "@/lib/i18/i18n-context";
import {
  Layers,
  Code2,
  FileText,
  Workflow,
  CheckCircle2,
} from "lucide-react";

export function AboutUsTeam() {
  const { t } = useI18n();

  const members = [
    {
      id: "sm",
      abbr: "SM",
      name: "Nguyễn Tấn Minh",
      icon: Layers,
    },
    {
      id: "tl",
      abbr: "TL",
      name: "Lê Khắc Huy",
      icon: Code2,
    },
    {
      id: "doc",
      abbr: "DOC",
      name: "Võ Trương Nhật Đăng",
      icon: FileText,
    },
    {
      id: "dl",
      abbr: "DL",
      name: "Mai Hoàng Ân",
      icon: Workflow,
    },
    {
      id: "qa",
      abbr: "QA",
      name: "Dương Nhật Anh",
      icon: CheckCircle2,
    },
  ];

  return (
    <section className="relative py-12 sm:py-16 bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
            {t("about_us.team.title") || "Thành Viên Đội Ngũ"}
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl">
            {t("about_us.team.subtitle") ||
              "Phân công vai trò và trách nhiệm chuyên môn của các thành viên trong dự án."}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {members.map((member, index) => {
            const Icon = member.icon;
            const role = t(`about_us.team.roles.${member.id}`) || member.abbr;
            const specialty = t(`about_us.team.specialties.${member.id}`) || "";
            const description = t(`about_us.team.descriptions.${member.id}`) || "";

            return (
              <div
                key={member.id}
                className="flex flex-col justify-between p-6 rounded-2xl bg-card/60 border border-border/70 hover:border-amber-500/40 hover:bg-card/90 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                        {role}
                      </span>
                    </div>
                    <span className="text-xs font-mono text-muted-foreground/50">
                      #{String(index + 1).padStart(2, "0")}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-foreground mb-1">
                    {member.name}
                  </h3>

                  {specialty && (
                    <p className="text-xs font-medium text-muted-foreground/80 mb-3">
                      {specialty}
                    </p>
                  )}

                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    {description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
