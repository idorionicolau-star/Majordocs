
"use client";

import { Header } from "@/components/layout/header";
import { SubHeader } from "@/components/layout/sub-header";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel"
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { mainNavItems } from "@/lib/data";

import DashboardPage from "./dashboard/page";
import InventoryPage from "./inventory/page";
import SalesPage from "./sales/page";
import ProductionPage from "./production/page";
import OrdersPage from "./orders/page";
import SettingsPage from "./settings/page";


const pages = [
  { path: "/dashboard", component: DashboardPage },
  { path: "/inventory", component: InventoryPage },
  { path: "/sales", component: SalesPage },
  { path: "/production", component: ProductionPage },
  { path: "/orders", component: OrdersPage },
  { path: "/settings", component: SettingsPage },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  const pathname = usePathname();
  const router = useRouter();
  const [api, setApi] = useState<CarouselApi>()
  
  const currentPageIndex = mainNavItems.findIndex(item => item.href === pathname);

  useEffect(() => {
    if (!api) return;

    const handleSelect = () => {
      const selectedIndex = api.selectedScrollSnap();
      const newPath = mainNavItems[selectedIndex]?.href;
      if (newPath && newPath !== pathname) {
        router.replace(newPath, { scroll: false });
      }
    };

    api.on("select", handleSelect);

    return () => {
      api.off("select", handleSelect);
    };

  }, [api, pathname, router]);

  useEffect(() => {
    if (api && currentPageIndex !== -1 && api.selectedScrollSnap() !== currentPageIndex) {
      api.scrollTo(currentPageIndex, true);
    }
  }, [pathname, api, currentPageIndex]);


  if (isMobile) {
    return (
      <div className="flex min-h-screen w-full flex-col bg-background">
        <Header />
        <SubHeader onNavigate={(index) => api?.scrollTo(index)} />
        <main className="flex-1 overflow-hidden">
          <Carousel 
            className="h-full"
            setApi={setApi}
            opts={{
              startIndex: currentPageIndex === -1 ? 0 : currentPageIndex,
            }}
          >
            <CarouselContent className="h-full">
              {pages.map(({ path, component: PageComponent }) => (
                <CarouselItem key={path} className="h-full overflow-y-auto p-4 sm:p-6 md:p-8">
                  <PageComponent />
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        </main>
      </div>
    )
  }

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
