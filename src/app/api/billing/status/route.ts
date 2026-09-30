export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { initializeAdmin, verifyIdToken } from '@/lib/firebase-admin';
import { applyPaidPayment, paysuite } from '@/lib/billing-server';

/**
 * Status of one payment (used when the customer returns from the PaySuite checkout).
 * If the webhook hasn't arrived yet, asks PaySuite directly and applies the payment.
 */
export async function GET(req: Request) {
    const decoded: any = await verifyIdToken(req);
    if (!decoded?.companyId) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    const reference = new URL(req.url).searchParams.get('ref') || '';
    const db = initializeAdmin().firestore();
    const pRef = db.doc(`companies/${decoded.companyId}/payments/${reference}`);
    const snap = await pRef.get();
    if (!snap.exists) return NextResponse.json({ error: 'Pagamento não encontrado.' }, { status: 404 });
    let p = snap.data()!;

    if (p.status === 'pending' && p.paysuiteId) {
        try {
            const r = await paysuite<{ data: { status?: string; amount?: number; transaction?: { transaction_id?: string } } }>(`/payments/${p.paysuiteId}`);
            const st = String(r?.data?.status || '').toLowerCase();
            if (['paid', 'success', 'completed', 'successful'].includes(st)) {
                await applyPaidPayment(reference, { paysuiteId: p.paysuiteId, transactionId: r.data.transaction?.transaction_id, amount: r.data.amount });
            } else if (['failed', 'cancelled', 'canceled', 'expired'].includes(st)) {
                await pRef.update({ status: 'failed' });
            }
            p = (await pRef.get()).data()!;
        } catch { /* keep pending */ }
    }
    return NextResponse.json({ status: p.status, planId: p.planId, amount: p.amount, periodEnd: p.periodEnd || null });
}
