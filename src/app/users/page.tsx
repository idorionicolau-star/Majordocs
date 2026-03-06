

"use client";

import { useState, useContext, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { UsersDataTable } from "@/components/users/data-table";
import { columns } from "@/components/users/columns";
import { PlusCircle, Users } from "lucide-react";
import Link from 'next/link';
import { InventoryContext } from "@/context/inventory-context";
import { Skeleton } from "@/components/ui/skeleton";
import type { Employee } from "@/lib/types";
import { useFirestore, useMemoFirebase } from '@/firebase/provider';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection } from "firebase/firestore";
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
import { Button } from "@/components/ui/button";
import { EmployeeCard } from "@/components/users/employee-card";
import { Card } from "@/components/ui/card";


export default function UsersPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { companyId, user, loading, companyData } = useContext(InventoryContext) || {};
  const isAdmin = user?.role === 'Admin';

  const employeesCollectionRef = useMemoFirebase(
    () => firestore && companyId ? collection(firestore, `companies/${companyId}/employees`) : null,
    [firestore, companyId]
  );

  const { data: employees, isLoading: employeesLoading, error: employeesError } = useCollection<Employee>(employeesCollectionRef);

  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);



  const handleDeleteEmployee = async () => {
    // Removal disabled
  };

  const tableColumns = useMemo(() => columns({
    onDelete: (employee) => setEmployeeToDelete(employee),
    currentUserId: user?.id,
    isAdmin: isAdmin,
    companyName: companyData?.name || null
  }), [user?.id, isAdmin, companyData?.name]);

  if (loading || employeesLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-1/3" />
        <Skeleton className="h-8 w-1/4" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (employeesError) {
    return (
      <Card className="p-12 text-center space-y-4 max-w-2xl mx-auto">
        <div className="flex justify-center">
          <div className="rounded-full bg-destructive/10 p-3 text-destructive">
            <Users className="h-12 w-12" />
          </div>
        </div>
        <h2 className="text-xl font-bold">Acesso Restrito</h2>
        <p className="text-muted-foreground">
          Ocorreu um problema ao carregar a lista de funcionários. Isto pode acontecer por falta de permissões ou erros de rede.
        </p>
        <p className="text-[10px] text-muted-foreground/50 border rounded p-2 text-left bg-muted/50 overflow-auto max-h-32">
          {employeesError.message}
        </p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-20 animate-in fade-in duration-500">
      <AlertDialog open={!!employeeToDelete} onOpenChange={(open) => !open && setEmployeeToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem a certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá remover permanentemente o funcionário "{employeeToDelete?.username}". A conta de autenticação terá de ser removida manualmente na consola Firebase.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteEmployee} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <div className="flex flex-col md:flex-row justify-end items-start md:items-center gap-4">
        {isAdmin && (
          <Button asChild>
            <Link href="/users/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              Adicionar Funcionário
            </Link>
          </Button>
        )}
      </div>

      <div className="hidden md:block">
        <UsersDataTable
          columns={tableColumns}
          data={employees || []}
        />
      </div>
      <div className="md:hidden space-y-3">
        {(employees && employees.length > 0) ? (
          employees.map(employee => (
            <EmployeeCard
              key={employee.id}
              employee={employee}
              onDelete={setEmployeeToDelete}
              currentUserId={user?.id}
              isAdmin={isAdmin}
            />
          ))
        ) : (
          <Card className="text-center py-12 text-muted-foreground">
            Nenhum funcionário encontrado.
          </Card>
        )}
      </div>
    </div>
  );
}
