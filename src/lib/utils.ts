import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Sale, Company } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function normalizeString(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function levenshteinDistance(a: string, b: string): number {
  const matrix = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) == a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

export function calculateSimilarity(str1: string, str2: string): number {
  const normalized1 = normalizeString(str1);
  const normalized2 = normalizeString(str2);
  const distance = levenshteinDistance(normalized1, normalized2);
  const maxLength = Math.max(normalized1.length, normalized2.length);

  if (maxLength === 0) return 1.0;

  return 1.0 - (distance / maxLength);
}

export function formatCompactNumber(value: number) {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toLocaleString('pt-MZ', { maximumFractionDigits: 1 })}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toLocaleString('pt-MZ', { maximumFractionDigits: 1 })}k`;
  }
  return value.toLocaleString('pt-MZ');
}

export function formatCurrency(value: number, options?: Intl.NumberFormatOptions & { compact?: boolean }) {
  if (options?.compact) {
    return formatCompactNumber(value);
  }

  return new Intl.NumberFormat('pt-MZ', {
    style: 'currency',
    currency: 'MZN',
    ...options
  }).format(value);
}

export function downloadSaleDocument(sale: Sale, companyData: Company | null) {
  const printWindow = window.open('', '', 'height=800,width=800');
  if (!printWindow) return;

  const isProforma = sale.documentType === 'Factura Proforma';
  const docTitle = sale.documentType;

  printWindow.document.write('<!DOCTYPE html><html><head><title>' + docTitle + '</title>');
  printWindow.document.write(`
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  `);
  printWindow.document.write(`
      <style>
          :root {
            --background: #ffffff;
            --foreground: #09090b;
            --muted: #f4f4f5;
            --muted-foreground: #71717a;
            --border: #e4e4e7;
            --primary: #18181b;
          }
          * { box-sizing: border-box; }
          body { 
            font-family: 'Inter', sans-serif; 
            line-height: 1.5; 
            color: var(--foreground); 
            margin: 0; 
            background-color: var(--muted); 
            -webkit-print-color-adjust: exact; 
            print-color-adjust: exact; 
          }
          .wrapper { 
            max-width: 800px; 
            margin: 2rem auto; 
            padding: 3rem; 
            background: var(--background); 
            border-radius: 12px; 
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); 
            border: 1px solid var(--border); 
          }
          .header { 
            display: flex; 
            justify-content: space-between; 
            align-items: flex-start; 
            margin-bottom: 3rem; 
            border-bottom: 1px solid var(--border); 
            padding-bottom: 2rem; 
          }
          .logo { display: flex; flex-direction: column; }
          .logo-img { max-height: 60px; margin-bottom: 0.5rem; object-fit: contain; }
          .logo-text { font-size: 1.25rem; font-weight: 700; color: var(--foreground); letter-spacing: -0.025em; }
          .doc-type { text-align: right; }
          .doc-type h1 { font-size: 2.25rem; font-weight: 600; color: var(--foreground); margin: 0 0 0.5rem 0; letter-spacing: -0.025em; text-transform: uppercase; }
          .doc-type p { margin: 0; color: var(--muted-foreground); font-size: 0.875rem; }
          .details-grid { 
            display: grid; 
            grid-template-columns: 1fr 1fr; 
            gap: 2rem; 
            margin-bottom: 3rem; 
          }
          .details-box { 
            background-color: #fafafa; 
            padding: 1.5rem; 
            border-radius: 8px; 
            border: 1px solid var(--border); 
          }
          .details-box h3 { 
            margin: 0 0 1rem 0; 
            font-size: 0.875rem; 
            text-transform: uppercase; 
            letter-spacing: 0.05em; 
            color: var(--muted-foreground); 
          }
          .details-row { 
            display: flex; 
            justify-content: space-between; 
            margin-bottom: 0.5rem; 
            font-size: 0.9375rem; 
          }
          .details-row span:first-child { color: #52525b; }
          .details-row span:last-child { font-weight: 500; color: var(--foreground); text-align: right; }
          table { 
            width: 100%; 
            border-collapse: separate; 
            border-spacing: 0; 
            margin-bottom: 3rem; 
          }
          th { 
            background-color: var(--muted); 
            color: #52525b; 
            font-weight: 600; 
            text-transform: uppercase; 
            font-size: 0.75rem; 
            letter-spacing: 0.05em; 
            padding: 1rem; 
            text-align: left; 
            border-top: 1px solid var(--border); 
            border-bottom: 1px solid var(--border); 
          }
          th:first-child { border-left: 1px solid var(--border); border-top-left-radius: 6px; border-bottom-left-radius: 6px; }
          th:last-child { border-right: 1px solid var(--border); border-top-right-radius: 6px; border-bottom-right-radius: 6px; text-align: right; }
          th:nth-child(2), th:nth-child(3) { text-align: right; }
          td { 
            padding: 1rem; 
            border-bottom: 1px solid var(--muted); 
            font-size: 0.9375rem; 
            color: #3f3f46; 
          }
          td:last-child { text-align: right; font-weight: 500; }
          td:nth-child(2), td:nth-child(3) { text-align: right; }
          .totals-wrapper { display: flex; justify-content: flex-end; }
          .totals-table { width: 320px; border-collapse: collapse; margin-bottom: 0; }
          .totals-table td { padding: 0.75rem 0; text-align: right; border-bottom: 1px solid var(--muted); font-size: 0.9375rem; }
          .totals-table td:first-child { text-align: left; color: #52525b; border-bottom: 1px solid var(--muted); }
          .totals-table tr:last-child td { border-bottom: none; }
          .final-total td { font-size: 1.25rem; font-weight: 600; color: var(--foreground); border-top: 2px solid var(--primary); padding-top: 1rem; border-bottom: none !important; }
          .signatures { 
            display: grid; 
            grid-template-columns: 1fr 1fr; 
            gap: 4rem; 
            margin-top: 4rem; 
            margin-bottom: 2rem; 
          }
          .signature-box { text-align: center; }
          .signature-line { border-bottom: 1px solid var(--border); margin-bottom: 0.5rem; height: 40px; }
          .signature-label { font-size: 0.875rem; color: var(--muted-foreground); text-transform: uppercase; letter-spacing: 0.05em; }
          .footer { 
            text-align: center; 
            font-size: 0.875rem; 
            color: var(--muted-foreground); 
            border-top: 1px solid var(--border); 
            padding-top: 2rem; 
            margin-top: 2rem; 
          }
          .badge-proforma {
            display: inline-block;
            background-color: #fef08a;
            color: #854d0e;
            padding: 0.25rem 0.75rem;
            border-radius: 9999px;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 1rem;
          }
          @media print {
            body { margin: 0; background-color: white; }
            .wrapper { margin: 0; padding: 0; border: none; box-shadow: none; max-width: 100%; }
          }
      </style>
  `);
  printWindow.document.write('</head><body><div class="wrapper">');

  printWindow.document.write(`
      <div class="header">
           <div class="logo">
              ${companyData?.logoUrl ? `<img src="${companyData.logoUrl}" class="logo-img" alt="Logo" />` : ''}
              <span class="logo-text">${companyData?.name || 'MajorStockX'}</span>
          </div>
          <div class="doc-type">
              ${isProforma ? '<div class="badge-proforma">Orçamento / Proposta</div>' : ''}
              <h1>${docTitle}</h1>
              <p>N.º ${sale.guideNumber}</p>
          </div>
      </div>
  `);

  printWindow.document.write(`
      <div class="details-grid">
          <div class="details-box">
            <h3>Detalhes da Emissão</h3>
            <div class="details-row"><span>Data:</span> <span>${new Date(sale.date).toLocaleDateString('pt-BR')}</span></div>
            ${sale.paymentMethod && !isProforma ? `<div class="details-row"><span>Pagamento:</span> <span>${sale.paymentMethod}</span></div>` : ''}
            <div class="details-row"><span>Operador:</span> <span>${sale.soldBy}</span></div>
          </div>
          <div class="details-box">
            <h3>Cliente</h3>
            <div class="details-row"><span>Nome:</span> <span>${sale.clientName || 'Consumidor Final'}</span></div>
            ${sale.customerId ? `<div class="details-row"><span>Cod.:</span> <span>${sale.customerId}</span></div>` : ''}
          </div>
      </div>
  `);

  printWindow.document.write('<table><thead><tr><th>Artigo / Descrição</th><th>Qtd.</th><th>Preço Unit.</th><th>Subtotal</th></tr></thead><tbody>');
  printWindow.document.write(`<tr><td>${sale.productName}</td><td>${sale.quantity} ${sale.unit || 'un'}</td><td>${formatCurrency(sale.unitPrice)}</td><td>${formatCurrency(sale.subtotal)}</td></tr>`);
  printWindow.document.write('</tbody></table>');

  let totalsHtml = '<div class="totals-wrapper"><table class="totals-table">';
  totalsHtml += `<tr><td>Subtotal:</td><td>${formatCurrency(sale.subtotal)}</td></tr>`;
  if (sale.discount && sale.discount > 0) {
    totalsHtml += `<tr><td>Desconto:</td><td>-${formatCurrency(sale.discount)}</td></tr>`;
  }
  if (sale.vat && sale.vat > 0) {
    totalsHtml += `<tr><td>IVA:</td><td>${formatCurrency(sale.vat)}</td></tr>`;
  }
  totalsHtml += `<tr class="final-total"><td>Total a Pagar:</td><td>${formatCurrency(sale.totalValue)}</td></tr>`;
  totalsHtml += '</table></div>';
  printWindow.document.write(totalsHtml);

  printWindow.document.write(`
    <div class="signatures">
        <div class="signature-box">
            <div class="signature-line"></div>
            <span class="signature-label">A Empresa</span>
        </div>
        <div class="signature-box">
            <div class="signature-line"></div>
            <span class="signature-label">O Cliente</span>
        </div>
    </div>
  `);

  printWindow.document.write(`<div class="footer"><p>${companyData?.name || 'MajorStockX'} &copy; ${new Date().getFullYear()} &bull; Processado por Software</p></div>`);
  printWindow.document.write('</div></body></html>');
  printWindow.document.close();

  setTimeout(() => {
    printWindow.focus();
    printWindow.print();
  }, 500);
}
