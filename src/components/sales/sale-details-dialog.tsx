
"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Sale } from "@/lib/types";
import { Calendar, Clock, Box, User, Hash, DollarSign, Tag, Percent, MinusCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export function SaleDetailsDialog() {
    // This component is now just a shell.
    // The main logic is in SaleDetailsDialogContent and triggered from columns.tsx
    return <Dialog />;
}

interface SaleDetailsDialogProps {
  sale: Sale;
}

const DetailItem = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: React.ReactNode }) => (
    <div className="flex items-start gap-3">
        <Icon className="h-5 w-5 text-muted-foreground mt-1" />
        <div>
            <p className="font-semibold text-muted-foreground">{label}</p>
            <p className="text-lg font-bold">{value}</p>
        </div>
    </div>
);

export function SaleDetailsDialogContent({ sale }: SaleDetailsDialogProps) {
  const saleDate = new Date(sale.date);
  
  const formattedSubtotal = formatCurrency(sale.subtotal);
  const formattedDiscount = sale.discount ? formatCurrency(sale.discount) : 'N/A';
  const formattedVat = sale.vat ? formatCurrency(sale.vat) : 'N/A';
  const formattedTotalValue = formatCurrency(sale.totalValue);
  const formattedUnitPrice = formatCurrency(sale.unitPrice);


  return (
    <DialogContent className="sm:max-w-md">
    <DialogHeader>
        <DialogTitle>Detalhes da Venda</DialogTitle>
        <DialogDescription>
        Informações completas sobre a transação #{sale.guideNumber}.
        </DialogDescription>
    </DialogHeader>
    <div className="grid gap-6 py-4">
        <div className="grid grid-cols-2 gap-4">
            <DetailItem icon={Box} label="Produto" value={sale.productName} />
            <DetailItem icon={Hash} label="Quantidade" value={sale.quantity} />
        </div>
        <div className="grid grid-cols-2 gap-4">
            <DetailItem icon={Calendar} label="Data" value={saleDate.toLocaleDateString('pt-BR', { timeZone: 'UTC' })} />
            <DetailItem icon={User} label="Vendedor" value={sale.soldBy} />
        </div>
         <div className="space-y-4 rounded-lg bg-muted p-4">
            <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-medium">Subtotal</span>
                <span className="font-bold">{formattedSubtotal}</span>
            </div>
            {sale.discount && sale.discount > 0 && (
                <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-medium">Desconto</span>
                    <span className="font-bold text-red-500">- {formattedDiscount}</span>
                </div>
            )}
            {sale.vat && sale.vat > 0 && (
                <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-medium">IVA</span>
                    <span className="font-bold">{formattedVat}</span>
                </div>
            )}
             <div className="flex justify-between items-center text-lg border-t pt-2 mt-2">
                <span className="font-bold">Total</span>
                <span className="font-bold">{formattedTotalValue}</span>
            </div>
        </div>
    </div>
    </DialogContent>
  );
}
