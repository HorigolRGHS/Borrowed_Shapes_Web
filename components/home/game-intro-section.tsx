"use client";

import { useI18n } from "@/lib/i18/i18n-context";
import { cn } from "@/lib/utils";

export function GameIntroSection() {
  const { t } = useI18n();

  const baseUrl = "https://pub-4a3e334f734f4b669489b78b2a739715.r2.dev";

  return (
    <section className="py-20 bg-background dark:bg-[#0a0a14] transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-stretch">
          
          {/* Left side: Content */}
          <div className="flex flex-col justify-center space-y-8">
            <div className="space-y-4">
              <span className="text-sm font-bold tracking-widest text-amber-500 uppercase">
                {t("home.intro.label") || "// ABOUT THE GAME"}
              </span>
              <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground dark:text-white">
                {t("home.intro.title") || "What is Borrowed Shapes?"}
              </h2>
            </div>

            <div className="space-y-6 text-lg leading-relaxed text-muted-foreground dark:text-gray-400">
              <p>{t("home.intro.paragraph_1")}</p>
              <p>{t("home.intro.paragraph_2")}</p>
              <p>{t("home.intro.paragraph_3")}</p>
            </div>

            {/* Info blocks */}
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-border dark:divide-[#1e1e3a] border border-border dark:border-[#1e1e3a] rounded-xl overflow-hidden bg-card dark:bg-[#0f0f1a]">
              <div className="p-4 flex flex-col items-center justify-center text-center">
                <span className="text-xs font-semibold text-muted-foreground dark:text-gray-500 uppercase tracking-wider mb-1">
                  {t("home.intro.info.genre_label") || "Genre"}
                </span>
                <span className="font-bold text-foreground dark:text-white text-sm">
                  {t("home.intro.info.genre_value") || "3D Co-op Adventure"}
                </span>
              </div>
              <div className="p-4 flex flex-col items-center justify-center text-center">
                <span className="text-xs font-semibold text-muted-foreground dark:text-gray-500 uppercase tracking-wider mb-1">
                  {t("home.intro.info.mode_label") || "Mode"}
                </span>
                <span className="font-bold text-foreground dark:text-white text-sm">
                  {t("home.intro.info.mode_value") || "Co-op 2–5"}
                </span>
              </div>
              <div className="p-4 flex flex-col items-center justify-center text-center border-t sm:border-t-0">
                <span className="text-xs font-semibold text-muted-foreground dark:text-gray-500 uppercase tracking-wider mb-1">
                  {t("home.intro.info.platform_label") || "Platform"}
                </span>
                <span className="font-bold text-foreground dark:text-white text-sm">
                  {t("home.intro.info.platform_value") || "Windows PC"}
                </span>
              </div>
              <div className="p-4 flex flex-col items-center justify-center text-center border-t sm:border-t-0">
                <span className="text-xs font-semibold text-muted-foreground dark:text-gray-500 uppercase tracking-wider mb-1">
                  {t("home.intro.info.price_label") || "Price"}
                </span>
                <span className="font-bold text-amber-500 text-sm">
                  {t("home.intro.info.price_value") || "Free to Play"}
                </span>
              </div>
            </div>
          </div>

          {/* Right side: Images grid */}
          <div className="grid grid-cols-2 gap-4 h-full min-h-[500px]">
            {/* Top Large Image */}
            <div className="col-span-2 relative rounded-2xl overflow-hidden group shadow-lg">
              <img
                src={`${baseUrl}/LivingRoom.jpeg`}
                alt={t("home.intro.images.home_alt") || "Family living room"}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80" />
              <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
                <span className="text-xs font-bold tracking-widest text-gray-200 uppercase">
                  {t("home.intro.images.home_label") || "THE FAMILY HOME"}
                </span>
              </div>
            </div>

            {/* Bottom Left Image */}
            <div className="relative rounded-2xl overflow-hidden group shadow-lg aspect-square sm:aspect-auto">
              <img
                src={`${baseUrl}/Kitchen.jpeg`}
                alt={t("home.intro.images.kitchen_alt") || "Kitchen level"}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80" />
              <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
                <span className="text-xs font-bold tracking-widest text-gray-200 uppercase">
                  {t("home.intro.images.kitchen_label") || "KITCHEN"}
                </span>
              </div>
            </div>

            {/* Bottom Right Image */}
            <div className="relative rounded-2xl overflow-hidden group shadow-lg aspect-square sm:aspect-auto">
              <img
                src={`${baseUrl}/Bathroom.jpeg`}
                alt={t("home.intro.images.bathroom_alt") || "Bathroom level"}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80" />
              <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
                <span className="text-xs font-bold tracking-widest text-gray-200 uppercase">
                  {t("home.intro.images.bathroom_label") || "BATHROOM"}
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
