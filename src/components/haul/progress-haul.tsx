"use client";

import { useEffect, useLayoutEffect, useRef, useSyncExternalStore } from "react";
import { getHaul, subscribeHaul, type HaulKind, type HaulPhase } from "@/lib/haul";

// O cartão ao centro com a barra puxada. Os puxões são ritmados (um a cada TUG segundos): o objecto inclina-se e
// faz força, a corda estica, a barra avança um bocado; entre puxões recupera. A barra abranda até ~85% e, se a
// gravação ainda não acabou, o objecto continua a fazer força sem avançar. Quando grava, a barra enche, a corda
// solta-se e o objecto dá um salto. Tudo CSS (transform/opacity): fluido mesmo com o telemóvel ocupado a gravar.

const TUG = 0.7; // segundos por puxão
const TUGS = 12;
const P_MAX = 0.86;
const TRACK = 176; // largura da barra (px)
const pct = (t: number) => `${((t / (TUG * TUGS)) * 100).toFixed(3)}%`;

// progresso de cada puxão: grandes no início, cada vez mais pequenos (custa mais)
const P = Array.from({ length: TUGS + 1 }, (_, k) => P_MAX * (1 - Math.exp(-k / 4)) / (1 - Math.exp(-TUGS / 4)));
const progress = (prop: (p: number) => string) => P.slice(0, TUGS).map((p, k) =>
    `${pct(k * TUG + 0.18 * TUG)}{transform:${prop(p)};animation-timing-function:cubic-bezier(.3,0,.2,1)}${pct(k * TUG + 0.48 * TUG)}{transform:${prop(P[k + 1])};animation-timing-function:linear}`).join("")
    + `0%{transform:${prop(0)}}100%{transform:${prop(P[TUGS])}}`;

const CSS = `
@keyframes msx-h-in{from{opacity:0}to{opacity:1}}
@keyframes msx-h-pop{from{opacity:0;transform:scale(.85) translateY(10px)}to{opacity:1;transform:none}}
@keyframes msx-h-fill{${progress((p) => `translateX(${((p - 1) * 100).toFixed(2)}%)`)}}
@keyframes msx-h-move{${progress((p) => `translateX(${(p * TRACK).toFixed(1)}px)`)}}
@keyframes msx-h-tug{0%,100%{transform:rotate(0) scale(1,1)}25%{transform:rotate(-7deg) scale(1.05,.95)}45%{transform:rotate(-3deg) scale(1,1)}70%{transform:rotate(1.5deg) scale(.98,1.03)}}
@keyframes msx-h-jiggle{0%,100%{transform:translateY(0) rotate(0)}30%{transform:translateY(-4px) rotate(-6deg)}55%{transform:translateY(1px) rotate(3deg)}}
@keyframes msx-h-spin{0%{transform:rotate(0)}40%{transform:rotate(290deg)}100%{transform:rotate(360deg)}}
@keyframes msx-h-taut{0%,12%{opacity:0}18%,55%{opacity:1}65%,100%{opacity:0}}
@keyframes msx-h-slack{0%,12%{opacity:1}18%,55%{opacity:0}65%,100%{opacity:1}}
@keyframes msx-h-dust{0%,15%{opacity:0;transform:translate(0,0) scale(.3)}25%{opacity:.75}80%,100%{opacity:0;transform:translate(-16px,-7px) scale(1.5)}}
@keyframes msx-h-sweat{0%,30%{opacity:0;transform:translate(0,0) scale(.4)}40%{opacity:1;transform:translate(2px,-5px) scale(1)}70%,100%{opacity:0;transform:translate(9px,4px) scale(.8)}}
@keyframes msx-h-hop{0%{transform:translateY(0) rotate(0)}35%{transform:translateY(-12px) rotate(-8deg)}65%{transform:translateY(0) rotate(2deg) scale(1.06,.94)}100%{transform:none}}
@keyframes msx-h-no{0%,100%{transform:translateX(0)}20%{transform:translateX(-5px) rotate(-4deg)}40%{transform:translateX(5px) rotate(4deg)}60%{transform:translateX(-3px)}80%{transform:translateX(3px)}}
@keyframes msx-h-check{from{opacity:0;transform:scale(0) rotate(-30deg)}to{opacity:1;transform:none}}
.msx-h-back{position:fixed;inset:0;z-index:400;display:flex;align-items:center;justify-content:center;background:rgba(9,12,18,.35);animation:msx-h-in .2s ease-out both}
.msx-h-card{width:min(92vw,330px);animation:msx-h-pop .35s cubic-bezier(.34,1.56,.64,1) both}
.msx-h-stage{position:relative;width:${TRACK + 106}px;height:86px;margin:12px auto 0}
.msx-h-track{position:absolute;left:0;top:70px;width:${TRACK}px;height:10px;border-radius:999px;overflow:hidden;background:hsl(var(--muted))}
.msx-h-fill{position:absolute;inset:0;border-radius:999px;background:linear-gradient(90deg,#f8ad00,#e13333 45%,#7c6cae 75%,#3992fe);transition:background .3s;will-change:transform;animation:msx-h-fill ${TUG * TUGS}s both}
.msx-h-mover{position:absolute;left:8px;top:10px;width:94px;height:73px;will-change:transform;animation:msx-h-move ${TUG * TUGS}s both}
.msx-h-mover svg{display:block;overflow:visible}
.msx-h-body{transform-box:view-box;transform-origin:22px 54px;animation:msx-h-tug ${TUG}s ease-in-out infinite}
.msx-h-load{transform-box:fill-box;transform-origin:50% 100%;animation:msx-h-jiggle ${TUG}s ease-in-out infinite;animation-delay:.05s}
.msx-h-wheel{transform-box:fill-box;transform-origin:center;animation:msx-h-spin ${TUG}s cubic-bezier(.3,0,.3,1) infinite}
.msx-h-taut{animation:msx-h-taut ${TUG}s linear infinite}
.msx-h-slack{animation:msx-h-slack ${TUG}s linear infinite}
.msx-h-dust{transform-box:fill-box;transform-origin:center;opacity:0;animation:msx-h-dust ${TUG}s ease-out infinite}
.msx-h-dust:nth-child(2){animation-delay:.06s}.msx-h-dust:nth-child(3){animation-delay:.12s}
.msx-h-sweat{transform-box:fill-box;transform-origin:center;opacity:0;animation:msx-h-sweat ${TUG * 2}s ease-out infinite}
.msx-h-check{display:inline-flex;width:20px;height:20px;margin-right:6px;vertical-align:-4px;border-radius:50%;background:#16a34a;color:#fff;align-items:center;justify-content:center;font-weight:800;font-size:12px;box-shadow:0 4px 12px -3px #16a34a;animation:msx-h-check .4s cubic-bezier(.34,1.56,.64,1) .2s both}
.msx-h-done .msx-h-body{animation:msx-h-hop .55s cubic-bezier(.34,1.56,.64,1) both}
.msx-h-done .msx-h-load,.msx-h-done .msx-h-wheel,.msx-h-done .msx-h-dust,.msx-h-done .msx-h-sweat,.msx-h-done .msx-h-taut{animation:none;opacity:0}
.msx-h-done .msx-h-load,.msx-h-done .msx-h-wheel{opacity:1}
.msx-h-done .msx-h-slack{animation:none;opacity:1}
.msx-h-error .msx-h-fill{background:#ef4444}
.msx-h-error .msx-h-body{animation:msx-h-no .5s ease-in-out both}
.msx-h-error .msx-h-load,.msx-h-error .msx-h-wheel,.msx-h-error .msx-h-dust,.msx-h-error .msx-h-sweat,.msx-h-error .msx-h-taut{animation:none;opacity:0}
.msx-h-error .msx-h-load,.msx-h-error .msx-h-wheel{opacity:1}
.msx-h-error .msx-h-slack{animation:none;opacity:1}
`;

const INK = { fill: "hsl(var(--foreground))" };
const INK_STROKE = { stroke: "hsl(var(--foreground))" };

/** a corda entre a ponta da barra (x=-6) e o objecto: esticada quando puxa, bamba entre puxões */
function Rope({ to }: { to: [number, number] }) {
    const [x, y] = to;
    return <>
        <path className="msx-h-slack" d={`M-6 49 Q${(x - 6) / 2} ${Math.max(y, 49) + 6} ${x} ${y}`} fill="none" stroke="#b08955" strokeWidth="2" strokeLinecap="round" />
        <path className="msx-h-taut" d={`M-6 49 L${x} ${y}`} fill="none" stroke="#b08955" strokeWidth="2.2" strokeLinecap="round" />
    </>;
}
const Dust = ({ x, y }: { x: number; y: number }) => (
    <g>{[0, 1, 2].map((i) => <circle key={i} className="msx-h-dust" cx={x - i * 3} cy={y - i} r={3 + i} fill="#b9bec6" />)}</g>
);
const Sweat = ({ x, y }: { x: number; y: number }) => <>
    {[0, 1].map((i) => <path key={i} className="msx-h-sweat" style={{ animationDelay: `${i * TUG}s` }} d={`M${x + i * 7} ${y - 6} q5 6 0 9 q-5 -3 0 -9z`} fill="#7cc4ff" />)}
</>;
const Wheel = ({ cx, cy, r }: { cx: number; cy: number; r: number }) => (
    <g className="msx-h-wheel">
        <circle cx={cx} cy={cy} r={r} style={INK} />
        <path d={`M${cx - r * 0.7} ${cy}h${r * 1.4}M${cx} ${cy - r * 0.7}v${r * 1.4}`} stroke="#9aa4ad" strokeWidth="1.3" />
    </g>
);
function Grad({ id }: { id: string }) {
    return (
        <defs>
            <linearGradient id={id} x1="0" y1="1" x2="1" y2="0">
                <stop offset="0" stopColor="#f8ad00" /><stop offset=".45" stopColor="#e13333" /><stop offset=".75" stopColor="#7c6cae" /><stop offset="1" stopColor="#3992fe" />
            </linearGradient>
        </defs>
    );
}

/** Vendas: carrinho de compras; as rodas da frente levantam no esticão e os produtos saltam lá dentro. */
function Cart() {
    return (
        <svg viewBox="0 0 72 56" width="94" height="73">
            <Grad id="msx-h-g-cart" />
            <Rope to={[14, 44]} />
            <Dust x={16} y={52} />
            <g className="msx-h-body">
                <g className="msx-h-load">
                    <rect x="23" y="7" width="11" height="12" rx="2" fill="#f8ad00" />
                    <rect x="37" y="2" width="8" height="17" rx="2" fill="#e13333" />
                    <circle cx="54" cy="12" r="6.5" fill="#3992fe" />
                </g>
                <path d="M16 20 L9 11 H4" fill="none" style={INK_STROKE} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M15 17 H67 L61 39 H22 Z" fill="url(#msx-h-g-cart)" />
                <path d="M30 19v18M41 19v18M52 19v18M19 28h45" stroke="#fff" strokeOpacity=".35" strokeWidth="1.6" />
                <path d="M14 44 H60" style={INK_STROKE} strokeWidth="3" strokeLinecap="round" />
                <path d="M22 39 L20 44" style={INK_STROKE} strokeWidth="3" strokeLinecap="round" />
                <Sweat x={64} y={8} />
            </g>
            <Wheel cx={24} cy={49} r={5} /><Wheel cx={56} cy={49} r={5} />
        </svg>
    );
}

const OBJECTS: Record<HaulKind, () => React.JSX.Element> = {
    sale: Cart, transfer: Cart, production: Cart, stock: Cart, document: Cart, report: Cart, settings: Cart, auth: Cart,
};

function HaulCard({ kind, label, doneLabel, phase }: { kind: HaulKind; label: string; doneLabel: string; phase: HaulPhase }) {
    const fillRef = useRef<HTMLDivElement>(null);
    const moverRef = useRef<HTMLDivElement>(null);
    const Obj = OBJECTS[kind];

    // no fim: a barra parte de onde está e enche até ao fim (os puxões param)
    useLayoutEffect(() => {
        if (phase !== "done") return;
        const go = (el: HTMLElement | null, to: string) => {
            if (!el) return;
            const now = getComputedStyle(el).transform;
            el.style.animation = "none";
            el.style.transform = now === "none" ? "" : now;
            el.animate?.([{ transform: now === "none" ? "none" : now }, { transform: to }], { duration: 380, easing: "cubic-bezier(.22,1,.36,1)", fill: "forwards" });
        };
        go(fillRef.current, "translateX(0)");
        go(moverRef.current, `translateX(${TRACK}px)`);
    }, [phase]);
    // no erro: pára onde está
    useEffect(() => {
        if (phase !== "error") return;
        [fillRef.current, moverRef.current].forEach((el) => { if (el) { el.style.transform = getComputedStyle(el).transform; el.style.animation = "none"; } });
    }, [phase]);

    const text = phase === "done" ? doneLabel : phase === "error" ? "Não foi possível concluir" : label;
    return (
        <div className="msx-h-back" role="status" aria-live="polite">
            <div className="msx-h-card rounded-2xl border bg-card px-5 pb-4 pt-5 text-card-foreground shadow-2xl">
                <p className={`text-center text-sm font-semibold ${phase === "done" ? "text-emerald-600 dark:text-emerald-400" : phase === "error" ? "text-red-600 dark:text-red-400" : ""}`}>{phase === "done" && <span className="msx-h-check">✓</span>}{text}</p>
                <div className={`msx-h-stage ${phase === "done" ? "msx-h-done" : phase === "error" ? "msx-h-error" : ""}`}>
                    <div className="msx-h-track"><div ref={fillRef} className="msx-h-fill" /></div>
                    <div ref={moverRef} className="msx-h-mover"><Obj /></div>
                </div>
            </div>
        </div>
    );
}

/** Fica no layout: mostra o cartão quando alguém chama `haul(...)`. */
export function ProgressHaulHost() {
    const s = useSyncExternalStore(subscribeHaul, getHaul, () => null);
    if (!s) return null;
    return <>
        <style dangerouslySetInnerHTML={{ __html: CSS }} />
        <HaulCard key={s.id} kind={s.kind} label={s.label} doneLabel={s.doneLabel} phase={s.phase} />
    </>;
}
