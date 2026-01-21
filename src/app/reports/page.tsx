
"use client";

import { useState, useMemo, useContext } from 'react';
import { format, startOfDay, endOfDay, isWithinInterval, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, DollarSign, Hash, Box, Trash2, TrendingUp, Trophy, Calendar, User, Lock, Share2 } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

type Period = 'daily' | 'weekly' | 'monthly' | 'yearly';

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
  const [period, setPeriod] = useState<Period>('monthly');
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const inventoryContext = useContext(InventoryContext);
  const { sales, companyData, loading, user, clearSales } = inventoryContext || { sales: [], companyData: null, loading: true, user: null, clearSales: async () => {} };
  const isAdmin = user?.role === 'Admin';
  const isPrivilegedUser = user?.role === 'Admin' || user?.role === 'Dono';
  const [showClearConfirm, setShowClearConfirm] = useState(false);


  const salesForPeriod = useMemo(() => {
    if (!selectedDate || !sales) return [];

    let start: Date, end: Date;

    switch (period) {
      case 'daily':
        start = startOfDay(selectedDate);
        end = endOfDay(selectedDate);
        break;
      case 'weekly':
        start = startOfWeek(selectedDate, { locale: pt });
        end = endOfWeek(selectedDate, { locale: pt });
        break;
      case 'monthly':
        start = startOfMonth(selectedDate);
        end = endOfMonth(selectedDate);
        break;
      case 'yearly':
        start = startOfYear(selectedDate);
        end = endOfYear(selectedDate);
        break;
    }
    
    return sales.filter(sale => {
        const saleDate = new Date(sale.date);
        return isWithinInterval(saleDate, { start, end });
    });
  }, [selectedDate, sales, period]);

  const reportSummary = useMemo(() => {
    const totalSales = salesForPeriod.length;
    const totalValue = salesForPeriod.reduce((sum, sale) => sum + sale.totalValue, 0);
    const totalItems = salesForPeriod.reduce((sum, sale) => sum + sale.quantity, 0);
    const averageTicket = totalSales > 0 ? totalValue / totalSales : 0;
    
    const productQuantities = salesForPeriod.reduce((acc, sale) => {
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
  }, [salesForPeriod]);
  
  const handleClearSales = async () => {
    if (clearSales) {
      await clearSales();
    }
    setShowClearConfirm(false);
  };
  
  const getPeriodDescription = () => {
    if (!selectedDate) return "Nenhuma data selecionada.";

    switch (period) {
      case 'daily':
        return `Todas as vendas registadas em ${format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: pt } )}.`
      case 'weekly':
        const start = startOfWeek(selectedDate, { locale: pt });
        const end = endOfWeek(selectedDate, { locale: pt });
        return `Vendas para a semana de ${format(start, 'dd/MM')} a ${format(end, 'dd/MM/yyyy')}.`;
      case 'monthly':
        return `Todas as vendas registadas em ${format(selectedDate, 'MMMM yyyy', { locale: pt })}.`
      case 'yearly':
        return `Todas as vendas registadas em ${format(selectedDate, 'yyyy')}.`
      default:
        return "Selecione um período e data."
    }
  }

  const handleGeneratePdf = async () => {
    if (!selectedDate) {
      toast({
        title: "Nenhuma data selecionada",
        description: "Por favor, escolha um mês para gerar o relatório.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    toast({ title: "A gerar PDF...", description: "O seu relatório está a ser preparado." });

    try {
      const response = await fetch('/api/generate-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sales: salesForPeriod,
          summary: reportSummary,
          company: companyData,
          date: selectedDate,
          period,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || 'Falha ao gerar o PDF no servidor.');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      const contentDisposition = response.headers.get('content-disposition');
      let fileName = 'relatorio.pdf';
      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename="?(.+)"?/);
        if (fileNameMatch && fileNameMatch.length > 1) {
            fileName = fileNameMatch[1];
        }
      }
      a.download = fileName;
      
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      
      toast({ title: "Sucesso!", description: "O seu relatório em PDF foi descarregado." });

    } catch (error: any) {
      console.error("Error generating PDF:", error);
      toast({
        title: "Erro ao gerar PDF",
        description: error.message,
        variant: "destructive",
        duration: 9000,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSharePdf = async () => {
    if (!navigator.share) {
      toast({
        title: "Navegador não suportado",
        description: "A função de partilha não é suportada pelo seu navegador. Por favor, descarregue o PDF e partilhe-o manualmente.",
        variant: "destructive"
      });
      return;
    }

    if (!selectedDate) {
      toast({
        title: "Nenhuma data selecionada",
        description: "Por favor, escolha um mês para partilhar o relatório.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    toast({ title: "A preparar para partilhar...", description: "O seu relatório está a ser preparado." });

    try {
      const response = await fetch('/api/generate-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sales: salesForPeriod,
          summary: reportSummary,
          company: companyData,
          date: selectedDate,
          period,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || 'Falha ao gerar o PDF no servidor.');
      }

      const blob = await response.blob();
      const fileName = `relatorio-vendas-${format(selectedDate, 'MM-yyyy')}.pdf`;
      const file = new File([blob], fileName, { type: 'application/pdf' });
      
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `Relatório de Vendas - ${format(selectedDate, 'MMMM yyyy', { locale: pt })}`,
            text: `Aqui está o relatório de vendas para ${companyData?.name || 'a nossa empresa'}.`,
            files: [file],
          });
          toast({ title: "Sucesso!", description: "O diálogo de partilha foi aberto." });
      } else {
         toast({
            title: "Partilha não suportada",
            description: "O seu navegador não suporta a partilha de ficheiros. Por favor, descarregue o PDF.",
            variant: "destructive"
          });
      }

    } catch (error: any) {
      // Don't show an error if the user cancels the share dialog
      if (error.name !== 'AbortError') {
        console.error("Error sharing PDF:", error);
        toast({
          title: "Erro ao Partilhar",
          description: error.message || "Não foi possível partilhar o relatório.",
          variant: "destructive",
          duration: 9000,
        });
      }
    } finally {
      setIsProcessing(false);
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
        <div className="flex flex-col w-full items-center md:flex-row justify-between items-start gap-4">
            <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center">
              <Select value={period} onValueChange={(value: Period) => setPeriod(value)}>
                <SelectTrigger className="h-12 w-full md:w-[180px]">
                  <SelectValue placeholder="Selecionar Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Diário</SelectItem>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="monthly">Mensal</SelectItem>
                  <SelectItem value="yearly">Anual</SelectItem>
                </SelectContent>
              </Select>
              <DatePicker date={selectedDate} setDate={setSelectedDate} />
              <Button onClick={handleGeneratePdf} variant="outline" className="h-12 w-full md:w-auto" disabled={!selectedDate || isProcessing}>
                <Download className="mr-2 h-4 w-4" />
                {isProcessing ? 'A processar...' : 'Exportar PDF'}
              </Button>
              <Button onClick={handleSharePdf} variant="outline" className="h-12 w-full md:w-auto" disabled={!selectedDate || isProcessing}>
                  <Share2 className="mr-2 h-4 w-4" />
                  {isProcessing ? 'A processar...' : 'Partilhar'}
              </Button>
            </div>
        </div>
        
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={Hash} title="Total de Vendas" value={reportSummary.totalSales} />
            {isPrivilegedUser ? (
                <>
                    <StatCard icon={DollarSign} title="Valor Total" value={formatCurrency(reportSummary.totalValue)} />
                    <StatCard icon={TrendingUp} title="Ticket Médio" value={formatCurrency(reportSummary.averageTicket)} />
                </>
            ) : (
                 <>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
                            <Lock className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">-</div>
                            <p className="text-xs text-muted-foreground">Acesso Restrito</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
                            <Lock className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">-</div>
                            <p className="text-xs text-muted-foreground">Acesso Restrito</p>
                        </CardContent>
                    </Card>
                </>
            )}
            <StatCard icon={Trophy} title="Mais Vendido" value={reportSummary.bestSellingProduct.name} subValue={`${reportSummary.bestSellingProduct.quantity} un.`} />
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle>Detalhes das Vendas do Período</CardTitle>
            <CardDescription>
              {getPeriodDescription()}
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
                    {salesForPeriod.length > 0 ? (
                    salesForPeriod.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((sale: Sale) => (
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
                        Nenhuma venda encontrada para este período.
                        </TableCell>
                    </TableRow>
                    )}
                </TableBody>
                </Table>
            </div>
            <div className="block md:hidden space-y-3">
                {salesForPeriod.length > 0 ? (
                    salesForPeriod.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((sale: Sale) => (
                        <SaleReportCard key={sale.id} sale={sale} />
                    ))
                ) : (
                    <div className="h-24 text-center flex items-center justify-center text-muted-foreground">
                        Nenhuma venda encontrada para este período.
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

    