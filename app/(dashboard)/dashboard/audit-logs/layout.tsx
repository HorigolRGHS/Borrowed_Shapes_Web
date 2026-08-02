import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Audit Logs | Borrowed Shapes",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
