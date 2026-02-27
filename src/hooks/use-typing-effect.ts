"use client";

import { useState, useEffect, useRef, useCallback } from "react";

/**
 * Custom hook that simulates a typing effect by revealing text character-by-character.
 *
 * @param fullText - The complete text to be typed out
 * @param options - Configuration options
 * @returns { displayedText, isTyping, skipTyping }
 */
export function useTypingEffect(
    fullText: string,
    options?: {
        /** Milliseconds per character (default: 12) */
        speed?: number;
        /** Whether the effect is enabled (default: true) */
        enabled?: boolean;
        /** Callback when typing finishes */
        onComplete?: () => void;
    }
) {
    const speed = options?.speed ?? 12;
    const enabled = options?.enabled ?? true;

    const [displayedText, setDisplayedText] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const indexRef = useRef(0);
    const rafRef = useRef<number | null>(null);
    const lastTimeRef = useRef(0);
    const fullTextRef = useRef(fullText);
    const skippedRef = useRef(false);

    // Keep fullText ref in sync
    fullTextRef.current = fullText;

    // Skip to end
    const skipTyping = useCallback(() => {
        skippedRef.current = true;
        if (rafRef.current) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        }
        setDisplayedText(fullTextRef.current);
        setIsTyping(false);
        options?.onComplete?.();
    }, [options?.onComplete]);

    useEffect(() => {
        if (!enabled || !fullText) {
            setDisplayedText(fullText || "");
            setIsTyping(false);
            return;
        }

        // Reset for new text
        indexRef.current = 0;
        skippedRef.current = false;
        lastTimeRef.current = 0;
        setDisplayedText("");
        setIsTyping(true);

        const animate = (timestamp: number) => {
            if (skippedRef.current) return;

            if (!lastTimeRef.current) {
                lastTimeRef.current = timestamp;
            }

            const elapsed = timestamp - lastTimeRef.current;

            if (elapsed >= speed) {
                // Calculate how many characters to advance based on elapsed time
                const charsToAdvance = Math.max(1, Math.floor(elapsed / speed));
                const newIndex = Math.min(
                    indexRef.current + charsToAdvance,
                    fullTextRef.current.length
                );
                indexRef.current = newIndex;
                lastTimeRef.current = timestamp;

                setDisplayedText(fullTextRef.current.slice(0, newIndex));

                if (newIndex >= fullTextRef.current.length) {
                    setIsTyping(false);
                    options?.onComplete?.();
                    return;
                }
            }

            rafRef.current = requestAnimationFrame(animate);
        };

        rafRef.current = requestAnimationFrame(animate);

        return () => {
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
                rafRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fullText, enabled, speed]);

    return { displayedText, isTyping, skipTyping };
}
