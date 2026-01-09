
"use client";

import { useState, useContext }
from "react";
import { useToast } from "@/hooks/use-toast";
import { UsersDataTable } from "@/components/users/data-table";
import { columns } from "@/components/users/columns";
import { AddEmployeeDialog } from "@/components/users/add-employee-dialog";
import { InventoryContext } from "@/context/inventory-context";
import { Skeleton } from "@/components/ui/skeleton";
import type { Employee } from "@/lib/types";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, addDoc, doc, deleteDoc } from "firebase/firestore";

export default function UsersPage() {
  const { toast } = useToast();
  const firestore = useFirestore();

  const employeesCollectionRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, `employees`);
  }, [firestore]);
  
  const { data: employees, isLoading: employeesLoading } = useCollection<Employee>(employeesCollectionRef);
  const { userData } = useContext(InventoryContext) || {};
  
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);

  const handleAddEmployee = async (employeeData: Omit<Employee, 'id'>) => {
    if (!employeesCollectionRef) return;
    // In a real app, password should be hashed before saving
    await addDoc(employeesCollectionRef, employeeData);
    toast({
      title: "Funcionário Adicionado",
      description: `O funcionário "${employeeData.username}" foi adicionado.`,
    });
  };

  const handleDeleteEmployee = async () => {
    if (employeeToDelete && employeeToDelete.id && firestore) {
      const employeeDocRef = doc(firestore, `employees`, employeeToDelete.id);
      await deleteDoc(employeeDocRef);
      toast({
        title: "Funcionário Removido",
        description: `O funcionário "${employeeToDelete.username}" foi removido.`,
      });
      setEmployeeToDelete(null);
    }
  };

  if (employeesLoading) {
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
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h1 className="text-2xl md:text-3xl font-headline font-bold">Gestão de Funcionários</h1>
                <p className="text-sm font-medium text-slate-500 mt-1">
                    Adicione, edite e remova funcionários do sistema.
                </p>
            </div>
            <AddEmployeeDialog onAddEmployee={handleAddEmployee} />
        </div>
      
        <UsersDataTable 
            columns={columns({
                onDelete: (employee) => setEmployeeToDelete(employee),
                currentUserId: userData?.id
            })} 
            data={employees || []} 
        />
    </div>
  );
}
