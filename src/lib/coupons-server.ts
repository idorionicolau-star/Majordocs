import 'server-only';
import { normalizeCode, type CouponDef } from '@/lib/coupon-core';

/**
 * Os códigos e os seus preços (MZN/mês, nos primeiros meses pagos do plano Mensal). Só no servidor: não vão
 * para o navegador e o preço cobrado vem sempre daqui. Para acrescentar ou tirar um código, muda-se esta lista.
 */
const COUPONS: Record<string, CouponDef> = {
    MAJOR76: { price: 550, months: 3 },
    GD66: { price: 500, months: 3 },
    MJTP86: { price: 450, months: 3 },
    // para testar os pagamentos: só um mês, a 25 MT
    CHRISKILLYAN2224: { price: 25, months: 1, test: true },
};

export function findCoupon(raw: string): { code: string; def: CouponDef } | null {
    const code = normalizeCode(raw);
    const def = COUPONS[code];
    return def ? { code, def } : null;
}
