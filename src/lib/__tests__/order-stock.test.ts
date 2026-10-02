import { describe, expect, it } from 'vitest';
import { ingredientRequiredQty, planOrderReservation, reservedToRelease } from '../order-stock';

describe('ingredientRequiredQty', () => {
    it('linear sem rendimento', () => {
        expect(ingredientRequiredQty({ quantity: 2 }, 10)).toBe(20);
    });
    it('com rendimento arredonda para cima (nunca meio saco)', () => {
        const saco = { quantity: 1, yieldPerUnit: 75 };
        expect(ingredientRequiredQty(saco, 150)).toBe(2);
        expect(ingredientRequiredQty(saco, 76)).toBe(2);
        expect(ingredientRequiredQty(saco, 75)).toBe(1);
        expect(ingredientRequiredQty({ quantity: 3, yieldPerUnit: 75 }, 76)).toBe(6);
    });
    it('rendimento inválido é ignorado', () => {
        expect(ingredientRequiredQty({ quantity: 2, yieldPerUnit: 0 }, 5)).toBe(10);
    });
});

describe('planOrderReservation', () => {
    it('fabricante reserva mesmo sem stock suficiente (vai produzir)', () => {
        expect(planOrderReservation({ stock: 5, reservedStock: 0 }, 100, true)).toEqual({ kind: 'reserve' });
    });
    it('fabricante: produto que ainda não existe no inventário é criado', () => {
        expect(planOrderReservation(null, 100, true)).toEqual({ kind: 'create' });
    });
    it('revendedor reserva só se o disponível chega', () => {
        expect(planOrderReservation({ stock: 50, reservedStock: 10 }, 40, false)).toEqual({ kind: 'reserve' });
        expect(planOrderReservation({ stock: 50, reservedStock: 10 }, 41, false)).toEqual({ kind: 'refuse', available: 40 });
    });
    it('revendedor sem o produto no inventário recusa', () => {
        expect(planOrderReservation(null, 1, false)).toEqual({ kind: 'refuse', available: 0 });
    });
    it('disponível negativo mostra 0', () => {
        expect(planOrderReservation({ stock: 5, reservedStock: 9 }, 1, false)).toEqual({ kind: 'refuse', available: 0 });
    });
});

describe('reservedToRelease', () => {
    it('liberta o que a encomenda reservou', () => {
        expect(reservedToRelease({ quantity: 10, reservedQuantity: 10 })).toBe(10);
        expect(reservedToRelease({ quantity: 10, reservedQuantity: 0 })).toBe(0);
    });
    it('encomendas antigas (sem o campo) mantêm a regra antiga', () => {
        expect(reservedToRelease({ quantity: 10 })).toBe(10);
    });
});
