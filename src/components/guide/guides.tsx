// Os guias da app. Cada passo aponta para um elemento com `data-tour="…"` (ver o componente da página).
// Se o elemento não estiver no ecrã, o balão aparece ao centro e a pessoa pode seguir — um guia nunca encrava.
import type { Guide, GuideStep } from "./types";
import { appears, disappears, filled, navStep } from "./types";
import { PAGE_GUIDES } from "./page-guides";

// ---------------------------------------------------------------------------------------------
// Venda de demonstração (produtos de exemplo, nada é gravado)
// ---------------------------------------------------------------------------------------------
const DEMO = "/pos?demo=1";

const demoSteps = (closing: GuideStep): GuideStep[] => [
    {
        route: DEMO,
        target: "pos-search",
        advance: "auto",
        // só quando a pessoa parou de escrever (com 3 letras ou mais): uma letra já mostrava resultados e o guia saltava
        done: () => appears("pos-cart-line")() || (filled("pos-search", 3)() && appears("pos-result")()),
        settle: 1500,
        hint: "Escreva aqui",
        title: "Procure o produto",
        body: <>Isto é um <b>treino</b>: os produtos são de exemplo e <b>nada é gravado</b>. Escreva o nome do que o cliente leva — experimente <b>cimento</b>.</>,
    },
    {
        route: DEMO,
        target: "pos-result|pos-favourite",
        advance: "auto",
        done: appears("pos-cart-line"),
        hint: "Toque no produto",
        title: "Toque no produto",
        body: <>Toque no <b>Cimento</b> para o pôr no carrinho.</>,
    },
    {
        route: DEMO,
        target: "pos-qty",
        title: "Quantidade",
        body: <>Use <b>−</b> e <b>+</b>, ou toque no número e escreva. O preço vem do catálogo.</>,
    },
    {
        route: DEMO,
        target: "pos-payment|pos-pickup",
        title: "Pagamento",
        body: <>Por defeito: <b>pago em numerário</b> e <b>levado agora</b>. Só mude se for diferente — se o cliente ficar a dever, escreva o nome dele.</>,
    },
    {
        route: DEMO,
        target: "pos-confirm",
        advance: "auto",
        done: appears("pos-demo-done"),
        hint: "Toque em Confirmar",
        title: "Confirme",
        body: <>Confira o total e toque em <b>Confirmar</b>.</>,
    },
    closing,
];

const vendaDemo: Guide = {
    id: "venda-demo",
    title: "Venda de treino",
    next: "stock-inicial",
    steps: [
        navStep("/pos", "Venda Rápida", "Abra a Venda Rápida", <>É aqui que se vende, todos os dias. Toque em <b>Venda Rápida</b>.</>),
        ...demoSteps({
            route: DEMO,
            target: "pos-demo-done",
            title: "Já sabe vender 🎉",
            body: <>É sempre assim. Numa venda a sério o stock desce sozinho e o recibo fica pronto a imprimir ou enviar. <br />Falta só dizer <b>quanto tem em stock</b> — mostramos onde.</>,
        }),
    ],
};

// ---------------------------------------------------------------------------------------------
// Stock: a primeira entrada (a sério) — Inventário → Stock Rápido → procurar → quantidade → registar
// ---------------------------------------------------------------------------------------------
const QS = "/inventory/quick";
const stockInicial: Guide = {
    id: "stock-inicial",
    title: "O seu stock",
    steps: [
        navStep("/inventory", "Inventário", "Abra o Inventário", <>O Inventário mostra quanto tem de cada produto. Toque em <b>Inventário</b>.</>),
        {
            // sem `route`: este passo acaba precisamente por sair do Inventário (o guia pararia ao mudar de página)
            target: "inv-quick",
            advance: "auto",
            done: () => window.location.pathname === QS,
            hint: "Toque em Stock Rápido",
            title: "Stock Rápido",
            body: <>Para dar <b>entrada</b> do que chegou (ou do que já tem), toque em <b>Stock Rápido</b>.</>,
        },
        {
            route: QS,
            target: "qs-search",
            advance: "auto",
            done: () => appears("qs-panel")() || (filled("qs-search", 2)() && appears("qs-results")()),
            settle: 1500,
            hint: "Escreva aqui",
            title: "Procure o produto",
            body: <>Está em <b>Entrada</b>. Escreva o nome do produto que acabou de pôr no catálogo.</>,
        },
        {
            route: QS,
            target: "qs-results",
            advance: "auto",
            done: appears("qs-panel"),
            hint: "Toque no produto",
            title: "Toque no produto",
            body: <>Toque no seu produto.</>,
        },
        {
            route: QS,
            target: "qs-panel",
            advance: "auto",
            done: appears("qs-lot"),
            hint: "Quantidade e Adicionar",
            title: "Quantos tem?",
            body: <>Escreva a quantidade que tem (ou que chegou) e toque em <b>Adicionar</b>. Pode juntar vários produtos antes de registar.</>,
        },
        {
            route: QS,
            target: "qs-confirm",
            advance: "auto",
            done: disappears("qs-lot"),
            hint: "Toque em Confirmar entrada",
            title: "Confirme",
            body: <>Toque em <b>Confirmar entrada</b> (o botão verde). O stock sobe na hora.</>,
        },
        {
            title: "Está pronto 🎉",
            body: <>Já tem produto, sabe vender e o stock está certo. Agora é vender a sério na <b>Venda Rápida</b>. Cada página tem a sua ajuda no botão <b>?</b> lá em cima.</>,
        },
    ],
};

// ---------------------------------------------------------------------------------------------
// Catálogo: pôr o primeiro produto (este é a sério). Cada passo é fazer, não ler.
// ---------------------------------------------------------------------------------------------
const catalogo: Guide = {
    id: "catalogo",
    title: "O seu primeiro produto",
    // depois do produto, mostra-se como se vende (treino, nada é gravado)
    next: "venda-demo",
    steps: [
        navStep("/catalog", "Catálogo", "Abra o Catálogo", <>O Catálogo é a lista do que vende, com os preços. Toque em <b>Catálogo</b> no menu (no telemóvel, primeiro em <b>Mais</b>).</>),
        {
            route: "/catalog",
            target: "catalog-new",
            advance: "auto",
            done: appears("catalog-form"),
            hint: "Toque aqui",
            title: "Novo produto",
            body: <>Vamos pôr <b>um produto seu</b> — este fica gravado. Toque em <b>Novo produto</b>.</>,
        },
        {
            target: "catalog-f-name",
            advance: "auto",
            done: filled("catalog-f-name", 2),
            settle: 1500,
            hint: "Escreva o nome",
            title: "Nome",
            body: <>Escreva o nome como o diz ao cliente, por exemplo <b>Cimento 32,5N</b>.</>,
        },
        {
            target: "catalog-f-price",
            advance: "auto",
            done: filled("catalog-f-price", 1, true),
            settle: 1500,
            hint: "Escreva o preço",
            title: "Preço",
            body: <>O <b>preço de venda</b> de uma unidade (saco, lata, m²…). A unidade escolhe-se ao lado.</>,
        },
        {
            target: "catalog-f-submit",
            advance: "auto",
            done: disappears("catalog-form"),
            hint: "Toque em Adicionar",
            title: "Guarde",
            body: <>Toque em <b>Adicionar ao Catálogo</b>. Foto, custo, código de barras e variações são opcionais — pode completar depois.</>,
        },
    ],
};

// A Venda Rápida, aberta pelo botão "?" da própria página: a mesma demonstração, sem seguir para o catálogo.
const paginaPos: Guide = {
    id: "pagina-pos",
    title: "Venda Rápida",
    steps: demoSteps({
        route: DEMO,
        target: "pos-demo-done",
        title: "É assim que se vende 🎉",
        body: <>Agora já sabe. Saia da demonstração para vender a sério — os seus produtos aparecem na pesquisa e nos <b>mais vendidos</b>.</>,
        cta: { label: "Sair da demonstração", href: "/pos" },
    }),
};

export const GUIDES: Record<string, Guide> = Object.fromEntries(
    [vendaDemo, catalogo, stockInicial, paginaPos, ...PAGE_GUIDES].map((g) => [g.id, g]),
);

/** O tutorial de cada página (botão "?" e convite na primeira visita). A rota mais específica ganha. */
export const PAGE_TUTORIALS: { path: string; guide: string; title: string }[] = [
    { path: "/pos", guide: "pagina-pos", title: "Venda Rápida" },
    ...PAGE_GUIDES.filter((g) => g.path).map((g) => ({ path: g.path!, guide: g.id, title: g.title })),
];

export function tutorialFor(pathname: string): { path: string; guide: string; title: string } | undefined {
    // só a própria página (ex.: /inventory/new não herda o tutorial de /inventory)
    return PAGE_TUTORIALS.find((t) => t.path === pathname);
}
