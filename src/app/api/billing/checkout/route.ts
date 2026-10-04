export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { initializeAdmin, verifyIdToken } from '@/lib/firebase-admin';
import { zumbopay } from '@/lib/billing-server';
import { planById } from '@/lib/plans';
import { findCoupon } from '@/lib/coupons-server';
import { couponAmount } from '@/lib/coupon-core';

/**
 * Cria um pagamento na ZumboPay (checkout alojado: M-Pesa, e-Mola e cartão) para a empresa de quem está
 * autenticado e devolve o `checkout_url` para onde se redirecciona o cliente.
 */
export async function POST(req: Request) {
    const decoded: any = await verifyIdToken(req);
    if (!decoded) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    const companyId: string | undefined = decoded.companyId;
    if (!companyId) return NextResponse.json({ error: 'Empresa não encontrada.' }, { status: 400 });

    const { planId } = await req.json().catch(() => ({}));
    const plan = planById(planId);
    if (!plan) return NextResponse.json({ error: 'Plano inválido.' }, { status: 400 });

    const walletId = process.env.ZUMBOPAY_WALLET_ID;
    if (!walletId) return NextResponse.json({ error: 'Pagamentos ainda não configurados (ZUMBOPAY_WALLET_ID).' }, { status: 503 });

    const admin = initializeAdmin();
    const db = admin.firestore();
    const emp = await db.doc(`companies/${companyId}/employees/${decoded.uid}`).get();
    if (!['Admin', 'Dono'].includes(emp.get('role')) && !decoded.superAdmin) {
        return NextResponse.json({ error: 'Só o administrador da empresa pode pagar a subscrição.' }, { status: 403 });
    }

    const reference = `MSX${Date.now().toString(36).toUpperCase()}${companyId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase()}`;
    const company = await db.doc(`companies/${companyId}`).get();
    const now = new Date();

    // Código de convite: preço especial nos primeiros meses do Mensal. O preço vem da lista do servidor e os meses
    // usados contam-se nos pagamentos (que só o servidor escreve) — nada do que está na empresa é confiado.
    const coupon = findCoupon(company.get('coupon.code') || '');
    let amount = plan.amount;
    if (coupon) {
        const used = (await db.collection(`companies/${companyId}/payments`).where('coupon', '==', coupon.code).where('status', '==', 'paid').get()).size;
        const c = couponAmount(coupon.def, used, plan.id);
        if (c.amount != null) amount = c.amount;
    }
    const withCoupon = coupon && amount !== plan.amount ? coupon.code : null;

    // Índice referência → empresa, para o webhook encontrar o pagamento sem confiar no que vem no corpo.
    await db.doc(`billingRefs/${reference}`).set({ companyId, reference, createdAt: now.toISOString() });
    const paymentRef = db.doc(`companies/${companyId}/payments/${reference}`);
    await paymentRef.set({
        reference, provider: 'zumbopay', planId: plan.id, months: plan.months, amount,
        ...(withCoupon ? { coupon: withCoupon, fullAmount: plan.amount } : {}),
        status: 'pending', createdAt: now.toISOString(), createdBy: emp.get('username') || decoded.uid,
    });

    try {
        const r = await zumbopay<{ data: { id?: string; reference?: string; slug?: string; checkout_url: string } }>('/payments', {
            method: 'POST',
            headers: { 'Idempotency-Key': reference },
            body: JSON.stringify({
                title: `MajorStockX — ${plan.label}${withCoupon ? ` (código ${withCoupon})` : ''}`.slice(0, 80),
                // a nossa referência vai aqui: se o webhook devolver a descrição, é por ela que se encontra o pagamento
                description: `${reference} · ${company.get('name') || companyId}`.slice(0, 200),
                amount,
                currency: 'MZN',
                channels: ['mpesa', 'emola', 'card'],
                wallet_id: walletId,
                max_uses: 1,
                expires_at: new Date(now.getTime() + 24 * 3600_000).toISOString(),
            }),
        });
        const d = r.data;
        if (!d?.checkout_url) throw new Error('A ZumboPay não devolveu o link de pagamento.');
        await paymentRef.update({ providerId: d.id || null, providerReference: d.reference || null, slug: d.slug || null, checkoutUrl: d.checkout_url });
        // todos os identificadores que o webhook possa usar apontam para o mesmo pagamento
        await Promise.all([d.reference, d.slug, d.id]
            .filter((k): k is string => !!k && !k.includes('/') && k !== reference)
            .map((k) => db.doc(`billingRefs/${k}`).set({ companyId, reference, createdAt: now.toISOString() })));
        return NextResponse.json({ reference, checkoutUrl: d.checkout_url, amount });
    } catch (e: any) {
        await paymentRef.update({ status: 'error', error: String(e?.message || e).slice(0, 300) });
        return NextResponse.json({ error: 'Não foi possível iniciar o pagamento.', details: e?.message }, { status: 502 });
    }
}
