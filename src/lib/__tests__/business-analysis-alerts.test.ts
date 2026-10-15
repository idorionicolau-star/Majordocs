import { describe, it, expect } from 'vitest';
import { analyzeBusiness, runoutLabel } from '../business-analysis';
import type { Product, Sale } from '../types';

const now = new Date('2026-10-15T12:00:00Z');
const ago = (d: number) => new Date(now.getTime() - d * 864e5).toISOString();
const prod = (name: string, stock: number, price = 100) =>
    ({ id: name, instanceId: name, name, stock, reservedStock: 0, price, cost: 0, category: 'Geral', unit: 'un', lowStockThreshold: 1, criticalStockThreshold: 0 }) as unknown as Product;
const sale = (productName: string, quantity: number, daysAgo: number) =>
    ({ id: `${productName}${daysAgo}`, productName, quantity, unitPrice: 100, totalValue: 100 * quantity, amountPaid: 100 * quantity, documentType: 'Venda a Dinheiro', status: 'Levantado', date: ago(daysAgo) }) as unknown as Sale;

describe('alerta "vão esgotar"', () => {
    it('não repete os já esgotados e diz "acaba hoje" em vez de "~0 dias"', () => {
        const a = analyzeBusiness({
            now, businessType: 'manufacturer',
            products: [prod('Tampa', 0), prod('Lancil', 3), prod('Pavê', 20)],
            sales: [sale('Tampa', 60, 2), sale('Lancil', 300, 3), sale('Pavê', 60, 1)],
        });
        const runout = a.alerts.find((x) => x.id === 'runout')!;
        expect(runout.title).toBe('2 produtos vão esgotar em ≤ 14 dias');
        expect(runout.items).toEqual(['Lancil: acaba hoje (3 un)', 'Pavê: ~10 dias (20 un)']);
        expect(a.alerts.find((x) => x.id === 'out')!.items).toContain('Tampa');
        expect(a.stock.runout.some((r) => r.name === 'Tampa')).toBe(true); // o plano de produção continua a vê-lo
    });

    it('rótulos', () => {
        expect(runoutLabel(0)).toBe('acaba hoje');
        expect(runoutLabel(1)).toBe('acaba amanhã');
        expect(runoutLabel(6)).toBe('~6 dias');
    });
});

describe('alerta "stock parado"', () => {
    const products = [prod('Vendido', 10), prod('Parado', 10, 1000)];

    it('com menos de 30 dias de vendas na app, não acusa nada', () => {
        const a = analyzeBusiness({ now, products, sales: [sale('Vendido', 1, 20), sale('Vendido', 1, 1)] });
        expect(a.alerts.some((x) => x.id === 'dead')).toBe(false);
        expect(a.stock.dead.count).toBe(0);
    });

    it('com 40 dias de vendas, diz 40 dias (não inventa 90)', () => {
        const a = analyzeBusiness({ now, products, sales: [sale('Vendido', 1, 40), sale('Vendido', 1, 1)] });
        expect(a.alerts.find((x) => x.id === 'dead')!.title).toMatch(/sem vendas registadas há 40 dias$/);
        expect(a.stock.dead.days).toBe(40);
    });

    it('com mais de 90 dias de vendas, fica nos 90', () => {
        const a = analyzeBusiness({ now, products, sales: [sale('Vendido', 1, 200), sale('Vendido', 1, 1)] });
        expect(a.alerts.find((x) => x.id === 'dead')!.title).toMatch(/há 90 dias$/);
    });
});
