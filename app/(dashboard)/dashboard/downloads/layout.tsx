import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Downloads Management | Borrowed Shapes",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
