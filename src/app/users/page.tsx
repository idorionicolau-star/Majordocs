

"use client";

import { useState, useContext } from "react";
import { useToast } from "@/hooks/use-toast";
import { UsersDataTable } from "@/components/users/data-table";
import { columns } from "@/components/users/columns";
import { AddEmployeeDialog } from "@/components/users/add-employee-dialog";
import { InventoryContext } from "@/context/inventory-context";
import { Skeleton } from "@/components/ui/skeleton";
import type { Employee } from "@/lib/types";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, addDoc, doc, deleteDoc, getDocs, query, where } from "firebase/firestore";
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

export default function UsersPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { companyId, user, loading } = useContext(InventoryContext) || {};
  const isAdmin = user?.role === 'Admin';

  const employeesCollectionRef = useMemoFirebase(() => {
    if (!firestore || !companyId) return null;
    return collection(firestore, `companies/${companyId}/employees`);
  }, [firestore, companyId]);
  
  const { data: employees, isLoading: employeesLoading } = useCollection<Employee>(employeesCollectionRef);
  
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);

  const handleAddEmployee = async (employeeData: Omit<Employee, 'id' | 'companyId'>) => {
    if (!employeesCollectionRef || !companyId) return;

    const usernameWithoutCompany = employeeData.username.split('@')[0];

    // Check if username already exists in the company
    const q = query(employeesCollectionRef, where("username", "==", usernameWithoutCompany));
    const existingUserSnapshot = await getDocs(q);

    if (!existingUserSnapshot.empty) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Este nome de utilizador já existe nesta empresa.",
      });
      return;
    }
    
    // In a real app, password should be hashed before saving
    await addDoc(employeesCollectionRef, { 
      ...employeeData,
      username: usernameWithoutCompany, // Save only the username
      companyId,
    });

    toast({
      title: "Funcionário Adicionado",
      description: `O funcionário "${usernameWithoutCompany}" foi adicionado.`,
    });
  };

  const handleDeleteEmployee = async () => {
    if (employeeToDelete && employeeToDelete.id && firestore && companyId) {
      const employeeDocRef = doc(firestore, `companies/${companyId}/employees`, employeeToDelete.id);
      await deleteDoc(employeeDocRef);
      toast({
        title: "Funcionário Removido",
        description: `O funcionário "${employeeToDelete.username}" foi removido.`,
      });
      setEmployeeToDelete(null);
    }
  };

  if (loading || employeesLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-1/3" />
        <Skeleton className="h-8 w-1/4" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-20 animate-in fade-in duration-500">
        <AlertDialog open={!!employeeToDelete} onOpenChange={(open) => !open && setEmployeeToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Tem a certeza?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta ação irá remover permanentemente o funcionário "{employeeToDelete?.username}".
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteEmployee}>Remover</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h1 className="text-2xl md:text-3xl font-headline font-bold">Gestão de Funcionários</h1>
                <p className="text-sm font-medium text-slate-500 mt-1">
                    Adicione, edite e remova funcionários do sistema.
                </p>
            </div>
            {isAdmin && <AddEmployeeDialog onAddEmployee={handleAddEmployee} />}
        </div>
      
        <UsersDataTable 
            columns={columns({
                onDelete: (employee) => setEmployeeToDelete(employee),
                currentUserId: user?.id,
                isAdmin: isAdmin
            })} 
            data={employees || []} 
        />
    </div>
  );
}
