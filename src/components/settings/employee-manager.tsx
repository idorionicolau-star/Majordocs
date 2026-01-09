
"use client";

import { useMemo, useState } from 'react';
import type { User } from '@/lib/types';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, deleteDoc, doc } from 'firebase/firestore';
import { AddEmployeeDialog } from './add-employee-dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Trash2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

interface EmployeeManagerProps {
  companyId: string | null;
}

export function EmployeeManager({ companyId }: EmployeeManagerProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [employeeToDelete, setEmployeeToDelete] = useState<User | null>(null);

  const employeesCollectionQuery = useMemoFirebase(() => {
    if (!firestore || !companyId) return null;
    return query(collection(firestore, "users"), where("companyId", "==", companyId));
  }, [firestore, companyId]);

  const { data: employees, isLoading } = useCollection<User>(employeesCollectionQuery);

  const sortedEmployees = useMemo(() => {
    if (!employees) return [];
    // Sort by role (Admin first) and then by name
    return [...employees].sort((a, b) => {
      if (a.role === 'Admin' && b.role !== 'Admin') return -1;
      if (a.role !== 'Admin' && b.role === 'Admin') return 1;
      return a.name.localeCompare(b.name);
    });
  }, [employees]);

  const handleDeleteEmployee = async () => {
    if (!employeeToDelete || !firestore) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível identificar o funcionário a ser removido.' });
      return;
    }
    
    // Note: Deleting the Firebase Auth user is a separate, more complex operation
    // involving backend functions for security reasons. Here, we only delete the
    // user's profile document from Firestore.
    try {
      await deleteDoc(doc(firestore, 'users', employeeToDelete.id));
      toast({ title: 'Funcionário Removido', description: `O perfil de ${employeeToDelete.name} foi removido.` });
    } catch (error) {
      console.error("Error deleting employee document: ", error);
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível remover o perfil do funcionário.' });
    }
    
    setEmployeeToDelete(null);
  };


  if (!companyId) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground text-center">Aguardando identificação da empresa...</p>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <>
    <AlertDialog open={!!employeeToDelete} onOpenChange={setEmployeeToDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem a certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá remover o perfil do funcionário <span className="font-bold">{employeeToDelete?.name}</span>. O acesso dele/a à aplicação será efetivamente revogado. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteEmployee}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    <div className="space-y-4">
      <div className="flex justify-end">
        <AddEmployeeDialog companyId={companyId} />
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Função</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  <Skeleton className="h-6 w-full" />
                </TableCell>
              </TableRow>
            ) : sortedEmployees.length > 0 ? (
              sortedEmployees.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                     <span className={`px-2 py-1 text-xs font-semibold rounded-full ${user.role === 'Admin' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                        {user.role}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {user.role !== 'Admin' && (
                       <Button variant="ghost" size="icon" onClick={() => setEmployeeToDelete(user)}>
                         <Trash2 className="h-4 w-4 text-destructive" />
                       </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  Nenhum funcionário cadastrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
    </>
  );
}

    