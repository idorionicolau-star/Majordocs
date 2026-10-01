// Documento de venda (factura, recibo, guia, proforma…) como PDF verdadeiro.
// Antes "Guardar PDF" abria só a janela de impressão do browser.
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Company, Sale } from './types';
import { formatCurrency } from './utils';

// As fontes base do PDF não têm os espaços finos que o Intl usa nos números.
const money = (v: number) => formatCurrency(Number(v) || 0).replace(/[  ]/g, ' ');
const qty = (v: number) => (Number.isInteger(v) ? String(v) : (Number(v) || 0).toLocaleString('pt-PT', { maximumFractionDigits: 3 }));
const fmtDate = (iso: string) => {
    const d = new Date(iso);
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export function saleDocTitle(type?: Sale['documentType']) {
    switch (type) {
        case 'Factura Proforma': return 'Factura Proforma';
        case 'Cotação': return 'Cotação';
        case 'Venda a Dinheiro': return 'Venda a Dinheiro';
        case 'Guia de Remessa': return 'Guia de Remessa';
        case 'Recibo': return 'Recibo';
        default: return 'Factura';
    }
}

export function saleDocFileName(sale: Pick<Sale, 'documentType' | 'guideNumber'>) {
    const safe = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w.-]+/g, '_').replace(/_+/g, '_');
    return `${safe(saleDocTitle(sale.documentType))}_${safe(sale.guideNumber || 'sem-numero')}.pdf`;
}

/** Totais do documento — mesma conta que o documento impresso. */
export function saleDocTotals(sales: Sale[]) {
    const subtotal = sales.reduce((t, s) => t + (Number(s.subtotal) || (Number(s.quantity) || 0) * (Number(s.unitPrice) || 0)), 0);
    const discount = sales.reduce((t, s) => t + (Number(s.discount) || 0), 0);
    const vat = sales.reduce((t, s) => t + (Number(s.vat) || 0), 0);
    const total = subtotal - discount + vat;
    const paid = sales.reduce((t, s) => t + (Number(s.amountPaid) || 0), 0);
    return { subtotal, discount, vat, total, paid };
}

/** Carrega uma imagem (URL ou data URL) para o PDF; devolve null se não der (ex.: CORS). */
async function loadImage(src?: string): Promise<{ data: string; w: number; h: number } | null> {
    if (!src || typeof window === 'undefined') return null;
    try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = src;
        await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error('imagem'));
            setTimeout(() => reject(new Error('tempo')), 6000);
        });
        if (!img.naturalWidth) return null;
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        return { data: canvas.toDataURL('image/jpeg', 0.92), w: img.naturalWidth, h: img.naturalHeight };
    } catch {
        return null;
    }
}

const fit = (img: { w: number; h: number }, maxW: number, maxH: number) => {
    const r = Math.min(maxW / img.w, maxH / img.h);
    return { w: img.w * r, h: img.h * r };
};

export async function buildSaleDocumentPDF(saleOrSales: Sale | Sale[], company: Company | null): Promise<jsPDF> {
    const sales = (Array.isArray(saleOrSales) ? saleOrSales : [saleOrSales]).filter(Boolean);
    if (!sales.length) throw new Error('Documento sem artigos.');
    const sale = sales[0];
    const isProforma = sale.documentType === 'Factura Proforma' || sale.documentType === 'Cotação';
    const title = saleDocTitle(sale.documentType);
    const { subtotal, discount, vat, total, paid } = saleDocTotals(sales);
    const [logo, signature] = await Promise.all([loadImage(company?.logoUrl), loadImage(company?.signatureUrl)]);

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const M = 15;
    const dark: [number, number, number] = [24, 24, 27];
    const grey: [number, number, number] = [113, 113, 122];
    const line: [number, number, number] = [228, 228, 231];

    doc.setProperties({ title: `${title} ${sale.guideNumber || ''}`.trim(), author: company?.name || 'MajorStockX', creator: 'MajorStockX' });

    // ---------- cabeçalho ----------
    let y = M;
    let textX = M;
    if (logo) {
        const s = fit(logo, 32, 18);
        doc.addImage(logo.data, 'JPEG', M, y, s.w, s.h);
        textX = M + s.w + 4;
    }
    doc.setTextColor(...dark);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text(company?.name || 'MajorStockX', textX, y + 6, { maxWidth: W / 2 - textX + M });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...grey);
    const companyLines = [
        company?.address,
        company?.taxId ? `NUIT: ${company.taxId}` : '',
        [company?.phone, company?.email].filter(Boolean).join(' · '),
    ].filter(Boolean) as string[];
    let cy = y + 11;
    companyLines.forEach((l) => {
        const wrapped = doc.splitTextToSize(l, W / 2 - textX + M);
        doc.text(wrapped, textX, cy);
        cy += wrapped.length * 3.8;
    });

    doc.setTextColor(...dark);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(17);
    doc.text(title.toUpperCase(), W - M, y + 6, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(...grey);
    doc.text(`N.º ${sale.guideNumber || '—'}`, W - M, y + 12, { align: 'right' });
    if (isProforma || sale.offlinePending) {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(133, 77, 14);
        doc.text(isProforma ? 'ORÇAMENTO / PROPOSTA — NÃO É FACTURA' : 'PROVISÓRIO — SEM INTERNET', W - M, y + 17, { align: 'right' });
    }

    y = Math.max(cy, y + 20) + 2;
    doc.setDrawColor(...dark);
    doc.setLineWidth(0.6);
    doc.line(M, y, W - M, y);
    y += 6;

    // ---------- emissão / cliente ----------
    const boxW = (W - 2 * M - 6) / 2;
    const box = (x: number, heading: string, rows: [string, string][]) => {
        const h = 9 + rows.length * 5.5;
        doc.setDrawColor(...line);
        doc.setFillColor(250, 250, 250);
        doc.setLineWidth(0.3);
        doc.roundedRect(x, y, boxW, h, 2, 2, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(...grey);
        doc.text(heading.toUpperCase(), x + 4, y + 5.5);
        rows.forEach(([k, v], i) => {
            const ry = y + 11 + i * 5.5;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.setTextColor(82, 82, 91);
            doc.text(k, x + 4, ry);
            doc.setTextColor(...dark);
            doc.text(doc.splitTextToSize(v || '—', boxW - 30)[0], x + boxW - 4, ry, { align: 'right' });
        });
        return h;
    };
    const issue: [string, string][] = [['Data', fmtDate(sale.date)]];
    if (sale.paymentMethod && !isProforma) issue.push(['Pagamento', sale.paymentMethod]);
    if (sale.soldBy) issue.push(['Operador', sale.soldBy]);
    const client: [string, string][] = [['Nome', sale.clientName || 'Consumidor Final']];
    const h1 = box(M, 'Detalhes da emissão', issue);
    const h2 = box(M + boxW + 6, 'Cliente', client);
    y += Math.max(h1, h2) + 6;

    // ---------- artigos ----------
    autoTable(doc, {
        startY: y,
        margin: { left: M, right: M, bottom: 20 },
        head: [['Artigo / Descrição', 'Qtd.', 'Preço unit.', 'Subtotal']],
        body: sales.map((s) => [
            s.productName || '',
            `${qty(Number(s.quantity) || 0)} ${s.unit || 'un'}`,
            money(s.unitPrice),
            money(Number(s.subtotal) || (Number(s.quantity) || 0) * (Number(s.unitPrice) || 0)),
        ]),
        theme: 'plain',
        styles: { font: 'helvetica', fontSize: 9.5, cellPadding: { top: 2.6, bottom: 2.6, left: 3, right: 3 }, textColor: dark, lineColor: line },
        headStyles: { fillColor: [244, 244, 245], textColor: [82, 82, 91], fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { lineWidth: { bottom: 0.2 } },
        columnStyles: { 1: { halign: 'right', cellWidth: 26 }, 2: { halign: 'right', cellWidth: 32 }, 3: { halign: 'right', cellWidth: 34, fontStyle: 'bold' } },
        didParseCell: (d) => { if (d.section === 'head' && d.column.index > 0) d.cell.styles.halign = 'right'; },
    });
    y = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || y) + 6;

    const ensure = (need: number) => {
        if (y + need > H - 20) { doc.addPage(); y = M; }
    };

    // ---------- totais ----------
    const rows: [string, string, boolean?][] = [['Subtotal', money(subtotal)]];
    if (discount > 0) rows.push(['Desconto', `-${money(discount)}`]);
    if (vat > 0) rows.push(['IVA', money(vat)]);
    rows.push([isProforma ? 'Total' : 'Total a pagar', money(total), true]);
    if (!isProforma && paid > 0 && paid < total - 0.005) {
        rows.push(['Pago', money(paid)]);
        rows.push(['Em dívida', money(total - paid)]);
    }
    ensure(rows.length * 7 + 6);
    const tx = W - M - 80;
    rows.forEach(([k, v, strong]) => {
        if (strong) {
            y += 2;
            doc.setDrawColor(...dark);
            doc.setLineWidth(0.5);
            doc.line(tx, y - 4, W - M, y - 4);
        }
        doc.setFont('helvetica', strong ? 'bold' : 'normal');
        doc.setFontSize(strong ? 12 : 9.5);
        doc.setTextColor(...(strong ? dark : ([82, 82, 91] as [number, number, number])));
        doc.text(k, tx, y);
        doc.setTextColor(...dark);
        doc.text(v, W - M, y, { align: 'right' });
        y += strong ? 8 : 6;
    });
    y += 2;

    // ---------- nota ----------
    const notes = sales.map((s) => s.notes).filter(Boolean).join(' · ');
    if (notes) {
        const wrapped = doc.splitTextToSize(`Nota: ${notes}`, W - 2 * M);
        ensure(wrapped.length * 4.5 + 4);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(82, 82, 91);
        doc.text(wrapped, M, y);
        y += wrapped.length * 4.5 + 4;
    }

    // ---------- pagamento ----------
    if (company?.paymentInfo) {
        const wrapped = doc.splitTextToSize(company.paymentInfo, W - 2 * M - 8);
        const h = 10 + wrapped.length * 4.3;
        ensure(h + 4);
        doc.setDrawColor(...line);
        doc.setFillColor(250, 250, 250);
        doc.setLineWidth(0.3);
        doc.roundedRect(M, y, W - 2 * M, h, 2, 2, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(...grey);
        doc.text('INFORMAÇÕES DE PAGAMENTO', M + 4, y + 5.5);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(82, 82, 91);
        doc.text(wrapped, M + 4, y + 10.5);
        y += h + 6;
    }

    // ---------- assinaturas ----------
    ensure(34);
    y = Math.max(y + 6, y);
    const sigW = 65;
    const sigY = y + 18;
    const leftX = M + 10;
    const rightX = W - M - 10 - sigW;
    if (signature) {
        const s = fit(signature, sigW, 18);
        doc.addImage(signature.data, 'JPEG', leftX + (sigW - s.w) / 2, sigY - s.h - 1, s.w, s.h);
    }
    doc.setDrawColor(...grey);
    doc.setLineWidth(0.3);
    doc.line(leftX, sigY, leftX + sigW, sigY);
    doc.line(rightX, sigY, rightX + sigW, sigY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...grey);
    doc.text('A EMPRESA', leftX + sigW / 2, sigY + 4.5, { align: 'center' });
    doc.text('O CLIENTE', rightX + sigW / 2, sigY + 4.5, { align: 'center' });

    // ---------- rodapé em todas as páginas ----------
    const pages = (doc as unknown as { getNumberOfPages(): number }).getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
        doc.setPage(i);
        doc.setDrawColor(...line);
        doc.setLineWidth(0.3);
        doc.line(M, H - 13, W - M, H - 13);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(...grey);
        doc.text(`${company?.name || 'MajorStockX'} © ${new Date().getFullYear()} · Processado por computador (MajorStockX)`, M, H - 8.5);
        if (pages > 1) doc.text(`Página ${i} de ${pages}`, W - M, H - 8.5, { align: 'right' });
    }
    return doc;
}

/** Gera e descarrega o ficheiro .pdf do documento. */
export async function downloadSaleDocumentPDF(saleOrSales: Sale | Sale[], company: Company | null) {
    const sales = Array.isArray(saleOrSales) ? saleOrSales : [saleOrSales];
    const doc = await buildSaleDocumentPDF(sales, company);
    doc.save(saleDocFileName(sales[0]));
}
