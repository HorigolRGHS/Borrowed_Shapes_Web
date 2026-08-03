import { Metadata } from "next";
import { AboutUsHero } from "@/components/about-us/hero-section";
import { AboutUsTeam } from "@/components/about-us/team-section";
import { AboutUsClosing } from "@/components/about-us/closing-section";

export const metadata: Metadata = {
  title: "About Us | Borrowed Shapes",
  description: "Meet the creators, builders, testers, and storytellers behind Borrowed Shapes.",
};

export default function AboutUsPage() {
  return (
    <div className="flex-1 flex flex-col w-full">
            
      <main className="flex-1 flex flex-col">
        <AboutUsHero />
        <AboutUsTeam />
        <AboutUsClosing />
      </main>

          </div>
  );
}
