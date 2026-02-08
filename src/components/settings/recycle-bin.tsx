"use client";

import { useState, useContext, useMemo } from 'react';
import { InventoryContext } from '@/context/inventory-context';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, RefreshCw, AlertTriangle, Search } from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function RecycleBin() {
    const { allProducts: products, allSales: sales, allOrders: orders, allProductions: productions, restoreItem, hardDelete, user, confirmAction } = useContext(InventoryContext) || { allProducts: [], allSales: [], allOrders: [], allProductions: [], confirmAction: () => { } };
    const [searchQuery, setSearchQuery] = useState('');
    const [itemToRestore, setItemToRestore] = useState<{ id: string, name: string, type: 'product' | 'sale' | 'order' | 'production' } | null>(null);
    const [itemToDelete, setItemToDelete] = useState<{ id: string, name: string, type: 'product' | 'sale' | 'order' | 'production' } | null>(null);

    // We need to fetch *deleted* items.
    // However, the context's `products` and `sales` usually Filter Out deleted items?
    // If I changed the types to include `deletedAt`, I need to check if the main hooks filter them out.
    // Usually `useCollection` fetches everything unless I put a query constraint.
    // If I didn't update the hooks in `InventoryContext`, they are fetching everything.
    // So I need to filter locally.
    // BUT, usually we WANT to filter them out from the main UI (Inventory Table).
    // The main UI probably iterates `products` directly.
    // So if `products` contains deleted items, they show up in Inventory.
    // I need to check `InventoryContext` fetching logic.
    // If `useCollection` gets everything, I should filter `products` exported in context to NOT include deleted.
    // AND have a separate `deletedProducts` or expose `allProducts`?
    // OR, I just filter here for `p.deletedAt` and filter in InventoryPage for `!p.deletedAt`.

    // Assumption: The main context exports `products` as Raw from useCollection (or memoized).
    // I need to verify this behavior.

    // Let's assume for now they are all in `products` / `sales`.

    const deletedProducts = useMemo(() => {
        return products?.filter(p => p.deletedAt) || [];
    }, [products]);

    const deletedSales = useMemo(() => {
        return sales?.filter(s => s.deletedAt) || [];
    }, [sales]);

    const deletedOrders = useMemo(() => {
        return orders?.filter(o => o.deletedAt) || [];
    }, [orders]);

    const deletedProductions = useMemo(() => {
        return productions?.filter(p => p.deletedAt) || [];
    }, [productions]);

    const filteredProducts = deletedProducts.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredSales = deletedSales.filter(s =>
        (s.productName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.guideNumber || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredOrders = deletedOrders.filter(o =>
        (o.productName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (o.clientName || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredProductions = deletedProductions.filter(p =>
        (p.productName || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleRestore = async () => {
        if (!itemToRestore || !restoreItem || !confirmAction) return;
        confirmAction(async () => {
            let collection = '';
            switch (itemToRestore.type) {
                case 'product': collection = 'products'; break;
                case 'sale': collection = 'sales'; break;
                case 'order': collection = 'orders'; break;
                case 'production': collection = 'productions'; break;
            }
            if (collection) {
                await restoreItem(collection, itemToRestore.id);
                setItemToRestore(null);
            }
        }, "Restaurar Item", "Confirme com a sua palavra-passe para restaurar este item.");
    };

    const handleHardDelete = async () => {
        if (!itemToDelete || !hardDelete || !confirmAction) return;
        confirmAction(async () => {
            let collection = '';
            switch (itemToDelete.type) {
                case 'product': collection = 'products'; break;
                case 'sale': collection = 'sales'; break;
                case 'order': collection = 'orders'; break;
                case 'production': collection = 'productions'; break;
            }
            if (collection) {
                await hardDelete(collection, itemToDelete.id);
                setItemToDelete(null);
            }
        }, "Excluir Permanentemente", "Esta ação é irreversível. O item será apagado para sempre.");
    };

    if (!user || user.role !== 'Admin') return <div className="p-4 text-center text-muted-foreground">Acesso restrito a administradores.</div>;

    return (
        <Card className="border-red-200 dark:border-red-900 bg-red-50/20">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Trash2 className="h-5 w-5 text-red-500" />
                            Lixeira (Recycle Bin)
                        </CardTitle>
                        <CardDescription>
                            Recupere itens apagados ou remova-os permanentemente.
                        </CardDescription>
                    </div>
                </div>
                <div className="mt-4">
                    <div className="relative">

                        <Input
                            placeholder="Procurar itens apagados..."

                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="products">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="products">Produtos ({deletedProducts.length})</TabsTrigger>
                        <TabsTrigger value="sales">Vendas ({deletedSales.length})</TabsTrigger>
                        <TabsTrigger value="orders">Encomendas ({deletedOrders.length})</TabsTrigger>
                        <TabsTrigger value="production">Produção ({deletedProductions.length})</TabsTrigger>
                    </TabsList>

                    <TabsContent value="products">
                        <ScrollArea className="h-[300px] border rounded-md bg-background">
                            {filteredProducts.length === 0 ? (
                                <p className="text-center p-4 text-muted-foreground text-sm">Nenhum produto na lixeira.</p>
                            ) : (
                                <div className="divide-y">
                                    {filteredProducts.map(product => (
                                        <div key={product.id} className="p-3 flex items-center justify-between hover:bg-muted/50">
                                            <div>
                                                <p className="font-medium text-sm">{product.name}</p>
                                                <p className="text-xs text-muted-foreground">Apagado a: {product.deletedAt ? format(new Date(product.deletedAt), "dd/MM/yyyy HH:mm", { locale: pt }) : 'N/A'}</p>
                                                <p className="text-xs text-muted-foreground">Por: {product.deletedBy || 'Desconhecido'}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button size="icon" variant="outline" className="h-8 w-8 text-green-600" onClick={() => setItemToRestore({ id: product.id!, name: product.name, type: 'product' })}>
                                                    <RefreshCw className="h-4 w-4" />
                                                </Button>
                                                <Button size="icon" variant="outline" className="h-8 w-8 text-red-600 border-red-200 hover:bg-red-50" onClick={() => setItemToDelete({ id: product.id!, name: product.name, type: 'product' })}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </TabsContent>

                    <TabsContent value="sales">
                        <ScrollArea className="h-[300px] border rounded-md bg-background">
                            {filteredSales.length === 0 ? (
                                <p className="text-center p-4 text-muted-foreground text-sm">Nenhuma venda na lixeira.</p>
                            ) : (
                                <div className="divide-y">
                                    {filteredSales.map(sale => (
                                        <div key={sale.id} className="p-3 flex items-center justify-between hover:bg-muted/50">
                                            <div>
                                                <p className="font-medium text-sm">{sale.productName} (Qty: {sale.quantity})</p>
                                                <p className="text-xs text-muted-foreground">Guia: {sale.guideNumber}</p>
                                                <p className="text-xs text-muted-foreground">Apagado a: {sale.deletedAt ? format(new Date(sale.deletedAt), "dd/MM/yyyy HH:mm", { locale: pt }) : 'N/A'}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button size="icon" variant="outline" className="h-8 w-8 text-green-600" onClick={() => setItemToRestore({ id: sale.id, name: `Venda ${sale.guideNumber}`, type: 'sale' })}>
                                                    <RefreshCw className="h-4 w-4" />
                                                </Button>
                                                <Button size="icon" variant="outline" className="h-8 w-8 text-red-600 border-red-200 hover:bg-red-50" onClick={() => setItemToDelete({ id: sale.id, name: `Venda ${sale.guideNumber}`, type: 'sale' })}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </TabsContent>

                    <TabsContent value="orders">
                        <ScrollArea className="h-[300px] border rounded-md bg-background">
                            {filteredOrders.length === 0 ? (
                                <p className="text-center p-4 text-muted-foreground text-sm">Nenhuma encomenda na lixeira.</p>
                            ) : (
                                <div className="divide-y">
                                    {filteredOrders.map(order => (
                                        <div key={order.id} className="p-3 flex items-center justify-between hover:bg-muted/50">
                                            <div>
                                                <p className="font-medium text-sm">{order.productName} (Qty: {order.quantity})</p>
                                                <p className="text-xs text-muted-foreground">Cliente: {order.clientName || 'N/A'}</p>
                                                <p className="text-xs text-muted-foreground">Apagado a: {order.deletedAt ? format(new Date(order.deletedAt), "dd/MM/yyyy HH:mm", { locale: pt }) : 'N/A'}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button size="icon" variant="outline" className="h-8 w-8 text-green-600" onClick={() => setItemToRestore({ id: order.id, name: `Encomenda de ${order.productName}`, type: 'order' })}>
                                                    <RefreshCw className="h-4 w-4" />
                                                </Button>
                                                <Button size="icon" variant="outline" className="h-8 w-8 text-red-600 border-red-200 hover:bg-red-50" onClick={() => setItemToDelete({ id: order.id, name: `Encomenda de ${order.productName}`, type: 'order' })}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </TabsContent>

                    <TabsContent value="production">
                        <ScrollArea className="h-[300px] border rounded-md bg-background">
                            {filteredProductions.length === 0 ? (
                                <p className="text-center p-4 text-muted-foreground text-sm">Nenhum registo de produção na lixeira.</p>
                            ) : (
                                <div className="divide-y">
                                    {filteredProductions.map(prod => (
                                        <div key={prod.id} className="p-3 flex items-center justify-between hover:bg-muted/50">
                                            <div>
                                                <p className="font-medium text-sm">{prod.productName} (Qty: {prod.quantity})</p>
                                                <p className="text-xs text-muted-foreground">Data: {format(new Date(prod.date), "dd/MM/yyyy")}</p>
                                                <p className="text-xs text-muted-foreground">Apagado a: {prod.deletedAt ? format(new Date(prod.deletedAt), "dd/MM/yyyy HH:mm", { locale: pt }) : 'N/A'}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button size="icon" variant="outline" className="h-8 w-8 text-green-600" onClick={() => setItemToRestore({ id: prod.id, name: `Produção de ${prod.productName}`, type: 'production' })}>
                                                    <RefreshCw className="h-4 w-4" />
                                                </Button>
                                                <Button size="icon" variant="outline" className="h-8 w-8 text-red-600 border-red-200 hover:bg-red-50" onClick={() => setItemToDelete({ id: prod.id, name: `Produção de ${prod.productName}`, type: 'production' })}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </TabsContent>
                </Tabs>
            </CardContent>

            <Dialog open={!!itemToRestore} onOpenChange={(open) => !open && setItemToRestore(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Restaurar Item</DialogTitle>
                        <DialogDescription>
                            Tem a certeza que deseja restaurar "{itemToRestore?.name}"? Ele voltará a aparecer nas listas principais.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setItemToRestore(null)}>Cancelar</Button>
                        <Button onClick={handleRestore} className="bg-green-600 hover:bg-green-700">Restaurar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-destructive">Excluir Permanentemente</DialogTitle>
                        <DialogDescription>
                            <span className="flex items-center gap-2 font-bold text-red-600 mb-2">
                                <AlertTriangle className="h-4 w-4" /> Ação Irreversível
                            </span>
                            Tem a certeza que deseja apagar permanentemente "{itemToDelete?.name}"? Esta ação não pode ser desfeita.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setItemToDelete(null)}>Cancelar</Button>
                        <Button variant="destructive" onClick={handleHardDelete}>Apagar Para Sempre</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
