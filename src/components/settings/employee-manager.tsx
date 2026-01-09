
"use client";

import { useState } from 'react';
import type { Employee } from '@/lib/types';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, deleteDoc } from 'firebase/firestore';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Trash2 } from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';
import { AddEmployeeDialog } from './add-employee-dialog';

interface EmployeeManagerProps {
  companyId: string | null;
}

export function EmployeeManager({ companyId }: EmployeeManagerProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);

  const employeesCollectionRef = useMemoFirebase(() => {
    if (!firestore || !companyId) return null;
    return collection(firestore, `companies/${companyId}/employees`);
  }, [firestore, companyId]);

  const { data: employees, isLoading, forceRefetch } = useCollection<Employee>(employeesCollectionRef);

  const confirmDeleteEmployee = async () => {
    if (!employeeToDelete || !employeesCollectionRef) return;

    try {
      await deleteDoc(doc(employeesCollectionRef, employeeToDelete.id));
      toast({
        title: "Funcionário Removido",
        description: `O utilizador "${employeeToDelete.username}" foi removido.`,
      });
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível remover o funcionário.' });
    } finally {
      setEmployeeToDelete(null);
    }
  };
  
  if (!companyId) {
    return (
      <div className="space-y-2 text-center">
          <p className="text-sm text-muted-foreground">A carregar dados da empresa...</p>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AlertDialog open={!!employeeToDelete} onOpenChange={(open) => !open && setEmployeeToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem a certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá apagar permanentemente o funcionário "{employeeToDelete?.username}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteEmployee}>Apagar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">Funcionários</p>
        <AddEmployeeDialog 
          companyId={companyId} 
          onEmployeeAdded={forceRefetch}
          disabled={!companyId}
        />
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome de Utilizador</TableHead>
              <TableHead>Função</TableHead>
              <TableHead><span className="sr-only">Ações</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={3}>
                  <Skeleton className="h-8 w-full" />
                </TableCell>
              </TableRow>
            ) : employees && employees.length > 0 ? (
              employees.map(employee => (
                <TableRow key={employee.id}>
                  <TableCell className="font-medium">{employee.username}</TableCell>
                  <TableCell>{employee.role}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => setEmployeeToDelete(employee)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="text-center h-24 text-muted-foreground">
                  Nenhum funcionário cadastrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

    