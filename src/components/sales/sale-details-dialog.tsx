
"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import type { Sale, Location } from "@/lib/types";
import { Calendar, Clock, Box, User, Hash, MapPin, DollarSign } from "lucide-react";

interface SaleDetailsDialogProps {
  sale: Sale;
  locations: Location[];
  isMultiLocation: boolean;
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

export function SaleDetailsDialog({ sale, locations, isMultiLocation }: SaleDetailsDialogProps) {
  const saleDate = new Date(sale.date);
  const locationName = isMultiLocation ? locations.find(l => l.id === sale.location)?.name || 'N/A' : null;
  const formattedTotalValue = new Intl.NumberFormat('pt-MZ', {
    style: 'currency',
    currency: 'MZN',
  }).format(sale.totalValue);


  return (
    <Dialog>
      <DialogTrigger asChild>
        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
          Ver Detalhes
        </DropdownMenuItem>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Detalhes da Venda</DialogTitle>
          <DialogDescription>
            Informações completas sobre a transação #{sale.guideNumber}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <DetailItem icon={Box} label="Produto" value={sale.productName} />
           <DetailItem icon={DollarSign} label="Valor Total da Venda" value={formattedTotalValue} />
          <div className="grid grid-cols-2 gap-4">
            <DetailItem icon={Hash} label="Quantidade" value={sale.quantity} />
            <DetailItem icon={User} label="Vendedor" value={sale.soldBy} />
            <DetailItem icon={Calendar} label="Data" value={saleDate.toLocaleDateString('pt-BR')} />
            <DetailItem icon={Clock} label="Hora" value={saleDate.toLocaleTimeString('pt-BR')} />
          </div>
          {isMultiLocation && locationName && (
             <DetailItem icon={MapPin} label="Localização" value={locationName} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
