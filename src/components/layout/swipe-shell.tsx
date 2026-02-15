"use client"

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { SwipeView } from '@/components/ui/swipe-view'
import { cn } from '@/lib/utils'

// Import Page Components
// Note: We bypass Next.js routing for these specific pages to allow swipe
import DashboardPage from '@/app/dashboard/page'
import POSPage from '@/app/pos/page'
import SalesPage from '@/app/sales/page'
import OrdersPage from '@/app/orders/page'

const PAGES = [
    { path: '/dashboard', component: DashboardPage, id: 'dashboard' },
    { path: '/pos', component: POSPage, id: 'pos' },
    { path: '/sales', component: SalesPage, id: 'sales' },
    { path: '/orders', component: OrdersPage, id: 'orders' },
]

export function SwipeShell() {
    const router = useRouter()
    const pathname = usePathname()
    const containerRef = useRef<HTMLDivElement>(null)
    const [activeIndex, setActiveIndex] = useState(0)
    const isScrollingRef = useRef(false)

    // Sync URL to Scroll Position (Initial Load & External Navigation)
    useEffect(() => {
        if (isScrollingRef.current) return

        const index = PAGES.findIndex(p => p.path === pathname)
        if (index !== -1 && index !== activeIndex) {
            scrollToIndex(index)
            setActiveIndex(index)
        }
    }, [pathname])

    // Scroll to specific index
    const scrollToIndex = (index: number) => {
        if (!containerRef.current) return
        const width = containerRef.current.offsetWidth
        containerRef.current.scrollTo({
            left: width * index,
            behavior: 'smooth'
        })
    }

    // Handle Scroll Events to update URL
    const handleScroll = useCallback(() => {
        if (!containerRef.current) return

        const width = containerRef.current.offsetWidth
        const scrollLeft = containerRef.current.scrollLeft

        // Calculate active index based on scroll position (center point)
        const newIndex = Math.round(scrollLeft / width)

        if (newIndex !== activeIndex && PAGES[newIndex]) {
            setActiveIndex(newIndex)
            isScrollingRef.current = true

            // Shallow routing to update URL without re-rendering
            window.history.pushState(null, '', PAGES[newIndex].path)

            // Reset scrolling flag after a delay
            setTimeout(() => {
                isScrollingRef.current = false
            }, 500)
        }
    }, [activeIndex])


    return (
        <div
            ref={containerRef}
            className="flex overflow-x-auto snap-x snap-mandatory w-full h-full no-scrollbar"
            onScroll={handleScroll}
        >
            {PAGES.map((page, index) => (
                <div
                    key={page.id}
                    className="w-full shrink-0 snap-center h-full overflow-y-auto"
                >
                    <div className="container mx-auto p-4 md:p-8 min-h-full">
                        <page.component />
                    </div>
                </div>
            ))}
        </div>
    )
}
