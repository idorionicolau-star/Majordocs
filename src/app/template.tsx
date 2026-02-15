"use client";

import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { useRef } from "react";

// Same order as the hook to determine direction
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

export default function Template({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const prevPathRef = useRef(pathname);

    // Determine direction
    const currentIndex = PAGE_ORDER.indexOf(pathname);
    const prevIndex = PAGE_ORDER.indexOf(prevPathRef.current);

    // Default to 1 (slide right-to-left / next)
    let direction = 1;

    if (currentIndex !== -1 && prevIndex !== -1) {
        if (currentIndex < prevIndex) {
            direction = -1; // slide left-to-right / prev
        }
    }

    // Update ref for next render
    if (prevPathRef.current !== pathname) {
        prevPathRef.current = pathname;
    }

    const variants = {
        enter: (direction: number) => ({
            x: direction > 0 ? 1000 : -1000,
            opacity: 0,
        }),
        center: {
            zIndex: 1,
            x: 0,
            opacity: 1,
        },
        exit: (direction: number) => ({
            zIndex: 0,
            x: direction < 0 ? 1000 : -1000,
            opacity: 0,
        }),
    };

    return (
        <motion.div
            key={pathname}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
                x: { type: "spring", stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 },
            }}
            className="w-full h-full"
        >
            {children}
        </motion.div>
    );
}
