'use client';

import { useState, useMemo, useContext } from 'react';
import type { Employee, User } from '@/lib/types';
import { InventoryContext } from '@/context/inventory-context';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, deleteDoc, getDocs, query, where } from 'firebase/firestore';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { AddEmployeeDialog } from '@/components/users/add-employee-dialog';
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
import { Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function UsersPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { companyId, loading: contextLoading } = useContext(InventoryContext) || { companyId: null, loading: true };

  const usersCollectionRef = useMemoFirebase(() => {
    if (!firestore || !companyId) return null;
    // Query for admins of the company
    return query(collection(firestore, 'users'), where('companyId', '==', companyId));
  }, [firestore, companyId]);

  const employeesCollectionRef = useMemoFirebase(() => {
    if (!firestore || !companyId) return null;
    return collection(firestore, `companies/${companyId}/employees`);
  }, [firestore, companyId]);

  const { data: adminUsers, isLoading: adminsLoading } = useCollection<User>(usersCollectionRef);
  const { data: employees, isLoading: employeesLoading } = useCollection<Employee>(employeesCollectionRef);
  const [userToDelete, setUserToDelete] = useState<{ id: string, name: string, type: 'admin' | 'employee' } | null>(null);

  const isLoading = contextLoading || adminsLoading || employeesLoading;

  const allUsers = useMemo(() => {
    const combined = [];
    if (adminUsers) {
      combined.push(...adminUsers.map(u => ({ ...u, username: u.name, type: 'Admin' as const })));
    }
    if (employees) {
      combined.push(...employees.map(e => ({ ...e, name: e.username, type: 'Funcionário' as const })));
    }
    return combined;
  }, [adminUsers, employees]);

  const handleDeleteUser = async () => {
    if (!userToDelete || !firestore || !companyId) return;

    let docRef;
    if (userToDelete.type === 'admin') {
      // Deleting an admin user might have more implications, handle with care.
      // For now, we assume we only delete them from the 'users' collection.
      // In a real-world scenario, you might need a cloud function to delete the Firebase Auth user too.
      docRef = doc(firestore, 'users', userToDelete.id);
    } else {
      docRef = doc(firestore, `companies/${companyId}/employees`, userToDelete.id);
    }
    
    try {
      await deleteDoc(docRef);
      toast({
        title: 'Utilizador Removido',
        description: `O utilizador "${userToDelete.name}" foi removido com sucesso.`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao Remover',
        description: 'Não foi possível remover o utilizador.',
      });
    } finally {
      setUserToDelete(null);
    }
  };

  return (
    <>
      <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem a certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá apagar permanentemente o utilizador "{userToDelete?.name}". Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive hover:bg-destructive/90">
              Apagar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-headline font-bold">Utilizadores</h1>
            <p className="text-muted-foreground">Crie e gira os utilizadores internos da sua empresa.</p>
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome / Utilizador</TableHead>
                <TableHead>Função</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead><span className="sr-only">Ações</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ) : allUsers.length > 0 ? (
                allUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.role}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${user.type === 'Admin' ? 'bg-primary/10 text-primary' : 'bg-secondary text-secondary-foreground'}`}>
                        {user.type}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {user.type !== 'Admin' && ( // Prevent deleting the main admin
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setUserToDelete({ id: user.id, name: user.name, type: 'employee' })}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    Nenhum utilizador encontrado.
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
