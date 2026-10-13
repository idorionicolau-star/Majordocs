import { describe, it, expect } from 'vitest';
import { isManualMethod, manualProofMessage, MANUAL_METHODS, paymentReference } from '@/lib/manual-pay-core';

describe('Pagamento directo', () => {
    it('números de M-Pesa e e-Mola', () => {
        expect(MANUAL_METHODS.mpesa.number).toBe('843641708');
        expect(MANUAL_METHODS.emola.number).toBe('872979951');
        expect(isManualMethod('mpesa')).toBe(true);
        expect(isManualMethod('card')).toBe(false);
        expect(isManualMethod('toString')).toBe(false);
    });
    it('referência curta com a empresa', () => {
        expect(paymentReference('c1-ab', new Date(0))).toBe('MSX0C1AB');
        expect(paymentReference('xyz', new Date(1_700_000_000_000))).toMatch(/^MSX[0-9A-Z]+XYZ$/);
    });
    it('mensagem do comprovativo', () => {
        const m = manualProofMessage({ company: 'Tapete Vermelho', email: 'a@b.com', plan: 'Mensal', amount: '1.000,00 MT', method: 'emola', reference: 'MSX1' });
        expect(m).toContain('Empresa: Tapete Vermelho');
        expect(m).toContain('Pago por: e-Mola');
        expect(m).toContain('Referência: MSX1');
        expect(manualProofMessage({ plan: 'Anual', amount: '1 MT', method: 'mpesa', reference: 'R' })).not.toContain('Empresa');
    });
});
