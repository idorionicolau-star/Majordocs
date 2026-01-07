
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Sidebar } from "@/components/layout/sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <div className="flex flex-1 flex-col sm:pb-0">
        <Header />
        <main className="flex-1 overflow-y-auto bg-background p-4 pt-20 sm:p-6 sm:pt-6">
          <div className="container mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
