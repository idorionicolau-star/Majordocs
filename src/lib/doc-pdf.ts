// Desenha um documento (DocModel) em PDF com o tema escolhido. Um só motor para todos os documentos da app.
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Company } from './types';
import { docTitle, docTotals, isQuoteLike, itemSubtotal, type DocModel } from './doc-model';
import { hexToRgb, readableOn, themeById, tint, type RGB } from './doc-themes';
import { formatCurrency } from './utils';

// As fontes base do PDF não têm os espaços finos que o Intl usa nos números.
const money = (v: number) => formatCurrency(Number(v) || 0).replace(/[  ]/g, ' ');
const qty = (v: number) => (Number.isInteger(v) ? String(v) : (Number(v) || 0).toLocaleString('pt-PT', { maximumFractionDigits: 3 }));
const fmtDate = (iso?: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

type Img = { data: string; w: number; h: number };

/** Carrega uma imagem (URL ou data URL) para o PDF; devolve null se não der (ex.: CORS ou fora do navegador). */
export async function loadImage(src?: string): Promise<Img | null> {
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

export async function renderDocPDF(m: DocModel, company: Company | null): Promise<jsPDF> {
    if (!m.items.length) throw new Error('Documento sem artigos.');
    const st = m.style || {};
    const theme = themeById(st.theme);
    const accent: RGB = hexToRgb(st.accent) || theme.defaultAccent;
    const on = readableOn(accent);
    const soft = tint(accent, 0.93);
    const mid = tint(accent, 0.7);
    const dark: RGB = [24, 24, 27];
    const grey: RGB = [113, 113, 122];
    const text2: RGB = [82, 82, 91];
    const line: RGB = [228, 228, 231];
    const F = theme.font;

    const title = docTitle(m.type);
    const quote = isQuoteLike(m.type);
    const totals = docTotals(m);
    const hasLineDiscount = m.items.some((i) => (Number(i.discountPct) || 0) > 0);

    const [logo, companySig, clientSig] = await Promise.all([
        st.showLogo === false ? Promise.resolve(null) : loadImage(company?.logoUrl),
        loadImage(st.companySignature || company?.signatureUrl),
        loadImage(st.clientSignature),
    ]);

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const M = theme.header === 'sidebar' ? 22 : 15;
    const R = W - 15; // margem direita
    const setText = (c: RGB) => doc.setTextColor(c[0], c[1], c[2]);
    const setFill = (c: RGB) => doc.setFillColor(c[0], c[1], c[2]);
    const setDraw = (c: RGB) => doc.setDrawColor(c[0], c[1], c[2]);
    const font = (style: 'normal' | 'bold' | 'italic', size: number) => { doc.setFont(F, style); doc.setFontSize(size); };

    doc.setProperties({ title: `${title} ${m.number || ''}`.trim(), author: company?.name || 'MajorStockX', creator: 'MajorStockX' });

    const companyLines = [
        company?.address,
        company?.taxId ? `NUIT: ${company.taxId}` : '',
        [company?.phone, company?.email].filter(Boolean).join(' · '),
    ].filter(Boolean) as string[];
    const banner = quote ? 'ORÇAMENTO / PROPOSTA — NÃO É FACTURA' : m.offlinePending ? 'PROVISÓRIO — SEM INTERNET' : '';

    // ================= cabeçalho =================
    let y = 15;
    if (theme.header === 'sidebar') {
        setFill(accent);
        doc.rect(0, 0, 7, H, 'F');
    }

    const companyBlock = (x: number, top: number, color: RGB, sub: RGB, maxW: number, align: 'left' | 'center' = 'left') => {
        font('bold', theme.header === 'minimal' ? 12 : 15);
        setText(color);
        const nx = align === 'center' ? W / 2 : x;
        doc.text(company?.name || 'MajorStockX', nx, top + 6, { maxWidth: maxW, align });
        font('normal', 8.5);
        setText(sub);
        let cy = top + 11;
        companyLines.forEach((l) => {
            const wrapped = doc.splitTextToSize(l, maxW);
            doc.text(wrapped, nx, cy, { align });
            cy += wrapped.length * 3.8;
        });
        return cy;
    };

    const drawLogo = (x: number, top: number, maxW: number, maxH: number, onWhite = false) => {
        if (!logo) return { w: 0, h: 0 };
        const s = fit(logo, maxW, maxH);
        if (onWhite) { setFill([255, 255, 255]); doc.roundedRect(x - 1.5, top - 1.5, s.w + 3, s.h + 3, 1.5, 1.5, 'F'); }
        doc.addImage(logo.data, 'JPEG', x, top, s.w, s.h);
        return s;
    };

    if (theme.header === 'line' || theme.header === 'sidebar') {
        let textX = M;
        if (logo) { const s = drawLogo(M, y, 32, 18); textX = M + s.w + 4; }
        const cy = companyBlock(textX, y, dark, grey, W / 2 - textX + 15);
        font('bold', 17);
        setText(theme.header === 'sidebar' ? accent : dark);
        doc.text(title.toUpperCase(), R, y + 6, { align: 'right' });
        font('normal', 11);
        setText(grey);
        doc.text(`N.º ${m.number || '—'}`, R, y + 12, { align: 'right' });
        if (banner) { font('bold', 8); setText([133, 77, 14]); doc.text(banner, R, y + 17, { align: 'right' }); }
        y = Math.max(cy, y + 20) + 2;
        setDraw(theme.header === 'sidebar' ? accent : dark);
        doc.setLineWidth(0.6);
        doc.line(M, y, R, y);
        y += 6;
    } else if (theme.header === 'band') {
        setFill(accent);
        doc.rect(0, 0, W, 38, 'F');
        let textX = M;
        if (logo) { const s = drawLogo(M, 8, 30, 18, true); textX = M + s.w + 6; }
        companyBlock(textX, 7, on, tint(on, on[0] === 255 ? 0 : 0.35) as RGB, W / 2 - textX + 15);
        font('bold', 20);
        setText(on);
        doc.text(title.toUpperCase(), R, 17, { align: 'right' });
        font('normal', 11);
        doc.text(`N.º ${m.number || '—'}`, R, 24, { align: 'right' });
        if (banner) { font('bold', 7.5); doc.text(banner, R, 30, { align: 'right' }); }
        y = 38 + 8;
    } else if (theme.header === 'minimal') {
        let textX = M;
        if (logo) { const s = drawLogo(M, y, 26, 14); textX = M + s.w + 4; }
        const cy = companyBlock(textX, y - 1, dark, grey, 85);
        font('normal', 26);
        setText(accent);
        doc.text(title, R, y + 8, { align: 'right' });
        font('normal', 11);
        setText(grey);
        doc.text(`N.º ${m.number || '—'}`, R, y + 15, { align: 'right' });
        if (banner) { font('bold', 7.5); setText([133, 77, 14]); doc.text(banner, R, y + 20, { align: 'right' }); }
        y = Math.max(cy, y + 24) + 8;
    } else if (theme.header === 'centered') {
        if (logo) { const s = fit(logo, 34, 20); doc.addImage(logo.data, 'JPEG', W / 2 - s.w / 2, y, s.w, s.h); y += s.h + 3; }
        const cy = companyBlock(M, y - 3, accent, grey, W - 2 * M, 'center');
        y = cy + 1;
        setDraw(accent);
        doc.setLineWidth(0.8);
        doc.line(M, y, R, y);
        doc.setLineWidth(0.2);
        doc.line(M, y + 1.4, R, y + 1.4);
        y += 9;
        font('bold', 15);
        setText(accent);
        doc.text(title.toUpperCase(), W / 2, y, { align: 'center' });
        font('normal', 11);
        setText(grey);
        doc.text(`N.º ${m.number || '—'}`, W / 2, y + 6, { align: 'center' });
        if (banner) { font('bold', 8); setText([133, 77, 14]); doc.text(banner, W / 2, y + 11, { align: 'center' }); y += 5; }
        y += 14;
    } else {
        // block: bloco de cor no canto superior direito com o título
        setFill(accent);
        doc.rect(W - 92, 0, 92, 36, 'F');
        font('bold', 19);
        setText(on);
        doc.text(title.toUpperCase(), W - 8, 15, { align: 'right', maxWidth: 80 });
        font('normal', 11);
        doc.text(`N.º ${m.number || '—'}`, W - 8, 23, { align: 'right' });
        if (banner) { font('bold', 6.5); doc.text(banner, W - 8, 30, { align: 'right', maxWidth: 82 }); }
        let textX = M;
        if (logo) { const s = drawLogo(M, y, 32, 18); textX = M + s.w + 4; }
        const cy = companyBlock(textX, y, dark, grey, W - 92 - textX - 4);
        y = Math.max(cy, 36) + 3;
        setFill(accent);
        doc.rect(M, y, R - M, 1.2, 'F');
        y += 8;
    }

    // ================= emissão / cliente =================
    const boxW = (W - M - 15 - 6) / 2;
    const clientRows: [string, string][] = [['Nome', m.client.name || 'Consumidor Final']];
    if (m.client.taxId) clientRows.push(['NUIT', m.client.taxId]);
    if (m.client.address) clientRows.push(['Morada', m.client.address]);
    const contact = [m.client.phone, m.client.email].filter(Boolean).join(' · ');
    if (contact) clientRows.push(['Contacto', contact]);
    const issueRows: [string, string][] = [['Data', fmtDate(m.issueDate)]];
    if (m.dueDate) issueRows.push([quote ? 'Válida até' : 'Vencimento', fmtDate(m.dueDate)]);
    if (m.paymentMethod && !quote) issueRows.push(['Pagamento', m.paymentMethod]);
    if (m.operator) issueRows.push(['Operador', m.operator]);

    const box = (x: number, heading: string, rows: [string, string][]) => {
        const h = 9 + rows.length * 5.5;
        if (theme.boxes === 'boxed') {
            setDraw(line);
            setFill([250, 250, 250]);
            doc.setLineWidth(0.3);
            doc.roundedRect(x, y, boxW, h, 2, 2, 'FD');
        } else if (theme.boxes === 'bar') {
            setFill(soft);
            doc.roundedRect(x, y, boxW, h, 1.5, 1.5, 'F');
            setFill(accent);
            doc.rect(x, y, 1.4, h, 'F');
        }
        const px = x + (theme.boxes === 'plain' ? 0 : 4.5);
        const pr = x + boxW - (theme.boxes === 'plain' ? 0 : 4);
        font('bold', 7.5);
        setText(theme.boxes === 'plain' ? accent : grey);
        doc.text(heading.toUpperCase(), px, y + 5.5);
        if (theme.boxes === 'plain') { setDraw(line); doc.setLineWidth(0.25); doc.line(px, y + 7, pr, y + 7); }
        rows.forEach(([k, v], i) => {
            const ry = y + 11.5 + i * 5.5;
            font('normal', 9);
            setText(text2);
            doc.text(k, px, ry);
            setText(dark);
            doc.text(doc.splitTextToSize(v || '—', boxW - 32)[0], pr, ry, { align: 'right' });
        });
        return h;
    };
    const h1 = box(M, 'Detalhes da emissão', issueRows);
    const h2 = box(M + boxW + 6, 'Cliente', clientRows);
    y += Math.max(h1, h2) + 6;

    // ================= artigos =================
    const head = ['Artigo / Descrição', 'Qtd.', 'Preço unit.', ...(hasLineDiscount ? ['Desc.'] : []), 'Subtotal'];
    const body = m.items.map((i) => [
        i.description || '',
        `${qty(Number(i.quantity) || 0)} ${i.unit || 'un'}`,
        money(i.unitPrice),
        ...(hasLineDiscount ? [(Number(i.discountPct) || 0) > 0 ? `${qty(Number(i.discountPct))}%` : ''] : []),
        money(itemSubtotal(i)),
    ]);
    const last = head.length - 1;
    const columnStyles: Record<number, { halign: 'right'; cellWidth: number; fontStyle?: 'bold' }> = {
        1: { halign: 'right', cellWidth: 26 },
        2: { halign: 'right', cellWidth: 32 },
        [last]: { halign: 'right', cellWidth: 34, fontStyle: 'bold' },
    };
    if (hasLineDiscount) columnStyles[3] = { halign: 'right', cellWidth: 18 };

    const tableTheme = theme.table === 'striped' ? 'striped' : theme.table === 'grid' ? 'grid' : 'plain';
    const headFill: RGB | false = theme.table === 'filled' ? accent : theme.table === 'striped' ? soft : theme.table === 'plain' ? ([244, 244, 245] as RGB) : false;
    const headText: RGB = theme.table === 'filled' ? on : theme.table === 'striped' || theme.table === 'grid' ? accent : text2;
    autoTable(doc, {
        startY: y,
        margin: { left: M, right: 15, bottom: 20 },
        head: [head],
        body,
        theme: tableTheme,
        styles: { font: F, fontSize: 9.5, cellPadding: { top: 2.6, bottom: 2.6, left: 3, right: 3 }, textColor: dark, lineColor: theme.table === 'grid' ? mid : line },
        headStyles: {
            ...(headFill ? { fillColor: headFill } : { fillColor: [255, 255, 255] as RGB }),
            textColor: headText, fontStyle: 'bold', fontSize: 8,
            ...(theme.table === 'minimal' ? { lineWidth: { bottom: 0.4 }, lineColor: accent } : {}),
        },
        bodyStyles: theme.table === 'plain' || theme.table === 'filled' ? { lineWidth: { bottom: 0.2 } } : theme.table === 'minimal' ? { lineWidth: { bottom: 0.1 } } : {},
        alternateRowStyles: theme.table === 'striped' || theme.table === 'filled' ? { fillColor: [250, 250, 250] as RGB } : {},
        columnStyles,
        didParseCell: (d) => { if (d.section === 'head' && d.column.index > 0) d.cell.styles.halign = 'right'; },
    });
    y = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || y) + 6;

    const ensure = (need: number) => { if (y + need > H - 20) { doc.addPage(); y = 15; } };

    // ================= totais =================
    const rows: [string, string][] = [['Subtotal', money(totals.subtotal)]];
    if (totals.discount > 0) rows.push(['Desconto', `-${money(totals.discount)}`]);
    if (totals.vat > 0) rows.push([m.vatPct ? `IVA (${qty(m.vatPct)}%)` : 'IVA', money(totals.vat)]);
    const showPaid = !quote && totals.paid > 0 && totals.paid < totals.total - 0.005;
    ensure(rows.length * 6 + 24 + (showPaid ? 12 : 0));
    const tx = R - 80;
    rows.forEach(([k, v]) => {
        font('normal', 9.5);
        setText(text2);
        doc.text(k, tx, y);
        setText(dark);
        doc.text(v, R, y, { align: 'right' });
        y += 6;
    });
    y += 1;
    const totalLabel = quote ? 'Total' : 'Total a pagar';
    if (theme.totals === 'block') {
        setFill(accent);
        doc.roundedRect(tx - 4, y - 5.5, 84, 11, 2, 2, 'F');
        font('bold', 12);
        setText(on);
        doc.text(totalLabel, tx, y + 1.5);
        doc.text(money(totals.total), R - 4, y + 1.5, { align: 'right' });
        y += 12;
    } else {
        setDraw(theme.header === 'centered' || theme.header === 'minimal' ? accent : dark);
        doc.setLineWidth(0.5);
        doc.line(tx, y - 4.5, R, y - 4.5);
        font('bold', 12);
        setText(dark);
        doc.text(totalLabel, tx, y + 1);
        doc.text(money(totals.total), R, y + 1, { align: 'right' });
        y += 9;
    }
    if (showPaid) {
        font('normal', 9.5);
        setText(text2);
        doc.text('Pago', tx, y);
        setText(dark);
        doc.text(money(totals.paid), R, y, { align: 'right' });
        y += 6;
        font('bold', 9.5);
        doc.text('Em dívida', tx, y);
        doc.text(money(totals.total - totals.paid), R, y, { align: 'right' });
        y += 6;
    }
    y += 2;

    // ================= notas e condições =================
    const textBlock = (heading: string, body: string) => {
        const wrapped = doc.splitTextToSize(body, R - M - 8);
        const h = 10 + wrapped.length * 4.3;
        ensure(h + 4);
        setDraw(line);
        setFill(theme.boxes === 'bar' ? soft : [250, 250, 250]);
        doc.setLineWidth(0.3);
        doc.roundedRect(M, y, R - M, h, 2, 2, 'FD');
        font('bold', 7.5);
        setText(theme.boxes === 'plain' ? accent : grey);
        doc.text(heading.toUpperCase(), M + 4, y + 5.5);
        font('normal', 9);
        setText(text2);
        doc.text(wrapped, M + 4, y + 10.5);
        y += h + 5;
    };
    if (m.notes?.trim()) textBlock('Notas', m.notes.trim());
    if (m.paymentTerms?.trim()) textBlock('Condições', m.paymentTerms.trim());
    if (company?.paymentInfo) textBlock('Informações de pagamento', company.paymentInfo);

    // ================= assinaturas =================
    if (st.showSignatures !== false) {
        ensure(32);
        y += 3;
        const sigW = 65;
        const sigY = y + 19;
        const leftX = M + 6;
        const rightX = R - 6 - sigW;
        const place = [st.signaturePlace, fmtDate(m.issueDate)].filter(Boolean).join(', ');
        if (place) { font('italic', 8.5); setText(grey); doc.text(place, M, y); }
        if (companySig) { const s = fit(companySig, sigW, 20); doc.addImage(companySig.data, 'JPEG', leftX + (sigW - s.w) / 2, sigY - s.h - 1, s.w, s.h); }
        if (clientSig) { const s = fit(clientSig, sigW, 20); doc.addImage(clientSig.data, 'JPEG', rightX + (sigW - s.w) / 2, sigY - s.h - 1, s.w, s.h); }
        setDraw(grey);
        doc.setLineWidth(0.3);
        doc.line(leftX, sigY, leftX + sigW, sigY);
        doc.line(rightX, sigY, rightX + sigW, sigY);
        font('normal', 8);
        setText(grey);
        doc.text('A EMPRESA', leftX + sigW / 2, sigY + 4.5, { align: 'center' });
        doc.text('O CLIENTE', rightX + sigW / 2, sigY + 4.5, { align: 'center' });
    }

    // ================= rodapé e marca de água em todas as páginas =================
    const pages = (doc as unknown as { getNumberOfPages(): number }).getNumberOfPages();
    const footer = st.footerNote?.trim() || `${company?.name || 'MajorStockX'} © ${new Date().getFullYear()} · Processado por computador (MajorStockX)`;
    for (let i = 1; i <= pages; i++) {
        doc.setPage(i);
        if (theme.header === 'sidebar') { setFill(accent); doc.rect(0, 0, 7, H, 'F'); }
        setDraw(theme.header === 'centered' ? accent : line);
        doc.setLineWidth(0.3);
        doc.line(M, H - 13, R, H - 13);
        font('normal', 7.5);
        setText(grey);
        doc.text(doc.splitTextToSize(footer, R - M - 30)[0], M, H - 8.5);
        if (pages > 1) doc.text(`Página ${i} de ${pages}`, R, H - 8.5, { align: 'right' });
        if (st.watermark) {
            const d: any = doc; // as definições de tipos do jsPDF não trazem o estado gráfico
            d.saveGraphicsState();
            if (d.GState) d.setGState(new d.GState({ opacity: 0.09 }));
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(Math.min(90, 460 / Math.max(5, st.watermark.length)));
            setText(accent);
            doc.text(st.watermark, W / 2, H / 2 + 10, { align: 'center', angle: 40 });
            d.restoreGraphicsState();
        }
    }
    return doc;
}
