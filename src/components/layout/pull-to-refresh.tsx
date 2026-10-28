"use client";

// "Puxar para atualizar" da própria app. O do Chrome recarregava a app inteira (círculo azul, animação de carregar,
// menu e avatar a piscar) só para ir buscar dados que já chegam sozinhos em tempo real. Este não recarrega: refaz a
// ligação ao servidor (resolve as vezes em que a ligação do telemóvel fica "presa") e só diz "Atualizado" quando o
// servidor confirma as vendas e os produtos (~1 s). O carrinho do ecrã de carregamento avança enquanto se puxa e
// corre ao largar. Só no topo da página, nunca com uma janela aberta nem dentro de uma lista já com scroll; o deslizar para os lados
// (entre páginas, swipe-nav) continua a ser dele.
import { useContext, useEffect, useRef, useState } from "react";
import { collection, disableNetwork, enableNetwork, onSnapshot, type Firestore, type Unsubscribe } from "firebase/firestore";
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

/**
 * Espera que o servidor confirme as vendas e os produtos. São as mesmas colecções que a app já tem abertas
 * (core.ts): o Firestore partilha a escuta, por isso não há leituras a mais. O `onSnapshotsInSync` não servia: só
 * avisa quando alguma lista muda, e sem novidades no servidor ficava à espera para nada.
 */
function serverConfirmed(firestore: Firestore, companyId: string, stops: Unsubscribe[]) {
    return Promise.all(["products", "sales"].map((name) => new Promise<void>((resolve) => {
        stops.push(onSnapshot(collection(firestore, `companies/${companyId}/${name}`), { includeMetadataChanges: true },
            (snap) => { if (!snap.metadata.fromCache) resolve(); },
            () => resolve())); // sem permissão para essa lista (ex.: funcionário sem vendas): não conta
    })));
}

export function PullToRefresh() {
    const firestore = useFirestore();
    const companyId = useContext(InventoryContext)?.companyId;
    const box = useRef<HTMLDivElement>(null);
    const cart = useRef<HTMLDivElement>(null);
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
        if (cart.current) cart.current.style.transform = ""; // a partir daqui manda a animação "a correr"
        let result: RefreshResult = "updated";
        if (!navigator.onLine) result = "offline";
        else {
            const stops: Unsubscribe[] = [];
            try {
                // refaz a ligação (as listas voltam a sincronizar sozinhas) e espera que o servidor as confirme
                await disableNetwork(firestore);
                await enableNetwork(firestore);
                if (companyId) await Promise.race([serverConfirmed(firestore, companyId, stops), timeout(10000)]);
            } catch {
                result = navigator.onLine ? "unreachable" : "offline";
                enableNetwork(firestore).catch(() => {});
            } finally {
                stops.forEach((stop) => stop());
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
            // o carrinho entra da esquerda à medida que se puxa; as rodas giram com a distância
            const c = cart.current;
            if (c) {
                const k = Math.min(1, dist / PULL_TRIGGER);
                c.style.transform = `translate3d(${(k - 1) * 46}px,0,0) rotate(${dist >= PULL_TRIGGER ? -4 : 0}deg)`;
                c.style.setProperty("--msx-ptr-turn", `${(dist / PULL_MAX) * 720}deg`);
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
    const failed = phase === "offline" || phase === "unreachable";
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
            <style dangerouslySetInnerHTML={{ __html: PTR_CSS }} />
            <div className="relative flex h-11 w-[120px] items-center justify-center overflow-hidden rounded-full border border-primary/30 bg-background shadow-xl ring-4 ring-background/60">
                {failed ? <WifiOff className="h-5 w-5 text-amber-500" /> : (
                    // a pista: o carrinho some suavemente nas pontas (a máscara fica aqui dentro, o fundo do cartão fica sólido)
                    <div className="msx-ptr-road absolute inset-0 flex items-center justify-center">
                        <div ref={cart} className="msx-ptr-cart relative" style={{ transform: "translate3d(-46px,0,0)" }}>
                            <MiniCart />
                            {phase === "updated" && (
                                <span className="msx-ptr-ok absolute -right-3 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white"><Check className="h-3 w-3" strokeWidth={3} /></span>
                            )}
                        </div>
                    </div>
                )}
            </div>
            {label && <span className={cn("rounded-full border border-primary/20 bg-background px-3 py-1 text-xs font-semibold shadow-lg", failed ? "text-amber-600" : "text-foreground")}>{label}</span>}
        </div>
    );
}

// a correr: atravessa a pista e volta a entrar (enquanto espera pelo servidor); no fim trava ao centro
const PTR_CSS = `@keyframes msx-ptr-run{0%{transform:translate3d(-62px,0,0) rotate(-3deg)}100%{transform:translate3d(62px,0,0) rotate(-3deg)}}
@keyframes msx-ptr-brake{0%{transform:translate3d(-40px,0,0) rotate(-3deg)}70%{transform:translate3d(4px,0,0) rotate(4deg)}100%{transform:translate3d(0,0,0) rotate(0)}}
@keyframes msx-ptr-spin{to{transform:rotate(360deg)}}
@keyframes msx-ptr-pop{from{transform:scale(0)}to{transform:scale(1)}}
.msx-ptr-road{-webkit-mask-image:linear-gradient(90deg,transparent 4%,#000 26%,#000 74%,transparent 96%);mask-image:linear-gradient(90deg,transparent 4%,#000 26%,#000 74%,transparent 96%)}
.msx-ptr-cart{--msx-ink:#253238;will-change:transform}
.dark .msx-ptr-cart{--msx-ink:#cbd5e1}
.msx-ptr-wheel{transform-box:fill-box;transform-origin:center;transform:rotate(var(--msx-ptr-turn,0deg))}
.msx-ptr-speed{opacity:0}
.msx-ptr[data-phase=refreshing] .msx-ptr-cart{animation:msx-ptr-run .75s linear infinite}
.msx-ptr[data-phase=refreshing] .msx-ptr-wheel{animation:msx-ptr-spin .3s linear infinite}
.msx-ptr[data-phase=refreshing] .msx-ptr-speed{opacity:.9}
.msx-ptr[data-phase=updated] .msx-ptr-cart{animation:msx-ptr-brake .45s cubic-bezier(.12,.75,.3,1) both}
.msx-ptr-ok{animation:msx-ptr-pop .3s cubic-bezier(.34,1.56,.64,1) .3s both}`;

/** o carrinho do ecrã de carregamento (app-loader.tsx), em pequeno */
function MiniCart() {
    const ink = { stroke: "var(--msx-ink)" };
    return (
        <svg viewBox="-30 0 150 80" width="54" height="29" className="overflow-visible" aria-hidden>
            <defs>
                <linearGradient id="msx-ptr-grad" x1="0" y1="1" x2="1" y2="0">
                    <stop offset="0" stopColor="#f8ad00" /><stop offset=".4" stopColor="#e13333" /><stop offset=".72" stopColor="#7c6cae" /><stop offset="1" stopColor="#3992fe" />
                </linearGradient>
            </defs>
            <g className="msx-ptr-speed" stroke="#9aa4ad" strokeWidth="5" strokeLinecap="round"><path d="M-4 32h-22" /><path d="M0 46h-28" /></g>
            <rect x="38" y="12" width="17" height="16" rx="2" fill="#f8ad00" />
            <rect x="58" y="6" width="14" height="22" rx="2" fill="#e13333" />
            <circle cx="86" cy="19" r="9" fill="#3992fe" />
            <path d="M6 12h13l11 42" fill="none" style={ink} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M22 24h88l-11 30H33z" fill="url(#msx-ptr-grad)" />
            <path d="M31 56l-2 8h72" fill="none" style={ink} strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
            {[36, 90].map((cx) => (
                <g key={cx} className="msx-ptr-wheel">
                    <circle cx={cx} cy={71} r={8} style={{ fill: "var(--msx-ink)" }} />
                    <path d={`M${cx - 6} 71h12`} stroke="#fff" strokeWidth="2.2" opacity=".75" />
                </g>
            ))}
        </svg>
    );
}
