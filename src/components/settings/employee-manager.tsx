
"use client";

import { useState, useContext } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, Trash2 } from 'lucide-react';
import { InventoryContext } from '@/context/inventory-context';
import { Skeleton } from '../ui/skeleton';
import { AddEmployeeDialog } from './add-employee-dialog';
import type { User } from '@/lib/types';
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
import { useUser } from '@/firebase/auth/use-user';
import { doc, deleteDoc, query, collection, where } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';

export function EmployeeManager() {
  const { user: currentUser } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [employeeToDelete, setEmployeeToDelete] = useState<User | null>(null);

  const inventoryContext = useContext(InventoryContext);
  const companyId = inventoryContext?.companyId;

  const usersCollectionRef = useMemoFirebase(() => {
    if (!firestore || !companyId) return null;
    return query(collection(firestore, 'users'), where('companyId', '==', companyId));
  }, [firestore, companyId]);

  const { data: users, isLoading: loading } = useCollection<User>(usersCollectionRef);

  const confirmDelete = async () => {
    if (!employeeToDelete || !firestore) return;
    
    toast({ title: "A remover funcionário..." });
    try {
        await deleteDoc(doc(firestore, 'users', employeeToDelete.id));
        toast({ title: "Funcionário Removido" });
    } catch(e) {
        toast({ variant: 'destructive', title: "Erro", description: "Não foi possível remover o funcionário." });
    }
    setEmployeeToDelete(null);
  };
  
  if (loading) {
    return (
        <div className="space-y-2">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-8 w-1/2" />
        </div>
    )
  }

  return (
    <>
    <AlertDialog open={!!employeeToDelete} onOpenChange={(open) => !open && setEmployeeToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem a certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá apagar permanentemente a conta do funcionário <span className="font-bold">{employeeToDelete?.name}</span>. O funcionário perderá o acesso à aplicação.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Sim, apagar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    <div className="space-y-4">
        <div className='flex justify-between items-center'>
            <h4 className="font-medium text-lg">Funcionários</h4>
            <AddEmployeeDialog />
        </div>
        <div className="rounded-md border">
            <ul className="divide-y">
              {users && users.length > 0 ? users.map(user => (
                <li key={user.id} className="flex items-center justify-between p-3">
                    <div>
                        <p className="text-sm font-medium">{user.name} <span className="text-xs text-muted-foreground">{user.role === 'Admin' ? '(Admin)' : ''}</span></p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  
                  <div className='flex items-center gap-2'>
                    {user.id !== currentUser?.uid && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setEmployeeToDelete(user)}
                        >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Apagar</span>
                        </Button>
                    )}
                  </div>
                </li>
              )) : (
                <li className="p-3 text-sm text-muted-foreground text-center">Nenhum funcionário cadastrado.</li>
              )}
            </ul>
        </div>
    </div>
    </>
  );
}
