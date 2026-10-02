import 'server-only';
import { initializeAdmin } from '@/lib/firebase-admin';
import { GRACE_DAYS, planById } from '@/lib/plans';
import { amountLooksRight, parseZumboError } from '@/lib/zumbopay-core';

const DEFAULT_BASE = 'https://zumbopay.com/api/public/v1';

/** Chamada à API da ZumboPay (só no servidor: a chave nunca vai para o navegador). */
export async function zumbopay<T = any>(path: string, init: RequestInit = {}): Promise<T> {
    const key = process.env.ZUMBOPAY_API_KEY;
    const merchant = process.env.ZUMBOPAY_MERCHANT_ID;
    if (!key || !merchant) throw new Error('ZUMBOPAY_API_KEY / ZUMBOPAY_MERCHANT_ID não configurados.');
    const base = (process.env.ZUMBOPAY_BASE_URL || DEFAULT_BASE).replace(/\/$/, '');
    const res = await fetch(`${base}${path}`, {
        ...init,
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${key}`, 'X-Merchant-Id': merchant, ...(init.headers || {}) },
        cache: 'no-store',
    });
    const text = await res.text();
    let json: any = null;
    try { json = text ? JSON.parse(text) : null; } catch { /* não é JSON */ }
    if (!res.ok) {
        const e = parseZumboError(res.status, json);
        throw new Error(`${e.code}: ${e.message}`);
    }
    return json as T;
}

function addMonths(from: Date, months: number) {
    const d = new Date(from.getTime());
    d.setMonth(d.getMonth() + months);
    return d;
}

/**
 * `refKey` é qualquer identificador do pagamento guardado no índice `billingRefs` (a nossa referência, a da ZumboPay,
 * o slug ou o id). Devolve a nossa referência e a empresa, ou null se não for um pagamento nosso.
 */
export async function findPaymentByRef(refKey: string): Promise<{ reference: string; companyId: string } | null> {
    if (!refKey || refKey.includes('/')) return null;
    const snap = await initializeAdmin().firestore().doc(`billingRefs/${refKey}`).get();
    if (!snap.exists) return null;
    const d = snap.data() as { companyId: string; reference?: string };
    return { companyId: d.companyId, reference: d.reference || refKey };
}

/**
 * Marca um pagamento como pago (idempotente) e prolonga a subscrição da empresa.
 * O novo período começa no mais tardio entre "agora" e o fim actual (pagar antes do fim não perde dias).
 */
export async function applyPaidPayment(reference: string, info: { providerId?: string; transactionId?: string; amount?: number }) {
    const admin = initializeAdmin();
    const db = admin.firestore();
    const found = await findPaymentByRef(reference);
    if (!found) return { ok: false, reason: 'unknown-reference' as const };
    const { companyId } = found;
    const paymentRef = db.doc(`companies/${companyId}/payments/${found.reference}`);
    const companyRef = db.doc(`companies/${companyId}`);

    return db.runTransaction(async (tx) => {
        const [pSnap, cSnap] = await Promise.all([tx.get(paymentRef), tx.get(companyRef)]);
        if (!pSnap.exists) return { ok: false, reason: 'missing-payment' as const };
        const p = pSnap.data()!;
        if (p.status === 'paid') return { ok: true, already: true };
        if (!amountLooksRight(Number(p.amount), info.amount)) {
            tx.update(paymentRef, { status: 'amount-mismatch', paidAmount: info.amount, updatedAt: new Date().toISOString() });
            return { ok: false, reason: 'amount-mismatch' as const };
        }
        const plan = planById(p.planId);
        const months = plan?.months || p.months || 1;
        const c = cSnap.data() || {};
        const now = new Date();
        const currentEnd = c.subscriptionEndsAt ? new Date(c.subscriptionEndsAt) : null;
        const start = currentEnd && !isNaN(currentEnd.getTime()) && currentEnd > now ? currentEnd : now;
        const end = addMonths(start, months);

        tx.update(paymentRef, {
            status: 'paid',
            paidAt: now.toISOString(),
            periodStart: start.toISOString(),
            periodEnd: end.toISOString(),
            ...(info.providerId ? { providerId: info.providerId } : {}),
            ...(info.transactionId ? { transactionId: info.transactionId } : {}),
        });
        tx.set(companyRef, {
            status: 'active',
            plan: p.planId,
            subscriptionEndsAt: end.toISOString(),
            // cópia numérica para as regras do Firestore (não sabem ler datas ISO): fim + tolerância
            paidUntilMs: end.getTime() + GRACE_DAYS * 86_400_000,
        }, { merge: true });
        return { ok: true, end: end.toISOString() };
    });
}
