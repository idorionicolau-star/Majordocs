
"use client";

import { useState, useMemo, useContext, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { InventoryContext } from "@/context/inventory-context";
import { Skeleton } from "@/components/ui/skeleton";
import type { StockMovement } from "@/lib/types";
import { useFirestore, useMemoFirebase } from "@/firebase/provider";
import { useCollection } from "@/firebase/firestore/use-collection";
import { collection, query, orderBy, Timestamp } from "firebase/firestore";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { startOfDay, endOfDay, isWithinInterval, format } from 'date-fns';
import { Button } from "@/components/ui/button";
import { Trash2, Printer, Download, ArrowLeft } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { MovementCard } from "@/components/inventory/history/movement-card";
import Link from "next/link";

export default function InventoryHistoryPage() {
  const searchParams = useSearchParams();
  const productNameFromQuery = searchParams.get('productName');

  const { companyId, locations, loading: contextLoading, user, clearStockMovements, companyData } = useContext(InventoryContext) || {};
  const firestore = useFirestore();
  const isAdmin = user?.role === 'Admin';
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const { toast } = useToast();


  const [searchFilter, setSearchFilter] = useState(productNameFromQuery || "");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  const stockMovementsCollectionRef = useMemoFirebase(() => {
    if (!firestore || !companyId) return null;
    return collection(firestore, `companies/${companyId}/stockMovements`);
  }, [firestore, companyId]);

  const { data: movements, isLoading: movementsLoading } = useCollection<StockMovement>(stockMovementsCollectionRef);
  
  const locationMap = useMemo(() => {
    const map = new Map<string, string>();
    locations?.forEach(loc => map.set(loc.id, loc.name));
    return map;
  }, [locations]);
  
  const filteredMovements = useMemo(() => {
    if (!movements) return [];
    let result = movements;

    if (selectedDate) {
        const start = startOfDay(selectedDate);
        const end = endOfDay(selectedDate);
        result = result.filter(m => {
            if (!m.timestamp) return false;
            const moveDate = (m.timestamp as Timestamp).toDate();
            return isWithinInterval(moveDate, { start, end });
        });
    }

    if (searchFilter) {
      const lowerCaseFilter = searchFilter.toLowerCase();
      result = result.filter(m => 
        m.productName.toLowerCase().includes(lowerCaseFilter) ||
        (m.userName && m.userName.toLowerCase().includes(lowerCaseFilter)) ||
        m.reason.toLowerCase().includes(lowerCaseFilter)
      );
    }
    
    // Sort client-side
    return result.sort((a, b) => {
        const dateA = a.timestamp ? (a.timestamp as Timestamp).toMillis() : 0;
        const dateB = b.timestamp ? (b.timestamp as Timestamp).toMillis() : 0;
        return dateB - dateA;
    });
  }, [movements, searchFilter, selectedDate]);
  
  const handleClearHistory = async () => {
    if (clearStockMovements) {
      await clearStockMovements();
    }
    setShowClearConfirm(false);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '', 'height=800,width=800');
    if (printWindow) {
        printWindow.document.write('<!DOCTYPE html><html><head><title>Relatório de Movimentos de Stock</title>');
        printWindow.document.write(`
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&family=Space+Grotesk:wght@400;700&display=swap" rel="stylesheet">
        `);
        printWindow.document.write(`
            <style>
                body { font-family: 'PT Sans', sans-serif; line-height: 1.6; color: #333; margin: 2rem; }
                .container { max-width: 1000px; margin: auto; padding: 2rem; border: 1px solid #eee; border-radius: 8px; }
                .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #eee; padding-bottom: 1rem; margin-bottom: 2rem; }
                .header h1 { font-family: 'Space Grotesk', sans-serif; font-size: 2rem; color: #3498db; margin: 0; }
                .logo { display: flex; flex-direction: column; align-items: flex-start; }
                .logo span { font-family: 'Space Grotesk', sans-serif; font-size: 1.5rem; font-weight: bold; color: #3498db; }
                table { width: 100%; border-collapse: collapse; margin-top: 2rem; font-size: 10px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f9fafb; font-family: 'Space Grotesk', sans-serif; }
                .footer { text-align: center; margin-top: 3rem; font-size: 0.8rem; color: #999; }
                @page { size: A4 landscape; margin: 0.5in; }
                @media print {
                  body { margin: 0; -webkit-print-color-adjust: exact; }
                  .no-print { display: none; }
                  .container { border: none; box-shadow: none; }
                }
            </style>
        `);
        printWindow.document.write('</head><body><div class="container">');
        printWindow.document.write(`
            <div class="header">
                 <div class="logo">
                    <span>${companyData?.name || 'MajorStockX'}</span>
                </div>
                <h1>Relatório de Movimentos</h1>
            </div>
            <h2>Período: ${selectedDate ? format(selectedDate, 'dd/MM/yyyy') : 'Todos os movimentos'}</h2>
        `);

        printWindow.document.write('<table><thead><tr><th>Data e Hora</th><th>Tipo</th><th>Produto</th><th>Qtd.</th><th>Localização</th><th>Motivo</th><th>Utilizador</th></tr></thead><tbody>');
        
        filteredMovements.forEach(movement => {
            const timestamp = movement.timestamp as Timestamp;
            const date = timestamp ? format(timestamp.toDate(), "dd/MM/yyyy HH:mm:ss") : 'N/A';
            const locationFrom = movement.fromLocationId ? (locationMap.get(movement.fromLocationId) || 'N/A') : 'N/A';
            const locationTo = movement.toLocationId ? (locationMap.get(movement.toLocationId) || 'N/A') : 'N/A';
            let locationText = '';
            if (movement.type === 'TRANSFER') {
                locationText = `${locationFrom} → ${locationTo}`;
            } else if (movement.type === 'IN') {
                locationText = locationTo;
            } else if (movement.type === 'OUT') {
                locationText = locationFrom;
            }

            printWindow.document.write(`
                <tr>
                    <td>${date}</td>
                    <td>${movement.type}</td>
                    <td>${movement.productName}</td>
                    <td>${movement.quantity > 0 ? '+' : ''}${movement.quantity}</td>
                    <td>${locationText}</td>
                    <td>${movement.reason}</td>
                    <td>${movement.userName}</td>
                </tr>
            `);
        });

        printWindow.document.write('</tbody></table>');
        
        printWindow.document.write(`<div class="footer"><p>${companyData?.name || 'MajorStockX'} &copy; ' + new Date().getFullYear() + '</p></div>`);
        printWindow.document.write('</div></body></html>');
        printWindow.document.close();
        
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
        }, 500);
    }
  };

  const handleDownloadPdf = () => {
    toast({
      title: "Como Guardar o Relatório em PDF",
      description: "Na janela de impressão que vai abrir, por favor mude o destino para 'Guardar como PDF' para descarregar o ficheiro.",
      duration: 8000,
    });
    handlePrint();
  };


  const isLoading = contextLoading || movementsLoading;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-1/3" />
        <Skeleton className="h-8 w-1/4" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <>
       <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem a certeza absoluta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é irreversível e irá apagar permanentemente **todo** o histórico de movimentos de stock.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearHistory} variant="destructive">
              Sim, apagar tudo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex flex-col gap-6 pb-20 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <Button asChild variant="outline" className="h-12">
            <Link href="/inventory">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar ao Inventário
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <Button onClick={handleDownloadPdf} variant="outline" className="h-12">
              <Download className="mr-2 h-4 w-4" />
              Baixar PDF
            </Button>
            <Button onClick={handlePrint} variant="outline" className="h-12">
              <Printer className="mr-2 h-4 w-4" />
              Imprimir
            </Button>
          </div>
        </div>
        <div className="flex flex-col md:flex-row gap-2">
          <Input
              placeholder="Pesquisar por produto, utilizador, motivo..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="h-12 text-sm"
          />
          <DatePicker date={selectedDate} setDate={setSelectedDate} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredMovements.length > 0 ? (
            filteredMovements.map(movement => (
              <MovementCard key={movement.id} movement={movement} locationMap={locationMap} />
            ))
          ) : (
            <div className="col-span-full">
                <Card className="text-center py-12 text-muted-foreground">
                    Nenhum movimento encontrado com os filtros atuais.
                </Card>
            </div>
          )}
        </div>
        
        {isAdmin && (
            <Card className="mt-8">
                <div className="p-6 flex flex-col items-center text-center">
                    <h3 className="font-semibold mb-2">Zona de Administrador</h3>
                    <p className="text-sm text-muted-foreground mb-4 max-w-md">
                        Esta ação é irreversível e irá apagar permanentemente **todo** o histórico de movimentos de stock.
                    </p>
                    <Button variant="destructive" onClick={() => setShowClearConfirm(true)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Limpar Histórico
                    </Button>
                </div>
            </Card>
        )}
      </div>
    </>
  );
}
