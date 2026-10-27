"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

/**
 * Animação de entrada (uma vez por sessão, cerca de 4 s). As quatro cores do logótipo são os quatro pilares da app:
 * Stock (laranja), Vendas (vermelho), Gestão (roxo) e Controlo (azul). Cada um entra com o seu símbolo,
 * juntam-se ao centro e misturam-se no círculo do MajorStockX.
 *
 * O ecrã vem já no HTML do servidor (sem "piscar" a app por baixo); o script em `INTRO_GATE` decide antes da
 * primeira pintura se é para mostrar. Um toque salta a animação; quem pede menos movimento vê só o logótipo.
 */

const KEY = "msx-intro";
/** Corre antes da primeira pintura: esconde a entrada se já foi vista nesta sessão, em testes automáticos ou nas páginas legais. */
export const INTRO_GATE = `try{var q=/[?&]intro=1/.test(location.search);if(!q&&(sessionStorage.getItem('${KEY}')||navigator.webdriver||/^\\/(privacidade|termos)/.test(location.pathname)))document.documentElement.dataset.intro='skip'}catch(e){document.documentElement.dataset.intro='skip'}`;

const ORANGE = "rgb(244,150,9)", RED = "rgb(225,51,51)", PURPLE = "rgb(117,112,182)", BLUE = "rgb(89,128,216)";

// momentos da animação (segundos)
const T = { stock: 0.2, sales: 0.75, manage: 1.3, control: 1.85, merge: 2.6, logo: 3.15, slogan: 3.45, out: 4.3 };
/** quanto dura a viagem dos pilares para o centro */
const MOVE = 0.6;

const spring = { type: "spring", stiffness: 260, damping: 18 } as const;
const draw = (delay: number, duration = 0.4) => ({ initial: { pathLength: 0, opacity: 0 }, animate: { pathLength: 1, opacity: 1 }, transition: { delay, duration, ease: "easeOut" } }) as const;

/** Stock: três caixas a cair e a empilhar. */
function StockIcon() {
    const box = (x: number, y: number, k: number) => (
        <motion.g key={k} initial={{ y: -34, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ ...spring, delay: T.stock + 0.12 + k * 0.12 }}>
            <rect x={x} y={y} width="15" height="13" rx="2" fill="#fff" />
            <rect x={x + 6} y={y} width="3" height="5" fill={ORANGE} opacity="0.55" />
        </motion.g>
    );
    return <svg viewBox="0 0 48 48" className="h-[58%] w-[58%] overflow-visible">{box(7.5, 28, 0)}{box(25.5, 28, 1)}{box(16.5, 13, 2)}</svg>;
}

/** Vendas: o recibo sobe, as linhas escrevem-se e cai a moeda. */
function SalesIcon() {
    const d = T.sales + 0.1;
    return (
        <svg viewBox="0 0 48 48" className="h-[58%] w-[58%] overflow-visible">
            <motion.path d="M12 6h22v34l-3.7-2.7-3.6 2.7-3.7-2.7-3.6 2.7-3.7-2.7-3.7 2.7z" fill="#fff" initial={{ y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ ...spring, delay: d }} />
            {[13, 19, 25].map((y, i) => <motion.path key={y} d={`M17 ${y}h${i === 2 ? 7 : 12}`} stroke={RED} strokeWidth="2.4" strokeLinecap="round" {...draw(d + 0.15 + i * 0.07, 0.2)} />)}
            <motion.g initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ ...spring, delay: d + 0.38 }} style={{ originX: "36px", originY: "35px" }}>
                <circle cx="36" cy="35" r="8.5" fill="rgb(253,224,71)" stroke={RED} strokeWidth="1.6" />
                <text x="36" y="38" textAnchor="middle" fontSize="8" fontWeight="800" fill={RED}>MT</text>
            </motion.g>
        </svg>
    );
}

/** Gestão: barras a crescer e a linha de tendência a subir. */
function ManageIcon() {
    const d = T.manage + 0.1;
    const bars = [[9, 12], [20, 20], [31, 29]];
    return (
        <svg viewBox="0 0 48 48" className="h-[58%] w-[58%] overflow-visible">
            {bars.map(([x, h], i) => (
                <motion.rect key={x} x={x} width="8" rx="1.5" fill="#fff" initial={{ y: 42, height: 0 }} animate={{ y: 42 - h, height: h }} transition={{ ...spring, delay: d + i * 0.08 }} />
            ))}
            <motion.path d="M6 30 L16 22 L25 25 L41 9" fill="none" stroke="rgb(253,224,71)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" {...draw(d + 0.25, 0.35)} />
            <motion.path d="M34 8.5h7.5v7.5" fill="none" stroke="rgb(253,224,71)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" {...draw(d + 0.55, 0.15)} />
        </svg>
    );
}

/** Controlo: o escudo desenha-se, o visto confirma e um pulso de radar sai dele. */
function ControlIcon() {
    const d = T.control + 0.1;
    return (
        <svg viewBox="0 0 48 48" className="h-[58%] w-[58%] overflow-visible">
            <motion.circle cx="24" cy="24" r="20" fill="none" stroke="#fff" strokeWidth="1.5" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: [0.5, 1.35], opacity: [0.8, 0] }} transition={{ delay: d + 0.35, duration: 0.7, ease: "easeOut" }} style={{ originX: "24px", originY: "24px" }} />
            <motion.path d="M24 5 L39 11 V23 C39 33 32 40 24 43 C16 40 9 33 9 23 V11 Z" fill="rgba(255,255,255,0.18)" stroke="#fff" strokeWidth="2.6" strokeLinejoin="round" {...draw(d, 0.4)} />
            <motion.path d="M16.5 24 l5.5 5.5 l10.5 -11" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" {...draw(d + 0.3, 0.22)} />
        </svg>
    );
}

// posição de cada pilar: a cor fica no mesmo canto em que aparece no círculo do logótipo
const PILLARS = [
    { label: "Stock", color: ORANGE, at: T.stock, left: "8%", top: "52%", to: ["85%", "-85%"], Icon: StockIcon },
    { label: "Vendas", color: RED, at: T.sales, left: "8%", top: "8%", to: ["85%", "85%"], Icon: SalesIcon },
    { label: "Gestão", color: PURPLE, at: T.manage, left: "52%", top: "52%", to: ["-85%", "-85%"], Icon: ManageIcon },
    { label: "Controlo", color: BLUE, at: T.control, left: "52%", top: "8%", to: ["-85%", "85%"], Icon: ControlIcon },
] as const;

// pontinhos de cor a subir devagar no fundo (posições fixas: iguais no servidor e no navegador)
const DOTS = Array.from({ length: 16 }, (_, i) => ({ x: (i * 37) % 100, y: (i * 53) % 100, c: [ORANGE, RED, PURPLE, BLUE][i % 4], s: 3 + (i % 3) * 2, d: (i % 5) * 0.5 }));

export function IntroSplash() {
    const reduce = useReducedMotion();
    const [phase, setPhase] = useState<"play" | "out" | "gone">("play");

    useEffect(() => {
        if (document.documentElement.dataset.intro === "skip") { setPhase("gone"); return; }
        try { sessionStorage.setItem(KEY, "1"); } catch { /* navegação privada */ }
        const t1 = setTimeout(() => setPhase("out"), (reduce ? 0.9 : T.out) * 1000);
        return () => clearTimeout(t1);
    }, [reduce]);

    useEffect(() => {
        if (phase !== "out") return;
        const t = setTimeout(() => { setPhase("gone"); document.documentElement.dataset.intro = "skip"; }, 450);
        return () => clearTimeout(t);
    }, [phase]);

    if (phase === "gone") return null;

    return (
        <motion.div
            className="msx-intro fixed inset-0 z-[300] flex flex-col items-center justify-center overflow-hidden"
            style={{ background: "radial-gradient(circle at 50% 42%, #1a2233 0%, #0b0f17 62%)" }}
            initial={{ opacity: 1 }}
            animate={{ opacity: phase === "out" ? 0 : 1, scale: phase === "out" ? 1.04 : 1 }}
            transition={{ duration: 0.45, ease: "easeInOut" }}
            onClick={() => setPhase("out")}
            role="presentation"
            aria-hidden
        >
            {!reduce && DOTS.map((p, i) => (
                <motion.span key={i} className="absolute rounded-full" style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.s, height: p.s, background: p.c }}
                    initial={{ opacity: 0, y: 0 }} animate={{ opacity: [0, 0.45, 0], y: -60 }} transition={{ delay: p.d, duration: 4, ease: "easeOut" }} />
            ))}

            <div className="relative aspect-square w-[min(80vw,360px)]">
                {/* brilho por trás do logótipo */}
                <motion.div className="absolute inset-[10%] rounded-full" style={{ background: `conic-gradient(from 200deg, ${ORANGE}, ${RED}, ${PURPLE}, ${BLUE}, ${ORANGE})`, filter: "blur(40px)" }}
                    initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: reduce ? 0.35 : [0, 0.55, 0.35], scale: 1 }} transition={{ delay: reduce ? 0 : T.merge + 0.2, duration: 0.8 }} />

                {/* os quatro pilares */}
                {!reduce && PILLARS.map(({ label, color, at, left, top, to, Icon }) => (
                    <motion.div key={label} className="absolute flex w-[40%] flex-col items-center" style={{ left, top }}
                        initial={{ opacity: 0, scale: 0.4, x: 0, y: 0 }}
                        animate={{ opacity: [0, 1, 1, 0], scale: [0.4, 1, 1, 0.5], x: ["0%", "0%", "0%", to[0]], y: ["0%", "0%", "0%", to[1]], filter: ["blur(0px)", "blur(0px)", "blur(0px)", "blur(12px)"] }}
                        transition={{ duration: T.merge + MOVE - at, times: [0, 0.12, (T.merge - at) / (T.merge + MOVE - at), 1], delay: at, ease: "easeInOut" }}>
                        <div className="flex aspect-square w-[72%] items-center justify-center rounded-[28%] shadow-2xl" style={{ background: `linear-gradient(145deg, ${color}, color-mix(in srgb, ${color} 70%, #000))`, boxShadow: `0 12px 40px -8px ${color}` }}>
                            <Icon />
                        </div>
                        <span className="mt-2 text-[13px] font-semibold tracking-wide text-white/80">{label}</span>
                    </motion.div>
                ))}

                {/* as cores juntam-se no círculo */}
                <motion.div className="absolute inset-[12%] overflow-hidden rounded-full" style={{ background: `linear-gradient(45deg, ${ORANGE} 15%, ${RED} 45%, ${PURPLE} 70%, ${BLUE} 90%)` }}
                    initial={{ scale: reduce ? 1 : 0, opacity: reduce ? 1 : 0, rotate: reduce ? 0 : -90 }} animate={{ scale: 1, opacity: 1, rotate: 0 }}
                    transition={{ delay: reduce ? 0 : T.merge + 0.2, type: "spring", stiffness: 140, damping: 16 }}>
                    {!reduce && [ORANGE, RED, PURPLE, BLUE].map((c, i) => (
                        <motion.span key={c} className="absolute h-[70%] w-[70%] rounded-full" style={{ background: c, filter: "blur(22px)", left: ["-10%", "-5%", "40%", "40%"][i], top: ["40%", "-5%", "40%", "-10%"][i] }}
                            initial={{ scale: 0.2 }} animate={{ scale: 1 }} transition={{ delay: T.merge + 0.25 + i * 0.05, duration: 0.6 }} />
                    ))}
                </motion.div>

                {/* o logótipo escreve-se da esquerda para a direita e passa um brilho */}
                <motion.div className="absolute inset-[12%] overflow-hidden rounded-full"
                    initial={{ clipPath: reduce ? "inset(0 0% 0 0)" : "inset(0 100% 0 0)" }} animate={{ clipPath: "inset(0 0% 0 0)" }}
                    transition={{ delay: reduce ? 0 : T.logo, duration: 0.65, ease: [0.65, 0, 0.35, 1] }}>
                    <img src="/logo.svg" alt="" className="h-full w-full" draggable={false} />
                    {!reduce && (
                        <motion.span className="absolute inset-y-0 w-1/3 -skew-x-12" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)" }}
                            initial={{ left: "-40%" }} animate={{ left: "130%" }} transition={{ delay: T.logo + 0.6, duration: 0.7, ease: "easeInOut" }} />
                    )}
                </motion.div>
            </div>

            <motion.p className="mt-3 px-6 text-center font-headline text-base font-medium tracking-wide text-white/85"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reduce ? 0.1 : T.slogan, duration: 0.4 }}>
                Stock, vendas e controlo num só lugar
            </motion.p>
        </motion.div>
    );
}
