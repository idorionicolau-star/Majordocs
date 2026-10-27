// Desenha um documento (DocModel) em PDF com o tema escolhido. Um só motor para todos os documentos da app.
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Company } from './types';
import { docTitle, docTotals, isQuoteLike, itemSubtotal, type DocModel } from './doc-model';
import { hexToRgb, isDecor, readableOn, themeById, tint, type RGB } from './doc-themes';
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
const decode = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('imagem'));
    setTimeout(() => reject(new Error('tempo')), 6000);
    img.src = src;
});

/**
 * Carrega uma imagem (URL ou data URL) para o PDF; devolve null se não der.
 * Se o endereço directo falhar (sem CORS), tenta pelo nosso servidor (só para imagens do Vercel Blob).
 */
export async function loadImage(src?: string): Promise<Img | null> {
    if (!src || typeof window === 'undefined') return null;
    let img: HTMLImageElement | null = null;
    try { img = await decode(src); } catch {
        if (/^https:\/\/[^/]+\.public\.blob\.vercel-storage\.com\//.test(src)) {
            try { img = await decode(`/api/image-proxy?url=${encodeURIComponent(src)}`); } catch { /* sem logótipo */ }
        }
    }
    if (!img?.naturalWidth) return null;
    try {
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
        return null; // canvas "contaminado" (CORS)
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
    const D = theme.header;
    const decor = isDecor(D);
    const hl: RGB = theme.highlight || [250, 204, 21];
    const charcoal: RGB = [38, 38, 48];
    const MR = D === 'frame' ? 20 : 15; // margem direita
    const M = D === 'sidebar' ? 22 : D === 'frame' ? 20 : 15;
    const R = W - MR;
    // onde começa o conteúdo nas páginas seguintes, e até onde pode ir (os desenhos do topo e do rodapé não o tapam)
    const pageTop = ({ wave: 26, card: 16, frame: 20, stripes: 18, hatch: 16, corner: 26, circles: 20 } as Record<string, number>)[D] ?? 15;
    const bottomLimit = ({ wave: 26, card: 24, frame: 24, corner: 26, circles: 26 } as Record<string, number>)[D] ?? 20;
    const setText = (c: RGB) => doc.setTextColor(c[0], c[1], c[2]);
    const setFill = (c: RGB) => doc.setFillColor(c[0], c[1], c[2]);
    const setDraw = (c: RGB) => doc.setDrawColor(c[0], c[1], c[2]);
    const font = (style: 'normal' | 'bold' | 'italic', size: number) => { doc.setFont(F, style); doc.setFontSize(size); };
    /** Polígono cheio a partir de pontos absolutos. */
    const poly = (pts: [number, number][]) => {
        const segs = pts.slice(1).map((p, i) => [p[0] - pts[i][0], p[1] - pts[i][1]]);
        doc.lines(segs, pts[0][0], pts[0][1], [1, 1], 'F', true);
    };
    /** Caminho com curvas: cada passo é [x, y] (recta) ou [c1x, c1y, c2x, c2y, x, y] (curva), tudo absoluto. */
    const shape = (start: [number, number], steps: number[][]) => {
        let cx = start[0], cy = start[1];
        const segs = steps.map((st) => {
            const rel = st.map((v, i) => v - (i % 2 === 0 ? cx : cy));
            cx = st[st.length - 2]; cy = st[st.length - 1];
            return rel;
        });
        doc.lines(segs, start[0], start[1], [1, 1], 'F', true);
    };
    /** Riscas finas a 45° dentro de um rectângulo. */
    const hatch = (x: number, y0: number, w: number, h: number, c: RGB, step = 2.2) => {
        setDraw(c);
        doc.setLineWidth(0.15);
        for (let k = -h; k < w; k += step) {
            let x1 = x + k, y1 = y0 + h, x2 = x + k + h, y2 = y0;
            if (x1 < x) { y1 -= x - x1; x1 = x; }
            if (x2 > x + w) { y2 += x2 - (x + w); x2 = x + w; }
            if (x1 < x2) doc.line(x1, y1, x2, y2);
        }
    };

    doc.setProperties({ title: `${title} ${m.number || ''}`.trim(), author: company?.name || 'MajorStockX', creator: 'MajorStockX' });

    const companyLines = [
        company?.address,
        company?.taxId ? `NUIT: ${company.taxId}` : '',
        [company?.phone, company?.email].filter(Boolean).join(' · '),
    ].filter(Boolean) as string[];
    const banner = quote ? 'ORÇAMENTO / PROPOSTA — NÃO É FACTURA' : m.offlinePending ? 'PROVISÓRIO — SEM INTERNET' : '';

    // linhas do cliente (os cabeçalhos "cartão" e "moldura" mostram-nas no topo)
    const clientInfo = [m.client.taxId ? `NUIT: ${m.client.taxId}` : '', m.client.address || '', [m.client.phone, m.client.email].filter(Boolean).join(' · ')].filter(Boolean);
    const totalLabelTop = quote ? 'Total' : 'Total a pagar';

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

    const initials = (company?.name || 'M').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('');
    /** Os cabeçalhos com desenho próprio. Devolve onde começa o conteúdo. */
    function decorHeader(): number {
        const titleU = title.toUpperCase();
        const num = `N.º ${m.number || '—'}`;
        if (D === 'wave') {
            setFill(tint(accent, 0.86));
            shape([0, 0], [[W, 0], [W, 24], [W * 0.62, 30, W * 0.3, 96, 0, 88]]);
            setFill(accent);
            shape([0, 0], [[W * 0.64, 0], [W * 0.46, 10, W * 0.38, 62, 0, 72]]);
            let tx = M;
            if (logo) { const s = drawLogo(M, 11, 26, 15, true); tx = M + s.w + 5; }
            companyBlock(tx, 9, on, tint(on, on[0] === 255 ? 0.15 : 0.35), 74 - (tx - M));
            font('bold', 22); setText(accent); doc.text(titleU, R, 21, { align: 'right' });
            font('normal', 10.5); setText(grey); doc.text(num, R, 28, { align: 'right' });
            if (banner) { font('bold', 7.5); setText([133, 77, 14]); doc.text(banner, R, 33, { align: 'right' }); }
            return 80;
        }
        if (D === 'card') {
            setFill(accent); doc.rect(0, 0, W, 74, 'F');
            setFill(tint(accent, 0.12)); doc.circle(W - 8, -6, 46, 'F');
            setFill(tint(accent, 0.2)); doc.circle(W - 42, 62, 18, 'F');
            let tx = M;
            if (logo) { const s = drawLogo(M, 11, 26, 15, true); tx = M + s.w + 5; }
            companyBlock(tx, 9, on, tint(on, on[0] === 255 ? 0.18 : 0.35), 100 - (tx - M));
            font('bold', 20); setText(on); doc.text(titleU, R, 19, { align: 'right' });
            font('normal', 10.5); doc.text(num, R, 26, { align: 'right' });
            if (banner) { font('bold', 7); doc.text(banner, R, 31, { align: 'right' }); }
            const sub = tint(on, on[0] === 255 ? 0.25 : 0.35);
            font('normal', 7.5); setText(sub); doc.text(quote ? 'PROPOSTA PARA' : 'FATURADO A', M, 40);
            font('bold', 12.5); setText(on); doc.text(doc.splitTextToSize(m.client.name || 'Consumidor Final', 95)[0], M, 46.5);
            font('normal', 8.5); setText(sub);
            clientInfo.slice(0, 3).forEach((l, i) => doc.text(doc.splitTextToSize(l, 95)[0], M, 51.5 + i * 4));
            const cols: [string, string][] = [['DATA', fmtDate(m.issueDate)]];
            if (m.dueDate) cols.push([quote ? 'VÁLIDA ATÉ' : 'VENCIMENTO', fmtDate(m.dueDate)]);
            cols.forEach(([k, v], i) => {
                const cx = R - (cols.length - 1 - i) * 30;
                font('normal', 7.5); setText(sub); doc.text(k, cx, 40, { align: 'right' });
                font('bold', 10.5); setText(on); doc.text(v, cx, 46.5, { align: 'right' });
            });
            if (m.paymentMethod && !quote) { font('normal', 8.5); setText(sub); doc.text(`Pagamento: ${m.paymentMethod}`, R, 52, { align: 'right' }); }
            // o cartão onde assenta o cabeçalho da tabela
            setFill([205, 208, 216]); doc.roundedRect(M + 0.9, 64.4, R - M, 15, 4, 4, 'F');
            setFill([255, 255, 255]); doc.roundedRect(M, 63, R - M, 15, 4, 4, 'F');
            return 64.5;
        }
        if (D === 'frame') {
            setFill(accent); doc.rect(0, 0, W, 78, 'F');
            font('bold', 9);
            const tw = doc.getTextWidth(titleU) + titleU.length * 1.2 + 8;
            setFill(hl); doc.rect(M, 12, tw, 8, 'F');
            setText(dark); doc.text(titleU, M + 4, 17.4, { charSpace: 1.2 });
            const sub = tint(on, on[0] === 255 ? 0.25 : 0.35);
            font('normal', 8.5); setText(sub);
            doc.text([num, `Data: ${fmtDate(m.issueDate)}${m.dueDate ? ` · ${quote ? 'Válida até' : 'Vencimento'}: ${fmtDate(m.dueDate)}` : ''}`], M, 27);
            font('normal', 7.5); doc.text(quote ? 'PROPOSTA PARA' : 'FATURADO A', M, 41);
            font('bold', 15); setText(on); doc.text(doc.splitTextToSize(m.client.name || 'Consumidor Final', 100)[0], M, 48);
            font('normal', 8.5); setText(sub);
            clientInfo.slice(0, 3).forEach((l, i) => doc.text(doc.splitTextToSize(l, 100)[0], M, 53.5 + i * 4));
            setDraw(sub); doc.setLineWidth(0.3); doc.line(M, 67, M + 70, 67);
            let ty = 14;
            if (logo) { const s = fit(logo, 30, 14); setFill([255, 255, 255]); doc.roundedRect(R - s.w - 1.5, 10.5, s.w + 3, s.h + 3, 1.5, 1.5, 'F'); doc.addImage(logo.data, 'JPEG', R - s.w, 12, s.w, s.h); ty = 12 + s.h + 5; }
            font('bold', 12); setText(on); doc.text(company?.name || 'MajorStockX', R, ty + 2, { align: 'right' });
            font('normal', 7.5); setText(sub);
            companyLines.forEach((l, i) => doc.text(doc.splitTextToSize(l, 70)[0], R, ty + 6.5 + i * 3.6, { align: 'right' }));
            font('normal', 10); setText(on); doc.text(totalLabelTop, R, 55, { align: 'right' });
            font('bold', 20); setText(hl); doc.text(money(totals.total), R, 64, { align: 'right' });
            if (banner) { font('bold', 7); setText(hl); doc.text(banner, R, 70, { align: 'right' }); }
            return 86;
        }
        if (D === 'stripes') {
            setFill(charcoal); doc.rect(0, 0, W, 14, 'F');
            setFill(accent); poly([[0, 0], [46, 0], [36, 14], [0, 14]]);
            setFill(tint(accent, 0.35)); poly([[50, 0], [58, 0], [48, 14], [40, 14]]);
            setFill(accent); poly([[62, 0], [66, 0], [56, 14], [52, 14]]);
            setFill(accent); doc.rect(W * 0.55, 14, W * 0.45, 1.3, 'F');
            let tx = M;
            if (logo) { const s = drawLogo(M, 21, 28, 16); tx = M + s.w + 4; }
            const cy = companyBlock(tx, 20, dark, grey, 100 - (tx - M));
            font('bold', 20); setText(charcoal); doc.text(titleU, R, 33, { align: 'right', charSpace: 1.6 });
            font('normal', 10.5); setText(accent); doc.text(num, R, 40, { align: 'right' });
            if (banner) { font('bold', 7.5); setText([133, 77, 14]); doc.text(banner, R, 45, { align: 'right' }); }
            return Math.max(cy, 46) + 4;
        }
        if (D === 'hatch') {
            hatch(0, 0, W, 10, [205, 205, 214]);
            setFill(accent); doc.rect(W * 0.5, 10, W * 0.5, 0.9, 'F');
            let tx = M;
            if (logo) { const s = drawLogo(M, 17, 26, 15); tx = M + s.w + 4; }
            else { setFill(accent); doc.circle(M + 7, 25, 7, 'F'); font('bold', 9); setText(on); doc.text(initials, M + 7, 26.6, { align: 'center' }); tx = M + 18; }
            const cy = companyBlock(tx, 17, dark, grey, 100 - (tx - M));
            font('bold', 24); setText(dark); doc.text(title, R, 31, { align: 'right' });
            const tw = doc.getTextWidth(title);
            setText(accent); doc.text('.', R - tw - 1.6, 31, { align: 'right' });
            setDraw(accent); doc.setLineWidth(0.8); doc.line(R - 62, 18, R, 18);
            font('normal', 10.5); setText(grey); doc.text(num, R, 38, { align: 'right' });
            if (banner) { font('bold', 7.5); setText([133, 77, 14]); doc.text(banner, R, 43, { align: 'right' }); }
            const ly = Math.max(cy, 46) + 2;
            setDraw(accent); doc.setLineWidth(0.5); doc.line(M, ly, R, ly);
            setDraw(line); doc.setLineWidth(0.2); doc.line(M, ly + 1.2, R, ly + 1.2);
            return ly + 7;
        }
        if (D === 'corner') {
            setFill(tint(accent, 0.8)); poly([[W - 98, 0], [W, 0], [W, 80]]);
            setFill(accent); poly([[W - 68, 0], [W, 0], [W, 56]]);
            let tx = M;
            if (logo) { const s = drawLogo(M, 14, 28, 16); tx = M + s.w + 4; }
            const cy = companyBlock(tx, 13, dark, grey, 92 - (tx - M));
            const ty = Math.max(cy, 32) + 9;
            font('bold', 26); setText(accent); doc.text(titleU, M, ty);
            font('normal', 10.5); setText(grey); doc.text(num, M, ty + 7);
            if (banner) { font('bold', 7.5); setText([133, 77, 14]); doc.text(banner, M, ty + 12); }
            return ty + (banner ? 19 : 15);
        }
        // circles
        setFill(tint(accent, 0.86)); doc.circle(W - 6, 2, 44, 'F');
        setFill(tint(accent, 0.6)); doc.circle(W - 46, -8, 22, 'F');
        setFill(accent); doc.circle(W - 3, 44, 15, 'F');
        let tx = M;
        if (logo) { const s = drawLogo(M, 14, 28, 16); tx = M + s.w + 4; }
        const cy = companyBlock(tx, 13, dark, grey, 92 - (tx - M));
        const ty = Math.max(cy, 32) + 9;
        font('bold', 26); setText(accent); doc.text(title, M, ty);
        font('normal', 10.5); setText(grey); doc.text(num, M, ty + 7);
        if (banner) { font('bold', 7.5); setText([133, 77, 14]); doc.text(banner, M, ty + 12); }
        return ty + (banner ? 19 : 15);
    }

    if (decor) {
        y = decorHeader();
    } else if (theme.header === 'line' || theme.header === 'sidebar') {
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
    const boxW = (R - M - 6) / 2;
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
    // "cartão" e "moldura" já mostram o cliente e as datas no topo
    if (D !== 'card' && D !== 'frame') {
        const h1 = box(M, 'Detalhes da emissão', issueRows);
        const h2 = box(M + boxW + 6, 'Cliente', clientRows);
        y += Math.max(h1, h2) + 6;
        if (D === 'hatch') {
            // total em destaque ao lado do cliente, como nos estúdios de design
            const bx = M + boxW + 6;
            setFill(accent); doc.rect(bx, y - 3, R - bx, 9, 'F');
            font('bold', 8); setText(on); doc.text(totalLabelTop.toUpperCase(), bx + 4, y + 2.6);
            font('bold', 11); doc.text(money(totals.total), R - 4, y + 2.8, { align: 'right' });
            y += 12;
        }
    }

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
    let headFill: RGB | false = theme.table === 'filled' ? accent : theme.table === 'striped' ? soft : theme.table === 'plain' ? ([244, 244, 245] as RGB) : false;
    let headText: RGB = theme.table === 'filled' ? on : theme.table === 'striped' || theme.table === 'grid' ? accent : text2;
    // cabeçalhos da tabela próprios de alguns temas
    if (D === 'card') { headFill = [255, 255, 255]; headText = accent; }
    if (D === 'frame') { headFill = hl; headText = readableOn(hl); }
    if (D === 'stripes') { headFill = charcoal; headText = [255, 255, 255]; }
    if (D === 'hatch') { headFill = false; headText = accent; }
    autoTable(doc, {
        startY: y,
        margin: { top: pageTop, left: M, right: MR, bottom: bottomLimit },
        head: [head],
        body,
        theme: tableTheme,
        styles: { font: F, fontSize: 9.5, cellPadding: { top: 2.6, bottom: 2.6, left: 3, right: 3 }, textColor: dark, lineColor: theme.table === 'grid' ? mid : line },
        headStyles: {
            ...(headFill ? { fillColor: headFill } : { fillColor: [255, 255, 255] as RGB }),
            textColor: headText, fontStyle: 'bold', fontSize: 8,
            ...(theme.table === 'minimal' ? { lineWidth: { bottom: 0.4 }, lineColor: accent } : {}),
            ...(D === 'card' ? { cellPadding: { top: 4.3, bottom: 4.3, left: 3, right: 3 } } : {}),
            ...(D === 'hatch' ? { lineWidth: { top: 0.4, bottom: 0.4 }, lineColor: accent } : {}),
        },
        bodyStyles: theme.table === 'plain' || theme.table === 'filled' ? { lineWidth: { bottom: 0.2 } } : theme.table === 'minimal' ? { lineWidth: { bottom: 0.1 } } : {},
        alternateRowStyles: theme.table === 'striped' || theme.table === 'filled' ? { fillColor: [250, 250, 250] as RGB } : {},
        columnStyles,
        didParseCell: (d) => { if (d.section === 'head' && d.column.index > 0) d.cell.styles.halign = 'right'; },
        willDrawCell: (d) => { if (D === 'hatch' && d.section === 'head') hatch(d.cell.x, d.cell.y, d.cell.width, d.cell.height, [222, 222, 230]); },
    });
    y = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || y) + 6;

    const ensure = (need: number) => { if (y + need > H - bottomLimit) { doc.addPage(); y = pageTop; } };

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
        const withClient = st.showClientSignature === true;
        ensure(40);
        y += 3;
        const sigW = 65;
        // o local e a data ficam por cima, com espaço próprio: o carimbo/assinatura (até 20 mm) já não os tapa
        const place = [st.signaturePlace, fmtDate(m.issueDate)].filter(Boolean).join(', ');
        // só a empresa: carimbo e data ao centro; com o cliente, data à esquerda e uma assinatura de cada lado
        if (place) { font('italic', 8.5); setText(grey); doc.text(place, withClient ? M : W / 2, y, withClient ? undefined : { align: 'center' }); y += 4; }
        const sigY = y + 23;
        const leftX = withClient ? M + 6 : W / 2 - sigW / 2;
        const rightX = R - 6 - sigW;
        if (companySig) { const s = fit(companySig, sigW, 20); doc.addImage(companySig.data, 'JPEG', leftX + (sigW - s.w) / 2, sigY - s.h - 1, s.w, s.h); }
        if (withClient && clientSig) { const s = fit(clientSig, sigW, 20); doc.addImage(clientSig.data, 'JPEG', rightX + (sigW - s.w) / 2, sigY - s.h - 1, s.w, s.h); }
        setDraw(grey);
        doc.setLineWidth(0.3);
        doc.line(leftX, sigY, leftX + sigW, sigY);
        if (withClient) doc.line(rightX, sigY, rightX + sigW, sigY);
        font('normal', 8);
        setText(grey);
        doc.text('A EMPRESA', leftX + sigW / 2, sigY + 4.5, { align: 'center' });
        if (withClient) doc.text('O CLIENTE', rightX + sigW / 2, sigY + 4.5, { align: 'center' });
        y = sigY + 8;
    }

    // ================= rodapé e marca de água em todas as páginas =================
    const pages = (doc as unknown as { getNumberOfPages(): number }).getNumberOfPages();
    const footer = st.footerNote?.trim() || `${company?.name || 'MajorStockX'} © ${new Date().getFullYear()} · Processado por computador (MajorStockX)`;
    const thanks = 'Obrigado pela preferência!';
    for (let i = 1; i <= pages; i++) {
        doc.setPage(i);
        const pageNo = pages > 1 ? `Página ${i} de ${pages}` : '';
        const foot = doc.splitTextToSize(footer, R - M - 40)[0];
        if (decor) {
            decorFooter(i, foot, pageNo);
        } else {
            if (theme.header === 'sidebar') { setFill(accent); doc.rect(0, 0, 7, H, 'F'); }
            setDraw(theme.header === 'centered' ? accent : line);
            doc.setLineWidth(0.3);
            doc.line(M, H - 13, R, H - 13);
            font('normal', 7.5);
            setText(grey);
            doc.text(foot, M, H - 8.5);
            if (pageNo) doc.text(pageNo, R, H - 8.5, { align: 'right' });
        }
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

    /** Rodapé (todas as páginas) e topo das páginas seguintes dos temas com desenho. */
    function decorFooter(page: number, foot: string, pageNo: string) {
        const small = () => { font('normal', 7.5); setText(grey); };
        if (D === 'wave') {
            if (page > 1) { setFill(accent); shape([0, 0], [[72, 0], [52, 6, 30, 16, 0, 20]]); }
            setFill(tint(accent, 0.86)); shape([W * 0.28, H], [[W * 0.62, H - 4, W * 0.85, H - 20, W, H - 24], [W, H]]);
            setFill(accent); shape([W * 0.55, H], [[W * 0.78, H - 3, W * 0.92, H - 12, W, H - 15], [W, H]]);
            small(); doc.text(foot, M, H - 8.5);
            if (pageNo) { font('normal', 7.5); setText(on); doc.text(pageNo, R, H - 4, { align: 'right' }); }
        } else if (D === 'card') {
            if (page > 1) { setFill(accent); doc.rect(0, 0, W, 8, 'F'); }
            setFill(accent); doc.roundedRect(M + 18, H - 20, R - M - 36, 8, 4, 4, 'F');
            font('bold', 8.5); setText(on); doc.text(thanks, W / 2, H - 14.8, { align: 'center' });
            small(); doc.text(foot, W / 2, H - 6, { align: 'center' });
            if (pageNo) doc.text(pageNo, R, H - 6, { align: 'right' });
        } else if (D === 'frame') {
            const top = page === 1 ? 78 : 0;
            setFill(accent);
            doc.rect(0, top, 12, H - top, 'F');
            doc.rect(W - 12, top, 12, H - top, 'F');
            doc.rect(0, H - 14, W, 14, 'F');
            if (page > 1) doc.rect(0, 0, W, 12, 'F');
            font('italic', 9); setText(hl); doc.text(thanks, W / 2, H - 5.5, { align: 'center' });
            small(); doc.text(foot, M, H - 17.5);
            if (pageNo) doc.text(pageNo, R, H - 17.5, { align: 'right' });
        } else if (D === 'stripes') {
            if (page > 1) { setFill(charcoal); doc.rect(0, 0, W, 8, 'F'); setFill(accent); poly([[0, 0], [30, 0], [24, 8], [0, 8]]); }
            setFill(charcoal); doc.rect(0, H - 12, W, 12, 'F');
            setFill(accent); poly([[W - 40, H - 12], [W, H - 12], [W, H], [W - 48, H]]);
            setFill(tint(accent, 0.35)); poly([[W - 52, H - 12], [W - 46, H - 12], [W - 54, H], [W - 60, H]]);
            font('normal', 7.5); setText([230, 230, 235]); doc.text(foot, M, H - 4.6);
            if (pageNo) doc.text(pageNo, W - 66, H - 4.6, { align: 'right' });
        } else if (D === 'hatch') {
            if (page > 1) hatch(0, 0, W, 8, [205, 205, 214]);
            hatch(0, H - 8, W, 8, [205, 205, 214]);
            setFill(accent); doc.rect(0, H - 8.9, W * 0.5, 0.9, 'F');
            small(); doc.text(foot, M, H - 11.5);
            if (pageNo) doc.text(pageNo, R, H - 11.5, { align: 'right' });
        } else if (D === 'corner') {
            if (page > 1) { setFill(accent); poly([[W - 30, 0], [W, 0], [W, 22]]); }
            setFill(tint(accent, 0.8)); poly([[0, H - 30], [55, H], [0, H]]);
            setFill(accent); poly([[0, H - 20], [38, H], [0, H]]);
            small(); doc.text(foot, R, H - 8.5, { align: 'right' });
            if (pageNo) doc.text(pageNo, R, H - 4.5, { align: 'right' });
        } else {
            if (page > 1) { setFill(tint(accent, 0.86)); doc.circle(W - 6, -4, 18, 'F'); }
            setFill(tint(accent, 0.86)); doc.circle(8, H + 6, 30, 'F');
            setFill(tint(accent, 0.6)); doc.circle(32, H + 8, 13, 'F');
            setFill(accent); doc.circle(54, H + 3, 6, 'F');
            small(); doc.text(foot, R, H - 8.5, { align: 'right' });
            if (pageNo) doc.text(pageNo, R, H - 4.5, { align: 'right' });
        }
    }
}
