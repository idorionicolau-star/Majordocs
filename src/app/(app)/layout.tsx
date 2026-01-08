
"use client";

import { Header } from "@/components/layout/header";
import { SubHeader } from "@/components/layout/sub-header";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header />
      <SubHeader />
      <main className="flex-1 p-4 sm:p-6 md:p-8">
        {children}
      </main>
    </div>
  );
}
