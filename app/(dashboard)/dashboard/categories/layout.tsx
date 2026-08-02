import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Categories Management | Borrowed Shapes",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
