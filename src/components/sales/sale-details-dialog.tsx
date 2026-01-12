
"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Sale, Location } from "@/lib/types";
import { Calendar, Clock, Box, User, Hash, MapPin, DollarSign, Tag } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useContext } from "react";
import { InventoryContext } from "@/context/inventory-context";


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
  const { isMultiLocation, locations } = useContext(InventoryContext) || {};
  const saleDate = new Date(sale.date);
  const locationName = isMultiLocation ? locations?.find(l => l.id === sale.location)?.name || 'N/A' : null;
  const unitPrice = sale.quantity > 0 ? sale.totalValue / sale.quantity : 0;
  
  const formattedTotalValue = formatCurrency(sale.totalValue);
  const formattedUnitPrice = formatCurrency(unitPrice);


  return (
    <DialogContent className="sm:max-w-md">
    <DialogHeader>
        <DialogTitle>Detalhes da Venda</DialogTitle>
        <DialogDescription>
        Informações completas sobre a transação #{sale.guideNumber}.
        </DialogDescription>
    </DialogHeader>
    <div className="grid gap-6 py-4">
        <DetailItem icon={Box} label="Produto" value={sale.productName} />
        <div className="grid grid-cols-2 gap-4">
        <DetailItem icon={Tag} label="Preço Unitário" value={formattedUnitPrice} />
        <DetailItem icon={DollarSign} label="Valor Total da Venda" value={formattedTotalValue} />
        <DetailItem icon={Hash} label="Quantidade" value={sale.quantity} />
        <DetailItem icon={User} label="Vendedor" value={sale.soldBy} />
        <DetailItem icon={Calendar} label="Data" value={saleDate.toLocaleDateString('pt-BR', { timeZone: 'UTC' })} />
        <DetailItem icon={Clock} label="Hora" value={saleDate.toLocaleTimeString('pt-BR',  { timeZone: 'UTC' })} />
        </div>
        {isMultiLocation && locationName && (
            <DetailItem icon={MapPin} label="Localização" value={locationName} />
        )}
    </div>
    </DialogContent>
  );
}
