import { Suspense } from "react";
import { WikiPublicHeader } from "@/components/wiki/wiki-public-header";

export default function WikiLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={<div className="h-14 border-b bg-background/80" />}>
        <WikiPublicHeader />
      </Suspense>
      {children}
    </div>
  );
}
