"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { LOGO_MAJOR, LOGO_STOCKX } from "./intro-logo";

/**
 * Animação de entrada (uma vez por sessão, cerca de 4 s). As quatro cores do logótipo são os quatro pilares da app:
 * Stock (laranja), Vendas (vermelho), Gestão (roxo) e Controlo (azul). Cada um entra com o seu símbolo,
 * juntam-se ao centro e misturam-se no círculo do MajorStockX; depois "Major" e "StockX" aparecem à frente e recuam para o lugar.
 *
 * O ecrã vem já no HTML do servidor (sem "piscar" a app por baixo); o script em `INTRO_GATE` decide antes da
 * primeira pintura se é para mostrar. Um toque salta a animação; quem pede menos movimento vê só o logótipo.
 */

const KEY = "msx-intro";
/** Corre antes da primeira pintura: esconde a entrada se já foi vista nesta sessão, em testes automáticos ou nas páginas legais. */
export const INTRO_GATE = `try{var q=/[?&]intro=1/.test(location.search);if(!q&&(sessionStorage.getItem('${KEY}')||navigator.webdriver||/^\\/(privacidade|termos)/.test(location.pathname)))document.documentElement.dataset.intro='skip'}catch(e){document.documentElement.dataset.intro='skip'}`;

const ORANGE = "rgb(244,150,9)", RED = "rgb(225,51,51)", PURPLE = "rgb(117,112,182)", BLUE = "rgb(89,128,216)";

// momentos da animação (segundos)
const T = { stock: 0.2, sales: 0.75, manage: 1.3, control: 1.85, merge: 2.6, logo: 3.1, word2: 3.8, shine: 4.55, slogan: 4.6, out: 5.35 };
/** cada palavra: a onda revela-a à frente (um pouco fora do círculo), cresce devagar, recua de repente e assenta */
const WORD_TIME = 0.85;
const ZOOM = [1.3, 1.38, 0.96, 1];
/** intervalo entre letras na onda */
const WAVE = 0.045;
/** as duas palavras: letras, quando começam, centro, linha de base e largura (coordenadas do logótipo) */
const WORDS = [
    { glyphs: LOGO_MAJOR, at: T.logo, cx: 188, base: 179, w: 265 },
    { glyphs: LOGO_STOCKX, at: T.word2, cx: 187, base: 273, w: 330 },
];

/** quando cada palavra assenta no lugar */
const LANDS = WORDS.map((w) => w.at + WORD_TIME * 0.82);
const BURSTS = WORDS.map((w, i) => ({ at: LANDS[i], cx: w.cx, y: w.base, w: w.w }));

/** O tremor do logótipo quando cada palavra assenta ("drrr"): curto, a perder força, sem ser violento. */
const SHAKE_X = [0, -4, 3.6, -3, 2.3, -1.6, 0.9, -0.4, 0];
const SHAKE_Y = [0, 2.2, -2, 1.6, -1.2, 0.8, -0.5, 0.2, 0];
const SHAKE_R = [0, -0.6, 0.5, -0.4, 0.3, -0.2, 0.1, 0, 0];
const SHAKE_TIME = 0.42;
const SHAKE = (() => {
    const start = LANDS[0], total = LANDS[LANDS.length - 1] + SHAKE_TIME - start;
    const times: number[] = [], x: number[] = [], y: number[] = [], rotate: number[] = [];
    LANDS.forEach((l) => SHAKE_X.forEach((_, k) => {
        times.push((l - start + (k * SHAKE_TIME) / (SHAKE_X.length - 1)) / total);
        x.push(SHAKE_X[k]); y.push(SHAKE_Y[k]); rotate.push(SHAKE_R[k]);
    }));
    return { animate: { x, y, rotate }, transition: { delay: start, duration: total, times, ease: "easeInOut" as const } };
})();

/**
 * Poeira fina de verdade: centenas de grãos brancos e acinzentados saem de debaixo da palavra, travam no ar,
 * sobem devagar e dissipam-se, com nuvens suaves por trás. Desenhada num canvas (leve mesmo em telemóveis fracos).
 */
function DustCanvas() {
    const ref = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        const c = ref.current, ctx = c?.getContext("2d");
        if (!c || !ctx) return;
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const box = c.getBoundingClientRect();
        c.width = box.width * dpr; c.height = box.height * dpr;
        // o canvas cobre 140% do palco; o logótipo (375 × 375) ocupa 76% do palco, a 12% da borda
        const S = ((0.76 / 1.4) * c.width) / 375, O = (0.32 / 1.4) * c.width;
        type Grain = { x: number; y: number; vx: number; vy: number; r: number; a: number; life: number; age: number; grey: boolean; cloud: boolean; seed: number };
        const grains: Grain[] = [];
        let seed = 7;
        const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
        const spawn = (b: (typeof BURSTS)[number]) => {
            const bx = O + b.cx * S, by = O + b.y * S, half = (b.w * S) / 2;
            for (let i = 0; i < 280; i++) {
                const u = rnd() * 2 - 1; // onde sai ao longo da palavra: -1 à esquerda, 1 à direita
                const side = u < 0 ? -1 : 1;
                const speed = (40 + rnd() * 170) * dpr * (0.35 + Math.abs(u));
                grains.push({
                    x: bx + u * half, y: by + (rnd() - 0.6) * 6 * dpr,
                    vx: side * speed * (0.6 + rnd() * 0.6) + (rnd() - 0.5) * 30 * dpr, vy: -(8 + rnd() * 70) * dpr,
                    r: (0.35 + rnd() ** 2 * 1.3) * dpr, a: 0.25 + rnd() * 0.6, life: 0.7 + rnd() * 1.1, age: 0,
                    grey: rnd() < 0.35, cloud: false, seed: rnd() * 10,
                });
            }
            for (let i = 0; i < 14; i++) {
                const u = rnd() * 2 - 1, side = u < 0 ? -1 : 1;
                grains.push({ x: bx + u * half * 0.9, y: by, vx: side * (20 + rnd() * 50) * dpr, vy: -(5 + rnd() * 20) * dpr, r: (8 + rnd() * 10) * dpr, a: 0.1 + rnd() * 0.1, life: 0.9 + rnd() * 0.6, age: 0, grey: false, cloud: true, seed: 0 });
            }
        };
        const fired = BURSTS.map(() => false);
        const end = LANDS[LANDS.length - 1] + 2.5;
        const t0 = performance.now();
        let last = t0, raf = 0;
        const frame = (now: number) => {
            const t = (now - t0) / 1000, dt = Math.min(0.05, (now - last) / 1000);
            last = now;
            BURSTS.forEach((b, i) => { if (!fired[i] && t >= b.at) { fired[i] = true; spawn(b); } });
            ctx.clearRect(0, 0, c.width, c.height);
            for (let i = grains.length - 1; i >= 0; i--) {
                const g = grains[i];
                g.age += dt;
                if (g.age >= g.life) { grains.splice(i, 1); continue; }
                const drag = Math.exp(-(g.cloud ? 2.5 : 3.2) * dt);
                g.vx = g.vx * drag + Math.sin(t * 4 + g.seed) * 10 * dpr * dt; // trava no ar, com um pouco de turbulência
                g.vy = g.vy * drag - 14 * dpr * dt; // e sobe devagar
                g.x += g.vx * dt; g.y += g.vy * dt;
                const k = g.age / g.life, fade = k < 0.12 ? k / 0.12 : 1 - (k - 0.12) / 0.88;
                ctx.beginPath();
                if (g.cloud) {
                    const r = g.r * (1 + k * 1.6);
                    const grad = ctx.createRadialGradient(g.x, g.y, 0, g.x, g.y, r);
                    grad.addColorStop(0, `rgba(235,235,240,${g.a * fade})`);
                    grad.addColorStop(1, "rgba(235,235,240,0)");
                    ctx.fillStyle = grad;
                    ctx.arc(g.x, g.y, r, 0, Math.PI * 2);
                } else {
                    ctx.fillStyle = g.grey ? `rgba(200,200,208,${g.a * fade})` : `rgba(255,255,255,${g.a * fade})`;
                    ctx.arc(g.x, g.y, g.r, 0, Math.PI * 2);
                }
                ctx.fill();
            }
            if (t < end) raf = requestAnimationFrame(frame);
        };
        raf = requestAnimationFrame(frame);
        return () => cancelAnimationFrame(raf);
    }, []);
    return <canvas ref={ref} className="pointer-events-none absolute" style={{ left: "-20%", top: "-20%", width: "140%", height: "140%" }} aria-hidden />;
}
/** o degradê do círculo do logótipo (laranja em baixo à esquerda, azul em cima à direita) */
const LOGO_GRADIENT = "linear-gradient(45deg, rgb(248,173,0) 15%, rgb(225,51,51) 50%, rgb(124,108,174) 72%, rgb(57,146,254) 85%)";
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
                {/* tudo o que treme quando as palavras assentam */}
                <motion.div className="absolute inset-0" {...(reduce ? {} : SHAKE)}>
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

                    {/* o círculo assenta nas cores exactas do logótipo */}
                    <motion.div className="absolute inset-[12%] rounded-full" style={{ background: LOGO_GRADIENT }}
                        initial={{ opacity: reduce ? 1 : 0 }} animate={{ opacity: 1 }} transition={{ delay: reduce ? 0 : T.logo - 0.1, duration: 0.5, ease: "easeInOut" }} />

                    {/* cada palavra: a onda revela-a grande à frente, segura, e recua ("voom") para o lugar, levantando poeira */}
                    <div className="absolute inset-[12%]">
                        <svg viewBox="0 0 375 375" className="h-full w-full overflow-visible">
                            <defs>
                                <filter id="msx-letter-shadow" x="-20%" y="-30%" width="140%" height="170%">
                                    <feDropShadow dx="0" dy="5" stdDeviation="5" floodColor="#000" floodOpacity="0.28" />
                                </filter>
                            </defs>
                            {WORDS.map(({ glyphs, at }) => (
                                <g key={at}>
                                    <motion.g filter="url(#msx-letter-shadow)" style={{ originX: 0.5, originY: 0.5 }}
                                        initial={reduce ? false : { scale: ZOOM[0] }}
                                        animate={{ scale: reduce ? 1 : ZOOM }}
                                        transition={{ delay: at, duration: WORD_TIME, times: [0, 0.55, 0.82, 1], ease: ["easeOut", [0.55, 0, 1, 0.45], "easeOut"] }}>
                                        {glyphs.map((g, i) => (
                                            <g key={i} transform={`translate(${g.x} ${g.y})`}>
                                                <motion.path d={g.d} fill={g.fill}
                                                    initial={reduce ? false : { opacity: 0, y: 26 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: at + i * WAVE, duration: 0.3, ease: [0.22, 1, 0.36, 1] }} />
                                            </g>
                                        ))}
                                    </motion.g>
                                </g>
                            ))}
                        </svg>
                    </div>

                    {/* no fim, um brilho atravessa o logótipo */}
                    {!reduce && (
                        <div className="pointer-events-none absolute inset-[12%] overflow-hidden rounded-full">
                            <motion.span className="absolute inset-y-0 w-1/3 -skew-x-12" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)" }}
                                initial={{ left: "-40%" }} animate={{ left: "130%" }} transition={{ delay: T.shine, duration: 0.7, ease: "easeInOut" }} />
                        </div>
                    )}
                </motion.div>

                {/* a poeira fica fora do tremor */}
                {!reduce && <DustCanvas />}
            </div>

            <motion.p className="mt-3 px-6 text-center font-headline text-base font-medium tracking-wide text-white/85"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reduce ? 0.1 : T.slogan, duration: 0.4 }}>
                Stock, vendas e controlo num só lugar
            </motion.p>
        </motion.div>
    );
}
