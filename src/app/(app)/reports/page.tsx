
"use client";

import { useState, useMemo } from 'react';
import { sales as allSales } from '@/lib/data';
import { format, startOfDay, isSameDay } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar, Printer, DollarSign, Hash, Box } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { Sale } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default function ReportsPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());

  const salesForDate = useMemo(() => {
    return allSales.filter(sale => isSameDay(new Date(sale.date), selectedDate));
  }, [selectedDate]);

  const reportSummary = useMemo(() => {
    const totalSales = salesForDate.length;
    const totalValue = salesForDate.reduce((sum, sale) => sum + sale.totalValue, 0);
    const totalItems = salesForDate.reduce((sum, sale) => sum + sale.quantity, 0);
    const uniqueProducts = new Set(salesForDate.map(s => s.productId)).size;

    return {
      totalSales,
      totalValue,
      totalItems,
      uniqueProducts,
    };
  }, [salesForDate]);

  const handlePrint = () => {
    const printWindow = window.open('', '', 'height=800,width=800');
    if (printWindow) {
        printWindow.document.write('<!DOCTYPE html><html><head><title>Relatório de Vendas</title>');
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
                .header h1 { font-family: 'Space Grotesk', sans-serif; font-size: 2rem; color: #3498db; margin: 0; }
                .logo { display: flex; align-items: center; gap: 0.5rem; }
                .logo span { font-family: 'Space Grotesk', sans-serif; font-size: 1.5rem; font-weight: bold; color: #3498db; }
                .summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin: 2rem 0; }
                .summary-card { background-color: #f9fafb; padding: 1rem; border-radius: 6px; }
                .summary-card strong { display: block; margin-bottom: 0.5rem; color: #374151; font-family: 'Space Grotesk', sans-serif; }
                table { width: 100%; border-collapse: collapse; margin-top: 2rem; font-size: 12px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f9fafb; font-family: 'Space Grotesk', sans-serif; }
                .footer { text-align: center; margin-top: 3rem; font-size: 0.8rem; color: #999; }
                @media print {
                  body { margin: 0; }
                  .no-print { display: none; }
                  .container { border: none; box-shadow: none; }
                }
            </style>
        `);
        printWindow.document.write('</head><body><div class="container">');
        printWindow.document.write(`
            <div class="header">
                 <div class="logo">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="color: #3498db;">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></polyline>
                    <line x1="12" y1="22.08" x2="12" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></line>
                    </svg>
                    <span>MajorStockX</span>
                </div>
                <h1>Relatório de Vendas</h1>
            </div>
            <h2>Dia: ${format(selectedDate, 'dd/MM/yyyy')}</h2>
        `);

        printWindow.document.write('<div class="summary-grid">');
        printWindow.document.write(`<div class="summary-card"><strong>Total de Vendas</strong><span>${reportSummary.totalSales}</span></div>`);
        printWindow.document.write(`<div class="summary-card"><strong>Valor Total</strong><span>${formatCurrency(reportSummary.totalValue)}</span></div>`);
        printWindow.document.write(`<div class="summary-card"><strong>Itens Vendidos</strong><span>${reportSummary.totalItems}</span></div>`);
        printWindow.document.write(`<div class="summary-card"><strong>Produtos Distintos</strong><span>${reportSummary.uniqueProducts}</span></div>`);
        printWindow.document.write('</div>');

        printWindow.document.write('<h3>Detalhes das Vendas</h3>');
        printWindow.document.write('<table><thead><tr><th>Guia N.º</th><th>Produto</th><th>Qtd</th><th>Valor Total</th><th>Vendedor</th></tr></thead><tbody>');
        salesForDate.forEach(sale => {
            printWindow.document.write(`<tr><td>${sale.guideNumber}</td><td>${sale.productName}</td><td>${sale.quantity}</td><td>${formatCurrency(sale.totalValue)}</td><td>${sale.soldBy}</td></tr>`);
        });
        printWindow.document.write('</tbody></table>');
        
        printWindow.document.write('<div class="footer"><p>MajorStockX &copy; ' + new Date().getFullYear() + '</p></div>');
        printWindow.document.write('</div></body></html>');
        printWindow.document.close();
        
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
          printWindow.close();
        }, 500);
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-headline font-bold">Relatórios de Vendas</h1>
          <p className="text-muted-foreground">
            Selecione uma data para visualizar o relatório de vendas.
          </p>
        </div>
        <div className="flex items-center gap-2">
            <Input
                type="date"
                value={format(selectedDate, 'yyyy-MM-dd')}
                onChange={(e) => setSelectedDate(startOfDay(new Date(e.target.value)))}
                className="w-auto h-12"
            />
            <Button onClick={handlePrint} variant="outline" className="h-12">
                <Printer className="mr-2 h-4 w-4" />
                Imprimir Relatório
            </Button>
        </div>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Hash} title="Total de Vendas" value={reportSummary.totalSales} />
          <StatCard icon={DollarSign} title="Valor Total" value={formatCurrency(reportSummary.totalValue)} />
          <StatCard icon={Box} title="Total de Itens" value={reportSummary.totalItems} />
          <StatCard icon={Box} title="Produtos Distintos" value={reportSummary.uniqueProducts} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detalhes das Vendas do Dia</CardTitle>
          <CardDescription>
            Todas as vendas registadas em {format(selectedDate, 'dd/MM/yyyy')}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Guia N.º</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead className="text-right">Quantidade</TableHead>
                <TableHead className="text-right">Valor Total</TableHead>
                <TableHead>Vendedor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {salesForDate.length > 0 ? (
                salesForDate.map((sale: Sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="font-medium">{sale.guideNumber}</TableCell>
                    <TableCell>{sale.productName}</TableCell>
                    <TableCell className="text-right">{sale.quantity}</TableCell>
                    <TableCell className="text-right">{formatCurrency(sale.totalValue)}</TableCell>
                    <TableCell>{sale.soldBy}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    Nenhuma venda encontrada para esta data.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

interface StatCardProps {
    icon: React.ElementType;
    title: string;
    value: string | number;
}

const StatCard = ({ icon: Icon, title, value }: StatCardProps) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value}</div>
        </CardContent>
    </Card>
);

    