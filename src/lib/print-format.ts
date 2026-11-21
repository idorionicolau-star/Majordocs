// Em que papel imprime este aparelho: folha A4 (impressora normal) ou talão de 80 ou 58 mm (impressora térmica).
// Fica no aparelho (localStorage), como o "imprimir sempre": cada balcão tem a sua impressora.

export type PrintFormat = "a4" | "80" | "58";
const KEY = "msx-print-format";

export function parsePrintFormat(v: string | null | undefined): PrintFormat {
    return v === "80" || v === "58" ? v : "a4";
}

export function getPrintFormat(): PrintFormat {
    try { return parsePrintFormat(localStorage.getItem(KEY)); } catch { return "a4"; }
}

export function setPrintFormat(v: PrintFormat) {
    try { if (v === "a4") localStorage.removeItem(KEY); else localStorage.setItem(KEY, v); } catch { /* navegação privada */ }
}
