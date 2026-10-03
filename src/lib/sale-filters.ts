import type { Sale } from '@/lib/types';

/** Documentos que não são vendas: não movem dinheiro nem stock (propostas e pró-formas). */
const NON_SALE_TYPES = ['Factura Proforma', 'Cotação'];

/**
 * Uma venda "a sério" para totais, gráficos e análises: não está na lixeira e não é uma Cotação nem uma
 * Factura Proforma. Antes cada ecrã decidia por si — uns contavam cotações, o painel contava as apagadas.
 */
export const isCountableSale = (s: Pick<Sale, 'documentType'> & { deletedAt?: string }) =>
    !s.deletedAt && !NON_SALE_TYPES.includes(s.documentType);

/**
 * Dinheiro que a venda já trouxe: o que foi pago. Venda sem `amountPaid` (antiga) conta como paga por inteiro.
 * Atenção: `amountPaid || totalValue` estava errado — um 0 (venda a crédito por pagar) virava o valor total.
 */
export const saleIncome = (s: Pick<Sale, 'amountPaid' | 'totalValue'>): number => Number(s.amountPaid ?? s.totalValue) || 0;
