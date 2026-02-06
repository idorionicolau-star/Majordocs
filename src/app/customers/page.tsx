'use client';

import { useState } from 'react';
import { useInventory } from '@/context/inventory-context';
import { useCRM } from '@/context/crm-context';
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
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, normalizeString } from '@/lib/utils';
import { Search, Plus, User, Phone, Mail, Calendar, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/components/ui/use-toast';

export default function CustomersPage() {
    const { canView, companyData, sales } = useInventory();
    const { customers, addCustomer, updateCustomer, deleteCustomer, loading } = useCRM();
    const { toast } = useToast();

    const [searchTerm, setSearchTerm] = useState('');
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<any>(null);
    const [viewingCustomer, setViewingCustomer] = useState<any>(null);

    // Form State
    const [formData, setFormData] = useState({ name: '', phone: '', email: '', notes: '' });

    if (!canView('customers')) {
        return <div className="p-8 text-center">Você não tem permissão para aceder a este módulo.</div>;
    }

    const filteredCustomers = customers.filter(c =>
        normalizeString(c.name).includes(normalizeString(searchTerm)) ||
        (c.phone && c.phone.includes(searchTerm)) ||
        (c.email && normalizeString(c.email).includes(normalizeString(searchTerm)))
    );

    const handleAddSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name) return;
        try {
            await addCustomer(formData);
            setIsAddOpen(false);
            setFormData({ name: '', phone: '', email: '', notes: '' });
        } catch (e) {
            // toast handled in context
        }
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingCustomer || !formData.name) return;
        try {
            await updateCustomer(editingCustomer.id, formData);
            setEditingCustomer(null);
            setFormData({ name: '', phone: '', email: '', notes: '' });
        } catch (e) {
            // toast handled in context
        }
    };

    const openEdit = (customer: any) => {
        setFormData({
            name: customer.name,
            phone: customer.phone || '',
            email: customer.email || '',
            notes: customer.notes || '',
        });
        setEditingCustomer(customer);
    };

    const handleDelete = async (id: string) => {
        if (confirm('Tem a certeza que deseja remover este cliente?')) {
            await deleteCustomer(id);
        }
    };

    const getCustomerHistory = (customerId: string) => {
        return sales.filter(s => s.customerId === customerId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    };

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-headline text-slate-900 dark:text-white">Gestão de Clientes</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Gerencie a sua base de clientes e visualize o histórico de compras.
                    </p>
                </div>
                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95">
                            <Plus className="w-4 h-4 mr-2" />
                            Novo Cliente
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Adicionar Novo Cliente</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleAddSubmit} className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Nome Completo</Label>
                                <Input id="name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required placeholder="Ex: João Silva" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="phone">Telefone</Label>
                                    <Input id="phone" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="+258..." />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">E-mail</Label>
                                    <Input id="email" type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="email@exemplo.com" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="notes">Notas</Label>
                                <Input id="notes" value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} placeholder="Preferências, observações..." />
                            </div>
                            <DialogFooter>
                                <Button type="submit">Guardar Cliente</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Stats/Search */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="md:col-span-1 shadow-sm border-slate-200 dark:border-slate-800 bg-gradient-to-br from-blue-50 to-white dark:from-slate-900 dark:to-slate-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">Total de Clientes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold font-headline text-slate-900 dark:text-white">{loading ? '...' : customers.length}</div>
                    </CardContent>
                </Card>

                <div className="md:col-span-2 flex items-end">
                    <div className="relative w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Pesquisar por nome, telefone ou email..."
                            className="pl-10 h-12 text-lg bg-white dark:bg-slate-900 shadow-sm border-slate-200 dark:border-slate-800 focus-visible:ring-primary"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
                        <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead>Contacto</TableHead>
                            <TableHead>Total Comprado</TableHead>
                            <TableHead>Última Visita</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredCustomers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center text-slate-500">
                                    {loading ? 'A carregar...' : 'Nenhum cliente encontrado.'}
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredCustomers.map((customer) => (
                                <TableRow key={customer.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xs">
                                                {customer.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-slate-900 dark:text-white font-headline">{customer.name}</span>
                                                {customer.notes && <span className="text-xs text-slate-400 truncate max-w-[150px]">{customer.notes}</span>}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col text-sm text-slate-500">
                                            {customer.phone && <div className="flex items-center gap-1"><Phone className="w-3 h-3" /> {customer.phone}</div>}
                                            {customer.email && <div className="flex items-center gap-1"><Mail className="w-3 h-3" /> {customer.email}</div>}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className="font-bold text-slate-900 dark:text-white font-mono bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                                            {formatCurrency(customer.totalPurchases || 0, { compact: true })}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1 text-slate-500 text-sm">
                                            <Calendar className="w-3 h-3" />
                                            {customer.lastVisit ? format(new Date(customer.lastVisit), "d MMM yyyy", { locale: ptBR }) : '-'}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="icon" onClick={() => setViewingCustomer(customer)} className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-50">
                                                <User className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => openEdit(customer)} className="h-8 w-8 text-slate-500 hover:text-slate-900 hover:bg-slate-100">
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(customer.id)} className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Edit Dialog */}
            <Dialog open={!!editingCustomer} onOpenChange={(open) => !open && setEditingCustomer(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Editar Cliente</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleEditSubmit} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Nome Completo</Label>
                            <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Telefone</Label>
                                <Input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>E-mail</Label>
                                <Input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Notas</Label>
                            <Input value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} />
                        </div>
                        <DialogFooter>
                            <Button type="submit">Guardar Alterações</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* History Dialog */}
            <Dialog open={!!viewingCustomer} onOpenChange={(open) => !open && setViewingCustomer(null)}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <User className="w-5 h-5 text-primary" />
                            Histórico de {viewingCustomer?.name}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6">
                        <div className="grid grid-cols-3 gap-4">
                            <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg text-center">
                                <p className="text-xs text-slate-500 uppercase font-bold">Total Gasto</p>
                                <p className="text-lg font-bold text-primary">{formatCurrency(viewingCustomer?.totalPurchases || 0)}</p>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg text-center">
                                <p className="text-xs text-slate-500 uppercase font-bold">Vendas</p>
                                <p className="text-lg font-bold text-slate-700 dark:text-slate-300">
                                    {viewingCustomer ? getCustomerHistory(viewingCustomer.id).length : 0}
                                </p>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg text-center">
                                <p className="text-xs text-slate-500 uppercase font-bold">Última Visita</p>
                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mt-1">
                                    {viewingCustomer?.lastVisit ? format(new Date(viewingCustomer.lastVisit), "d MMM yy", { locale: ptBR }) : '-'}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <h3 className="font-bold text-sm text-slate-500 uppercase tracking-wider">Compras Recentes</h3>
                            <div className="space-y-2">
                                {viewingCustomer && getCustomerHistory(viewingCustomer.id).length > 0 ? (
                                    getCustomerHistory(viewingCustomer.id).slice(0, 10).map(sale => (
                                        <div key={sale.id} className="flex justify-between items-center p-3 border border-slate-100 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <div className="flex flex-col">
                                                <span className="font-medium text-slate-800 dark:text-slate-200">{sale.productName} <span className="text-slate-400 text-xs">x{sale.quantity}</span></span>
                                                <span className="text-xs text-slate-500">{format(new Date(sale.date), "d MMM yyyy HH:mm", { locale: ptBR })} • {sale.guideNumber}</span>
                                            </div>
                                            <span className="font-mono font-bold text-slate-900 dark:text-white">{formatCurrency(sale.totalValue)}</span>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-center text-slate-500 text-sm py-4">Sem registo de compras.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

        </div>
    );
}
