// Talão de venda para impressoras térmicas (58 ou 80 mm). O documento A4 (downloadSaleDocument) saía minúsculo e
// ilegível nestas impressoras. Aqui o papel tem a largura real (@page), letra de talão, só preto, e todos os textos
// escapados (nomes de produtos e clientes vêm de quem os escreve).
import type { Company, Sale } from "./types";
import { formatCurrency } from "./utils";

export type ReceiptWidth = 58 | 80;

export type ReceiptModel = {
    title: string;
    number: string;
    provisional: boolean;
    quote: boolean;
    date: string;
    seller: string;
    client: string;
    payment?: string;
    status: string;
    lines: { name: string; qty: string; price: number; subtotal: number }[];
    subtotal: number;
    discount: number;
    vat: number;
    total: number;
    paid: number;
    due: number;
    company: { name: string; taxId?: string; phone?: string; address?: string };
    footer: string;
};

const TITLES: Record<string, string> = {
    "Factura Proforma": "Orçamento", "Cotação": "Cotação", "Venda a Dinheiro": "Venda a Dinheiro",
    "Guia de Remessa": "Guia de Remessa", "Recibo": "Recibo",
};

const fmtDate = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const p = (n: number) => String(n).padStart(2, "0");
    return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

/** Os dados do talão: todos os artigos com o mesmo número de guia formam uma venda. */
export function receiptModel(sales: Sale[], company: Company | null): ReceiptModel {
    const s = sales[0];
    const quote = s.documentType === "Factura Proforma" || s.documentType === "Cotação";
    const subtotal = sales.reduce((t, x) => t + (x.subtotal || 0), 0);
    const discount = sales.reduce((t, x) => t + (x.discount || 0), 0);
    const vat = sales.reduce((t, x) => t + (x.vat || 0), 0);
    const total = subtotal - discount + vat;
    const paid = quote ? 0 : sales.reduce((t, x) => t + (x.amountPaid ?? x.totalValue ?? 0), 0);
    return {
        title: TITLES[s.documentType] || "Factura",
        number: s.guideNumber,
        provisional: sales.some((x) => x.offlinePending),
        quote,
        date: fmtDate(s.date),
        seller: s.soldBy || "",
        client: s.clientName || "Consumidor final",
        payment: quote ? undefined : s.paymentMethod,
        status: quote ? "" : sales.every((x) => x.status === "Levantado") ? "Levantado" : "Por levantar",
        lines: sales.map((x) => ({ name: x.productName, qty: `${x.quantity} ${x.unit || "un"}`, price: x.unitPrice, subtotal: x.subtotal })),
        subtotal, discount, vat, total,
        paid: Math.min(paid, total),
        due: quote ? 0 : Math.max(0, Math.round((total - paid) * 100) / 100),
        company: { name: company?.name || "MajorStockX", taxId: company?.taxId, phone: company?.phone, address: company?.address },
        footer: company?.documentFooterNote?.trim() || "Obrigado pela preferência!",
    };
}

const esc = (v: unknown) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const money = (n: number) => esc(formatCurrency(n));
/** nas linhas dos artigos só o número (como nos talões de caixa): cabe nos 58 mm; os totais levam a moeda */
const amount = (n: number) => esc(formatCurrency(n).replace(/\s*(MTn|MZN|MT)\s*$/u, ""));

/** O talão em HTML, com o papel à largura certa. `actions` acrescenta os botões (escondidos ao imprimir). */
export function receiptHtml(m: ReceiptModel, width: ReceiptWidth, actions = ""): string {
    // área útil: 58 mm imprime ~48 mm; 80 mm imprime ~72 mm
    const area = width === 58 ? 48 : 72;
    const font = width === 58 ? 11 : 12.5;
    const row = (l: string, r: string, cls = "") => `<div class="row ${cls}"><span>${l}</span><span>${r}</span></div>`;
    const lines = m.lines.map((l) => `<div class="item"><div class="name">${esc(l.name)}</div>${row(`${esc(l.qty)} × ${amount(l.price)}`, amount(l.subtotal))}</div>`).join("");
    return `<!doctype html><html lang="pt"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(m.title)} ${esc(m.number)}</title>
<style id="msx-page">@page{size:${width}mm 200mm;margin:0}</style>
<style>
*{box-sizing:border-box}
html,body{margin:0;background:#e5e5e5;color:#000}
.paper{width:${width}mm;margin:12px auto 96px;background:#fff;padding:3mm ${(width - area) / 2}mm;font:${font}px/1.35 "Courier New",ui-monospace,monospace}
.c{text-align:center}.b{font-weight:700}.big{font-size:1.25em}
.sep{border-top:1px dashed #000;margin:2mm 0}
.row{display:flex;justify-content:space-between;gap:2mm}.row span:last-child{text-align:right;white-space:nowrap}
.item{margin:1mm 0}.name{word-break:break-word}
.total{font-size:1.3em;font-weight:700}
.warn{border:1px solid #000;padding:1mm;margin:1mm 0;text-align:center;font-weight:700}
.actions{position:fixed;left:0;right:0;bottom:0;display:flex;gap:8px;justify-content:center;padding:12px;background:#fff;border-top:1px solid #ddd;font-family:system-ui,sans-serif}
.actions button{padding:12px 20px;border-radius:8px;border:1px solid #ccc;background:#f4f4f5;font-size:15px;font-weight:600}
.actions .print{background:#000;color:#fff;border-color:#000}
@media print{html,body{background:#fff}.paper{margin:0}.actions{display:none!important}}
</style></head><body><div class="paper">
<div class="c b big">${esc(m.company.name)}</div>
${m.company.taxId ? `<div class="c">NUIT ${esc(m.company.taxId)}</div>` : ""}
${m.company.address ? `<div class="c">${esc(m.company.address)}</div>` : ""}
${m.company.phone ? `<div class="c">Tel. ${esc(m.company.phone)}</div>` : ""}
<div class="sep"></div>
<div class="c b">${esc(m.title)}</div>
<div class="c b">N.º ${esc(m.number)}</div>
${m.provisional ? `<div class="warn">PROVISÓRIO — SEM INTERNET</div>` : ""}
${m.quote ? `<div class="warn">ORÇAMENTO — NÃO É FACTURA</div>` : ""}
${row("Data", esc(m.date))}
${row("Cliente", esc(m.client))}
${m.seller ? row("Operador", esc(m.seller)) : ""}
<div class="sep"></div>
${lines}
<div class="sep"></div>
${row("Subtotal", money(m.subtotal))}
${m.discount > 0 ? row("Desconto", "-" + money(m.discount)) : ""}
${m.vat > 0 ? row("IVA", money(m.vat)) : ""}
${row("TOTAL", money(m.total), "total")}
${m.payment ? row("Pagamento", esc(m.payment)) : ""}
${!m.quote && m.due > 0 ? row("Pago", money(m.paid)) + row("Em dívida", money(m.due), "b") : ""}
${m.status ? row("Estado", esc(m.status)) : ""}
<div class="sep"></div>
<div class="c">${esc(m.footer)}</div>
<div class="c" style="font-size:.85em;margin-top:1mm">Processado por MajorStockX</div>
</div>${actions}
<script>
// o papel tem o comprimento do talão: "${width}mm auto" não é aceite pelos navegadores, e uma folha fixa deixava
// papel em branco no rolo. Mede-se o talão (a ${width} mm, igual no ecrã e na impressão) e acerta-se o @page.
(function(){var p=document.querySelector('.paper'),s=document.getElementById('msx-page');function fit(){var mm=Math.ceil(p.getBoundingClientRect().height*25.4/96)+2;s.textContent='@page{size:${width}mm '+mm+'mm;margin:0}'}fit();if(document.fonts&&document.fonts.ready)document.fonts.ready.then(fit);window.addEventListener('beforeprint',fit)})();
</script></body></html>`;
}
