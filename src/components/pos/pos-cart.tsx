
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Trash2, X, Minus, Plus, CreditCard } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { CartItem } from '@/lib/types';

interface PosCartProps {
    cart: CartItem[];
    cartSubtotal: number;
    discountAmount: number;
    checkoutApplyVat: boolean;
    checkoutVatPercentage: number;
    vatAmount: number;
    cartTotal: number;
    onUpdateQuantity: (productName: string, quantity: number) => void;
    onRemoveItem: (productName: string) => void;
    onClearCart: () => void;
    onCheckout: () => void;
    className?: string;
}

export function PosCart({
    cart,
    cartSubtotal,
    discountAmount,
    checkoutApplyVat,
    checkoutVatPercentage,
    vatAmount,
    cartTotal,
    onUpdateQuantity,
    onRemoveItem,
    onClearCart,
    onCheckout,
    className
}: PosCartProps) {
    return (
        <Card className={`border-2 border-primary/20 shadow-xl z-20 h-full flex flex-col ${className}`}>
            <CardHeader className="pb-3 flex-none">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <ShoppingCart className="h-5 w-5 text-primary" />
                        Carrinho
                        {cart.length > 0 && (
                            <Badge variant="default" className="ml-1">{cart.length}</Badge>
                        )}
                    </CardTitle>
                    {cart.length > 0 && (
                        <Button variant="ghost" size="sm" onClick={onClearCart} className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4 mr-1" /> Limpar
                        </Button>
                    )}
                </div>
            </CardHeader>
            <Separator />
            <CardContent className="p-0 flex flex-col flex-1 min-h-0">
                {cart.length === 0 ? (
                    <div className="p-10 text-center text-muted-foreground flex-1 flex flex-col items-center justify-center">
                        <div className="mx-auto mb-4 w-20 h-20 rounded-full bg-primary/5 dark:bg-primary/10 flex items-center justify-center animate-pulse">
                            <ShoppingCart className="h-10 w-10 text-primary/40" />
                        </div>
                        <p className="text-base font-semibold text-foreground/70">Carrinho vazio</p>
                        <p className="text-sm mt-1">Toque num produto à esquerda para começar.</p>
                    </div>
                ) : (
                    <ScrollArea className="flex-1">
                        <div className="divide-y">
                            {cart.map(item => (
                                <div key={item.productName} className="p-3 hover:bg-muted/50 transition-colors">
                                    <div className="flex justify-between items-start mb-2">
                                        <p className="font-medium text-sm leading-tight flex-1 pr-2">{item.productName}</p>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 text-destructive hover:text-destructive shrink-0"
                                            onClick={() => onRemoveItem(item.productName)}
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
                                                onClick={() => onUpdateQuantity(item.productName, item.quantity - 1)}
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
                                                    onUpdateQuantity(item.productName, val > 0 ? val : 1);
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
                                                onClick={() => onUpdateQuantity(item.productName, item.quantity + 1)}
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
                    <div className="border-t p-4 space-y-3 flex-none bg-background">
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
                            onClick={onCheckout}
                            disabled={cart.length === 0}
                        >
                            <CreditCard className="mr-2 h-5 w-5" />
                            Finalizar Venda
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
