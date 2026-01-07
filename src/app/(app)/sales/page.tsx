import { sales } from "@/lib/data";
import { columns } from "@/components/sales/columns";
import { SalesDataTable } from "@/components/sales/data-table";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

export default function SalesPage() {
  return (
    <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
            <div>
                <h1 className="text-3xl font-headline font-bold">Vendas</h1>
                <p className="text-muted-foreground">
                    Visualize e registre as vendas de produtos.
                </p>
            </div>
            <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Registrar Venda
            </Button>
        </div>
      <SalesDataTable columns={columns} data={sales} />
    </div>
  );
}
