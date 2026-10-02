// Regras de stock das encomendas e da produção, puras (sem Firebase) para poderem ser testadas.

export type Ingredient = { quantity: number; yieldPerUnit?: number };

/**
 * Matéria-prima necessária para produzir `produced` unidades. Com rendimento (1 saco → 75 peças) arredonda
 * para cima, nunca meios sacos: 76 peças = 2 sacos. Sem rendimento, é linear.
 */
export function ingredientRequiredQty(ing: Ingredient, produced: number): number {
    const yieldPer = ing.yieldPerUnit && ing.yieldPerUnit > 0 ? ing.yieldPerUnit : null;
    return yieldPer ? Math.ceil(produced / yieldPer) * ing.quantity : ing.quantity * produced;
}

export type ReservationPlan =
    | { kind: 'reserve' }
    | { kind: 'create' }
    | { kind: 'refuse'; available: number };

/**
 * O que fazer ao stock quando se regista uma encomenda.
 * - Fabricante: a encomenda pode ser maior do que o stock (vai ser produzida) → reserva sempre; se o produto
 *   ainda não existe no inventário, cria-o com stock 0 para a reserva e a produção terem onde cair.
 * - Revendedor: só se vende o que há → recusa se o disponível (stock − reservado) não chega.
 */
export function planOrderReservation(
    found: { stock?: number; reservedStock?: number } | null,
    quantity: number,
    manufacturer: boolean,
): ReservationPlan {
    if (manufacturer) return found ? { kind: 'reserve' } : { kind: 'create' };
    const available = found ? (found.stock || 0) - (found.reservedStock || 0) : 0;
    return found && available >= quantity ? { kind: 'reserve' } : { kind: 'refuse', available: Math.max(0, available) };
}

/**
 * Quanto da reserva libertar ao entregar ou apagar uma encomenda: o que ela reservou de facto.
 * Encomendas antigas não guardam isso — mantém-se a regra antiga (a quantidade toda).
 */
export function reservedToRelease(order: { quantity: number; reservedQuantity?: number }): number {
    return order.reservedQuantity !== undefined ? order.reservedQuantity : order.quantity;
}
