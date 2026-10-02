import type { Sale } from '@/lib/types';

/** Documentos que não são vendas: não movem dinheiro nem stock (propostas e pró-formas). */
const NON_SALE_TYPES = ['Factura Proforma', 'Cotação'];

/**
 * Uma venda "a sério" para totais, gráficos e análises: não está na lixeira e não é uma Cotação nem uma
 * Factura Proforma. Antes cada ecrã decidia por si — uns contavam cotações, o painel contava as apagadas.
 */
export const isCountableSale = (s: Pick<Sale, 'documentType'> & { deletedAt?: string }) =>
    !s.deletedAt && !NON_SALE_TYPES.includes(s.documentType);
