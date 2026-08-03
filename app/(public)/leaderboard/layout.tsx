import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Leaderboard | Borrowed Shapes",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
