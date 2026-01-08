
"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Sale, Location, Product } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Edit, Printer, FileSearch } from "lucide-react"
import { useEffect, useState } from "react"
import { SaleDetailsDialogContent } from "./sale-details-dialog"
import { formatCurrency } from "@/lib/utils"
import { EditSaleDialog } from "./edit-sale-dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip"
import {
  Dialog,
  DialogTrigger,
  DialogContent,
} from "@/components/ui/dialog"

interface ColumnsOptions {
  locations: Location[];
  products: Product[];
  onUpdateSale: (sale: Sale) => void;
}

const handlePrintGuide = (sale: Sale, isMultiLocation: boolean, locations: Location[]) => {
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
              .logo { display: flex; align-items: center; gap: 0.5rem; }
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
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="color: #3498db;">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></polyline>
                  <line x1="12" y1="22.08" x2="12" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></line>
                  </svg>
                  <span>MajorStockX</span>
              </div>
              <h1>Guia de Remessa</h1>
          </div>
      `);
      
      printWindow.document.write(`
          <div class="details-grid">
              <div><strong>Data:</strong> ${new Date(sale.date).toLocaleDateString('pt-BR')}</div>
              <div><strong>Guia N.º:</strong> ${sale.guideNumber}</div>
              <div><strong>Vendedor:</strong> ${sale.soldBy}</div>
              ${isMultiLocation && sale.location ? `<div><strong>Localização:</strong> ${locations.find(l => l.id === sale.location)?.name || 'N/A'}</div>` : ''}
          </div>
      `);
      
      printWindow.document.write('<table><thead><tr><th>Produto</th><th>Quantidade</th><th>Preço Unit.</th><th>Total</th></tr></thead><tbody>');
      const unitPrice = sale.totalValue / sale.quantity;
      printWindow.document.write(`<tr><td>${sale.productName}</td><td>${sale.quantity}</td><td>${formatCurrency(unitPrice)}</td><td>${formatCurrency(sale.totalValue)}</td></tr>`);
      printWindow.document.write(`<tr class="total-row"><td colspan="3" style="text-align: right;"><strong>Total Geral:</strong></td><td><strong>${formatCurrency(sale.totalValue)}</strong></td></tr>`);
      printWindow.document.write('</tbody></table>');

      printWindow.document.write('<div style="margin-top: 4rem;"><p>Recebido por: ___________________________________</p><p>Data: ____/____/______</p></div>');
      printWindow.document.write('<div class="footer"><p>MajorStockX &copy; ' + new Date().getFullYear() + '</p></div>');
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
    const [isMultiLocation, setIsMultiLocation] = useState(false);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const sale = row.original as Sale;

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const multiLocationEnabled = localStorage.getItem('majorstockx-multi-location-enabled') === 'true';
            setIsMultiLocation(multiLocationEnabled);
        }
    }, []);
    
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
                <SaleDetailsDialogContent sale={sale} locations={options.locations} isMultiLocation={isMultiLocation} />
            </Dialog>

            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
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
                    products={options.products}
                    onUpdateSale={options.onUpdateSale}
                    onOpenChange={setIsEditDialogOpen}
                    open={isEditDialogOpen}
                />
            </Dialog>
            
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handlePrintGuide(sale, isMultiLocation, options.locations)}>
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
  let isMultiLocationEnabled = false;
  if (typeof window !== 'undefined') {
    isMultiLocationEnabled = localStorage.getItem('majorstockx-multi-location-enabled') === 'true';
  }

  const baseColumns: ColumnDef<Sale>[] = [
    {
      accessorKey: "guideNumber",
      header: "Guia",
    },
    {
      accessorKey: "productName",
      header: "Produto",
    },
  ];

  if (isMultiLocationEnabled) {
    baseColumns.push({
      accessorKey: "location",
      header: "Localização",
      cell: ({ row }) => {
        const location = options.locations.find(l => l.id === row.original.location);
        return location ? location.name : 'N/A';
      },
    });
  }

  baseColumns.push(
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
      accessorKey: "date",
      header: "Data",
       cell: ({ row }) => {
        const date = new Date(row.original.date);
        return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
      }
    },
    {
      accessorKey: "soldBy",
      header: "Vendedor",
    },
    {
      id: "actions",
      cell: (props) => <ActionsCell {...props} options={options} />,
    }
  );

  return baseColumns;
}

    
