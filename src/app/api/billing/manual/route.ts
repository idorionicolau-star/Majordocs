export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { initializeAdmin, verifyIdToken } from '@/lib/firebase-admin';
import { companyPayer, planAmountFor } from '@/lib/billing-server';
import { planById } from '@/lib/plans';
import { isManualMethod, paymentReference } from '@/lib/manual-pay-core';

/**
 * Pagamento directo por M-Pesa / e-Mola (ver lib/manual-pay-core.ts): regista o pedido como pendente, com o valor
 * calculado no servidor, e devolve a referência. A conta só é activada quando o super-administrador confirmar.
 */
export async function POST(req: Request) {
    const decoded: any = await verifyIdToken(req);
    if (!decoded) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    const companyId: string | undefined = decoded.companyId;
    if (!companyId) return NextResponse.json({ error: 'Empresa não encontrada.' }, { status: 400 });

    const { planId, method } = await req.json().catch(() => ({}));
    const plan = planById(planId);
    if (!plan) return NextResponse.json({ error: 'Plano inválido.' }, { status: 400 });
    if (!isManualMethod(method)) return NextResponse.json({ error: 'Forma de pagamento inválida.' }, { status: 400 });

    const payer = await companyPayer(companyId, decoded);
    if (!payer) return NextResponse.json({ error: 'Só o administrador da empresa pode pagar a subscrição.' }, { status: 403 });

    const db = initializeAdmin().firestore();
    const now = new Date();
    const reference = paymentReference(companyId, now);
    const { amount, coupon } = await planAmountFor(companyId, plan);
    const companyName = (await db.doc(`companies/${companyId}`).get()).get('name') || '';

    const batch = db.batch();
    batch.set(db.doc(`billingRefs/${reference}`), { companyId, reference, createdAt: now.toISOString() });
    batch.set(db.doc(`companies/${companyId}/payments/${reference}`), {
        reference, provider: 'manual', method, planId: plan.id, months: plan.months, amount,
        ...(coupon ? { coupon, fullAmount: plan.amount } : {}),
        status: 'pending', createdAt: now.toISOString(), createdBy: payer.username,
    });
    // lista do super-administrador (só o servidor lê e escreve)
    batch.set(db.doc(`manualPayments/${reference}`), {
        reference, companyId, companyName, method, planId: plan.id, amount,
        email: decoded.email || null, createdBy: payer.username, createdAt: now.toISOString(), status: 'pending',
    });
    await batch.commit();
    return NextResponse.json({ reference, amount });
}
