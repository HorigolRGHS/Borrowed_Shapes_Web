import { cookies } from "next/headers";
import en from "@/locales/en.json";
import vi from "@/locales/vi.json";
import { LegalToc } from "./LegalToc";
import { LegalFeedback } from "./LegalFeedback";
import { Separator } from "@/components/ui/separator";
import ReactMarkdown from "react-markdown";

export const metadata = {
  title: "Terms & Policies - Borrowed Shapes",
};

const POLICY_KEYS = [
  "terms",
  "privacy",
  "community-guidelines",
  "content-policy",
  "copyright",
  "fan-content",
  "cookie",
  "account-deletion",
  "data-retention",
] as const;

export default async function LegalPage() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value === "vi" ? "vi" : "en";
  const dict = locale === "vi" ? vi : en;
  const legal = (dict as any).legal;

  const tocItems = POLICY_KEYS.map((key) => ({
    id: key,
    text: legal[key].title,
    level: 1,
  }));

  const body = (
    <div className="space-y-16">
      <div className="mb-12">
        <h1 className="text-4xl font-bold tracking-tight mb-4">
          {legal.sidebar?.phase1 ? "Legal Policies" : "Terms & Policies"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {legal.common.lastUpdated}: <span className="font-medium text-foreground">2026</span>
        </p>
      </div>

      {POLICY_KEYS.map((key, index) => {
        const policy = legal[key];
        return (
          <section key={key} id={key} className="scroll-mt-24">
            <div className="mb-6 pb-4 border-b border-border/50">
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-500 mb-2">
                {policy.badge}
              </p>
              <h2 className="text-3xl font-bold text-foreground">{policy.title}</h2>
            </div>
            
            <div className="space-y-8">
              {Object.values(policy.sections).map((section: any, idx: number) => (
                <div key={idx} className="bg-card/30 rounded-2xl p-6 border border-border/50 hover:border-border transition-colors">
                  <h3 className="text-xl font-semibold text-foreground mt-0 mb-4">{section.title}</h3>
                  <div className="prose dark:prose-invert prose-sm sm:prose-base max-w-none text-muted-foreground">
                    <ReactMarkdown>{section.content}</ReactMarkdown>
                  </div>
                </div>
              ))}
            </div>
            
            {index < POLICY_KEYS.length - 1 && <Separator className="my-16" />}
          </section>
        );
      })}
      
      <LegalFeedback />
    </div>
  );

  return (
    <main suppressHydrationWarning className="container mx-auto px-4 py-8 pt-24 max-w-7xl">
      <div className="flex flex-col lg:flex-row gap-12 items-start">
        {/* Left Sidebar (Sticky) */}
        <aside className="hidden lg:block w-72 shrink-0 sticky top-24 self-start">
          <LegalToc items={tocItems} title={legal.sidebar?.phase1 ? "Policies" : "Contents"} />
        </aside>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {body}
        </div>
      </div>
    </main>
  );
}
