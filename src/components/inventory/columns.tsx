
"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Product } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal } from "lucide-react"
import { EditProductDialog } from "./edit-product-dialog"

interface ColumnsOptions {
  onAttemptDelete: (product: Product) => void;
  onUpdateProduct: (productId: string, updatedData: Partial<Omit<Product, 'id'>>) => void;
}

const getStockStatus = (product: Product) => {
  if (product.stock <= product.criticalStockThreshold) {
    return "crítico";
  }
  if (product.stock <= product.lowStockThreshold) {
    return "baixo";
  }
  return "ok";
};

export const columns = (options: ColumnsOptions): ColumnDef<Product>[] => [
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
  {
    accessorKey: "stock",
    header: "Estoque",
    cell: ({ row }) => {
      const status = getStockStatus(row.original);
      return (
        <div className="flex items-center gap-2">
          <span>{row.original.stock}</span>
          {status === "baixo" && <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30">Baixo</Badge>}
          {status === "crítico" && <Badge variant="destructive">Crítico</Badge>}
        </div>
      );
    },
  },
  {
    accessorKey: "lastUpdated",
    header: "Última Atualização",
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const product = row.original

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Ações</DropdownMenuLabel>
             <EditProductDialog product={product} onUpdateProduct={options.onUpdateProduct}>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  Editar Produto
                </DropdownMenuItem>
             </EditProductDialog>
            <DropdownMenuItem>Ver Histórico</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-destructive focus:bg-destructive/10 focus:text-destructive"
              onClick={() => options.onAttemptDelete(product)}
            >
              Apagar Produto
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]
