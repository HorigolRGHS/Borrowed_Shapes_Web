import { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Us | Borrowed Shapes",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
