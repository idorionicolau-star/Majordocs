'use client';

import { useState, useMemo } from 'react';
import { useInventory } from '@/context/inventory-context';
import { useFinance } from '@/context/finance-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { formatCurrency, normalizeString } from '@/lib/utils';
import { Search, Plus, TrendingUp, TrendingDown, DollarSign, Calendar, Trash2, Printer, Download } from 'lucide-react';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import dynamic from 'next/dynamic';
import { printFinancialReport } from '@/lib/report-utils';

// Dynamically import PDFDownloadLink to avoid SSR issues with @react-pdf/renderer
const PDFDownloadLink = dynamic(
    () => import('@react-pdf/renderer').then((mod) => mod.PDFDownloadLink),
    { ssr: false, loading: () => <Button variant="outline" disabled><Download className="w-4 h-4 mr-2" /> A carregar...</Button> }
);
import { FinancialReportPDF } from '@/components/finance/financial-report-pdf';

export default function FinancePage() {
    const { canView, sales, companyData, confirmAction } = useInventory();
    const { expenses, addExpense, deleteExpense, loading } = useFinance();

    const [searchTerm, setSearchTerm] = useState('');
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [formData, setFormData] = useState({ description: '', amount: '', category: 'Outros' });

    // Get current month stats
    const currentMonthStart = startOfMonth(new Date());
    const currentMonthEnd = endOfMonth(new Date());

    const currentMonthSales = sales.filter(s => isWithinInterval(new Date(s.date), { start: currentMonthStart, end: currentMonthEnd }));
    const currentMonthExpenses = expenses.filter(e => isWithinInterval(new Date(e.date), { start: currentMonthStart, end: currentMonthEnd }));

    const totalIncome = currentMonthSales.reduce((acc, s) => acc + (s.amountPaid || s.totalValue), 0);
    const totalExpenses = currentMonthExpenses.reduce((acc, e) => acc + e.amount, 0);
    const netProfit = totalIncome - totalExpenses;

    // Filter expenses for table
    const filteredExpenses = expenses.filter(e =>
        normalizeString(e.description).includes(normalizeString(searchTerm)) ||
        normalizeString(e.category).includes(normalizeString(searchTerm))
    );

    const handleAddSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.description || !formData.amount) return;
        try {
            await addExpense({
                description: formData.description,
                amount: parseFloat(formData.amount),
                category: formData.category,
                date: new Date().toISOString(),
                status: 'Pago', // Default to Paid for simplicity now
            });
            setIsAddOpen(false);
            setFormData({ description: '', amount: '', category: 'Outros' });
        } catch (e) { }
    };

    if (!canView('finance')) {
        return <div className="p-8 text-center">Você não tem permissão para aceder a este módulo.</div>;
    }

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            {/* Header */}
            <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold font-headline text-slate-900 dark:text-white">Fluxo Financeiro</h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                            Controle de receitas, despesas e margens.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                            <DialogTrigger asChild>
                                <Button className="flex-1 sm:flex-none bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20 transition-all active:scale-95">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Registar Despesa
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px]">
                                <DialogHeader>
                                    <DialogTitle>Registar Nova Despesa</DialogTitle>
                                </DialogHeader>
                                <form onSubmit={handleAddSubmit} className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label>Descrição</Label>
                                        <Input value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} required placeholder="Ex: Conta de Luz" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Valor (MZN)</Label>
                                            <Input type="number" step="0.01" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} required placeholder="0.00" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Categoria</Label>
                                            <Select value={formData.category} onValueChange={v => setFormData({ ...formData, category: v })}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Salários">Salários</SelectItem>
                                                    <SelectItem value="Aluguel">Aluguel</SelectItem>
                                                    <SelectItem value="Utilidades">Utilidades</SelectItem>
                                                    <SelectItem value="Matéria-Prima">Matéria-Prima</SelectItem>
                                                    <SelectItem value="Marketing">Marketing</SelectItem>
                                                    <SelectItem value="Impostos">Impostos</SelectItem>
                                                    <SelectItem value="Outros">Outros</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button type="submit" className="w-full bg-red-500 hover:bg-red-600">Confirmar Despesa</Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 sm:flex-none text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700"
                        onClick={() => printFinancialReport({
                            companyName: companyData?.name || 'Minha Empresa',
                            period: format(new Date(), "MMMM yyyy", { locale: ptBR }),
                            totalIncome,
                            totalExpenses,
                            netProfit,
                            sales: currentMonthSales,
                            expenses: currentMonthExpenses
                        })}
                    >
                        <Printer className="w-4 h-4 mr-2" />
                        Imprimir
                    </Button>

                    <PDFDownloadLink
                        document={
                            <FinancialReportPDF
                                companyName={companyData?.name || 'Minha Empresa'}
                                period={format(new Date(), "MMMM yyyy", { locale: ptBR })}
                                totalIncome={totalIncome}
                                totalExpenses={totalExpenses}
                                netProfit={netProfit}
                                sales={currentMonthSales}
                                expenses={currentMonthExpenses}
                            />
                        }
                        fileName={`Relatorio_Financeiro_${format(new Date(), "MMM_yyyy")}.pdf`}
                    >
                        {({ loading: pdfLoading }: any) => (
                            <Button variant="outline" size="sm" className="w-full sm:w-auto" disabled={pdfLoading}>
                                <Download className="w-4 h-4 mr-2" />
                                {pdfLoading ? 'A preparar...' : 'Baixar PDF'}
                            </Button>
                        )}
                    </PDFDownloadLink>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-green-100 bg-green-50/50 dark:bg-green-900/10 dark:border-green-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-green-600 dark:text-green-400 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4" /> Entradas (Mês)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-green-700 dark:text-green-300">{formatCurrency(totalIncome)}</div>
                        <p className="text-xs text-green-600/80 mt-1">{currentMonthSales.length} vendas registadas</p>
                    </CardContent>
                </Card>

                <Card className="border-red-100 bg-red-50/50 dark:bg-red-900/10 dark:border-red-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-red-600 dark:text-red-400 flex items-center gap-2">
                            <TrendingDown className="w-4 h-4" /> Saídas (Mês)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-red-700 dark:text-red-300">{formatCurrency(totalExpenses)}</div>
                        <p className="text-xs text-red-600/80 mt-1">{currentMonthExpenses.length} despesas registadas</p>
                    </CardContent>
                </Card>

                <Card className={`border-slate-200 dark:border-slate-800 ${netProfit >= 0 ? 'bg-blue-50/50 dark:bg-blue-900/10' : 'bg-orange-50/50 dark:bg-orange-900/10'}`}>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
                            <DollarSign className="w-4 h-4" /> Lucro Líquido
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={`text-3xl font-bold ${netProfit >= 0 ? 'text-blue-700 dark:text-blue-300' : 'text-orange-600'}`}>
                            {formatCurrency(netProfit)}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Margem operacional do mês</p>
                    </CardContent>
                </Card>
            </div>

            {/* Expenses List */}
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <h2 className="text-xl font-bold font-headline">Registo de Despesas</h2>
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Pesquisar despesa..."
                            className="pl-10 sm:pl-10 h-10 w-full"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />

                    </div>
                </div>

                {/* Desktop Table */}
                <div className="hidden md:block rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
                            <TableRow>
                                <TableHead>Descrição</TableHead>
                                <TableHead>Categoria</TableHead>
                                <TableHead>Valor</TableHead>
                                <TableHead>Data</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredExpenses.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center text-slate-500">
                                        {loading ? 'A carregar...' : 'Nenhuma despesa registada.'}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredExpenses.map((expense) => (
                                    <TableRow key={expense.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <TableCell className="font-medium">
                                            {expense.description}
                                        </TableCell>
                                        <TableCell>
                                            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                                {expense.category}
                                            </span>
                                        </TableCell>
                                        <TableCell className="font-bold text-red-600 dark:text-red-400">
                                            -{formatCurrency(expense.amount)}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1 text-slate-500 text-sm">
                                                <Calendar className="w-3 h-3" />
                                                {format(new Date(expense.date), "d MMM yyyy", { locale: ptBR })}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => {
                                                if (confirmAction) {
                                                    confirmAction(async () => {
                                                        await deleteExpense(expense.id);
                                                    }, "Apagar Despesa", `Tem a certeza que quer apagar a despesa "${expense.description}"? Esta ação não pode ser desfeita.`);
                                                }
                                            }} className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-3">
                    {filteredExpenses.length === 0 ? (
                        <Card className="p-8 text-center text-slate-500 bg-white/50 dark:bg-slate-900/50 border-dashed">
                            {loading ? 'A carregar...' : 'Nenhuma despesa encontrada.'}
                        </Card>
                    ) : (
                        filteredExpenses.map((expense) => (
                            <Card key={expense.id} className="overflow-hidden border-slate-200 dark:border-slate-800">
                                <CardContent className="p-4">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="space-y-1">
                                            <h3 className="font-bold text-slate-800 dark:text-slate-200">{expense.description}</h3>
                                            <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-500">
                                                {expense.category}
                                            </span>
                                        </div>
                                        <p className="text-lg font-black text-red-600 dark:text-red-400">
                                            -{formatCurrency(expense.amount)}
                                        </p>
                                    </div>
                                    <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-800">
                                        <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                                            <Calendar className="w-3.5 h-3.5" />
                                            {format(new Date(expense.date), "d MMM yyyy", { locale: ptBR })}
                                        </div>
                                        <Button variant="ghost" size="sm" onClick={() => {
                                            if (confirmAction) {
                                                confirmAction(async () => {
                                                    await deleteExpense(expense.id);
                                                }, "Apagar Despesa", `Tem a certeza que quer apagar a despesa "${expense.description}"? Esta ação não pode ser desfeita.`);
                                            }
                                        }} className="h-8 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30">
                                            <Trash2 className="h-4 w-4 mr-1.5" />
                                            Apagar
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
