
"use client";

import { useState, useMemo } from 'react';
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
import { useUser } from '@/firebase/auth/use-user';
import { useFirestore, useCollection, useMemoFirebase, useFirebase } from '@/firebase';
import { doc, setDoc, collection, query, where, updateDoc, deleteDoc } from 'firebase/firestore';
import { Skeleton } from '../ui/skeleton';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { getAuth } from 'firebase/auth';


export function EmployeeManager() {
  const { user: adminUser } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const employeesQuery = useMemoFirebase(() => {
    if (!firestore || !adminUser) return null;
    return query(collection(firestore, 'users'), where('companyId', '==', adminUser.uid));
  }, [firestore, adminUser]);

  const { data: users, isLoading: usersLoading } = useCollection<User>(employeesQuery);

  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const handleAddUser = async (newUserData: any) => {
    if (!adminUser || !firestore) {
      toast({ variant: "destructive", title: "Erro", description: "Não autenticado ou a base de dados não está pronta." });
      return;
    }
    
    // This is a workaround for a secondary Firebase app instance issue.
    // We get a temporary auth instance to create the user, but the primary instance will still manage the session.
    const tempAuth = getAuth(useFirebase().firebaseApp);

    toast({ title: "A criar funcionário...", description: "Por favor, aguarde." });

    try {
      // 1. Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(tempAuth, newUserData.email, newUserData.password);
      const newUser = userCredential.user;

      // 2. Update their profile
      await updateProfile(newUser, { displayName: newUserData.name });

      // 3. Create user profile in Firestore
      const userDocRef = doc(firestore, 'users', newUser.uid);
      await setDoc(userDocRef, {
        id: newUser.uid,
        name: newUserData.name,
        email: newUserData.email,
        role: newUserData.role,
        permissions: newUserData.permissions,
        status: 'Ativo',
        companyId: adminUser.uid, // Link to the admin's company
        avatar: `https://picsum.photos/seed/${newUser.uid}/40/40`,
      });

      toast({
          title: "Funcionário Criado!",
          description: `${newUserData.name} foi adicionado à sua empresa e pode agora fazer login.`,
      });
      
      // It's good practice to sign the new user out of the temporary auth instance
      // so the admin's session remains primary.
      await tempAuth.signOut();


    } catch (error: any) {
        let description = "Não foi possível criar o funcionário. Tente novamente.";
        if (error.code === 'auth/email-already-in-use') {
            description = "Este endereço de email já está em uso por outra conta.";
        } else if (error.code === 'auth/weak-password') {
            description = "A senha é muito fraca. Tente uma senha mais forte.";
        }
        console.error("Error creating user:", error);
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
    if (userToDelete && userToDelete.id && firestore) {
      // TODO: In a real app, you would also need to delete the user from Firebase Auth
      // using the Admin SDK, which can't be done from the client. This should be a cloud function.
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
            <UsersDataTable columns={userColumns} data={users || []} adminUser={adminUser} />
        )}
      </div>
    </>
  );
}

