import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { getLegalPolicyBySlug } from "@/lib/legal/parser";
import PolicyContent from "./PolicyContent";

export default async function LegalPolicyPage({ params }: { params: Promise<{ slug: string }> | { slug: string } }) {
  // Await params if it's a promise (Next.js 15 dynamic params)
  const resolvedParams = await params;
  const cookieStore = await cookies();
  const locale = (cookieStore.get("NEXT_LOCALE")?.value || "en") as "en" | "vi";
  
  const policy = getLegalPolicyBySlug(resolvedParams.slug, locale);

  if (!policy) {
    notFound();
  }

  return <PolicyContent policy={policy} />;
}
