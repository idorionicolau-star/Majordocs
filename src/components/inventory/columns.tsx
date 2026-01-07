
"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Product, Location } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip"
import { EditProductDialog } from "./edit-product-dialog"

interface ColumnsOptions {
  onAttemptDelete: (product: Product) => void;
  onProductUpdate: (product: Product) => void;
  isMultiLocation: boolean;
  locations: Location[];
}

const getStockStatus = (product: Product) => {
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
      header: "Produto",
      cell: ({ row }) => (
        <div className="font-medium">{row.original.name}</div>
      ),
    },
    {
      accessorKey: "category",
      header: "Categoria",
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
        return location ? location.name : 'N/A';
      },
    });
  }

  baseColumns.push(
    {
      accessorKey: "stock",
      header: "Estoque",
      cell: ({ row }) => {
        const status = getStockStatus(row.original);
        const stock = row.original.stock;
        return (
          <div className="flex items-center gap-2">
            <span className={`font-medium ${status === 'crítico' || status === 'sem-estoque' ? 'text-destructive' : ''}`}>{stock}</span>
            {status === "baixo" && <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/30">Baixo</Badge>}
            {status === "crítico" && <Badge variant="destructive" className="bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30 hover:bg-red-500/30">Crítico</Badge>}
            {status === "sem-estoque" && <Badge variant="destructive">Sem Estoque</Badge>}
          </div>
        );
      },
    },
    {
      accessorKey: "lastUpdated",
      header: "Última Atualização",
      cell: ({ row }) => {
        const date = new Date(row.original.lastUpdated);
        return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
      }
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const product = row.original
        return (
          <div className="flex items-center justify-end gap-2">
            <EditProductDialog 
              product={product} 
              onProductUpdate={options.onProductUpdate} 
              isMultiLocation={isMultiLocation}
              locations={locations}
            />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
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
