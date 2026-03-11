import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard — CircleSave",
  description: "Manage your savings circles",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
