// Ecrã "A carregar aplicação…": uma forma que se transforma noutra (círculo, triângulo, quadrado, pentágono,
// hexágono, estrela, losango e outra vez círculo), a rodar, com faíscas a cada transformação.
// Só CSS, sem JavaScript: aparece quando o telemóvel está mais ocupado a carregar a app, e o CSS continua fluido.

type Pt = [number, number];

/** pontos por forma: todas têm o mesmo número, para o navegador poder transformar uma na outra */
const N = 120;
const R = 46; // raio, em % da caixa (o centro está em 50%)

/** Distância do centro à borda de um polígono, na direcção do ângulo a (o polígono tem de "ver" o centro). */
function rayToPolygon(vertices: Pt[], a: number): number {
    const dx = Math.cos(a), dy = Math.sin(a);
    let best = Infinity;
    for (let i = 0; i < vertices.length; i++) {
        const [x1, y1] = vertices[i], [x2, y2] = vertices[(i + 1) % vertices.length];
        const ex = x2 - x1, ey = y2 - y1;
        const den = dx * ey - dy * ex;
        if (Math.abs(den) < 1e-9) continue;
        const t = (x1 * ey - y1 * ex) / den; // distância ao longo do raio
        const u = (x1 * dy - y1 * dx) / den; // posição ao longo da aresta
        if (t > 0 && u >= -1e-9 && u <= 1 + 1e-9) best = Math.min(best, t);
    }
    return best;
}

const regular = (sides: number, r = R, start = -Math.PI / 2): Pt[] =>
    Array.from({ length: sides }, (_, k) => { const a = start + (2 * Math.PI * k) / sides; return [r * Math.cos(a), r * Math.sin(a)]; });
const star = (points: number, outer: number, inner: number): Pt[] =>
    Array.from({ length: points * 2 }, (_, k) => { const a = -Math.PI / 2 + (Math.PI * k) / points; const r = k % 2 ? inner : outer; return [r * Math.cos(a), r * Math.sin(a)]; });

/** clip-path de uma forma, amostrada em N direcções a partir do centro */
function shape(radius: (a: number) => number): string {
    const pts = Array.from({ length: N }, (_, k) => {
        const a = -Math.PI / 2 + (2 * Math.PI * k) / N;
        const r = radius(a);
        return `${(50 + r * Math.cos(a)).toFixed(1)}% ${(50 + r * Math.sin(a)).toFixed(1)}%`;
    });
    return `polygon(${pts.join(",")})`;
}
const poly = (v: Pt[]) => shape((a) => rayToPolygon(v, a));

const SHAPES = [
    { clip: shape(() => R * 0.92), color: "rgb(57,146,254)" }, // círculo, azul
    { clip: poly(regular(3, R * 1.05, -Math.PI / 2).map(([x, y]) => [x, y + 6] as Pt)), color: "rgb(248,173,0)" }, // triângulo, âmbar
    { clip: poly([[-R * 0.8, -R * 0.8], [R * 0.8, -R * 0.8], [R * 0.8, R * 0.8], [-R * 0.8, R * 0.8]]), color: "rgb(225,51,51)" }, // quadrado, vermelho
    { clip: poly(regular(5, R, -Math.PI / 2)), color: "rgb(124,108,174)" }, // pentágono, roxo
    { clip: poly(regular(6, R * 0.97, -Math.PI / 2)), color: "rgb(234,118,22)" }, // hexágono, laranja
    { clip: poly(star(5, R * 1.05, R * 0.45)), color: "rgb(245,158,11)" }, // estrela, dourado
    { clip: poly([[0, -R * 1.02], [R * 0.68, 0], [0, R * 1.02], [-R * 0.68, 0]]), color: "rgb(209,60,70)" }, // losango, carmim
];

const STEP = 0.55; // segundos por transformação
const CYCLE = STEP * SHAPES.length;
const EASE = "cubic-bezier(0.65, 0, 0.35, 1)"; // acelera e trava: nada linear
const pct = (k: number) => `${((k / SHAPES.length) * 100).toFixed(3)}%`;

const morph = SHAPES.map((s, k) => `${pct(k)}{clip-path:${s.clip};background-color:${s.color};animation-timing-function:${EASE}}`).join("")
    + `100%{clip-path:${SHAPES[0].clip};background-color:${SHAPES[0].color}}`;
// roda sempre para o mesmo lado: 2 voltas por ciclo, para o fim bater certo com o início
const spin = SHAPES.map((_, k) => `${pct(k)}{transform:rotate(${((720 * k) / SHAPES.length).toFixed(2)}deg);animation-timing-function:${EASE}}`).join("")
    + "100%{transform:rotate(720deg)}";

// faíscas: a cada transformação, cada faísca sai do centro numa direcção diferente e apaga-se
const SPARKS = 12;
const SPARK_COLORS = ["rgb(248,173,0)", "rgb(225,51,51)", "rgb(124,108,174)", "rgb(57,146,254)"];
const sparkFrames = (i: number) => {
    const frames: string[] = ["0%{opacity:0;transform:translate(0,0) scale(.4)}"];
    SHAPES.forEach((_, b) => {
        const t = (b / SHAPES.length) * 100, span = (STEP / CYCLE) * 100;
        // nasce na borda da forma e voa para fora
        const a = ((i * (360 / SPARKS) + b * 23) * Math.PI) / 180, d = 44 + ((i * 7 + b * 11) % 18);
        const at = (r: number) => `translate(${(r * Math.cos(a)).toFixed(1)}px,${(r * Math.sin(a)).toFixed(1)}px)`;
        frames.push(`${(t + 0.01).toFixed(3)}%{opacity:0;transform:${at(24)} scale(.4)}`);
        frames.push(`${(t + span * 0.12).toFixed(3)}%{opacity:1;transform:${at(32)} scale(1)}`);
        frames.push(`${(t + span * 0.75).toFixed(3)}%{opacity:0;transform:${at(d)} scale(.3)}`);
    });
    frames.push("100%{opacity:0;transform:translate(0,0) scale(.4)}");
    return `@keyframes msx-spark-${i}{${frames.join("")}}`;
};

export const LOADER_CSS = `
@keyframes msx-morph{${morph}}
@keyframes msx-spin{${spin}}
${Array.from({ length: SPARKS }, (_, i) => sparkFrames(i)).join("\n")}
.msx-loader{position:relative;width:128px;height:128px}
.msx-loader-spin{position:absolute;inset:30px;animation:msx-spin ${CYCLE}s infinite;will-change:transform}
.msx-loader-shape{width:100%;height:100%;animation:msx-morph ${CYCLE}s infinite}
.msx-loader-spark{position:absolute;left:61.5px;top:61.5px;width:5px;height:5px;border-radius:50%;opacity:0;will-change:transform,opacity}
${Array.from({ length: SPARKS }, (_, i) => `.msx-loader-spark:nth-child(${i + 2}){background:${SPARK_COLORS[i % SPARK_COLORS.length]};animation:msx-spark-${i} ${CYCLE}s infinite ease-out}`).join("\n")}
`;

export function AppLoader({ label = "A carregar aplicação..." }: { label?: string }) {
    return (
        <div className="flex flex-col items-center gap-3" role="status" aria-label={label}>
            <style dangerouslySetInnerHTML={{ __html: LOADER_CSS }} />
            <div className="msx-loader" aria-hidden>
                <div className="msx-loader-spin"><div className="msx-loader-shape" /></div>
                {Array.from({ length: SPARKS }, (_, i) => <span key={i} className="msx-loader-spark" />)}
            </div>
            <p className="text-sm text-muted-foreground">{label}</p>
        </div>
    );
}
