export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { initializeAdmin, verifyIdToken } from '@/lib/firebase-admin';
import { findCoupon } from '@/lib/coupons-server';
import { couponMonthsLeft, normalizeCode, type CompanyCoupon } from '@/lib/coupon-core';

/**
 * Aplica um código de convite/desconto à empresa de quem está autenticado (registo por convite ou página de
 * Subscrição). Grava na empresa o código, o preço e os meses — só para mostrar e lembrar: o preço cobrado é
 * calculado de novo no checkout, a partir da lista do servidor e dos pagamentos já feitos com o código.
 */
export async function POST(req: Request) {
    const decoded: any = await verifyIdToken(req);
    if (!decoded) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    const companyId: string | undefined = decoded.companyId;
    if (!companyId) return NextResponse.json({ error: 'Empresa não encontrada.' }, { status: 400 });

    const { code: raw } = await req.json().catch(() => ({}));
    const found = findCoupon(String(raw || ''));
    if (!found) return NextResponse.json({ error: 'Código inválido.' }, { status: 404 });

    const db = initializeAdmin().firestore();
    const emp = await db.doc(`companies/${companyId}/employees/${decoded.uid}`).get();
    if (!['Admin', 'Dono'].includes(emp.get('role')) && !decoded.superAdmin) {
        return NextResponse.json({ error: 'Só o administrador da empresa pode usar um código.' }, { status: 403 });
    }

    const companyRef = db.doc(`companies/${companyId}`);
    const current = (await companyRef.get()).get('coupon') as CompanyCoupon | undefined;
    // um código já a meio (com meses pagos e ainda com desconto) não se troca por outro
    if (current?.code && normalizeCode(current.code) !== found.code && (current.monthsUsed || 0) > 0 && couponMonthsLeft(current) > 0) {
        return NextResponse.json({ error: `Já está a usar o código ${current.code}.` }, { status: 409 });
    }

    const paid = await db.collection(`companies/${companyId}/payments`).where('coupon', '==', found.code).where('status', '==', 'paid').get();
    const coupon: CompanyCoupon = {
        code: found.code, price: found.def.price, months: found.def.months, monthsUsed: paid.size,
        appliedAt: current?.code === found.code && current.appliedAt ? current.appliedAt : new Date().toISOString(),
    };
    await companyRef.set({ coupon }, { merge: true });
    return NextResponse.json({ coupon, monthsLeft: couponMonthsLeft(coupon) });
}
