
"use client";

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

  const bind = useDrag(({ down, movement: [mx], direction: [xDir], cancel }) => {
    // If the user is dragging, update the x position
    if (down) {
      controls.set({ x: mx });
    } 
    // When the user releases their finger
    else {
      const threshold = window.innerWidth * 0.3; // Must drag 30% of the screen

      if (mx > threshold && prevRoute) {
        // Swipe Right -> Navigate to previous route
        // The animation out/in is handled by AnimatePresence in the parent ClientLayout
        router.push(prevRoute, { scroll: false });
      } else if (mx < -threshold && nextRoute) {
        // Swipe Left -> Navigate to next route
        router.push(nextRoute, { scroll: false });
      } else {
        // Not enough drag -> Animate back to center
        controls.start({ x: 0 });
      }
    }
  }, { 
    axis: 'x',
    filterTaps: true, 
    // Prevent gesture if there's no route in that direction
    bounds: { 
      left: nextRoute ? -Infinity : 0, 
      right: prevRoute ? Infinity : 0 
    }
  });

  // Reset position on route change
  useEffect(() => {
    controls.set({ x: 0 });
  }, [pathname, controls]);


  return (
    <motion.div
      {...bind()}
      animate={controls}
      className="touch-pan-y w-full h-full will-change-transform"
      style={{ cursor: 'grab' }}
    >
      {children}
    </motion.div>
  );
}
