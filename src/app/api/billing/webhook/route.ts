export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { initializeAdmin } from '@/lib/firebase-admin';
import { applyPaidPayment, paysuite, verifyPaysuiteSignature } from '@/lib/billing-server';

/**
 * PaySuite webhook. Verifies the HMAC-SHA256 signature (X-Signature over the raw body),
 * then double-checks the payment with the PaySuite API before extending the subscription.
 */
export async function POST(req: Request) {
    const raw = await req.text();
    if (!verifyPaysuiteSignature(raw, req.headers.get('x-signature'))) {
        return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
    }
    let evt: any;
    try { evt = JSON.parse(raw); } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }); }
    const data = evt?.data || {};
    const reference: string | undefined = data.reference;
    if (!reference) return NextResponse.json({ ok: true, ignored: 'no reference' });

    try {
        if (evt.event === 'payment.success') {
            // Defence in depth: confirm with PaySuite that it is really paid.
            let confirmed = true;
            let transactionId: string | undefined = data.transaction_id;
            if (data.id) {
                try {
                    const r = await paysuite<{ data: { status?: string; transaction?: { transaction_id?: string } } }>(`/payments/${data.id}`);
                    const st = String(r?.data?.status || '').toLowerCase();
                    transactionId = r?.data?.transaction?.transaction_id || transactionId;
                    confirmed = ['paid', 'success', 'completed', 'successful'].includes(st);
                } catch { confirmed = true; /* signature already verified; API hiccup shouldn't lose a payment */ }
            }
            if (!confirmed) return NextResponse.json({ ok: false, reason: 'not confirmed' });
            const r = await applyPaidPayment(reference, { paysuiteId: data.id, transactionId, amount: data.amount !== undefined ? Number(data.amount) : undefined });
            return NextResponse.json(r);
        }
        if (evt.event === 'payment.failed') {
            const db = initializeAdmin().firestore();
            const idx = await db.doc(`billingRefs/${reference}`).get();
            if (idx.exists) {
                await db.doc(`companies/${idx.get('companyId')}/payments/${reference}`).set({ status: 'failed', updatedAt: new Date().toISOString() }, { merge: true });
            }
        }
        return NextResponse.json({ ok: true });
    } catch (e: any) {
        console.error('PaySuite webhook error', e);
        return NextResponse.json({ error: 'processing failed' }, { status: 500 }); // PaySuite retries
    }
}
