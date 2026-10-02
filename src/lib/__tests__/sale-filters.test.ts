import { describe, expect, it } from 'vitest';
import { isCountableSale } from '../sale-filters';

describe('isCountableSale', () => {
    it('conta vendas normais', () => {
        expect(isCountableSale({ documentType: 'Venda a Dinheiro' })).toBe(true);
        expect(isCountableSale({ documentType: 'Encomenda' })).toBe(true);
        expect(isCountableSale({ documentType: 'Factura' })).toBe(true);
    });
    it('não conta propostas nem pró-formas', () => {
        expect(isCountableSale({ documentType: 'Cotação' })).toBe(false);
        expect(isCountableSale({ documentType: 'Factura Proforma' })).toBe(false);
    });
    it('não conta as apagadas (lixeira)', () => {
        expect(isCountableSale({ documentType: 'Venda a Dinheiro', deletedAt: '2026-10-02T10:00:00Z' })).toBe(false);
    });
});
