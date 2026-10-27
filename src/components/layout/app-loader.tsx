// Ecrã "A carregar aplicação…": uma forma com o degradê do logótipo que salta como uma bola e se transforma
// noutra a cada salto (círculo, triângulo, quadrado, pentágono, hexágono, estrela, losango e outra vez círculo),
// a rodar, com faíscas quando bate no chão.
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
    shape(() => R * 0.92), // círculo
    poly(regular(3, R * 1.05, -Math.PI / 2).map(([x, y]) => [x, y + 6] as Pt)), // triângulo
    poly([[-R * 0.8, -R * 0.8], [R * 0.8, -R * 0.8], [R * 0.8, R * 0.8], [-R * 0.8, R * 0.8]]), // quadrado
    poly(regular(5, R, -Math.PI / 2)), // pentágono
    poly(regular(6, R * 0.97, -Math.PI / 2)), // hexágono
    poly(star(5, R * 1.05, R * 0.45)), // estrela
    poly([[0, -R * 1.02], [R * 0.68, 0], [0, R * 1.02], [-R * 0.68, 0]]), // losango
];

const STEP = 0.6; // segundos por salto (e por transformação)
const CYCLE = STEP * SHAPES.length;
const EASE = "cubic-bezier(0.65, 0, 0.35, 1)"; // acelera e trava: nada linear
const at = (k: number, f = 0) => `${(((k + f) / SHAPES.length) * 100).toFixed(3)}%`;

// O degradê do logótipo, grande e em espelho: cada forma mostra uma parte diferente dele, e as cores correm
// suavemente de uma forma para a outra (o início e o fim do degradê são iguais, para a volta não dar salto).
const GRADIENT = "linear-gradient(45deg,#f8ad00 0%,#e13333 22%,#7c6cae 40%,#3992fe 50%,#7c6cae 60%,#e13333 78%,#f8ad00 100%)";
// o degradê vai de baixo-esquerda para cima-direita, por isso anda-se nesse sentido: (0%, 100%) até (100%, 0%)
const slide = (k: number) => { const p = (k / SHAPES.length) * 100; return `${p.toFixed(2)}% ${(100 - p).toFixed(2)}%`; };
const morph = SHAPES.map((clip, k) => `${at(k)}{clip-path:${clip};background-position:${slide(k)};animation-timing-function:${EASE}}`).join("")
    + `100%{clip-path:${SHAPES[0]};background-position:${slide(SHAPES.length)}}`;
// roda sempre para o mesmo lado: 2 voltas por ciclo, para o fim bater certo com o início
const spin = SHAPES.map((_, k) => `${at(k)}{transform:rotate(${((720 * k) / SHAPES.length).toFixed(2)}deg);animation-timing-function:${EASE}}`).join("")
    + "100%{transform:rotate(720deg)}";

// Salta como uma bola: bate no chão e achata, estica a subir, trava lá em cima e cai a acelerar.
// A forma muda no ar (a meio do salto) e as faíscas saltam no momento em que bate no chão.
const HEIGHT = 46;
const bounce = SHAPES.map((_, k) => [
    `${at(k)}{transform:translateY(0) scale(1.2,.78);animation-timing-function:cubic-bezier(.2,.6,.4,1)}`,
    `${at(k, 0.12)}{transform:translateY(-${HEIGHT * 0.3}px) scale(.9,1.12);animation-timing-function:cubic-bezier(.25,.7,.45,1)}`,
    `${at(k, 0.5)}{transform:translateY(-${HEIGHT}px) scale(1,1);animation-timing-function:cubic-bezier(.55,0,.85,.4)}`,
    `${at(k, 0.94)}{transform:translateY(-2px) scale(.94,1.08);animation-timing-function:linear}`,
].join("")).join("") + "100%{transform:translateY(0) scale(1.2,.78)}";
// a sombra no chão: grande e escura quando a forma bate, pequena e clara lá em cima
const shadow = SHAPES.map((_, k) => `${at(k)}{transform:scale(1.15);opacity:1;animation-timing-function:ease-out}${at(k, 0.5)}{transform:scale(.5);opacity:.35;animation-timing-function:ease-in}`).join("")
    + "100%{transform:scale(1.15);opacity:1}";

// faíscas: a cada batida no chão saltam para os lados e para cima, e apagam-se
const SPARKS = 12;
const SPARK_COLORS = ["#f8ad00", "#e13333", "#7c6cae", "#3992fe"];
const sparkFrames = (i: number) => {
    const frames: string[] = ["0%{opacity:0;transform:translate(0,0) scale(.4)}"];
    SHAPES.forEach((_, b) => {
        const t = (b / SHAPES.length) * 100, span = (STEP / CYCLE) * 100;
        const deg = -165 + ((i * (150 / (SPARKS - 1)) + b * 13) % 150); // só para cima: de quase horizontal à esquerda a quase horizontal à direita
        const a = (deg * Math.PI) / 180, d = 34 + ((i * 7 + b * 11) % 22);
        const to = (r: number) => `translate(${(r * Math.cos(a)).toFixed(1)}px,${(r * Math.sin(a)).toFixed(1)}px)`;
        frames.push(`${(t + 0.01).toFixed(3)}%{opacity:0;transform:${to(8)} scale(.4)}`);
        frames.push(`${(t + span * 0.1).toFixed(3)}%{opacity:1;transform:${to(18)} scale(1)}`);
        frames.push(`${(t + span * 0.7).toFixed(3)}%{opacity:0;transform:${to(d)} scale(.3)}`);
    });
    frames.push("100%{opacity:0;transform:translate(0,0) scale(.4)}");
    return `@keyframes msx-spark-${i}{${frames.join("")}}`;
};

// medidas (px): caixa 140 × 170, o chão a 150, a forma com 68 de lado
export const LOADER_CSS = `
@keyframes msx-morph{${morph}}
@keyframes msx-spin{${spin}}
@keyframes msx-bounce{${bounce}}
@keyframes msx-shadow{${shadow}}
${Array.from({ length: SPARKS }, (_, i) => sparkFrames(i)).join("\n")}
.msx-loader{position:relative;width:140px;height:170px}
.msx-loader-shadow{position:absolute;left:40px;top:144px;width:60px;height:12px;border-radius:50%;background:radial-gradient(ellipse,rgba(0,0,0,.28),transparent 70%);animation:msx-shadow ${CYCLE}s infinite;will-change:transform,opacity}
.msx-loader-bounce{position:absolute;left:36px;top:82px;width:68px;height:68px;transform-origin:50% 100%;animation:msx-bounce ${CYCLE}s infinite;will-change:transform}
.msx-loader-spin{width:100%;height:100%;animation:msx-spin ${CYCLE}s infinite;will-change:transform}
.msx-loader-shape{width:100%;height:100%;background:${GRADIENT};background-size:300% 300%;animation:msx-morph ${CYCLE}s infinite}
.msx-loader-spark{position:absolute;left:67.5px;top:145px;width:5px;height:5px;border-radius:50%;opacity:0;will-change:transform,opacity}
${Array.from({ length: SPARKS }, (_, i) => `.msx-loader-spark:nth-child(${i + 3}){background:${SPARK_COLORS[i % SPARK_COLORS.length]};animation:msx-spark-${i} ${CYCLE}s infinite ease-out}`).join("\n")}
`;

export function AppLoader({ label = "A carregar aplicação..." }: { label?: string }) {
    return (
        <div className="flex flex-col items-center gap-1" role="status" aria-label={label}>
            <style dangerouslySetInnerHTML={{ __html: LOADER_CSS }} />
            <div className="msx-loader" aria-hidden>
                <div className="msx-loader-shadow" />
                <div className="msx-loader-bounce"><div className="msx-loader-spin"><div className="msx-loader-shape" /></div></div>
                {Array.from({ length: SPARKS }, (_, i) => <span key={i} className="msx-loader-spark" />)}
            </div>
            <p className="text-sm text-muted-foreground">{label}</p>
        </div>
    );
}
