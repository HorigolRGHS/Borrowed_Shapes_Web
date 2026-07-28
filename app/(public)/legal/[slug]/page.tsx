import { notFound } from "next/navigation";
import { cookies } from "next/headers";

import PolicyContent from "./PolicyContent";

export default async function LegalPolicyPage({ params }: { params: Promise<{ slug: string }> | { slug: string } }) {

  const resolvedParams = await params;
  const cookieStore = await cookies();
  const locale = (cookieStore.get("NEXT_LOCALE")?.value || "en") as "en" | "vi";

  const policy = null as any;

  if (!policy) {
    notFound();
  }

  return <PolicyContent policy={policy} />;
}
