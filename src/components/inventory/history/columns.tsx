
"use client"

import { ColumnDef } from "@tanstack/react-table"
import { StockMovement } from "@/lib/types"
import { format } from 'date-fns';
import { AlertTriangle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ColumnsOptions {
    locationMap: Record<string, string>;
}

export const columns = ({ locationMap }: ColumnsOptions): ColumnDef<StockMovement>[] => {
  return [
    {
        accessorKey: "timestamp",
        header: "Data/Hora",
        cell: ({ row }) => {
            const timestamp = row.original.timestamp;
            if (!timestamp || !timestamp.toDate) return 'Data inválida';
            const date = timestamp.toDate();
            return (
                <div>
                    <div>{format(date, 'dd/MM/yyyy')}</div>
                    <div className="text-xs text-muted-foreground">{format(date, 'HH:mm:ss')}</div>
                </div>
            );
        }
    },
    {
      accessorKey: "productName",
      header: "Produto",
    },
    {
        accessorKey: "type",
        header: "Tipo",
        cell: ({ row }) => {
            const type = row.original.type;
            const typeClasses = {
                IN: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
                OUT: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
                TRANSFER: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
                ADJUSTMENT: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
            }
            return (
                <span className={cn("px-2 py-0.5 rounded-full text-xs font-semibold", typeClasses[type])}>
                    {type}
                </span>
            )
        }
    },
    {
        id: "location",
        header: "Localização",
        cell: ({ row }) => {
            const { fromLocationId, toLocationId, type } = row.original;
            const fromName = fromLocationId ? locationMap[fromLocationId] || fromLocationId : null;
            const toName = toLocationId ? locationMap[toLocationId] || toLocationId : null;

            if (type === 'TRANSFER') {
                return <div className="flex items-center gap-1.5 text-xs">{fromName} <ArrowRight className="h-3 w-3" /> {toName}</div>;
            }
            if (type === 'IN' || type === 'ADJUSTMENT') {
                return <span className="text-xs">{toName || 'N/A'}</span>;
            }
            if (type === 'OUT') {
                return <span className="text-xs">{fromName || 'N/A'}</span>;
            }
            return null;
        }
    },
    {
        accessorKey: "quantity",
        header: "Qtd.",
        cell: ({ row }) => {
            const { quantity, type } = row.original;
            const isDeficit = type === 'ADJUSTMENT' && quantity < 0;

            return (
                <div className={cn(
                    "font-bold flex items-center gap-2",
                    isDeficit ? "text-red-600" : (type === 'IN' ? "text-green-600" : (type === 'OUT' ? "text-red-600" : "text-gray-500"))
                )}>
                   {isDeficit && <AlertTriangle className="h-4 w-4" />}
                   <span>{quantity > 0 ? `+${quantity}` : quantity}</span>
                </div>
            )
        }
    },
    {
      accessorKey: "reason",
      header: "Motivo/Referência",
    },
    {
      accessorKey: "userName",
      header: "Utilizador",
    },
  ];
}
