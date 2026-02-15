"use client";

import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";

// Define the order of pages for swipe navigation
const PAGE_ORDER = [
    "/dashboard",
    "/pos",
    "/sales",
    "/orders",
    "/production",
    "/inventory",
    "/raw-materials",
    "/reports",
    "/settings",
];

interface SwipeOptions {
    minSwipeDistance?: number;
    maxVerticalDistance?: number;
}

export function useSwipeNavigation({
    minSwipeDistance = 75,
    maxVerticalDistance = 30,
}: SwipeOptions = {}) {
    const router = useRouter();
    const pathname = usePathname();

    // Refs to store touch starting points
    const touchStartRef = useRef<{ x: number; y: number } | null>(null);
    const touchEndRef = useRef<{ x: number; y: number } | null>(null);

    useEffect(() => {
        const handleTouchStart = (e: TouchEvent) => {
            touchEndRef.current = null;
            touchStartRef.current = {
                x: e.targetTouches[0].clientX,
                y: e.targetTouches[0].clientY,
            };
        };

        const handleTouchMove = (e: TouchEvent) => {
            touchEndRef.current = {
                x: e.targetTouches[0].clientX,
                y: e.targetTouches[0].clientY,
            };
        };

        const handleTouchEnd = () => {
            if (!touchStartRef.current || !touchEndRef.current) return;

            const xDistance = touchStartRef.current.x - touchEndRef.current.x;
            const yDistance = touchStartRef.current.y - touchEndRef.current.y;

            const isHorizontalSwipe = Math.abs(xDistance) > minSwipeDistance;
            const isVerticalScroll = Math.abs(yDistance) > maxVerticalDistance;

            // Safety check: specific elements shouldn't trigger swipe (e.g. sliders, maps)
            // but for now relying on strict directional check is usually enough

            if (isHorizontalSwipe && !isVerticalScroll) {
                const currentIndex = PAGE_ORDER.findIndex((path) => path === pathname);

                if (currentIndex === -1) return; // Current page not in swipe order

                if (xDistance > 0) {
                    // Swipe Left -> Next Page
                    const nextIndex = currentIndex + 1;
                    if (nextIndex < PAGE_ORDER.length) {
                        router.push(PAGE_ORDER[nextIndex]);
                    }
                } else {
                    // Swipe Right -> Previous Page
                    const prevIndex = currentIndex - 1;
                    if (prevIndex >= 0) {
                        router.push(PAGE_ORDER[prevIndex]);
                    }
                }
            }

            // Reset
            touchStartRef.current = null;
            touchEndRef.current = null;
        };

        // Attach listeners to window or a specific container
        // Using window ensures it works everywhere, but might need to be scoped if problems arise
        window.addEventListener("touchstart", handleTouchStart);
        window.addEventListener("touchmove", handleTouchMove);
        window.addEventListener("touchend", handleTouchEnd);

        return () => {
            window.removeEventListener("touchstart", handleTouchStart);
            window.removeEventListener("touchmove", handleTouchMove);
            window.removeEventListener("touchend", handleTouchEnd);
        };
    }, [pathname, router, minSwipeDistance, maxVerticalDistance]);
}
