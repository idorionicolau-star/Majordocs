// Primeiros passos — lógica pura (sem React nem Firebase), para ser testada.

/** "joao.silva@empresa.co.mz" → "Joao Silva": o nome de utilizador deixou de ser pedido no registo. */
export function deriveUsername(email: string, fallback = 'Admin'): string {
  const local = (email || '').split('@')[0].replace(/[._-]+/g, ' ').replace(/\d+$/g, '').trim();
  if (!local) return fallback;
  return local.split(/\s+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export type FirstProductInput = { name: string; price: string; qty: string };
export type FirstProduct = { name: string; price: number; qty: number };

const num = (raw: string) => {
  const n = parseFloat(String(raw).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
};

/** Valida o formulário da primeira venda (nome, preço e quantidade). `error` é a mensagem para a pessoa. */
export function checkFirstProduct(i: FirstProductInput): { ok: true; value: FirstProduct } | { ok: false; error: string; field: keyof FirstProductInput } {
  const name = i.name.trim().replace(/\s+/g, ' ');
  if (name.length < 2) return { ok: false, field: 'name', error: 'Escreva o nome do produto (ex.: Cimento).' };
  const price = num(i.price);
  if (!(price > 0)) return { ok: false, field: 'price', error: 'Escreva o preço de venda (maior que zero).' };
  const qty = num(i.qty);
  if (!(qty >= 1)) return { ok: false, field: 'qty', error: 'Quantas unidades tem em stock? (pelo menos 1)' };
  return { ok: true, value: { name: name.charAt(0).toUpperCase() + name.slice(1), price, qty } };
}

export type StepId = 'products' | 'sale' | 'company' | 'tour';
export type Step = { id: StepId; done: boolean; required: boolean };

/** A lista de "Primeiros passos" do dashboard. */
export function gettingStarted(s: { products: number; sales: number; companyDone: boolean; tourSeen: boolean }): { steps: Step[]; done: number; total: number; finished: boolean; next?: StepId } {
  const steps: Step[] = [
    { id: 'products', done: s.products > 0, required: true },
    { id: 'sale', done: s.sales > 0, required: true },
    { id: 'company', done: s.companyDone, required: true },
    { id: 'tour', done: s.tourSeen, required: true },
  ];
  const done = steps.filter((x) => x.done).length;
  return { steps, done, total: steps.length, finished: done === steps.length, next: steps.find((x) => !x.done)?.id };
}

/** Entradas do menu que ficam escondidas no "menu simples" (o resto da app continua a um toque de distância). */
export const ADVANCED_HREFS = new Set([
  '/diagnostico', '/sales/carga', '/inventory/history', '/inventory/perdas',
  '/raw-materials', '/production', '/orders', '/reports/inventory-impact',
]);

/** Empresa nova (ainda sem vendas) começa com o menu simples; quem escolheu mantém a escolha. */
export function menuMode(saved: string | null, salesCount: number): 'simple' | 'full' {
  if (saved === 'simple' || saved === 'full') return saved;
  return salesCount === 0 ? 'simple' : 'full';
}
