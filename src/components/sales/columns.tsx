
"use client"

import * as React from "react"
import { ColumnDef } from "@tanstack/react-table"
import { Sale, Company } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Edit, Printer, FileSearch, CheckCircle, PackageCheck, Download } from "lucide-react"
import { SaleDetailsDialogContent } from "./sale-details-dialog"
import { formatCurrency, downloadSaleDocument } from "@/lib/utils"
import { EditSaleDialog } from "./edit-sale-dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip"
import {
  Dialog,
  DialogTrigger,
} from "@/components/ui/dialog"
import { InventoryContext } from "@/context/inventory-context"
import { cn } from "@/lib/utils"


interface ColumnsOptions {
  onUpdateSale: (sale: Sale) => void;
  onConfirmPickup: (sale: Sale) => void;
  canEdit: boolean;
}

const ActionsCell = ({ row, options }: { row: any, options: ColumnsOptions }) => {
    const [isDetailsOpen, setIsDetailsOpen] = React.useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
    const sale = row.original as Sale;
    const { canEdit } = options;
    const inventoryContext = React.useContext(InventoryContext);
    const { companyData } = inventoryContext || {};
        
    return (
        <div className="flex items-center justify-end gap-1">
            <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <DialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <FileSearch className="h-4 w-4" />
                                    <span className="sr-only">Ver Detalhes</span>
                                </Button>
                            </DialogTrigger>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Ver Detalhes</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
                <SaleDetailsDialogContent sale={sale} />
            </Dialog>

            {sale.status === 'Pago' && canEdit && (
              <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-500" onClick={() => options.onConfirmPickup(sale)}>
                            <CheckCircle className="h-4 w-4" />
                            <span className="sr-only">Confirmar Levantamento</span>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Confirmar Levantamento</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
            )}

            {canEdit && <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                 <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <DialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <Edit className="h-4 w-4" />
                                    <span className="sr-only">Editar Venda</span>
                                </Button>
                            </DialogTrigger>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Editar Venda</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
                <EditSaleDialog
                    sale={sale}
                    onUpdateSale={options.onUpdateSale}
                    onOpenChange={setIsEditDialogOpen}
                    open={isEditDialogOpen}
                />
            </Dialog>}
            
            <TooltipProvider>
                 <Tooltip>
                    <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => downloadSaleDocument(sale, companyData || null)}>
                        <Download className="h-4 w-4" />
                        <span className="sr-only">Baixar Documento</span>
                    </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                    <p>Baixar {sale.documentType} como PDF</p>
                    </TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => downloadSaleDocument(sale, companyData || null)}>
                        <Printer className="h-4 w-4" />
                        <span className="sr-only">Imprimir Documento</span>
                    </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                    <p>Imprimir {sale.documentType}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>
    )
}

export { ActionsCell as SaleActions };

export const columns = (options: ColumnsOptions): ColumnDef<Sale>[] => {

  const baseColumns: ColumnDef<Sale>[] = [
    {
      accessorKey: "guideNumber",
      header: "Documento N.º",
      cell: ({ row }) => (
        <div className="flex flex-col">
            <span className="font-bold">{row.original.guideNumber}</span>
            <span className="text-xs text-muted-foreground">{row.original.documentType}</span>
        </div>
      )
    },
    {
      accessorKey: "clientName",
      header: "Cliente",
      cell: ({ row }) => row.original.clientName || <span className="text-muted-foreground italic">N/A</span>
    },
    {
      accessorKey: "productName",
      header: "Produto",
    },
    {
      accessorKey: "totalValue",
      header: "Valor Total",
      cell: ({ row }) => {
        const sale = row.original;
        const isPartiallyPaid = sale.amountPaid !== undefined && sale.amountPaid < sale.totalValue;
        return (
            <div className="text-right">
                <div className="font-medium">{formatCurrency(sale.totalValue)}</div>
                {isPartiallyPaid && (
                    <div className="text-xs text-amber-600">
                        ({formatCurrency(sale.amountPaid || 0)} pagos)
                    </div>
                )}
            </div>
        )
      }
    },
    {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
            const status = row.original.status;
            return (
                <div className={cn("inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold",
                    status === 'Levantado' 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : 'bg-blue-100 text-blue-800'
                )}>
                    {status === 'Levantado' ? <CheckCircle className="h-3 w-3" /> : <PackageCheck className="h-3 w-3" />}
                    {status}
                </div>
            )
        }
    },
    {
      accessorKey: "date",
      header: "Data",
       cell: ({ row }) => {
        const date = new Date(row.original.date);
        return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
      }
    },
    {
      id: "actions",
      cell: (props) => <ActionsCell {...props} options={options} />,
    }
  ];

  return baseColumns;
}
