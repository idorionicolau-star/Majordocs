"use client";

// "Puxar para atualizar" da própria app. O do Chrome recarregava a app inteira (círculo azul, animação de carregar,
// menu e avatar a piscar) só para ir buscar dados que já chegam sozinhos em tempo real. Este não recarrega: refaz a
// ligação ao servidor (resolve as vezes em que a ligação do telemóvel fica "presa") e confirma com ele, em ~1 s.
// Só no topo da página, nunca com uma janela aberta nem dentro de uma lista já com scroll; o deslizar para os lados
// (entre páginas, swipe-nav) continua a ser dele.
import { useContext, useEffect, useRef, useState } from "react";
import { disableNetwork, doc, enableNetwork, getDocFromServer } from "firebase/firestore";
import { Check, WifiOff } from "lucide-react";
import { useFirestore } from "@/firebase/provider";
import { InventoryContext } from "@/context/inventory-context";
import { cn } from "@/lib/utils";
import { PULL_MAX, PULL_START, PULL_TRIGGER, isPullDown, pullDistance, refreshMessage, type RefreshResult } from "@/lib/pull-refresh";

const BLOCK = 'input, textarea, select, canvas, [data-no-pull], [role="slider"]';
const OPEN = '[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"], [data-vaul-drawer]';
/** quanto tempo fica a mensagem no fim */
const SHOW_MS = 1300;
/** o indicador escondido fica por baixo do cabeçalho */
const HIDDEN = -56;

/** dentro de uma lista com scroll que não está no topo: o gesto é dela */
const scrolledInside = (el: HTMLElement | null): boolean => {
    for (let n: HTMLElement | null = el; n && n !== document.body; n = n.parentElement) {
        if (n.scrollTop > 0 && n.scrollHeight > n.clientHeight + 2) {
            const oy = getComputedStyle(n).overflowY;
            if (oy === "auto" || oy === "scroll") return true;
        }
    }
    return false;
};

const timeout = (ms: number) => new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms));

export function PullToRefresh() {
    const firestore = useFirestore();
    const companyId = useContext(InventoryContext)?.companyId;
    const box = useRef<HTMLDivElement>(null);
    const arc = useRef<SVGCircleElement>(null);
    const busy = useRef(false);
    const [phase, setPhase] = useState<"idle" | "refreshing" | RefreshResult>("idle");

    const place = (y: number, animate: boolean) => {
        const el = box.current;
        if (!el) return;
        el.style.transition = animate ? "transform .3s cubic-bezier(.22,1,.36,1), opacity .3s" : "none";
        el.style.transform = `translate3d(-50%,${y}px,0)`;
        el.style.opacity = y <= HIDDEN ? "0" : String(Math.min(1, (y - HIDDEN) / 50));
    };

    const refresh = async () => {
        busy.current = true;
        setPhase("refreshing");
        place(PULL_TRIGGER + HIDDEN + 40, true);
        const started = Date.now();
        let result: RefreshResult = "updated";
        if (!navigator.onLine) result = "offline";
        else {
            try {
                // refaz a ligação (as listas voltam a sincronizar sozinhas) e confirma que o servidor responde
                await disableNetwork(firestore);
                await enableNetwork(firestore);
                if (companyId) await Promise.race([getDocFromServer(doc(firestore, `companies/${companyId}`)), timeout(10000)]);
            } catch {
                result = navigator.onLine ? "unreachable" : "offline";
                enableNetwork(firestore).catch(() => {});
            }
        }
        // não piscar: o "A atualizar…" fica pelo menos meio segundo
        await new Promise((r) => setTimeout(r, Math.max(0, 500 - (Date.now() - started))));
        setPhase(result);
        await new Promise((r) => setTimeout(r, result === "updated" ? SHOW_MS : SHOW_MS * 2));
        place(HIDDEN, true);
        setTimeout(() => { setPhase("idle"); busy.current = false; }, 300);
    };
    const refreshRef = useRef(refresh);
    refreshRef.current = refresh;

    useEffect(() => {
        // desliga o "puxar para atualizar" do navegador (recarregava a app): este faz o mesmo sem recarregar
        const html = document.documentElement, body = document.body;
        html.style.overscrollBehaviorY = "contain";
        body.style.overscrollBehaviorY = "contain";

        let sx = 0, sy = 0, mode: "idle" | "wait" | "pull" = "idle", dist = 0;
        const move = (e: TouchEvent) => {
            if (mode === "idle") return;
            const t = e.touches[0];
            const dx = t.clientX - sx, dy = t.clientY - sy;
            if (mode === "wait") {
                if (isPullDown(dx, dy)) mode = "pull";
                else if (Math.abs(dx) > PULL_START || dy < -PULL_START) { stop(); return; }
                else return;
            }
            if (e.cancelable) e.preventDefault();
            dist = pullDistance(dy);
            place(HIDDEN + dist, false);
            box.current?.toggleAttribute("data-ready", dist >= PULL_TRIGGER);
            const c = arc.current;
            if (c) {
                c.style.strokeDashoffset = String(1 - Math.min(1, dist / PULL_TRIGGER) * 0.85);
                c.parentElement!.style.transform = `rotate(${(dist / PULL_MAX) * 270}deg)`;
            }
        };
        const stop = () => {
            mode = "idle";
            window.removeEventListener("touchmove", move);
        };
        const down = (e: TouchEvent) => {
            if (busy.current || e.touches.length !== 1 || window.scrollY > 0) return;
            const target = e.target as HTMLElement;
            if (target.closest(BLOCK) || document.querySelector(OPEN) || document.body.hasAttribute("data-scroll-locked") || scrolledInside(target)) return;
            sx = e.touches[0].clientX; sy = e.touches[0].clientY; dist = 0; mode = "wait";
            // só escuta o arrastar quando pode ser puxar para atualizar (não pesa no scroll do resto da app)
            window.addEventListener("touchmove", move, { passive: false });
        };
        const up = () => {
            const was = mode;
            stop();
            if (was !== "pull") return;
            box.current?.removeAttribute("data-ready");
            if (dist >= PULL_TRIGGER) refreshRef.current();
            else place(HIDDEN, true);
        };

        window.addEventListener("touchstart", down, { passive: true });
        window.addEventListener("touchend", up, { passive: true });
        window.addEventListener("touchcancel", up, { passive: true });
        return () => {
            stop();
            window.removeEventListener("touchstart", down);
            window.removeEventListener("touchend", up);
            window.removeEventListener("touchcancel", up);
            html.style.overscrollBehaviorY = "";
            body.style.overscrollBehaviorY = "";
        };
    }, []);

    const label = phase === "refreshing" ? "A atualizar…" : phase === "idle" ? "" : refreshMessage(phase);
    return (
        <div
            ref={box}
            data-testid="pull-refresh"
            data-phase={phase}
            className="msx-ptr pointer-events-none fixed left-1/2 z-[29] flex flex-col items-center gap-2"
            style={{ top: "calc(env(safe-area-inset-top) + 64px)", transform: `translate3d(-50%,${HIDDEN}px,0)`, opacity: 0 }}
            role="status"
            aria-live="polite"
        >
            <style dangerouslySetInnerHTML={{ __html: `@keyframes msx-ptr-spin{to{transform:rotate(360deg)}}
.msx-ptr[data-phase=refreshing] .msx-ptr-ring{animation:msx-ptr-spin .8s linear infinite}
.msx-ptr[data-ready] .msx-ptr-ring circle{stroke-width:4}` }} />
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/30 bg-background shadow-xl ring-4 ring-background/60">
                {phase === "updated" ? <Check className="h-5 w-5 text-emerald-500" />
                    : phase === "offline" || phase === "unreachable" ? <WifiOff className="h-5 w-5 text-amber-500" />
                        : (
                            <svg viewBox="0 0 24 24" className="msx-ptr-ring h-6 w-6" aria-hidden>
                                <defs>
                                    <linearGradient id="msx-ptr-grad" x1="0" y1="1" x2="1" y2="0">
                                        <stop offset="0" stopColor="rgb(248,173,0)" /><stop offset=".45" stopColor="rgb(225,51,51)" />
                                        <stop offset=".75" stopColor="rgb(124,108,174)" /><stop offset="1" stopColor="rgb(57,146,254)" />
                                    </linearGradient>
                                </defs>
                                <circle ref={arc} cx="12" cy="12" r="9" fill="none" stroke="url(#msx-ptr-grad)" strokeWidth="3" strokeLinecap="round" pathLength={1} strokeDasharray="1" style={{ strokeDashoffset: phase === "refreshing" ? 0.25 : 1 }} />
                            </svg>
                        )}
            </div>
            {label && <span className={cn("rounded-full border border-primary/20 bg-background px-3 py-1 text-xs font-semibold shadow-lg", phase === "offline" || phase === "unreachable" ? "text-amber-600" : "text-foreground")}>{label}</span>}
        </div>
    );
}
