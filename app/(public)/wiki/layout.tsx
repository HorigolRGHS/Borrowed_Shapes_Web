import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Wiki | Borrowed Shapes",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
