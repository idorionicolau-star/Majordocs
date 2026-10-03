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
        target: "pos-demo-banner",
        title: "Uma venda a fingir, para aprender",
        body: <>Vamos fazer uma venda completa, passo a passo. Os produtos são <b>de exemplo</b> e <b>nada é gravado</b> — nem venda, nem stock. Pode errar à vontade.</>,
    },
    {
        route: DEMO,
        target: "pos-search",
        advance: "auto",
        done: () => appears("pos-result")() || appears("pos-cart-line")(),
        hint: "Escreva aqui",
        title: "1. Procure o produto",
        body: <>Escreva o nome do que o cliente leva. Experimente escrever <b>cimento</b>.</>,
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
        title: "3. A quantidade",
        body: <>Use <b>−</b> e <b>+</b>, ou toque no número e escreva. Por cima vê quanto há disponível e quanto fica depois da venda.</>,
    },
    {
        route: DEMO,
        target: "pos-price",
        title: "4. O preço",
        body: <>Vem do catálogo. Se fizer um preço especial, mude-o aqui. Quando um funcionário muda o preço, o gestor é avisado para confirmar.</>,
    },
    {
        route: DEMO,
        target: "pos-client",
        title: "5. O cliente (opcional)",
        body: <>Escreva o nome se quiser o cliente no documento. Só é obrigatório quando ele fica a dever.</>,
    },
    {
        route: DEMO,
        target: "pos-pickup",
        title: "6. Levou agora ou levanta depois?",
        body: <><b>Levou agora</b> tira do stock já. <b>Levanta depois</b> deixa a mercadoria reservada até o cliente a vir buscar.</>,
    },
    {
        route: DEMO,
        target: "pos-payment",
        title: "7. O pagamento",
        body: <>Escolha como pagou (numerário, M-Pesa, e-Mola…) e quanto recebeu. Se pagar menos, a app regista a dívida; se pagar a mais, mostra o troco.</>,
    },
    {
        route: DEMO,
        target: "pos-date",
        title: "8. A data",
        body: <>Por defeito é hoje. Esqueceu-se de registar as vendas de ontem? Mude a data e registe-as agora.</>,
    },
    {
        route: DEMO,
        target: "pos-more",
        title: "9. Mais opções",
        body: <>Aqui escolhe o <b>documento</b> (venda a dinheiro, factura, recibo, guia de remessa ou proforma), um <b>desconto</b> e uma <b>nota</b>.</>,
    },
    {
        route: DEMO,
        target: "pos-confirm",
        advance: "auto",
        done: appears("pos-demo-done"),
        hint: "Toque em Confirmar",
        title: "10. Confirme a venda",
        body: <>Confira o total em baixo e toque em <b>Confirmar</b>.</>,
    },
    closing,
];

const vendaDemo: Guide = {
    id: "venda-demo",
    title: "Venda de demonstração",
    next: "catalogo",
    steps: demoSteps({
        route: DEMO,
        target: "pos-demo-done",
        title: "Venda feita! 🎉",
        body: <>É sempre assim. Numa venda a sério o stock desce sozinho e o documento fica pronto a imprimir ou enviar. <br />A seguir: o <b>catálogo</b>, onde põe os <b>seus</b> produtos.</>,
    }),
};

// ---------------------------------------------------------------------------------------------
// Catálogo: adicionar e editar um produto (este é a sério)
// ---------------------------------------------------------------------------------------------
const catalogo: Guide = {
    id: "catalogo",
    title: "O seu catálogo",
    steps: [
        {
            route: "/catalog",
            title: "O seu catálogo",
            body: <>Aqui fica tudo o que vende: nome, preço, custo, foto e código de barras. Vamos adicionar <b>um produto seu, a sério</b> — este fica gravado.</>,
        },
        {
            route: "/catalog",
            target: "catalog-new",
            advance: "auto",
            done: appears("catalog-form"),
            hint: "Toque em Novo produto",
            title: "Novo produto",
            body: <>Toque aqui para adicionar um produto.</>,
        },
        { target: "catalog-f-category", title: "Categoria", body: <>O tipo de produto (Cimentos, Blocos, Tintas…). Ajuda a encontrar e a ver os relatórios por categoria.</> },
        { target: "catalog-f-name", title: "Nome", body: <>Escreva o nome como o diz ao cliente, por exemplo <b>Cimento 32,5N</b>. A app avisa se já existir um parecido.</> },
        { target: "catalog-f-photo", title: "Foto (opcional)", body: <>Uma foto ajuda quem vende a não se enganar no produto. Pode tirar com a câmara.</> },
        { target: "catalog-f-price", title: "Preço e unidade", body: <>O <b>preço de venda</b> e a <b>unidade</b> (saco, m³, metro, lata…).</> },
        { target: "catalog-f-cost", title: "Custo e código de barras", body: <>Com o <b>custo</b>, a app calcula a margem e o lucro. O <b>código de barras</b> pode ser lido com a câmara do telemóvel ou com um leitor.</> },
        { target: "catalog-f-alerts", title: "Alertas de stock", body: <>Quando o stock descer abaixo destes números, a app avisa: primeiro <b>baixo</b>, depois <b>crítico</b>.</> },
        { target: "catalog-f-variants", title: "Variações", body: <>O produto tem cores, texturas ou tamanhos? Ligue aqui e crie todas as variações de uma vez, cada uma com o seu stock e preço.</> },
        {
            target: "catalog-f-submit",
            advance: "auto",
            done: disappears("catalog-form"),
            hint: "Toque em Adicionar",
            title: "Guarde",
            body: <>Preencha pelo menos o nome e o preço e toque em <b>Adicionar ao Catálogo</b>. O produto passa a aparecer nas vendas, encomendas e no stock.</>,
        },
        {
            route: "/catalog",
            target: "catalog-row-open",
            advance: "auto",
            done: appears("catalog-detail"),
            hint: "Toque num produto",
            title: "Editar um produto",
            body: <>Para ver ou mudar um produto, toque nele para abrir a <b>ficha</b>.</>,
        },
        { target: "catalog-detail", title: "A ficha do produto", body: <>Preço, custo e margem, quanto há em cada local, as últimas vendas e o histórico de preços — tudo num sítio.</> },
        {
            target: "catalog-detail-edit",
            advance: "auto",
            done: appears("catalog-edit-form"),
            hint: "Toque em Editar",
            title: "Editar",
            body: <>Toque em <b>Editar</b> para mudar o nome, preço, foto ou código. Ao lado pode criar variações, duplicar ou apagar.</>,
        },
        { target: "catalog-edit-form", title: "Mude e guarde", body: <>Altere o que precisar e toque em <b>Salvar Alterações</b>. Cada mudança de preço fica guardada no histórico.</> },
        {
            title: "Já sabe usar o catálogo ✅",
            body: (
                <>
                    <p>No catálogo também pode <b>importar</b> uma lista do Excel, organizar as <b>categorias</b> e selecionar vários produtos para mudar o preço de uma vez.</p>
                    <p>Próximo passo: dar entrada do stock no <b>Stock Rápido</b>, para poder vender os seus produtos.</p>
                </>
            ),
            cta: { label: "Ver o Stock Rápido", guide: "pagina-stock-rapido" },
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
