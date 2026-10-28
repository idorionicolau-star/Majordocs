"use client";

// A barra de progresso do arranque (animação de entrada e ecrã de carregamento), ligada às fases reais
// (lib/boot-progress.ts). Antes do JavaScript arrancar já vem no HTML e avança um pouco só com CSS; depois cada fase
// leva-a ao seu ponto e arrasta-a devagar até perto do seguinte, sem nunca o passar. Mexe só no transform (fluido).
import { useEffect, useRef, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";
import { BOOT_DONE, bootLabel, bootRange, getBootStep, subscribeBootStep } from "@/lib/boot-progress";

/** as cores do logótipo, da esquerda para a direita */
const GRADIENT = "linear-gradient(90deg, rgb(248,173,0), rgb(225,51,51) 40%, rgb(124,108,174) 70%, rgb(57,146,254))";
/** quanto tempo a barra se arrasta dentro de uma fase */
const CRAWL_MS = 9000;
const CSS = `@keyframes msx-bp-pre{from{transform:scaleX(0)}to{transform:scaleX(.16)}}
.msx-bp-fill{transform-origin:0 50%;transform:scaleX(0);will-change:transform;animation:msx-bp-pre 6s cubic-bezier(.1,.6,.3,1) .3s forwards}`;

const scaleOf = (el: HTMLElement) => {
    const m = getComputedStyle(el).transform.match(/^matrix\(([^,]+)/);
    return m ? Number(m[1]) || 0 : 0;
};

export function BootProgress({ dark, idle, className }: { dark?: boolean; idle?: string; className?: string }) {
    const step = useSyncExternalStore(subscribeBootStep, getBootStep, () => -1);
    const fill = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = fill.current;
        if (!el || step < 0 || !el.animate) return;
        const now = scaleOf(el);
        el.getAnimations().forEach((a) => a.cancel());
        el.style.animation = "none";
        el.style.transform = `scaleX(${now})`;
        const [lo, hi] = bootRange(step);
        const anim = step >= BOOT_DONE
            ? el.animate([{ transform: `scaleX(${now})` }, { transform: "scaleX(1)" }], { duration: 300, easing: "ease-out", fill: "forwards" })
            : el.animate([
                { transform: `scaleX(${now})`, easing: "ease-out" },
                { transform: `scaleX(${Math.max(now, lo)})`, offset: 0.04, easing: "cubic-bezier(.1,.6,.3,1)" },
                { transform: `scaleX(${Math.max(now, hi)})` },
            ], { duration: CRAWL_MS, fill: "forwards" });
        // sem cancelar ao mudar de fase: a próxima parte de onde esta vai (lê o valor a meio da animação)
        return () => { if (!el.isConnected) anim.cancel(); };
    }, [step]);

    const done = step >= BOOT_DONE;
    return (
        <div className={cn("flex w-[min(60vw,240px)] flex-col items-center gap-2 transition-opacity duration-500", done && "opacity-0 delay-300", className)} data-testid="boot-progress" data-step={step}>
            <style dangerouslySetInnerHTML={{ __html: CSS }} />
            <div className={cn("h-1 w-full overflow-hidden rounded-full", dark ? "bg-white/10" : "bg-muted")}>
                <div ref={fill} className="msx-bp-fill h-full w-full rounded-full" style={{ background: GRADIENT }} />
            </div>
            <p className={cn("text-xs tracking-wide", dark ? "text-white/55" : "text-muted-foreground")} aria-live="polite">{bootLabel(step, idle)}</p>
        </div>
    );
}
