import { products } from "@/lib/data";
import { columns } from "@/components/inventory/columns";
import { InventoryDataTable } from "@/components/inventory/data-table";
import { Button } from "@/components/ui/button";
import { PlusCircle, FileText } from "lucide-react";
import Link from "next/link";

export default function InventoryPage() {
  return (
    <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
            <div>
                <h1 className="text-3xl font-headline font-bold">Inventário</h1>
                <p className="text-muted-foreground">
                    Gerencie os produtos do seu estoque.
                </p>
            </div>
            <div className="flex gap-2">
                <Button variant="outline">
                    <FileText className="mr-2 h-4 w-4" />
                    Form. Contagem
                </Button>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Adicionar Produto
                </Button>
            </div>
        </div>
      <InventoryDataTable columns={columns} data={products} />
    </div>
  );
}
