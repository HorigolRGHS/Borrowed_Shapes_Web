import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Announcements Management | Borrowed Shapes",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
