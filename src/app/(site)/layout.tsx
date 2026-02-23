"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isHomePage = pathname === "/";

  return (
    <>
      {!isHomePage && <Navbar />}
      <main className={!isHomePage ? "pt-16" : ""}>{children}</main>
    </>
  );
}
