
"use client";

// This component is no longer used and can be safely deleted.
// Swipe-based navigation has been removed in favor of the bottom navigation bar.

import { motion, useAnimation } from "framer-motion";
import { useDrag } from "@use-gesture/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

interface GestureNavigationProps {
  children: React.ReactNode;
  prevRoute?: string;
  nextRoute?: string;
}

export function GestureNavigation({ children, prevRoute, nextRoute }: GestureNavigationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const controls = useAnimation();

  useEffect(() => {
    controls.set({ x: 0 });
  }, [pathname, controls]);


  return (
    <motion.div
      animate={controls}
      className="w-full h-full"
    >
      {children}
    </motion.div>
  );
}
