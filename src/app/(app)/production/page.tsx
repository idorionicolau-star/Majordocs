import { productions } from "@/lib/data";
import { columns } from "@/components/production/columns";
import { ProductionDataTable } from "@/components/production/data-table";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

export default function ProductionPage() {
  return (
    <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
            <div>
                <h1 className="text-3xl font-headline font-bold">Produção</h1>
                <p className="text-muted-foreground">
                    Visualize e registre a produção de novos itens.
                </p>
            </div>
            <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Registrar Produção
            </Button>
        </div>
      <ProductionDataTable columns={columns} data={productions} />
    </div>
  );
}
