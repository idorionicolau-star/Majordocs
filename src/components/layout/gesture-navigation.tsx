
"use client";

import { motion, useAnimation, useMotionValue, useTransform } from "framer-motion";
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
  const x = useMotionValue(0);
  const controls = useAnimation();
  const input = [-window.innerWidth, 0, window.innerWidth];
  const output = [0.5, 1, 0.5];
  const opacity = useTransform(x, input, output);
  
  const bind = useDrag(({ active, movement: [mx], direction: [xDir], cancel }) => {
    if (active) {
      x.set(mx);
    } else {
      const threshold = window.innerWidth * 0.25; // 25% of the screen width

      if (mx > threshold && prevRoute) {
        // Swipe Right -> Go to previous
        controls.start({ x: window.innerWidth }).then(() => {
          router.push(prevRoute, { scroll: false });
        });
      } else if (mx < -threshold && nextRoute) {
        // Swipe Left -> Go to next
        controls.start({ x: -window.innerWidth }).then(() => {
          router.push(nextRoute, { scroll: false });
        });
      } else {
        // Not enough drag -> Animate back to center
        controls.start({ x: 0 });
      }
    }
  }, {
    axis: 'x',
    filterTaps: true,
    // prevent gesture if scrolling vertically
    // or if no route is available in that direction
    from: (event) => {
        if (event.target instanceof HTMLElement && event.target.closest('[data-radix-scroll-area-viewport]')) {
             return [0, 0];
        }

        const [vx, vy] = event.velocity
        if(Math.abs(vy) > Math.abs(vx)) return [0,0]

        return [event.x, event.y]
    },
    bounds: {
        left: nextRoute ? -Infinity : 0,
        right: prevRoute ? Infinity : 0
    }
  });

  useEffect(() => {
    x.set(0);
    controls.set({ x: 0 });
  }, [pathname, controls, x]);

  return (
    <motion.div
      {...bind()}
      style={{ x }}
      animate={controls}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.05}
      className="touch-pan-y w-full h-full will-change-transform bg-background"
    >
      <motion.div style={{ opacity }}>
        {children}
      </motion.div>
    </motion.div>
  );
}
