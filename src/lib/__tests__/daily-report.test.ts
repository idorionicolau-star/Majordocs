import { describe, it, expect } from 'vitest';
import { criticalProducts, escapeHtml, topProducts } from '@/lib/daily-report';

describe('Relatório do dia: mais vendidos', () => {
    it('soma por produto e ordena por quantidade (empate: valor)', () => {
        const top = topProducts([
            { productName: 'Pavê', quantity: 10, totalValue: 100 },
            { productName: 'Bloco', quantity: 5, totalValue: 500 },
            { productName: 'Pavê', quantity: 5, totalValue: 50 },
            { productName: 'Grelha', quantity: 5, totalValue: 80 },
            { productName: 'Tampa', quantity: 1, totalValue: 10 },
            { productName: '', quantity: 99 },
        ]);
        expect(top.map((t) => [t.name, t.quantity, t.value])).toEqual([['Pavê', 15, 150], ['Bloco', 5, 500], ['Grelha', 5, 80]]);
        expect(topProducts([])).toEqual([]);
    });
});

describe('Relatório do dia: stock crítico', () => {
    it('junta o mesmo produto no mesmo local ("" = Principal), desconta reservas e ignora a lixeira', () => {
        const list = criticalProducts([
            { name: 'Pavê', location: '', stock: 3, criticalStockThreshold: 10 },
            { name: 'Pavê', location: 'Principal', stock: 4, reservedStock: 2 },
            { name: 'Bloco', stock: 50, reservedStock: 45, criticalStockThreshold: 5 },
            { name: 'Grelha', stock: 100, criticalStockThreshold: 10 },
            { name: 'Velho', stock: 0, criticalStockThreshold: 5, deletedAt: '2026-01-01' },
        ]);
        expect(list).toEqual([
            { name: 'Pavê', location: '', available: 5, threshold: 10, unit: undefined },
            { name: 'Bloco', location: '', available: 5, threshold: 5, unit: undefined },
        ]);
    });
    it('com vários locais, mostra o nome do local', () => {
        const locs = [{ id: 'a', name: 'Loja' }, { id: 'b', name: 'Armazém' }];
        const list = criticalProducts([{ name: 'Pavê', location: 'b', stock: 0 }, { name: 'Pavê', location: '', stock: 0 }], locs);
        expect(list.map((p) => p.location).sort()).toEqual(['Armazém', 'Loja']);
    });
});

it('escapa HTML', () => {
    expect(escapeHtml('<b>"A" & \'B\'</b>')).toBe('&lt;b&gt;&quot;A&quot; &amp; &#39;B&#39;&lt;/b&gt;');
});
