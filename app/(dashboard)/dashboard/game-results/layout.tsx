import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Game Results Management | Borrowed Shapes",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
