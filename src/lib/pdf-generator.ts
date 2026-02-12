
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

export const generateInventoryReportPDF = (products: any[], company: Company | null, locationName: string = 'Geral') => {
    const doc = new jsPDF();
    const reportTitle = locationName === 'Geral' ? 'Relatório de Inventário Geral' : `Relatório de Inventário: ${locationName}`;

    // Header
    doc.setFontSize(20);
    doc.text(company?.name || 'MajorStockX', 14, 22);

    doc.setFontSize(14);
    doc.setTextColor(52, 152, 219); // Blue
    doc.text(reportTitle, 14, 32);

    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 14, 40);

    // Table
    const tableColumn = ["Produto", "Categoria", "Stock", "Preço Unit.", "Valor Stock"];
    const tableRows: any[] = [];

    let totalValue = 0;

    products.forEach(product => {
        const availableStock = product.stock - (product.reservedStock || 0);
        const stockValue = availableStock * product.price;
        totalValue += stockValue;

        const row = [
            product.name,
            product.category,
            `${availableStock} ${product.unit || 'un.'}`,
            formatCurrency(product.price),
            formatCurrency(stockValue)
        ];
        tableRows.push(row);
    });

    autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 45,
        theme: 'striped',
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        styles: { fontSize: 9, cellPadding: 2 },
    });

    // Totals
    const finalY = (doc as any).lastAutoTable.finalY + 10;

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`Valor Total do Inventário: ${formatCurrency(totalValue)}`, 14, finalY);

    // Footer
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`MajorStockX - ${new Date().getFullYear()}`, 105, 290, { align: 'center' });

    doc.save(`Inventario_${new Date().toISOString().split('T')[0]}.pdf`);
};

export const generateOrdersPDF = (orders: any[], company: Company | null) => {
    const doc = new jsPDF();
    const headers = [["Produto", "Cliente", "Data Entrega", "Qtd.", "Valor Total", "Status"]];
    const data = orders.map(order => [
        order.productName,
        order.clientName || 'N/A',
        order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString('pt-BR') : 'N/A',
        `${order.quantity} ${order.unit}`,
        order.totalValue ? formatCurrency(order.totalValue) : 'N/A',
        order.status
    ]);

    doc.setFontSize(20);
    doc.text(company?.name || 'MajorStockX', 14, 22);
    doc.setFontSize(10);
    doc.text("Relatório de Encomendas", 14, 30);
    doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 14, 35);

    autoTable(doc, {
        head: headers,
        body: data,
        startY: 40,
        theme: 'striped',
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        styles: { fontSize: 8, cellPadding: 2 },
    });

    doc.save(`Encomendas_${new Date().toISOString().split('T')[0]}.pdf`);
};

export const generateProductionPDF = (productions: any[], company: Company | null, locationMap: any[]) => {
    const doc = new jsPDF({ orientation: 'landscape' });
    const headers = [["Data", "Produto", "Qtd.", "Und.", "Localização", "Registado por", "Status"]];
    const data = productions.map(prod => [
        new Date(prod.date).toLocaleDateString('pt-BR'),
        prod.productName,
        prod.quantity,
        prod.unit || 'un.',
        locationMap.find(l => l.id === prod.location)?.name || 'N/A',
        prod.registeredBy,
        prod.status
    ]);

    doc.setFontSize(20);
    doc.text(company?.name || 'MajorStockX', 14, 22);
    doc.setFontSize(10);
    doc.text("Relatório de Produção", 14, 30);
    doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 14, 35);

    autoTable(doc, {
        head: headers,
        body: data,
        startY: 40,
        theme: 'striped',
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        styles: { fontSize: 9, cellPadding: 2 },
    });

    doc.save(`Producao_${new Date().toISOString().split('T')[0]}.pdf`);
};

export const generateRawMaterialsPDF = (type: 'materials' | 'recipes' | 'costs', data: any[], company: Company | null) => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text(company?.name || 'MajorStockX', 14, 22);
    doc.setFontSize(10);

    let title = "";
    if (type === 'materials') title = "Relatório de Matérias-Primas";
    if (type === 'recipes') title = "Relatório de Receitas";
    if (type === 'costs') title = "Relatório de Custos de Produção";

    doc.text(title, 14, 30);
    doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 14, 35);

    if (type === 'materials') {
        const headers = [["Nome", "Stock", "Custo Unit.", "Unidade", "Nível Mín."]];
        const rows = data.map((m: any) => [
            m.name,
            m.stock,
            m.cost ? formatCurrency(m.cost) : 'N/A',
            m.unit,
            m.lowStockThreshold
        ]);
        autoTable(doc, { head: headers, body: rows, startY: 40, theme: 'striped', headStyles: { fillColor: [41, 128, 185], textColor: 255 }, styles: { fontSize: 9 } });
    } else if (type === 'recipes') {
        let currentY = 40;
        data.forEach((r: any) => {
            if (currentY > 250) { doc.addPage(); currentY = 20; }
            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.text(r.productName, 14, currentY);
            currentY += 5;

            const ingHeaders = [["Ingrediente", "Quantidade"]];
            const ingRows = r.ingredients.map((ing: any) => [
                ing.rawMaterialName,
                ing.quantity
            ]);

            autoTable(doc, {
                head: ingHeaders,
                body: ingRows,
                startY: currentY,
                theme: 'plain',
                styles: { fontSize: 9 },
                margin: { left: 14 }
            });
            currentY = (doc as any).lastAutoTable.finalY + 10;
        });
    } else if (type === 'costs') {
        const headers = [["Produto Final", "Custo de Produção / Unidade"]];
        const rows = data.map((r: any) => [
            r.productName,
            r.isCalculable ? formatCurrency(r.totalCost) : 'Não calculado'
        ]);
        autoTable(doc, { head: headers, body: rows, startY: 40, theme: 'striped', headStyles: { fillColor: [41, 128, 185], textColor: 255 }, styles: { fontSize: 9 } });
    }

    doc.save(`${title.replace(/ /g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
};

export const generateCriticalStockPDF = (products: any[], company: Company | null) => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.setTextColor(231, 76, 60); // Red
    doc.text("ALERTA DE STOCK CRÍTICO", 14, 22);

    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(company?.name || 'MajorStockX', 14, 30);
    doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 14, 38);
    doc.text(`${products.length} itens necessitam de reposição`, 14, 46);

    const headers = [["Produto", "Categoria", "Stock Atual", "Mínimo", "Preço Unit.", "Status"]];
    const rows = products.map(p => {
        const available = p.stock - (p.reservedStock || 0);
        return [
            p.name,
            p.category,
            `${available} ${p.unit || 'un'}`,
            p.criticalStockThreshold,
            formatCurrency(p.price),
            available <= 0 ? 'ESGOTADO' : 'CRÍTICO'
        ];
    });

    autoTable(doc, {
        head: headers,
        body: rows,
        startY: 55,
        theme: 'striped',
        headStyles: { fillColor: [231, 76, 60], textColor: 255 },
        styles: { fontSize: 10, cellPadding: 3 },
    });

    doc.save(`Stock_Critico_${new Date().toISOString().split('T')[0]}.pdf`);
};

export const generateFinancialReportPDF = (companyName: string, period: string, totalIncome: number, totalExpenses: number, netProfit: number, sales: any[], expenses: any[]) => {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(20);
    doc.text('Relatório Financeiro', 14, 22);
    doc.setFontSize(12);
    doc.text(`${companyName} • ${period}`, 14, 30);

    // Summary
    doc.setFillColor(248, 250, 252);
    doc.rect(14, 40, 180, 25, 'F');

    doc.setFontSize(10);
    doc.text('Entradas', 20, 50);
    doc.text('Saídas', 80, 50);
    doc.text('Lucro Líquido', 140, 50);

    doc.setFontSize(14);
    doc.setTextColor(22, 163, 74); // Green
    doc.text(formatCurrency(totalIncome), 20, 60);

    doc.setTextColor(220, 38, 38); // Red
    doc.text(formatCurrency(totalExpenses), 80, 60);

    if (netProfit >= 0) {
        doc.setTextColor(37, 99, 235); // Blue
    } else {
        doc.setTextColor(220, 38, 38); // Red
    }
    doc.text(formatCurrency(netProfit), 140, 60);

    doc.setTextColor(0); // Reset color

    // Expenses Table
    doc.setFontSize(14);
    doc.text('Despesas do Período', 14, 80);

    const expHeaders = [["Data", "Descrição", "Categoria", "Valor"]];
    const expRows = expenses.map(e => [
        new Date(e.date).toLocaleDateString('pt-BR'),
        e.description,
        e.category,
        formatCurrency(e.amount)
    ]);

    autoTable(doc, {
        head: expHeaders,
        body: expRows,
        startY: 85,
        theme: 'striped',
        headStyles: { fillColor: [71, 85, 105], textColor: 255 },
        styles: { fontSize: 9 }
    });

    // Sales Summary (Optional, maybe just list total)
    // doc.text('Vendas do Período', 14, (doc as any).lastAutoTable.finalY + 15);
    // ... logic for sales table if needed ...

    doc.save(`Relatorio_Financeiro_${period.replace(/ /g, '_')}.pdf`);
};
