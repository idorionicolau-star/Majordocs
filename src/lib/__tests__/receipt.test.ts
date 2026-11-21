import { describe, expect, it } from "vitest";
import { receiptHtml, receiptModel } from "../receipt";
import { parsePrintFormat } from "../print-format";
import type { Company, Sale } from "../types";

const sale = (o: Partial<Sale>): Sale => ({
    id: "s1", productId: "p1", productName: "Cimento 32,5", quantity: 2, unit: "saco", unitPrice: 600, subtotal: 1200,
    totalValue: 1200, amountPaid: 1200, date: "2026-11-21T09:05:00", soldBy: "Ana", guideNumber: "VD-000123",
    status: "Levantado", documentType: "Venda a Dinheiro", clientName: "", ...o,
} as Sale);
const company = { name: "Estaleiro Belos Artefatos", taxId: "400123456", phone: "841234567" } as Company;

describe("talão", () => {
    it("junta os artigos da mesma venda e soma bem", () => {
        const m = receiptModel([sale({}), sale({ id: "s2", productName: "Bloco 15", quantity: 100, unit: "un", unitPrice: 45, subtotal: 4500, totalValue: 4500, amountPaid: 4500 })], company);
        expect(m.lines).toHaveLength(2);
        expect(m.total).toBe(5700);
        expect(m.due).toBe(0);
        expect(m.client).toBe("Consumidor final");
        expect(m.status).toBe("Levantado");
        expect(m.date).toBe("21/11/2026 09:05");
    });

    it("desconto, IVA e dívida", () => {
        const m = receiptModel([sale({ discount: 200, vat: 160, amountPaid: 500, status: "Pendente" })], company);
        expect(m.total).toBe(1160);
        expect(m.paid).toBe(500);
        expect(m.due).toBe(660);
        expect(m.status).toBe("Por levantar");
    });

    it("orçamento: sem pagamento nem dívida, com aviso", () => {
        const m = receiptModel([sale({ documentType: "Factura Proforma", amountPaid: 0 })], company);
        expect(m.quote).toBe(true);
        expect(m.due).toBe(0);
        expect(receiptHtml(m, 80)).toContain("NÃO É FACTURA");
    });

    it("papel à largura certa e textos escapados", () => {
        const m = receiptModel([sale({ productName: '<img src=x onerror="alert(1)">', clientName: "Zé & Filhos" })], company);
        const h58 = receiptHtml(m, 58), h80 = receiptHtml(m, 80);
        expect(h58).toContain("size:58mm ");
        expect(h80).toContain("size:80mm ");
        expect(h80).not.toContain("<img src=x");
        expect(h80).toContain("&lt;img src=x");
        expect(h80).toContain("Zé &amp; Filhos");
        expect(h80).toContain("NUIT 400123456");
        expect(h80).toContain("VD-000123");
    });

    it("venda sem internet fica marcada como provisória", () => {
        expect(receiptHtml(receiptModel([sale({ offlinePending: true })], company), 58)).toContain("PROVISÓRIO");
    });

    it("formato de impressão: A4 por defeito", () => {
        expect(parsePrintFormat(null)).toBe("a4");
        expect(parsePrintFormat("80")).toBe("80");
        expect(parsePrintFormat("58")).toBe("58");
        expect(parsePrintFormat("lixo")).toBe("a4");
    });
});
