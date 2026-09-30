export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { initializeAdmin, verifyIdToken } from '@/lib/firebase-admin';
import { paysuite } from '@/lib/billing-server';
import { planById } from '@/lib/plans';

/** Creates a PaySuite payment for the signed-in admin's company and returns the checkout URL. */
export async function POST(req: Request) {
    const decoded: any = await verifyIdToken(req);
    if (!decoded) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    const companyId: string | undefined = decoded.companyId;
    if (!companyId) return NextResponse.json({ error: 'Empresa não encontrada.' }, { status: 400 });

    const { planId } = await req.json().catch(() => ({}));
    const plan = planById(planId);
    if (!plan) return NextResponse.json({ error: 'Plano inválido.' }, { status: 400 });

    const admin = initializeAdmin();
    const db = admin.firestore();
    const emp = await db.doc(`companies/${companyId}/employees/${decoded.uid}`).get();
    if (!['Admin', 'Dono'].includes(emp.get('role')) && !decoded.superAdmin) {
        return NextResponse.json({ error: 'Só o administrador da empresa pode pagar a subscrição.' }, { status: 403 });
    }

    const origin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || new URL(req.url).origin;
    const reference = `MSX${Date.now().toString(36).toUpperCase()}${companyId.slice(0, 4).toUpperCase()}`;
    const company = await db.doc(`companies/${companyId}`).get();

    // Reference → company index, so the webhook can find the payment without trusting the payload.
    await db.doc(`billingRefs/${reference}`).set({ companyId, createdAt: new Date().toISOString() });
    const paymentRef = db.doc(`companies/${companyId}/payments/${reference}`);
    await paymentRef.set({
        reference, planId: plan.id, months: plan.months, amount: plan.amount,
        status: 'pending', createdAt: new Date().toISOString(), createdBy: emp.get('username') || decoded.uid,
    });

    try {
        const r = await paysuite<{ data: { id: string; checkout_url: string; status: string } }>('/payments', {
            method: 'POST',
            body: JSON.stringify({
                amount: plan.amount.toFixed(2),
                reference,
                description: `MajorStockX — ${plan.label} — ${company.get('name') || companyId}`.slice(0, 125),
                return_url: `${origin}/billing?ref=${reference}`,
                webhook_url: `${origin}/api/billing/webhook`,
            }),
        });
        await paymentRef.update({ paysuiteId: r.data.id, checkoutUrl: r.data.checkout_url });
        return NextResponse.json({ reference, checkoutUrl: r.data.checkout_url });
    } catch (e: any) {
        await paymentRef.update({ status: 'error', error: String(e?.message || e).slice(0, 300) });
        return NextResponse.json({ error: 'Não foi possível iniciar o pagamento.', details: e?.message }, { status: 502 });
    }
}
