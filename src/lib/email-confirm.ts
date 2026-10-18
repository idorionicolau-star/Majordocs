// Antes da primeira venda real de uma conta nova, o responsável confirma que o email é dele (contas com emails falsos
// não chegam a vender). Quem entra com o Google já vem confirmado. Puro, para ser testado.

type CompanyLike = { status?: string; emailVerifiedAt?: string | null } | null | undefined;

/**
 * Precisa de confirmar o email antes desta venda? Só numa conta em teste, sem vendas reais ainda e sem a confirmação
 * registada. Proformas e a venda de demonstração não contam (não são vendas).
 */
export function needsEmailConfirm(company: CompanyLike, realSalesCount: number, opts: { proforma?: boolean; demo?: boolean } = {}): boolean {
    if (!company || opts.proforma || opts.demo) return false;
    if (company.emailVerifiedAt) return false;
    if (company.status !== 'trial') return false; // conta paga (ou antiga) é real
    return realSalesCount === 0;
}

/** Pode registar a confirmação na empresa: é Dono/Admin e o email dele está confirmado. */
export const canMarkVerified = (role: string | undefined, emailVerified: boolean) => emailVerified && (role === 'Admin' || role === 'Dono');
