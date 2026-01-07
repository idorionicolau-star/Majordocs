import { users } from "@/lib/data";
import { columns } from "@/components/users/columns";
import { UsersDataTable } from "@/components/users/data-table";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

export default function UsersPage() {
  return (
    <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
            <div>
                <h1 className="text-3xl font-headline font-bold">Usuários</h1>
                <p className="text-muted-foreground">
                    Gerencie os usuários e permissões do sistema.
                </p>
            </div>
            <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Adicionar Usuário
            </Button>
        </div>
      <UsersDataTable columns={columns} data={users} />
    </div>
  );
}
