// Os guias da app. Cada passo aponta para um elemento com `data-tour="…"` (ver o componente da página).
// Se o elemento não estiver no ecrã, o balão aparece ao centro e a pessoa pode seguir — um guia nunca encrava.
import type { Guide, GuideStep } from "./types";
import { appears, disappears } from "./types";
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
        done: () => appears("pos-result")() || appears("pos-cart-line")(),
        hint: "Escreva aqui",
        title: "1. Procure o produto",
        body: <>Uma venda a fingir, para aprender: os produtos são <b>de exemplo</b> e <b>nada é gravado</b>. Escreva o que o cliente leva — experimente <b>cimento</b>.</>,
    },
    {
        route: DEMO,
        target: "pos-result|pos-favourite",
        advance: "auto",
        done: appears("pos-cart-line"),
        hint: "Toque no produto",
        title: "2. Toque no produto",
        body: <>Toque no produto para o pôr no carrinho. <br />Dica: pode escrever logo a quantidade — <b>cimento x 10</b> — e carregar em Enter.</>,
    },
    {
        route: DEMO,
        target: "pos-qty",
        title: "3. Quantidade e preço",
        body: <>Use <b>−</b> e <b>+</b>, ou toque no número e escreva. O <b>preço</b> vem do catálogo e pode mudá-lo numa venda especial (o gestor é avisado).</>,
    },
    {
        route: DEMO,
        target: "pos-payment|pos-pickup",
        title: "4. Cliente e pagamento",
        body: <>O <b>cliente</b> é opcional (só é obrigatório quando fica a dever). <b>Levou agora</b> tira do stock já; <b>levanta depois</b> deixa reservado. Escolha como pagou e quanto recebeu: a app regista a dívida ou mostra o troco.</>,
    },
    {
        route: DEMO,
        target: "pos-confirm",
        advance: "auto",
        done: appears("pos-demo-done"),
        hint: "Toque em Confirmar",
        title: "5. Confirme a venda",
        body: <>Confira o total e toque em <b>Confirmar</b>. Em <b>Mais opções</b> escolhe o documento (factura, recibo, guia, proforma), um desconto, uma nota e a data.</>,
    },
    closing,
];

const vendaDemo: Guide = {
    id: "venda-demo",
    title: "Venda de demonstração",
    steps: demoSteps({
        route: DEMO,
        target: "pos-demo-done",
        title: "Venda feita! 🎉",
        body: <>É sempre assim. Numa venda a sério o stock desce sozinho e o documento fica pronto a imprimir ou enviar. <br />Próximo passo: dar entrada do <b>stock</b> dos seus produtos no <b>Stock Rápido</b> — depois já pode vender a sério.</>,
        cta: { label: "Abrir o Stock Rápido", href: "/inventory/quick?modo=entrada" },
    }),
};

// ---------------------------------------------------------------------------------------------
// Catálogo: adicionar e editar um produto (este é a sério)
// ---------------------------------------------------------------------------------------------
const catalogo: Guide = {
    id: "catalogo",
    title: "O seu catálogo",
    // primeiro os produtos; depois mostra-se como se vende (demonstração, nada é gravado)
    next: "venda-demo",
    steps: [
        {
            route: "/catalog",
            target: "catalog-new",
            advance: "auto",
            done: appears("catalog-form"),
            hint: "Toque em Novo produto",
            title: "Novo produto",
            body: <>Aqui fica tudo o que vende. Vamos adicionar <b>um produto seu, a sério</b> — este fica gravado. Toque em <b>Novo produto</b>.</>,
        },
        { target: "catalog-f-name", title: "Nome e categoria", body: <>Escreva o nome como o diz ao cliente, por exemplo <b>Cimento 32,5N</b>, e escolha a <b>categoria</b> (Cimentos, Blocos, Tintas…).</> },
        { target: "catalog-f-price", title: "Preço, unidade e custo", body: <>O <b>preço de venda</b> e a <b>unidade</b> (saco, m³, lata…). Com o <b>custo</b>, a app calcula a margem e o lucro.</> },
        { target: "catalog-f-variants", title: "O resto é opcional", body: <><b>Foto</b>, <b>código de barras</b>, <b>alertas</b> de stock baixo e <b>variações</b> (cores, texturas, tamanhos), cada uma com o seu stock e preço.</> },
        {
            target: "catalog-f-submit",
            advance: "auto",
            done: disappears("catalog-form"),
            hint: "Toque em Adicionar",
            title: "Guarde",
            body: <>Com pelo menos o nome e o preço, toque em <b>Adicionar ao Catálogo</b>. O produto passa a aparecer nas vendas e no stock.</>,
        },
        {
            route: "/catalog",
            target: "catalog-row-open",
            advance: "auto",
            done: appears("catalog-detail"),
            hint: "Toque num produto",
            title: "Ver e editar",
            body: <>Toque num produto para abrir a <b>ficha</b>.</>,
        },
        {
            target: "catalog-detail-edit|catalog-detail",
            title: "A ficha ✅",
            body: (
                <>
                    <p>Preço, custo e margem, o stock em cada local e as últimas vendas. Toque em <b>Editar</b> para mudar o que precisar — cada mudança de preço fica no histórico.</p>
                    <p>A seguir mostramos <b>como se vende</b>, com produtos de exemplo — <b>nada é gravado</b>.</p>
                </>
            ),
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
    [vendaDemo, catalogo, paginaPos, ...PAGE_GUIDES].map((g) => [g.id, g]),
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
