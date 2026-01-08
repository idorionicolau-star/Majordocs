
"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Product, Location } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Trash2, Edit2, AlertCircle } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip"
import { EditProductDialog } from "./edit-product-dialog"

interface ColumnsOptions {
  onAttemptDelete: (product: Product) => void;
  onProductUpdate: (product: Product) => void;
  isMultiLocation: boolean;
  locations: Location[];
}

export const getStockStatus = (product: Product) => {
  if (product.stock <= 0) {
      return "sem-estoque";
  }
  if (product.stock <= product.criticalStockThreshold) {
    return "crítico";
  }
  if (product.stock <= product.lowStockThreshold) {
    return "baixo";
  }
  return "ok";
};

export const columns = (options: ColumnsOptions): ColumnDef<Product>[] => {
  const { isMultiLocation, locations } = options;

  const baseColumns: ColumnDef<Product>[] = [
    {
      accessorKey: "name",
      header: "Material",
      cell: ({ row }) => (
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
              <span className="text-sm font-[800] text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">{row.original.name}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">SKU: {row.original.id.toUpperCase()}</span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "category",
      header: "Categoria",
      cell: ({ row }) => (
        <span className="text-[10px] font-black px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase tracking-wider">
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
        const location = locations.find(l => l.id === row.original.location);
        return (
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <div className="h-2 w-2 rounded-full bg-blue-500" />
            <span className="text-xs font-semibold">{location ? location.name : 'N/A'}</span>
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
        const stock = row.original.stock;
        return (
          <div className="text-center">
            <span className={`text-base font-black ${status === 'crítico' || status === 'sem-estoque' ? 'text-rose-500' : status === 'baixo' ? 'text-amber-500' : 'text-slate-900 dark:text-white'}`}>
              {stock}
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
            return <div className="inline-flex items-center gap-2 text-rose-600 bg-rose-50 dark:bg-rose-500/10 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-rose-100 dark:border-rose-500/20">
                <AlertCircle size={14} strokeWidth={3} /> {status === 'sem-estoque' ? 'Esgotado' : 'Crítico'}
            </div>
        }
        if (status === 'baixo') {
             return <div className="inline-flex items-center gap-2 text-amber-600 bg-amber-50 dark:bg-amber-500/10 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-amber-100 dark:border-amber-500/20">
                <AlertCircle size={14} strokeWidth={3} /> Baixo
            </div>
        }
        return <div className="inline-flex items-center gap-2 text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-100 dark:border-emerald-500/20">
            Estável
        </div>
      }
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const product = row.original
        return (
          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <EditProductDialog 
              product={product} 
              onProductUpdate={options.onProductUpdate} 
              isMultiLocation={isMultiLocation}
              locations={locations}
              trigger="icon"
            />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="p-3 h-auto w-auto text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all"
                    onClick={() => options.onAttemptDelete(product)}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Apagar</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Apagar Produto</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )
      },
    }
  );

  return baseColumns;
}

    