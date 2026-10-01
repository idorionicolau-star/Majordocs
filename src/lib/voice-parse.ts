// Interpreta o que a pessoa disse ("dez sacos de cimento e duas latas de tinta branca") em itens
// { qty, term }. Só regras — sem IA, sem internet. O ditado vem do navegador; isto só arruma o texto.

export type VoiceItem = { qty: number | null; term: string };

const strip = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const UNITS_WORDS: Record<string, number> = {
  zero: 0, um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10,
  onze: 11, doze: 12, treze: 13, catorze: 14, quatorze: 14, quinze: 15, dezasseis: 16, dezesseis: 16, dezassete: 17,
  dezessete: 17, dezoito: 18, dezanove: 19, dezenove: 19,
};
const TENS: Record<string, number> = { vinte: 20, trinta: 30, quarenta: 40, cinquenta: 50, sessenta: 60, setenta: 70, oitenta: 80, noventa: 90 };
const HUNDREDS: Record<string, number> = { cem: 100, cento: 100, duzentos: 200, duzentas: 200, trezentos: 300, trezentas: 300, quatrocentos: 400, quatrocentas: 400, quinhentos: 500, quinhentas: 500, seiscentos: 600, seiscentas: 600, setecentos: 700, setecentas: 700, oitocentos: 800, oitocentas: 800, novecentos: 900, novecentas: 900 };

const isNumWord = (w: string) => w in UNITS_WORDS || w in TENS || w in HUNDREDS || w === 'mil' || w === 'meio' || w === 'meia';

/** Palavras que são só a unidade/embalagem logo a seguir à quantidade ("10 sacos de …"). */
const UNIT_FILLER = new Set(['saco', 'sacos', 'caixa', 'caixas', 'unidade', 'unidades', 'un', 'peca', 'pecas', 'pacote', 'pacotes', 'lata', 'latas', 'barra', 'barras', 'metro', 'metros', 'm', 'kg', 'quilo', 'quilos', 'litro', 'litros', 'rolo', 'rolos', 'carrinho', 'carrinhos', 'camiao', 'camioes', 'palete', 'paletes', 'frasco', 'frascos', 'par', 'pares']);
const GLUE = new Set(['de', 'do', 'da', 'dos', 'das', 'um', 'uma', 'o', 'a', 'os', 'as', 'quero', 'preciso', 'poe', 'por', 'favor', 'adiciona', 'adicionar', 'junta', 'juntar', 'vende', 'vender', 'registar', 'regista', 'entrada', 'saida']);

/** Lê um número a partir da posição i. Devolve valor e quantas palavras consumiu. */
function readNumber(words: string[], i: number): { value: number; used: number } | null {
  const w = words[i];
  if (/^\d+([.,]\d+)?$/.test(w)) return { value: Number(w.replace(',', '.')), used: 1 };
  if (!isNumWord(w)) return null;
  let total = 0;
  let current = 0;
  let used = 0;
  let j = i;
  let any = false;
  while (j < words.length) {
    const t = words[j];
    if (t === 'e' && any && j + 1 < words.length && (isNumWord(words[j + 1]) && words[j + 1] !== 'mil')) { j++; used++; continue; }
    if (t === 'meio' || t === 'meia') { current += 0.5; any = true; used++; j++; continue; }
    if (t in HUNDREDS) { current += HUNDREDS[t]; }
    else if (t in TENS) { current += TENS[t]; }
    else if (t in UNITS_WORDS) { current += UNITS_WORDS[t]; }
    else if (t === 'mil') { total += (current || 1) * 1000; current = 0; }
    else break;
    any = true; used++; j++;
  }
  // "e" final pendurado ("dez e") não faz parte do número
  if (words[i + used - 1] === 'e') used--;
  return any ? { value: total + current, used } : null;
}

/**
 * "dez sacos de cimento e duas latas de tinta branca"  → [{10,'cimento'},{2,'tinta branca'}]
 * "cimento 10"                                          → [{10,'cimento'}]
 * "areia"                                               → [{null,'areia'}]
 */
export function parseVoice(transcript: string): VoiceItem[] {
  const text = strip(transcript).replace(/[.,;!?]/g, (m) => (m === ',' || m === ';' ? ' | ' : ' ')).replace(/\s+/g, ' ').trim();
  if (!text) return [];
  const words = text.split(' ');

  type Tok = { kind: 'num'; value: number } | { kind: 'word'; w: string } | { kind: 'sep' };
  const toks: Tok[] = [];
  for (let i = 0; i < words.length; ) {
    const w = words[i];
    if (w === '|' || w === 'mais' || w === 'depois' || w === 'tambem') { toks.push({ kind: 'sep' }); i++; continue; }
    const n = readNumber(words, i);
    if (n) { toks.push({ kind: 'num', value: n.value }); i += n.used; continue; }
    toks.push({ kind: 'word', w }); i++;
  }

  // Um "e" seguido de número separa itens ("… cimento e duas latas"); um "e" entre palavras faz parte do nome.
  const groups: Tok[][] = [[]];
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    const next = toks[i + 1];
    if (t.kind === 'sep') { groups.push([]); continue; }
    if (t.kind === 'word' && t.w === 'e' && next?.kind === 'num') { groups.push([]); continue; }
    groups[groups.length - 1].push(t);
  }

  const items: VoiceItem[] = [];
  for (const g of groups) {
    const nums = g.filter((t): t is { kind: 'num'; value: number } => t.kind === 'num');
    if (!nums.length) {
      const term = clean(g);
      if (term) items.push({ qty: null, term });
      continue;
    }
    // medida no nome ("bloco 15 x 200"): vários números → a quantidade é o primeiro se estiver à cabeça, senão o último
    const firstIsNum = g[0].kind === 'num';
    const qtyTok = firstIsNum ? nums[0] : nums[nums.length - 1];
    const rest = g.filter((t) => t !== qtyTok);
    const term = clean(rest, firstIsNum);
    if (term) items.push({ qty: qtyTok.value, term });
  }
  return items;
}

function clean(tokens: ({ kind: 'num'; value: number } | { kind: 'word'; w: string } | { kind: 'sep' })[], afterQty = false): string {
  const out: string[] = [];
  let leading = true;
  for (const t of tokens) {
    if (t.kind === 'num') { out.push(String(t.value)); leading = false; continue; }
    if (t.kind !== 'word') continue;
    if (leading && afterQty && UNIT_FILLER.has(t.w)) continue; // "10 SACOS de cimento"
    if (leading && GLUE.has(t.w)) continue;
    if (t.w === 'x' || t.w === 'por') { out.push('x'); leading = false; continue; }
    leading = false;
    out.push(t.w);
  }
  while (out.length && GLUE.has(out[out.length - 1]) && out.length > 1) out.pop();
  return out.join(' ').trim();
}
