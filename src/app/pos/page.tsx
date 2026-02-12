"use client";

import React, { useState, useContext, useMemo, useCallback, useEffect } from 'react';
import { InventoryContext } from '@/context/inventory-context';
import { useCRM } from '@/context/crm-context';
import type { CartItem, Product, Sale, Location } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { DatePicker } from '@/components/ui/date-picker';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MathInput } from '@/components/ui/math-input';

import {
    ShoppingCart,
    Plus,
    Minus,
    Trash2,
    Search,
    Package,
    Receipt,
    X,
    CreditCard,
    AlertTriangle
} from 'lucide-react';

type CatalogProduct = Omit<Product, 'stock' | 'instanceId' | 'reservedStock' | 'location' | 'lastUpdated'>;

const CART_STORAGE_KEY = 'majorstockx-pos-cart';

function loadCartFromStorage(): CartItem[] {
    if (typeof window === 'undefined') return [];
    try {
        const saved = localStorage.getItem(CART_STORAGE_KEY);
        return saved ? JSON.parse(saved) : [];
    } catch {
        return [];
    }
}

function saveCartToStorage(cart: CartItem[]) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
}

export default function POSPage() {
    const inventoryContext = useContext(InventoryContext);
    const {
        products,
        catalogProducts,
        catalogCategories,
        loading,
        user,
        companyId,
        locations,
        isMultiLocation,
        addSale,
        canView,
        canEdit,
    } = inventoryContext || {
        products: [], catalogProducts: [], catalogCategories: [], loading: true,
        user: null, companyId: null, locations: [], isMultiLocation: false,
        addSale: async () => { }, canView: () => false, canEdit: () => false,
    };
    const { customers, addCustomer } = useCRM();
    const { toast } = useToast();

    const [cart, setCart] = useState<CartItem[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [selectedLocation, setSelectedLocation] = useState<string>('');
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

    // Checkout form state
    const [checkoutClientName, setCheckoutClientName] = useState('');
    const [checkoutCustomerId, setCheckoutCustomerId] = useState('new');
    const [checkoutDocType, setCheckoutDocType] = useState<'Factura Proforma' | 'Guia de Remessa' | 'Factura' | 'Recibo'>('Factura Proforma');
    const [checkoutNotes, setCheckoutNotes] = useState('');
    const [checkoutApplyVat, setCheckoutApplyVat] = useState(false);
    const [checkoutVatPercentage, setCheckoutVatPercentage] = useState(17);
    const [checkoutDiscountType, setCheckoutDiscountType] = useState<'fixed' | 'percentage'>('fixed');
    const [checkoutDiscountValue, setCheckoutDiscountValue] = useState(0);
    const [checkoutDate, setCheckoutDate] = useState<Date>(new Date());
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Load cart from localStorage on mount
    useEffect(() => {
        setCart(loadCartFromStorage());
    }, []);

    // Set default location
    useEffect(() => {
        if (isMultiLocation && locations.length > 0 && !selectedLocation) {
            const saved = localStorage.getItem('majorstockx-last-product-location');
            setSelectedLocation(saved && locations.some(l => l.id === saved) ? saved : locations[0].id);
        }
    }, [isMultiLocation, locations, selectedLocation]);

    // Save cart to localStorage on change
    useEffect(() => {
        saveCartToStorage(cart);
    }, [cart]);

    // Auto-set client name when customer is selected
    useEffect(() => {
        if (checkoutCustomerId && checkoutCustomerId !== 'new') {
            const customer = customers.find(c => c.id === checkoutCustomerId);
            if (customer) setCheckoutClientName(customer.name);
        }
    }, [checkoutCustomerId, customers]);

    // Products available for sale at current location
    const availableProducts = useMemo(() => {
        if (!products || !catalogProducts) return [];

        const productsForLocation = isMultiLocation && selectedLocation
            ? products.filter(p => p.location === selectedLocation)
            : products;

        const inStock = productsForLocation.filter(p => (p.stock - p.reservedStock) > 0);
        const inStockMap = new Map<string, Product>();
        inStock.forEach(p => { if (!inStockMap.has(p.name)) inStockMap.set(p.name, p); });

        return catalogProducts
            .filter(cp => inStockMap.has(cp.name))
            .map(cp => ({
                ...cp,
                stockInstance: inStockMap.get(cp.name)!,
                availableStock: (inStockMap.get(cp.name)!.stock || 0) - (inStockMap.get(cp.name)!.reservedStock || 0),
            }));
    }, [products, catalogProducts, selectedLocation, isMultiLocation]);

    // Filtered products based on search and category
    const filteredProducts = useMemo(() => {
        let result = availableProducts;

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(p =>
                p.name.toLowerCase().includes(query) ||
                p.category?.toLowerCase().includes(query)
            );
        }

        if (selectedCategory !== 'all') {
            result = result.filter(p => p.category === selectedCategory);
        }

        return result;
    }, [availableProducts, searchQuery, selectedCategory]);

    // Unique categories
    const categories = useMemo(() => {
        const cats = new Set(availableProducts.map(p => p.category).filter(Boolean));
        return ['all', ...Array.from(cats)];
    }, [availableProducts]);

    // Cart calculations
    const cartSubtotal = useMemo(() => cart.reduce((sum, item) => sum + item.subtotal, 0), [cart]);

    const discountAmount = useMemo(() => {
        if (checkoutDiscountType === 'percentage') {
            return cartSubtotal * (checkoutDiscountValue / 100);
        }
        return checkoutDiscountValue;
    }, [checkoutDiscountType, checkoutDiscountValue, cartSubtotal]);

    const totalAfterDiscount = Math.max(0, cartSubtotal - discountAmount);
    const vatAmount = checkoutApplyVat ? totalAfterDiscount * (checkoutVatPercentage / 100) : 0;
    const cartTotal = totalAfterDiscount + vatAmount;

    // Cart actions
    const addToCart = useCallback((product: typeof availableProducts[0]) => {
        setCart(prev => {
            const existing = prev.find(item => item.productName === product.name);
            if (existing) {
                // Check stock limit
                const newQty = existing.quantity + 1;
                if (newQty > product.availableStock) {
                    toast({ variant: 'destructive', title: 'Stock Insuficiente', description: `Apenas ${product.availableStock} ${product.unit || 'un'} disponíveis.` });
                    return prev;
                }
                return prev.map(item =>
                    item.productName === product.name
                        ? { ...item, quantity: newQty, subtotal: newQty * item.unitPrice }
                        : item
                );
            }
            return [...prev, {
                productId: product.stockInstance.id || product.id || '',
                productName: product.name,
                quantity: 1,
                unitPrice: product.price || 0,
                unit: product.unit || 'un',
                location: selectedLocation || undefined,
                subtotal: product.price || 0,
            }];
        });
    }, [selectedLocation, toast, availableProducts]);

    const updateCartQuantity = useCallback((productName: string, newQuantity: number) => {
        if (newQuantity <= 0) {
            setCart(prev => prev.filter(item => item.productName !== productName));
            return;
        }
        const product = availableProducts.find(p => p.name === productName);
        if (product && newQuantity > product.availableStock) {
            toast({ variant: 'destructive', title: 'Stock Insuficiente', description: `Apenas ${product.availableStock} ${product.unit || 'un'} disponíveis.` });
            return;
        }
        setCart(prev => prev.map(item =>
            item.productName === productName
                ? { ...item, quantity: newQuantity, subtotal: newQuantity * item.unitPrice }
                : item
        ));
    }, [availableProducts, toast]);

    const updateCartPrice = useCallback((productName: string, newPrice: number) => {
        setCart(prev => prev.map(item =>
            item.productName === productName
                ? { ...item, unitPrice: newPrice, subtotal: item.quantity * newPrice }
                : item
        ));
    }, []);

    const removeFromCart = useCallback((productName: string) => {
        setCart(prev => prev.filter(item => item.productName !== productName));
    }, []);

    const clearCart = useCallback(() => {
        setCart([]);
        localStorage.removeItem(CART_STORAGE_KEY);
    }, []);

    // Checkout
    const handleCheckout = async () => {
        if (!addSale || !user || cart.length === 0) return;
        setIsSubmitting(true);

        try {
            // Resolve customer
            let finalCustomerId = checkoutCustomerId === 'new' ? undefined : checkoutCustomerId;

            if (checkoutClientName && !finalCustomerId) {
                const normalizedName = checkoutClientName.trim();
                const existing = customers.find(c => c.name.toLowerCase() === normalizedName.toLowerCase());
                if (existing) {
                    finalCustomerId = existing.id;
                } else {
                    try {
                        const newId = await addCustomer({ name: normalizedName });
                        if (newId) finalCustomerId = newId;
                    } catch (e) { console.error("Failed to auto-create customer:", e); }
                }
            }

            // Create individual sales for each cart item, all linked by the same guide number
            for (const item of cart) {
                const saleData: Omit<Sale, 'id' | 'guideNumber'> = {
                    date: checkoutDate.toISOString(),
                    productId: item.productId,
                    productName: item.productName,
                    quantity: item.quantity,
                    unit: item.unit,
                    unitPrice: item.unitPrice,
                    subtotal: item.subtotal,
                    discount: cart.length === 1 ? discountAmount : 0,
                    vat: cart.length === 1 ? vatAmount : 0,
                    totalValue: cart.length === 1 ? cartTotal : item.subtotal,
                    amountPaid: cart.length === 1 ? cartTotal : item.subtotal,
                    soldBy: user.username,
                    status: 'Pago',
                    location: item.location || '',
                    documentType: checkoutDocType,
                    clientName: checkoutClientName || '',
                    customerId: finalCustomerId || '',
                    notes: checkoutNotes || '',
                };

                await addSale(saleData);
            }

            toast({
                title: '🎉 Venda Concluída!',
                description: `${cart.length} item${cart.length > 1 ? 's' : ''} vendido${cart.length > 1 ? 's' : ''} por ${formatCurrency(cartTotal)}.`,
            });

            clearCart();
            setIsCheckoutOpen(false);
            resetCheckoutForm();
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Erro na Venda',
                description: error.message || 'Não foi possível registar a venda.',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetCheckoutForm = () => {
        setCheckoutDate(new Date());
        setCheckoutClientName('');
        setCheckoutCustomerId('new');
        setCheckoutDocType('Factura Proforma');
        setCheckoutNotes('');
        setCheckoutApplyVat(false);
        setCheckoutVatPercentage(17);
        setCheckoutDiscountType('fixed');
        setCheckoutDiscountValue(0);
    };

    if (loading) {
        return (
            <div className="p-6 space-y-4">
                <Skeleton className="h-10 w-48" />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-4">
                        <Skeleton className="h-12 w-full" />
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
                        </div>
                    </div>
                    <Skeleton className="h-96 w-full" />
                </div>
            </div>
        );
    }

    if (!canView('sales')) {
        return (
            <div className="flex items-center justify-center h-full">
                <Card className="p-8 text-center">
                    <CardHeader>
                        <CardTitle>Acesso Negado</CardTitle>
                        <CardDescription>Não tem permissão para aceder ao ponto de venda.</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 pb-20 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <h1 className="text-2xl md:text-3xl font-headline font-bold flex items-center gap-3">
                    <ShoppingCart className="h-7 w-7 text-primary" />
                    Ponto de Venda
                </h1>
                <p className="text-muted-foreground">
                    Adicione produtos ao carrinho e finalize a venda de uma só vez.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* LEFT: Product Grid */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Search & Filters */}
                    <Card className="glass-panel border-none p-4">
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                                <Input
                                    placeholder="Pesquisar produto..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10 h-12 bg-background/50 text-foreground placeholder:text-muted-foreground"
                                />
                            </div>
                            {isMultiLocation && (
                                <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                                    <SelectTrigger className="w-full sm:w-48 h-12">
                                        <SelectValue placeholder="Localização" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {locations.map(loc => (
                                            <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>
                        {/* Category pills */}
                        <div className="flex gap-2 mt-3 overflow-x-auto pb-1 scrollbar-none">
                            {categories.map(cat => (
                                <Button
                                    key={cat}
                                    variant={selectedCategory === cat ? 'default' : 'outline'}
                                    size="sm"
                                    className="whitespace-nowrap rounded-full"
                                    onClick={() => setSelectedCategory(cat)}
                                >
                                    {cat === 'all' ? 'Todos' : cat}
                                </Button>
                            ))}
                        </div>
                    </Card>

                    {/* Product Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3 gap-4">
                        {filteredProducts.map(product => {
                            const inCart = cart.find(item => item.productName === product.name);
                            return (
                                <button
                                    key={product.name}
                                    onClick={() => addToCart(product)}
                                    className={`
                    relative group text-left p-4 rounded-xl border-2 transition-all duration-200
                    hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]
                    ${inCart
                                            ? 'border-primary bg-primary/5 shadow-md'
                                            : 'border-border/50 bg-card hover:border-primary/50'
                                        }
                  `}
                                >
                                    {inCart && (
                                        <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow-lg">
                                            {inCart.quantity}
                                        </div>
                                    )}
                                    <div className="space-y-2">
                                        <p className="font-semibold text-sm leading-tight line-clamp-2">{product.name}</p>
                                        <Badge variant="secondary" className="text-[10px]">{product.category}</Badge>
                                        <div className="flex justify-between items-end">
                                            <span className="text-lg font-bold text-primary">{formatCurrency(product.price)}</span>
                                            <span className="text-xs text-muted-foreground">{product.availableStock} {product.unit || 'un'}</span>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {filteredProducts.length === 0 && (
                        <Card className="p-8 text-center text-muted-foreground">
                            <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                            <p className="font-medium">Nenhum produto encontrado</p>
                            <p className="text-sm">Tente ajustar a pesquisa ou filtros.</p>
                        </Card>
                    )}
                </div>

                {/* RIGHT: Cart */}
                <div className="space-y-4">
                    <Card className="sticky top-20 border-2 border-primary/20 shadow-xl z-20">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <ShoppingCart className="h-5 w-5 text-primary" />
                                    Carrinho
                                    {cart.length > 0 && (
                                        <Badge variant="default" className="ml-1">{cart.length}</Badge>
                                    )}
                                </CardTitle>
                                {cart.length > 0 && (
                                    <Button variant="ghost" size="sm" onClick={clearCart} className="text-destructive hover:text-destructive">
                                        <Trash2 className="h-4 w-4 mr-1" /> Limpar
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <Separator />
                        <CardContent className="p-0">
                            {cart.length === 0 ? (
                                <div className="p-8 text-center text-muted-foreground">
                                    <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-30" />
                                    <p className="font-medium">Carrinho vazio</p>
                                    <p className="text-sm">Toque num produto para adicionar.</p>
                                </div>
                            ) : (
                                <ScrollArea className="max-h-[400px]">
                                    <div className="divide-y">
                                        {cart.map(item => (
                                            <div key={item.productName} className="p-3 hover:bg-muted/50 transition-colors">
                                                <div className="flex justify-between items-start mb-2">
                                                    <p className="font-medium text-sm leading-tight flex-1 pr-2">{item.productName}</p>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6 text-destructive hover:text-destructive shrink-0"
                                                        onClick={() => removeFromCart(item.productName)}
                                                    >
                                                        <X className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="flex items-center gap-1">
                                                        <Button
                                                            variant="outline"
                                                            size="icon"
                                                            className="h-7 w-7"
                                                            onClick={() => updateCartQuantity(item.productName, item.quantity - 1)}
                                                        >
                                                            <Minus className="h-3 w-3" />
                                                        </Button>
                                                        <Input
                                                            type="number"
                                                            min={1}
                                                            defaultValue={item.quantity}
                                                            key={`${item.productName}-${item.quantity}`}
                                                            onBlur={(e) => {
                                                                const val = Number(e.target.value);
                                                                updateCartQuantity(item.productName, val > 0 ? val : 1);
                                                            }}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    (e.target as HTMLInputElement).blur();
                                                                }
                                                            }}
                                                            className="w-16 h-7 text-center text-sm bg-background text-foreground [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                        />
                                                        <Button
                                                            variant="outline"
                                                            size="icon"
                                                            className="h-7 w-7"
                                                            onClick={() => updateCartQuantity(item.productName, item.quantity + 1)}
                                                        >
                                                            <Plus className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                    <span className="font-bold text-sm text-primary">
                                                        {formatCurrency(item.subtotal)}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {formatCurrency(item.unitPrice)} × {item.quantity} {item.unit || 'un'}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            )}

                            {/* Cart Footer / Totals */}
                            {cart.length > 0 && (
                                <div className="border-t p-4 space-y-3">
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Subtotal ({cart.length} {cart.length === 1 ? 'item' : 'itens'})</span>
                                            <span className="font-medium">{formatCurrency(cartSubtotal)}</span>
                                        </div>
                                        {discountAmount > 0 && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">Desconto</span>
                                                <span className="font-medium text-red-500">- {formatCurrency(discountAmount)}</span>
                                            </div>
                                        )}
                                        {checkoutApplyVat && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">IVA ({checkoutVatPercentage}%)</span>
                                                <span className="font-medium">{formatCurrency(vatAmount)}</span>
                                            </div>
                                        )}
                                        <Separator className="my-2" />
                                        <div className="flex justify-between text-lg">
                                            <span className="font-bold">Total</span>
                                            <span className="font-bold text-primary">{formatCurrency(cartTotal)}</span>
                                        </div>
                                    </div>

                                    <Button
                                        className="w-full h-14 text-lg font-bold shadow-lg"
                                        size="lg"
                                        onClick={() => setIsCheckoutOpen(true)}
                                        disabled={cart.length === 0}
                                    >
                                        <CreditCard className="mr-2 h-5 w-5" />
                                        Finalizar Venda
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Checkout Dialog */}
            <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Receipt className="h-5 w-5 text-primary" />
                            Finalizar Venda
                        </DialogTitle>
                        <DialogDescription>
                            Confirme os detalhes da venda de {cart.length} {cart.length === 1 ? 'item' : 'itens'}.
                        </DialogDescription>
                    </DialogHeader>

                    <ScrollArea className="max-h-[60vh]">
                        <div className="space-y-6 p-1">
                            {/* Items Summary */}
                            <div className="space-y-2 rounded-lg border p-3">
                                <h4 className="font-medium text-sm text-muted-foreground">Itens no Carrinho</h4>
                                {cart.map(item => (
                                    <div key={item.productName} className="flex justify-between text-sm">
                                        <span>{item.quantity}× {item.productName}</span>
                                        <span className="font-medium">{formatCurrency(item.subtotal)}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Customer */}
                            <div className="space-y-3">
                                <div className="space-y-2">
                                    <Label>Data da Venda</Label>
                                    <DatePicker date={checkoutDate} setDate={(d) => d && setCheckoutDate(d)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Cliente Registado</Label>
                                    <Select value={checkoutCustomerId} onValueChange={setCheckoutCustomerId}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="new">-- Novo / Não Registado --</SelectItem>
                                            {customers.map(c => (
                                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Nome do Cliente (no documento)</Label>
                                    <Input
                                        value={checkoutClientName}
                                        onChange={e => setCheckoutClientName(e.target.value)}
                                        placeholder="Nome do cliente"
                                    />
                                </div>
                            </div>

                            {/* Document Type */}
                            <div className="space-y-2">
                                <Label>Tipo de Documento</Label>
                                <Select value={checkoutDocType} onValueChange={(v: any) => setCheckoutDocType(v)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Factura Proforma">Factura Proforma</SelectItem>
                                        <SelectItem value="Guia de Remessa">Guia de Remessa</SelectItem>
                                        <SelectItem value="Factura">Factura</SelectItem>
                                        <SelectItem value="Recibo">Recibo</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Discount */}
                            <div className="space-y-3 rounded-lg border p-3">
                                <h4 className="font-medium text-sm text-muted-foreground">Desconto</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-2">
                                        <Label>Tipo</Label>
                                        <Select value={checkoutDiscountType} onValueChange={(v: any) => setCheckoutDiscountType(v)}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="fixed">Valor Fixo</SelectItem>
                                                <SelectItem value="percentage">Percentagem (%)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Valor</Label>
                                        <Input
                                            type="number"
                                            value={checkoutDiscountValue}
                                            onChange={e => setCheckoutDiscountValue(Number(e.target.value) || 0)}
                                            placeholder="0"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* VAT */}
                            <div className="flex items-center justify-between rounded-lg border p-3">
                                <div>
                                    <Label>Aplicar IVA</Label>
                                    <p className="text-xs text-muted-foreground">Imposto sobre o valor acrescentado</p>
                                </div>
                                <Switch checked={checkoutApplyVat} onCheckedChange={setCheckoutApplyVat} />
                            </div>
                            {checkoutApplyVat && (
                                <div className="space-y-2">
                                    <Label>IVA (%)</Label>
                                    <Input
                                        type="number"
                                        value={checkoutVatPercentage}
                                        onChange={e => setCheckoutVatPercentage(Number(e.target.value))}
                                        placeholder="17"
                                    />
                                </div>
                            )}

                            {/* Notes */}
                            <div className="space-y-2">
                                <Label>Notas (opcional)</Label>
                                <Textarea
                                    value={checkoutNotes}
                                    onChange={e => setCheckoutNotes(e.target.value)}
                                    placeholder="Observações sobre a venda..."
                                />
                            </div>

                            {/* Totals */}
                            <div className="rounded-lg bg-muted p-4 space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Subtotal</span>
                                    <span className="font-medium">{formatCurrency(cartSubtotal)}</span>
                                </div>
                                {discountAmount > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Desconto</span>
                                        <span className="font-medium text-red-500">- {formatCurrency(discountAmount)}</span>
                                    </div>
                                )}
                                {checkoutApplyVat && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">IVA ({checkoutVatPercentage}%)</span>
                                        <span className="font-medium">{formatCurrency(vatAmount)}</span>
                                    </div>
                                )}
                                <Separator />
                                <div className="flex justify-between text-xl">
                                    <span className="font-bold">Total</span>
                                    <span className="font-bold text-primary">{formatCurrency(cartTotal)}</span>
                                </div>
                            </div>
                        </div>
                    </ScrollArea>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setIsCheckoutOpen(false)}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleCheckout}
                            disabled={isSubmitting || cart.length === 0}
                            className="min-w-[140px]"
                        >
                            {isSubmitting ? 'A processar...' : `Confirmar ${formatCurrency(cartTotal)}`}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
