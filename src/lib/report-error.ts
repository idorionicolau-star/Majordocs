// Envia erros de ecrã para /api/log-error (sem bibliotecas externas nem chaves).
let sent = 0;
const seen = new Set<string>();

export function reportError(error: unknown, source: string) {
    try {
        if (typeof window === 'undefined' || sent >= 10) return;
        const e = error as { message?: string; stack?: string } | undefined;
        const message = e?.message || String(error);
        if (!message || /ResizeObserver loop|Script error\.?$/i.test(message)) return;
        const key = `${source}|${message}`;
        if (seen.has(key)) return;
        seen.add(key);
        sent++;
        const body = JSON.stringify({ message, stack: e?.stack, source, url: location.pathname });
        fetch('/api/log-error', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
    } catch { /* o registo nunca pode causar outro erro */ }
}
