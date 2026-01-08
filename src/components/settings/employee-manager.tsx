
"use client";

import { useState, useEffect, useContext } from 'react';
import { columns } from '@/components/users/columns';
import { UsersDataTable } from '@/components/users/data-table';
import { AddUserDialog } from '@/components/users/add-user-dialog';
import type { User } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
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
import { createUserWithEmail, updateUserProfile } from '@/firebase/auth/auth';
import { useUser } from '@/firebase/auth/use-user';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { doc, setDoc, collection, query, where, getDocs, writeBatch, updateDoc, deleteDoc } from 'firebase/firestore';
import { Skeleton } from '../ui/skeleton';


export function EmployeeManager() {
  const { user: adminUser } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const employeesQuery = useMemoFirebase(() => {
    if (!firestore || !adminUser) return null;
    // Query for users that belong to the current admin's company
    return query(collection(firestore, 'users'), where('companyId', '==', adminUser.uid));
  }, [firestore, adminUser]);

  const { data: users, isLoading: usersLoading } = useCollection<User>(employeesQuery);

  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const handleAddUser = async (newUserData: any) => {
     if (!adminUser || !firestore) {
        toast({ variant: "destructive", title: "Erro", description: "Não autenticado ou base de dados indisponível." });
        return;
    }
    toast({ title: "A criar funcionário...", description: "Por favor, aguarde." });

    try {
        // Note: This creates a new top-level Firebase Auth user.
        // This is a temporary solution. In a real scenario, you'd use a backend function.
        const userCredential = await createUserWithEmail(newUserData.email, newUserData.password);
        const newUser = userCredential.user;

        await updateUserProfile(newUser, { displayName: newUserData.name });

        const newUserProfile: Omit<User, 'id'> = {
            name: newUserData.name,
            email: newUserData.email,
            avatar: `https://picsum.photos/seed/${Math.random()}/40/40`,
            role: newUserData.role,
            status: 'Ativo',
            permissions: newUserData.permissions,
            companyId: adminUser.uid, // Link to the admin's "company"
        };
        
        const userDocRef = doc(firestore, `users`, newUser.uid);
        await setDoc(userDocRef, newUserProfile);
        
        toast({
            title: "Funcionário Adicionado!",
            description: `${newUserData.name} foi adicionado à sua empresa.`,
        });

    } catch (error: any) {
        let description = "Ocorreu um erro ao criar o funcionário.";
        if (error.code === 'auth/email-already-in-use') {
            description = "Este email já está em uso por outra conta.";
        } else if (error.code === 'auth/weak-password') {
            description = "A senha fornecida é muito fraca.";
        }
        toast({
            variant: "destructive",
            title: "Erro ao Adicionar Funcionário",
            description: description,
        });
    }
  };

  const handleUpdateUser = async (userId: string, data: Partial<User>) => {
    if (!firestore) return;
    const userDocRef = doc(firestore, 'users', userId);
    toast({ title: "A atualizar...", description: `A guardar as alterações para ${data.name || 'o funcionário'}.` });
    try {
      await updateDoc(userDocRef, data);
      toast({
        title: "Funcionário atualizado!",
        description: `Os dados de ${data.name || 'do funcionário'} foram atualizados.`,
      });
    } catch(e) {
       toast({
        variant: "destructive",
        title: "Erro ao atualizar",
        description: "Não foi possível guardar as alterações.",
      });
    }
  };

  const confirmDeleteUser = async () => {
    if (userToDelete && firestore) {
      // In a real app, this should also delete the user in Firebase Auth. 
      // This requires admin privileges and is best done via a Cloud Function.
      // For now, we just delete the Firestore document.
      toast({ title: "A apagar...", description: `A remover ${userToDelete.name}.` });
      try {
        await deleteDoc(doc(firestore, 'users', userToDelete.id));
        toast({
          title: "Funcionário Removido",
          description: `O funcionário "${userToDelete.name}" foi removido do sistema.`,
        });
        setUserToDelete(null);
      } catch (e) {
         toast({
          variant: "destructive",
          title: "Erro ao apagar",
          description: "Não foi possível remover o funcionário.",
        });
      }
    }
  };
  
  const handleToggleStatus = async (userId: string, currentStatus: 'Ativo' | 'Pendente') => {
    if (!firestore) return;
    const newStatus = currentStatus === 'Ativo' ? 'Pendente' : 'Ativo';
    const userDocRef = doc(firestore, 'users', userId);
     try {
      await updateDoc(userDocRef, { status: newStatus });
      toast({
        title: "Status do funcionário alterado",
        description: `O status foi alterado para ${newStatus}.`,
        duration: 3000,
      });
    } catch (e) {
       toast({
        variant: "destructive",
        title: "Erro ao alterar status",
        description: "Não foi possível alterar o status.",
      });
    }
  };

  const userColumns = columns({
    onUpdateUser: handleUpdateUser,
    onToggleStatus: handleToggleStatus,
    onAttemptDelete: (user) => setUserToDelete(user),
  });

  return (
    <>
      <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem a certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá apagar permanentemente o funcionário
              "{userToDelete?.name}" e remover o seu acesso à empresa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteUser}>Apagar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <div className="flex flex-col gap-4">
        <div className="flex justify-end items-center">
          <AddUserDialog onAddUser={handleAddUser} />
        </div>
        {usersLoading ? (
            <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
            </div>
        ) : (
            <UsersDataTable columns={userColumns} data={users || []} />
        )}
      </div>
    </>
  );
}
