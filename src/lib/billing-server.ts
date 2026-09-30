import 'server-only';
import crypto from 'crypto';
import { initializeAdmin } from '@/lib/firebase-admin';
import { GRACE_DAYS, planById } from '@/lib/plans';

const API = 'https://paysuite.tech/api/v1';

export async function paysuite<T = any>(path: string, init: RequestInit = {}): Promise<T> {
    const token = process.env.PAYSUITE_API_TOKEN;
    if (!token) throw new Error('PAYSUITE_API_TOKEN não configurado.');
    const res = await fetch(`${API}${path}`, {
        ...init,
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}`, ...(init.headers || {}) },
        cache: 'no-store',
    });
    const text = await res.text();
    let json: any = null;
    try { json = text ? JSON.parse(text) : null; } catch { /* not json */ }
    if (!res.ok) throw new Error(json?.message || json?.error || `PaySuite ${res.status}: ${text.slice(0, 200)}`);
    return json as T;
}

export function verifyPaysuiteSignature(rawBody: string, signature: string | null): boolean {
    const secret = process.env.PAYSUITE_WEBHOOK_SECRET;
    if (!secret || !signature) return false;
    const expected = crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');
    const a = Buffer.from(expected, 'utf8');
    const b = Buffer.from(signature.trim(), 'utf8');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function addMonths(from: Date, months: number) {
    const d = new Date(from.getTime());
    d.setMonth(d.getMonth() + months);
    return d;
}

/**
 * Marks a payment as paid (idempotent) and extends the company's subscription.
 * New period starts at the later of "now" and the current end date (paying early never loses days).
 */
export async function applyPaidPayment(reference: string, info: { paysuiteId?: string; transactionId?: string; amount?: number }) {
    const admin = initializeAdmin();
    const db = admin.firestore();
    const refDoc = await db.doc(`billingRefs/${reference}`).get();
    if (!refDoc.exists) return { ok: false, reason: 'unknown-reference' as const };
    const { companyId } = refDoc.data() as { companyId: string };
    const paymentRef = db.doc(`companies/${companyId}/payments/${reference}`);
    const companyRef = db.doc(`companies/${companyId}`);

    return db.runTransaction(async (tx) => {
        const [pSnap, cSnap] = await Promise.all([tx.get(paymentRef), tx.get(companyRef)]);
        if (!pSnap.exists) return { ok: false, reason: 'missing-payment' as const };
        const p = pSnap.data()!;
        if (p.status === 'paid') return { ok: true, already: true };
        if (info.amount !== undefined && Math.abs(Number(info.amount) - Number(p.amount)) > 0.5) {
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
            ...(info.paysuiteId ? { paysuiteId: info.paysuiteId } : {}),
            ...(info.transactionId ? { transactionId: info.transactionId } : {}),
        });
        tx.set(companyRef, {
            status: 'active',
            plan: p.planId,
            subscriptionEndsAt: end.toISOString(),
            // numeric copy for Firestore rules (they can't parse ISO dates): end + grace
            paidUntilMs: end.getTime() + GRACE_DAYS * 86_400_000,
        }, { merge: true });
        return { ok: true, end: end.toISOString() };
    });
}
