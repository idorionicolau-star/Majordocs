"use client"

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table"
import { Product, Location } from "@/lib/types"
import { AlertCircle, MapPin, History, Trash2, Edit2 } from "lucide-react"
import { EditProductDialog } from "./edit-product-dialog"
import { Button } from "../ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { cn } from "@/lib/utils";
import { AuditStockDialog } from "./audit-stock-dialog"
import Link from "next/link";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ColumnsOptions {
  onAttemptDelete: (product: Product) => void;
  onProductUpdate: (product: Product) => void;
  canEdit: boolean;
  isMultiLocation: boolean;
  locations: Location[];
}

export const getStockStatus = (product: Product) => {
  const availableStock = product.stock - product.reservedStock;
  if (availableStock <= 0) {
    return "sem-estoque";
  }
  if (availableStock <= product.criticalStockThreshold) {
    return "crítico";
  }
  if (availableStock <= product.lowStockThreshold) {
    return "baixo";
  }
  return "ok";
};

export const columns = (options: ColumnsOptions): ColumnDef<Product>[] => {
  const { canEdit, isMultiLocation, locations } = options;

  const baseColumns: ColumnDef<Product>[] = [
    {
      accessorKey: "name",
      header: "Material",
      cell: ({ row }) => (
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-sm font-[800] text-foreground group-hover:text-primary transition-colors">{row.original.name}</span>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">ID: {row.original.id?.toUpperCase().substring(0, 6)}</span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "category",
      header: "Categoria",
      cell: ({ row }) => (
        <span className="text-[10px] font-black px-3 py-1.5 rounded-full bg-muted text-muted-foreground uppercase tracking-wider">
          {row.original.category}
        </span>
      ),
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id))
      },
    },
  ];

  if (isMultiLocation) {
    baseColumns.push({
      accessorKey: "location",
      header: "Localização",
      cell: ({ row }) => {
        const locationName = locations.find(l => l.id === row.original.location)?.name || row.original.location || "N/A";
        return (
          <div className="flex items-center gap-2">
            <MapPin className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs">{locationName}</span>
          </div>
        );
      },
    });
  }

  baseColumns.push(
    {
      accessorKey: "stock",
      header: "Disponível",
      cell: ({ row }) => {
        const status = getStockStatus(row.original);
        const availableStock = row.original.stock - row.original.reservedStock;
        return (
          <div className="text-center">
            <span className={cn("text-base font-black",
              status === 'crítico' || status === 'sem-estoque' ? 'text-destructive' :
                status === 'baixo' ? 'text-[hsl(var(--chart-4))]' :
                  'text-foreground'
            )}>
              {availableStock}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "reservedStock",
      header: "Reservado",
      cell: ({ row }) => {
        const reserved = row.original.reservedStock;
        return (
          <div className="text-center">
            <span className="text-base font-black text-primary">
              {reserved > 0 ? reserved : '-'}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "lastUpdated",
      header: "Estado",
      cell: ({ row }) => {
        const status = getStockStatus(row.original);
        if (status === 'crítico' || status === 'sem-estoque') {
          return <div className="inline-flex items-center gap-2 text-destructive bg-destructive/10 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-destructive/20">
            <AlertCircle size={14} strokeWidth={3} /> {status === 'sem-estoque' ? 'Esgotado' : 'Crítico'}
          </div>
        }
        if (status === 'baixo') {
          return <div className="inline-flex items-center gap-2 text-[hsl(var(--chart-4))] bg-[hsl(var(--chart-4))]/10 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-[hsl(var(--chart-4))]/20">
            <AlertCircle size={14} strokeWidth={3} /> Baixo
          </div>
        }
        return <div className="inline-flex items-center gap-2 text-[hsl(var(--chart-2))] bg-[hsl(var(--chart-2))]/10 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-[hsl(var(--chart-2))]/20">
          Estável
        </div>
      }
    }
  );

  baseColumns.push({
    id: "actions",
    cell: ({ row }) => {
      const product = row.original
      return (
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button asChild variant="ghost" size="icon" className="p-3 h-auto w-auto text-muted-foreground hover:text-primary rounded-xl transition-all">
                  <Link href={`/inventory/history?productName=${encodeURIComponent(product.name)}`}>
                    <History className="h-4 w-4" />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Ver Histórico</p></TooltipContent>
            </Tooltip>
            {canEdit && (
              <>
                <AuditStockDialog product={product} trigger="icon" />
                <EditProductDialog
                  product={product}
                  onProductUpdate={options.onProductUpdate}
                  trigger="icon"
                  locations={options.locations}
                  isMultiLocation={options.isMultiLocation}
                />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => options.onAttemptDelete(product)}
                      className="p-3 h-auto w-auto text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Apagar</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Apagar Produto</p>
                  </TooltipContent>
                </Tooltip>
              </>
            )}
          </TooltipProvider>
        </div>
      )
    },
  });

  return baseColumns;
}
