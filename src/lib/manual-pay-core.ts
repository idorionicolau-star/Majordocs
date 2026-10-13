// Pagamento directo (manual) da subscrição: o cliente envia por M-Pesa ou e-Mola para os números da MajorStockX,
// manda o comprovativo por WhatsApp e o super-administrador confirma — a conta é activada nesse momento.
// Lógica pura (sem Firebase), para ser testada. O cartão continua pela ZumboPay.

export const MANUAL_METHODS = {
    mpesa: { label: 'M-Pesa', number: '843641708', display: '84 364 1708' },
    emola: { label: 'e-Mola', number: '872979951', display: '87 297 9951' },
} as const;

export type ManualMethod = keyof typeof MANUAL_METHODS;

export const isManualMethod = (m: unknown): m is ManualMethod => typeof m === 'string' && Object.prototype.hasOwnProperty.call(MANUAL_METHODS, m);

/** Referência do pagamento: curta, para o cliente escrever na mensagem da transferência. */
export function paymentReference(companyId: string, now: Date): string {
    return `MSX${now.getTime().toString(36).toUpperCase()}${companyId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase()}`;
}

/** A mensagem do comprovativo, já preenchida, para o WhatsApp. */
export function manualProofMessage(p: { company?: string | null; email?: string | null; plan: string; amount: string; method: ManualMethod; reference: string }): string {
    return [
        'Olá, paguei a subscrição da MajorStockX.',
        p.company ? `Empresa: ${p.company}` : '',
        p.email ? `Email: ${p.email}` : '',
        `Plano: ${p.plan}`,
        `Valor: ${p.amount}`,
        `Pago por: ${MANUAL_METHODS[p.method].label}`,
        `Referência: ${p.reference}`,
        '',
        '(Envio a seguir o comprovativo.)',
    ].filter((l, i, a) => l !== '' || (i > 0 && a[i - 1] !== '')).join('\n');
}
