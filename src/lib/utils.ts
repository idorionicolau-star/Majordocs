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

export function formatCurrency(value: number, options?: Intl.NumberFormatOptions & { compact?: boolean }) {
  if (options?.compact) {
    if (value >= 1_000_000) {
      return `${(value / 1_000_000).toFixed(2)}M`;
    }
    if (value >= 10000) {
      return `${(value / 1000).toFixed(0)}K`;
    }
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

  printWindow.document.write('<!DOCTYPE html><html><head><title>Guia de Remessa</title>');
  printWindow.document.write(`
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&family=Space+Grotesk:wght@400;700&display=swap" rel="stylesheet">
  `);
  printWindow.document.write(`
      <style>
          body { font-family: 'PT Sans', sans-serif; line-height: 1.6; color: #333; margin: 2rem; }
          .container { max-width: 800px; margin: auto; padding: 2rem; border: 1px solid #eee; border-radius: 8px; }
          .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #eee; padding-bottom: 1rem; margin-bottom: 2rem; }
          .header h1 { font-family: 'Space Grotesk', sans-serif; font-size: 2.5rem; color: #3498db; margin: 0; }
          .logo { display: flex; flex-direction: column; align-items: flex-start; }
          .logo span { font-family: 'Space Grotesk', sans-serif; font-size: 1.5rem; font-weight: bold; color: #3498db; }
          .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 2rem; }
          .details-grid div { background-color: #f9fafb; padding: 1rem; border-radius: 6px; }
          .details-grid strong { display: block; margin-bottom: 0.5rem; color: #374151; font-family: 'Space Grotesk', sans-serif; }
          table { width: 100%; border-collapse: collapse; margin-top: 2rem; }
          th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          th { background-color: #f9fafb; font-family: 'Space Grotesk', sans-serif; }
          .totals-table { width: 50%; margin-left: auto; margin-top: 1rem; }
          .totals-table td { border: none; }
          .totals-table tr td:first-child { text-align: right; font-weight: bold; padding-right: 1rem; }
          .final-total { font-size: 1.2rem; border-top: 2px solid #333; padding-top: 0.5rem; }
          .footer { text-align: center; margin-top: 3rem; font-size: 0.8rem; color: #999; }
          @media print {
            body { margin: 0; }
            .container { border: none; box-shadow: none; }
          }
      </style>
  `);
  printWindow.document.write('</head><body><div class="container">');

  printWindow.document.write(`
      <div class="header">
           <div class="logo">
              <span>${companyData?.name || 'MajorStockX'}</span>
          </div>
          <h1>${sale.documentType}</h1>
      </div>
  `);

  printWindow.document.write(`
      <div class="details-grid">
          <div><strong>Data:</strong> ${new Date(sale.date).toLocaleDateString('pt-BR')}</div>
          <div><strong>${sale.documentType} N.º:</strong> ${sale.guideNumber}</div>
          ${sale.clientName ? `<div><strong>Cliente:</strong> ${sale.clientName}</div>` : ''}
          <div><strong>Vendedor:</strong> ${sale.soldBy}</div>
      </div>
  `);

  printWindow.document.write('<table><thead><tr><th>Produto</th><th>Quantidade</th><th>Preço Unit.</th><th>Subtotal</th></tr></thead><tbody>');
  printWindow.document.write(`<tr><td>${sale.productName}</td><td>${sale.quantity}</td><td>${formatCurrency(sale.unitPrice)}</td><td>${formatCurrency(sale.subtotal)}</td></tr>`);
  printWindow.document.write('</tbody></table>');

  let totalsHtml = '<table class="totals-table">';
  totalsHtml += `<tr><td>Subtotal:</td><td>${formatCurrency(sale.subtotal)}</td></tr>`;
  if (sale.discount && sale.discount > 0) {
    totalsHtml += `<tr><td>Desconto:</td><td>-${formatCurrency(sale.discount)}</td></tr>`;
  }
  if (sale.vat && sale.vat > 0) {
    totalsHtml += `<tr><td>IVA:</td><td>${formatCurrency(sale.vat)}</td></tr>`;
  }
  totalsHtml += `<tr class="final-total"><td>Total:</td><td>${formatCurrency(sale.totalValue)}</td></tr>`;
  totalsHtml += '</table>';
  printWindow.document.write(totalsHtml);

  printWindow.document.write('<div style="margin-top: 4rem;"><p>Recebido por: ___________________________________</p><p>Data: ____/____/______</p></div>');
  printWindow.document.write(`<div class="footer"><p>${companyData?.name || 'MajorStockX'} &copy; ' + new Date().getFullYear() + '</p></div>`);
  printWindow.document.write('</div></body></html>');
  printWindow.document.close();

  setTimeout(() => {
    printWindow.focus();
    printWindow.print();
  }, 500);
}
