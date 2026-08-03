import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Download | Borrowed Shapes",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
