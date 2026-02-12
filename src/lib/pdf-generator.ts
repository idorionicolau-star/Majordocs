
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Sale, Company } from './types';
import { formatCurrency } from './utils';

export const generateSalePDF = (sale: Sale, company: Company | null) => {
    const doc = new jsPDF();

    // Add company logo/header
    doc.setFontSize(20);
    doc.text(company?.name || 'MajorStockX', 14, 22);

    doc.setFontSize(10);
    doc.text(company?.address || '', 14, 30);
    doc.text(`NUIT: ${company?.taxId || 'N/A'}`, 14, 35);

    // Add sale details
    doc.setFontSize(12);
    doc.text(sale.documentType, 150, 22, { align: 'right' });
    doc.text(`Nº ${sale.guideNumber}`, 150, 30, { align: 'right' });

    doc.setFontSize(10);
    doc.text(`Data: ${new Date(sale.date).toLocaleDateString('pt-BR')}`, 14, 50);
    doc.text(`Cliente: ${sale.clientName || 'Consumidor Final'}`, 14, 55);
    if (sale.soldBy) doc.text(`Vendedor: ${sale.soldBy}`, 14, 60);

    // Add items table
    const tableColumn = ["Produto", "Qtd", "Preço Unit.", "Total"];
    const tableRows = [];

    // For now, assuming single item sale structure based on existing code, 
    // but extensible for multiple items
    const saleData = [
        sale.productName,
        sale.quantity.toString(),
        formatCurrency(sale.unitPrice),
        formatCurrency(sale.subtotal)
    ];
    tableRows.push(saleData);

    autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 70,
        theme: 'striped',
        headStyles: { fillColor: [41, 128, 185], textColor: 255 }, // Blue header
        styles: { fontSize: 10, cellPadding: 3 },
    });

    // Add totals
    const finalY = (doc as any).lastAutoTable.finalY || 80;

    doc.text(`Subtotal: ${formatCurrency(sale.subtotal)}`, 140, finalY + 10);

    let currentY = finalY + 15;
    if (sale.discount && sale.discount > 0) {
        doc.text(`Desconto: -${formatCurrency(sale.discount)}`, 140, currentY);
        currentY += 5;
    }

    if (sale.vat && sale.vat > 0) {
        doc.text(`IVA: ${formatCurrency(sale.vat)}`, 140, currentY);
        currentY += 5;
    }

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`Total: ${formatCurrency(sale.totalValue)}`, 140, currentY + 5);

    // Footer
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text('Gerado por MajorStockX - Gestão Inteligente', 105, 290, { align: 'center' });

    // Save
    doc.save(`${sale.documentType}_${sale.guideNumber}.pdf`);
};
