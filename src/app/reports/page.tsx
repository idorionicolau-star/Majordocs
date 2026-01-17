"use client";

import { useState, useMemo, useContext } from 'react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Printer, DollarSign, Hash, Box, Trash2, TrendingUp, Trophy, Calendar, User } from 'lucide-react';
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
import { InventoryContext } from '@/context/inventory-context';
import { Skeleton } from '@/components/ui/skeleton';
import { DatePicker } from '@/components/ui/date-picker';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from '@/lib/utils';

const SaleReportCard = ({ sale }: { sale: Sale }) => (
    <Card className="glass-card">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <div>
                <CardTitle className="text-base font-bold">{sale.productName}</CardTitle>
                <CardDescription className="text-xs">Guia: {sale.guideNumber}</CardDescription>
            </div>
            <div className="text-lg font-bold font-mono text-primary">
                {formatCurrency(sale.totalValue)}
            </div>
        </CardHeader>
        <CardContent className="space-y-2 text-xs pt-2">
            <div className="flex items-center gap-2 text-sm">
                <Hash className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{sale.quantity} unidades</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{sale.soldBy}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{format(new Date(sale.date), 'dd/MM/yy')}</span>
            </div>
        </CardContent>
    </Card>
);

export default function ReportsPage() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const inventoryContext = useContext(InventoryContext);
  const { sales, companyData, loading, user, clearSales } = inventoryContext || { sales: [], companyData: null, loading: true, user: null, clearSales: async () => {} };
  const isAdmin = user?.role === 'Admin';
  const [showClearConfirm, setShowClearConfirm] = useState(false);


  const salesForMonth = useMemo(() => {
    if (!selectedDate) return [];
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    return sales.filter(sale => {
        const saleDate = new Date(sale.date);
        return saleDate.getFullYear() === year && saleDate.getMonth() === month;
    });
  }, [selectedDate, sales]);

  const reportSummary = useMemo(() => {
    const totalSales = salesForMonth.length;
    const totalValue = salesForMonth.reduce((sum, sale) => sum + sale.totalValue, 0);
    const totalItems = salesForMonth.reduce((sum, sale) => sum + sale.quantity, 0);
    const averageTicket = totalSales > 0 ? totalValue / totalSales : 0;
    
    const productQuantities = salesForMonth.reduce((acc, sale) => {
        acc[sale.productName] = (acc[sale.productName] || 0) + sale.quantity;
        return acc;
    }, {} as Record<string, number>);

    const bestSellingProduct = Object.entries(productQuantities).reduce((best, current) => {
        return current[1] > best.quantity ? { name: current[0], quantity: current[1] } : best;
    }, { name: 'N/A', quantity: 0 });


    return {
      totalSales,
      totalValue,
      totalItems,
      averageTicket,
      bestSellingProduct
    };
  }, [salesForMonth]);
  
  const handleClearSales = async () => {
    if (clearSales) {
      await clearSales();
    }
    setShowClearConfirm(false);
  };

  const handlePrint = () => {
    if (!selectedDate) return;
    const printWindow = window.open('', '', 'height=800,width=800');
    if (printWindow) {
        printWindow.document.write('<!DOCTYPE html><html><head><title>Relatório Mensal de Vendas</title>');
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
                .logo { display: flex; flex-direction: column; align-items: flex-start; }
                .logo span { font-family: 'Space Grotesk', sans-serif; font-size: 1.5rem; font-weight: bold; color: #3498db; }
                .summary-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem; margin: 2rem 0; }
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
                    <span>${companyData?.name || 'MajorStockX'}</span>
                </div>
                <h1>Relatório Mensal de Vendas</h1>
            </div>
            <h2>Mês: ${format(selectedDate, 'MMMM yyyy', { locale: pt })}</h2>
        `);

        printWindow.document.write('<div class="summary-grid">');
        printWindow.document.write(`<div class="summary-card"><strong>Total de Vendas</strong><span>${reportSummary.totalSales}</span></div>`);
        printWindow.document.write(`<div class="summary-card"><strong>Valor Total</strong><span>${formatCurrency(reportSummary.totalValue)}</span></div>`);
        printWindow.document.write(`<div class="summary-card"><strong>Ticket Médio</strong><span>${formatCurrency(reportSummary.averageTicket)}</span></div>`);
        printWindow.document.write(`<div class="summary-card"><strong>Total de Itens</strong><span>${reportSummary.totalItems}</span></div>`);
        printWindow.document.write(`<div class="summary-card"><strong>Produto Mais Vendido</strong><span>${reportSummary.bestSellingProduct.name} (${reportSummary.bestSellingProduct.quantity} un)</span></div>`);
        printWindow.document.write('</div>');

        printWindow.document.write('<h3>Detalhes das Vendas</h3>');
        printWindow.document.write('<table><thead><tr><th>Data</th><th>Guia N.º</th><th>Produto</th><th>Qtd</th><th>Valor Total</th><th>Vendedor</th></tr></thead><tbody>');
        salesForMonth.forEach(sale => {
            printWindow.document.write(`<tr><td>${format(new Date(sale.date), 'dd/MM/yy')}</td><td>${sale.guideNumber}</td><td>${sale.productName}</td><td>${sale.quantity}</td><td>${formatCurrency(sale.totalValue)}</td><td>${sale.soldBy}</td></tr>`);
        });
        printWindow.document.write('</tbody></table>');
        
        printWindow.document.write(`<div class="footer"><p>${companyData?.name || 'MajorStockX'} &copy; ' + new Date().getFullYear() + '</p></div>`);
        printWindow.document.write('</div></body></html>');
        printWindow.document.close();
        
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
        }, 500);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-1/3" />
        <Skeleton className="h-8 w-1/4" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <>
      <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem a certeza absoluta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é irreversível e irá apagar permanentemente **todas** as vendas registadas. Esta ação também irá limpar os dados desta página de relatórios.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearSales} variant="destructive">
              Sim, apagar tudo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex flex-col gap-6 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-headline font-bold">Relatório Mensal de Vendas</h1>
            <p className="text-muted-foreground">
              Selecione uma data para visualizar o relatório do mês correspondente.
            </p>
          </div>
          <div className="flex items-center gap-2">
              <DatePicker date={selectedDate} setDate={setSelectedDate} />
              <Button onClick={handlePrint} variant="outline" className="h-12" disabled={!selectedDate}>
                  <Printer className="mr-2 h-4 w-4" />
                  Imprimir Relatório
              </Button>
          </div>
        </div>
        
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <StatCard icon={Hash} title="Total de Vendas" value={reportSummary.totalSales} />
            <StatCard icon={DollarSign} title="Valor Total" value={formatCurrency(reportSummary.totalValue)} />
            <StatCard icon={TrendingUp} title="Ticket Médio" value={formatCurrency(reportSummary.averageTicket)} />
            <StatCard icon={Trophy} title="Mais Vendido" value={reportSummary.bestSellingProduct.name} subValue={`${reportSummary.bestSellingProduct.quantity} un.`} />
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle>Detalhes das Vendas do Mês</CardTitle>
            <CardDescription>
              {selectedDate ? `Todas as vendas registadas em ${format(selectedDate, 'MMMM yyyy', { locale: pt })}.` : "Nenhuma data selecionada."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="hidden md:block">
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead className="w-[100px]">Data</TableHead>
                    <TableHead>Guia N.º</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead className="text-right">Quantidade</TableHead>
                    <TableHead className="text-right">Valor Total</TableHead>
                    <TableHead>Vendedor</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {salesForMonth.length > 0 ? (
                    salesForMonth.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((sale: Sale) => (
                        <TableRow key={sale.id}>
                        <TableCell>{format(new Date(sale.date), 'dd/MM/yy')}</TableCell>
                        <TableCell className="font-medium">{sale.guideNumber}</TableCell>
                        <TableCell>{sale.productName}</TableCell>
                        <TableCell className="text-right">{sale.quantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(sale.totalValue)}</TableCell>
                        <TableCell>{sale.soldBy}</TableCell>
                        </TableRow>
                    ))
                    ) : (
                    <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                        Nenhuma venda encontrada para este mês.
                        </TableCell>
                    </TableRow>
                    )}
                </TableBody>
                </Table>
            </div>
            <div className="block md:hidden space-y-3">
                {salesForMonth.length > 0 ? (
                    salesForMonth.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((sale: Sale) => (
                        <SaleReportCard key={sale.id} sale={sale} />
                    ))
                ) : (
                    <div className="h-24 text-center flex items-center justify-center text-muted-foreground">
                        Nenhuma venda encontrada para este mês.
                    </div>
                )}
            </div>
          </CardContent>
        </Card>
        
        {isAdmin && (
            <Card className="mt-8">
                <div className="p-6 flex flex-col items-center text-center">
                <h3 className="font-semibold mb-2">Zona de Administrador</h3>
                <p className="text-sm text-muted-foreground mb-4 max-w-md">
                    Esta ação é irreversível e irá apagar permanentemente **todas** as vendas registadas.
                </p>
                <Button variant="destructive" onClick={() => setShowClearConfirm(true)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Limpar Vendas
                </Button>
                </div>
            </Card>
        )}
      </div>
    </>
  );
}

interface StatCardProps {
    icon: React.ElementType;
    title: string;
    value: string | number;
    subValue?: string;
}

const StatCard = ({ icon: Icon, title, value, subValue }: StatCardProps) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold truncate">{value}</div>
            {subValue && <p className="text-xs text-muted-foreground">{subValue}</p>}
        </CardContent>
    </Card>
);
