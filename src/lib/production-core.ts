// Registar produção (página /production/new): datas, pesquisa no catálogo e "mais produzidos". Puro, testado.
import { searchProducts } from '@/lib/quick-stock';
import { groupFamilies, type FamilyGroup } from '@/lib/variants';

const DAY = 86_400_000;
/** Dia de calendário de Maputo (UTC+2) em AAAA-MM-DD. */
export const mzDay = (d: Date) => new Date(d.getTime() + 2 * 3600_000).toISOString().slice(0, 10);

/** Hoje / ontem (em Maputo). */
export const todayMz = (now = new Date()) => mzDay(now);
export const yesterdayMz = (now = new Date()) => mzDay(new Date(now.getTime() - DAY));

/** Data de produção válida: AAAA-MM-DD, não no futuro e no máximo 1 ano para trás. */
export function validProductionDate(v: string, now = new Date()): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v || '')) return false;
    const today = todayMz(now);
    const oldest = mzDay(new Date(now.getTime() - 366 * DAY));
    return v <= today && v >= oldest;
}

/** "hoje", "ontem" ou "12/10/2026". */
export function dateLabel(v: string, now = new Date()): string {
    if (v === todayMz(now)) return 'hoje';
    if (v === yesterdayMz(now)) return 'ontem';
    const [y, m, d] = v.split('-');
    return `${d}/${m}/${y}`;
}

type Cat = { name: string; variantGroup?: string; unit?: string };

/** O catálogo para escolher: com texto, a pesquisa da Venda Rápida; sem texto, tudo por ordem. Variações juntas por família. */
export function catalogChoices<T extends Cat>(catalog: T[], term: string): (T | FamilyGroup<T>)[] {
    const list = term.trim()
        ? searchProducts(catalog, term, 60)
        : [...catalog].sort((a, b) => a.name.localeCompare(b.name, 'pt', { numeric: true, sensitivity: 'base' }));
    return groupFamilies(list);
}

/** Os mais produzidos nos últimos `days` dias (por número de registos), que ainda existem no catálogo. */
export function mostProduced(productions: { productName: string; date?: string; deletedAt?: string }[], catalogNames: Set<string>, n = 6, now = new Date(), days = 60): string[] {
    const since = mzDay(new Date(now.getTime() - days * DAY));
    const count = new Map<string, number>();
    for (const p of productions) {
        if (p.deletedAt || !p.productName || !catalogNames.has(p.productName)) continue;
        if (p.date && p.date.slice(0, 10) < since) continue;
        count.set(p.productName, (count.get(p.productName) || 0) + 1);
    }
    return [...count].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pt')).slice(0, n).map(([name]) => name);
}
