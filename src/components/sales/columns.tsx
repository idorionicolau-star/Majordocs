
"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Sale } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Edit, Printer, FileSearch, CheckCircle, PackageCheck } from "lucide-react"
import { useState, useContext } from "react"
import { SaleDetailsDialogContent } from "./sale-details-dialog"
import { formatCurrency } from "@/lib/utils"
import { EditSaleDialog } from "./edit-sale-dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip"
import {
  Dialog,
  DialogTrigger,
} from "@/components/ui/dialog"
import { InventoryContext } from "@/context/inventory-context"


interface ColumnsOptions {
  onUpdateSale: (sale: Sale) => void;
  onConfirmPickup: (sale: Sale) => void;
  canEdit: boolean;
}

const handlePrintGuide = (sale: Sale, companyName: string | undefined) => {
  const printWindow = window.open('', '', 'height=800,width=800');
  if (printWindow) {
      printWindow.document.write('<!DOCTYPE html><html><head><title>Guia de Remessa</title>');
      printWindow.document.write(`
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&family=Space+Grotesk:wght@400;700&display=swap" rel="stylesheet">
      `);
      printWindow.document.write(`
          <style>
              body { font-family: 'PT Sans', sans-serif; line-height: 1.6; color: #333; margin: 2rem; }
              .container { max-width: 800px; margin: auto; padding: 2rem; border: 1px solid #eee; border-radius: 8px; }
              .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #eee; padding-bottom: 1rem; margin-bottom: 2rem; }
              .header h1 { font-family: 'Space Grotesk', sans-serif; font-size: 2.5rem; color: #3498db; margin: 0; }
              .logo { display: flex; flex-direction: column; align-items: flex-start; }
              .logo span { font-family: 'Space Grotesk', sans-serif; font-size: 1.5rem; font-weight: bold; color: #3498db; }
              .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 2rem; }
              .details-grid div { background-color: #f9fafb; padding: 1rem; border-radius: 6px; }
              .details-grid strong { display: block; margin-bottom: 0.5rem; color: #374151; font-family: 'Space Grotesk', sans-serif; }
              table { width: 100%; border-collapse: collapse; margin-top: 2rem; }
              th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
              th { background-color: #f9fafb; font-family: 'Space Grotesk', sans-serif; }
              .total-row td { font-weight: bold; font-size: 1.1rem; }
              .footer { text-align: center; margin-top: 3rem; font-size: 0.8rem; color: #999; }
              @media print {
                body { margin: 0; }
                .container { border: none; box-shadow: none; }
              }
          </style>
      `);
      printWindow.document.write('</head><body><div class="container">');
      
      printWindow.document.write(`
          <div class="header">
               <div class="logo">
                  <span>${companyName || 'MajorStockX'}</span>
              </div>
              <h1>Guia de Remessa</h1>
          </div>
      `);
      
      printWindow.document.write(`
          <div class="details-grid">
              <div><strong>Data:</strong> ${new Date(sale.date).toLocaleDateString('pt-BR')}</div>
              <div><strong>Guia N.º:</strong> ${sale.guideNumber}</div>
              <div><strong>Vendedor:</strong> ${sale.soldBy}</div>
          </div>
      `);
      
      printWindow.document.write('<table><thead><tr><th>Produto</th><th>Quantidade</th><th>Preço Unit.</th><th>Total</th></tr></thead><tbody>');
      const unitPrice = sale.totalValue / sale.quantity;
      printWindow.document.write(`<tr><td>${sale.productName}</td><td>${sale.quantity}</td><td>${formatCurrency(unitPrice)}</td><td>${formatCurrency(sale.totalValue)}</td></tr>`);
      printWindow.document.write(`<tr class="total-row"><td colspan="3" style="text-align: right;"><strong>Total Geral:</strong></td><td><strong>${formatCurrency(sale.totalValue)}</strong></td></tr>`);
      printWindow.document.write('</tbody></table>');

      printWindow.document.write('<div style="margin-top: 4rem;"><p>Recebido por: ___________________________________</p><p>Data: ____/____/______</p></div>');
      printWindow.document.write(`<div class="footer"><p>${companyName || 'MajorStockX'} &copy; ' + new Date().getFullYear() + '</p></div>`);
      printWindow.document.write('</div></body></html>');
      printWindow.document.close();
      
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
        printWindow.close();
      }, 500);
  }
};


const ActionsCell = ({ row, options }: { row: any, options: ColumnsOptions }) => {
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const sale = row.original as Sale;
    const { canEdit } = options;
    const inventoryContext = useContext(InventoryContext);
    const { companyData } = inventoryContext || {};
        
    return (
        <div className="flex items-center justify-end gap-2">
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
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600" onClick={() => options.onConfirmPickup(sale)}>
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
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handlePrintGuide(sale, companyData?.name)}>
                        <Printer className="h-4 w-4" />
                        <span className="sr-only">Imprimir Guia</span>
                    </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                    <p>Imprimir Guia</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>
    )
}

export { ActionsCell as SaleActions, handlePrintGuide };

export const columns = (options: ColumnsOptions): ColumnDef<Sale>[] => {

  const baseColumns: ColumnDef<Sale>[] = [
    {
      accessorKey: "guideNumber",
      header: "Guia",
    },
    {
      accessorKey: "productName",
      header: "Produto",
    },
    {
      accessorKey: "quantity",
      header: "Quantidade",
    },
    {
      accessorKey: "totalValue",
      header: "Valor Total",
      cell: ({ row }) => {
        const formatted = formatCurrency(row.original.totalValue);
        return <div className="text-right font-medium">{formatted}</div>
      }
    },
    {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
            const status = row.original.status;
            return (
                <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold ${
                    status === 'Levantado' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' 
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'
                }`}>
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
