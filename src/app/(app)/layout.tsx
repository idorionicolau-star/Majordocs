
"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { SubHeader } from "@/components/layout/sub-header";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { mainNavItems } from "@/lib/data";

// Import all the pages that will be in the carousel
import DashboardPage from './dashboard/page';
import InventoryPage from './inventory/page';
import SalesPage from './sales/page';
import ProductionPage from './production/page';
import OrdersPage from './orders/page';
import SettingsPage from './settings/page';

const pages = [
  { path: '/dashboard', component: <DashboardPage /> },
  { path: '/inventory', component: <InventoryPage /> },
  { path: '/sales', component: <SalesPage /> },
  { path: '/production', component: <ProductionPage /> },
  { path: '/orders', component: <OrdersPage /> },
  { path: '/settings', component: <SettingsPage /> },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  const pathname = usePathname();
  const router = useRouter();
  const [api, setApi] = useState<CarouselApi>();

  const activeSlide = mainNavItems.findIndex((item) => item.href === pathname);
  
  useEffect(() => {
    if (api) {
      const onSelect = () => {
        const newPath = mainNavItems[api.selectedScrollSnap()].href;
        if (pathname !== newPath) {
          router.replace(newPath, { scroll: false });
        }
      };
      api.on("select", onSelect);
      return () => {
        api.off("select", onSelect);
      };
    }
  }, [api, router, pathname]);

  useEffect(() => {
    if (api && activeSlide !== -1 && api.selectedScrollSnap() !== activeSlide) {
      api.scrollTo(activeSlide, true); // Use snap scroll
    }
  }, [pathname, api, activeSlide]);

  const handleNavClick = (index: number) => {
    if (api) {
      api.scrollTo(index);
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header />
      <SubHeader onNavClick={isMobile ? handleNavClick : undefined} />
      
      {isMobile ? (
        <Carousel
          setApi={setApi}
          opts={{
            align: "start",
            loop: false,
            startIndex: activeSlide !== -1 ? activeSlide : 0,
          }}
          className="flex-1 w-full"
        >
          <CarouselContent>
            {pages.map((page, index) => (
              <CarouselItem key={index} className="flex-1">
                 <main className="p-4 sm:p-6 md:p-8">
                    {page.component}
                </main>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      ) : (
         <main className="flex-1 p-4 sm:p-6 md:p-8">
            {children}
        </main>
      )}
    </div>
  );
}
