// Relatório do fim do dia (email): contas puras, sem Firebase, para serem testadas.

type ReportSale = { productName?: string; quantity?: number; totalValue?: number; unit?: string };
type ReportProduct = {
    name?: string; location?: string; stock?: number; reservedStock?: number;
    criticalStockThreshold?: number; unit?: string; deletedAt?: string;
};
type ReportLocation = { id: string; name: string };

export type TopProduct = { name: string; quantity: number; value: number; unit?: string };
export type CriticalProduct = { name: string; location: string; available: number; threshold: number; unit?: string };

/** "" e "Principal" são o mesmo local (ver lib/product-ref.ts). */
const normLoc = (l?: string) => (!l || l === 'Principal' ? '' : l);

/** Os `n` produtos mais vendidos (por quantidade; empate: maior valor). */
export function topProducts(sales: ReportSale[], n = 3): TopProduct[] {
    const by = new Map<string, TopProduct>();
    for (const s of sales) {
        const name = String(s.productName || '').trim();
        if (!name) continue;
        const cur = by.get(name) || { name, quantity: 0, value: 0, unit: s.unit };
        cur.quantity += Number(s.quantity) || 0;
        cur.value += Number(s.totalValue) || 0;
        by.set(name, cur);
    }
    return [...by.values()]
        .filter((p) => p.quantity > 0)
        .sort((a, b) => b.quantity - a.quantity || b.value - a.value)
        .slice(0, n);
}

/**
 * Produtos em stock crítico (disponível ≤ limite crítico), juntando os documentos do mesmo produto no mesmo local.
 * Os mais em falta primeiro. O local aparece pelo nome (só quando a empresa tem vários).
 */
export function criticalProducts(products: ReportProduct[], locations: ReportLocation[] = []): CriticalProduct[] {
    const by = new Map<string, CriticalProduct & { stock: number }>();
    for (const p of products) {
        if (p.deletedAt) continue;
        const name = String(p.name || '').trim();
        if (!name) continue;
        const loc = normLoc(p.location);
        const key = `${name}\u0000${loc}`;
        const cur = by.get(key) || { name, location: loc, available: 0, stock: 0, threshold: 0, unit: p.unit };
        cur.available += (Number(p.stock) || 0) - (Number(p.reservedStock) || 0);
        cur.threshold = Math.max(cur.threshold, Number(p.criticalStockThreshold) || 0);
        by.set(key, cur);
    }
    const multi = locations.length > 1;
    const locName = (l: string) => {
        if (!multi) return '';
        if (!l) return locations[0]?.name || 'Principal';
        return locations.find((x) => x.id === l || x.name === l)?.name || l;
    };
    return [...by.values()]
        .filter((p) => p.available <= p.threshold)
        .sort((a, b) => a.available - a.threshold - (b.available - b.threshold) || a.name.localeCompare(b.name))
        .map(({ name, location, available, threshold, unit }) => ({ name, location: locName(location), available, threshold, unit }));
}

/** Texto seguro para pôr no HTML do email (nomes de produtos vêm dos utilizadores). */
export const escapeHtml = (s: string) =>
    String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
