
"use client";

import { useState, useEffect } from 'react';
import { users as initialUsers } from '@/lib/data';
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
import { useFirestore } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';


export function EmployeeManager() {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const { toast } = useToast();
  const { user: adminUser } = useUser();
  const firestore = useFirestore();


  const handleAddUser = async (newUserData: any) => {
     if (!adminUser || !firestore) {
        toast({ variant: "destructive", title: "Erro", description: "Não autenticado ou base de dados indisponível." });
        return;
    }
    try {
        // Note: This creates a new top-level Firebase Auth user.
        const userCredential = await createUserWithEmail(newUserData.email, newUserData.password);
        const newUser = userCredential.user;

        await updateUserProfile(newUser, { displayName: newUserData.name });

        const newUserProfile: User = {
            id: newUser.uid,
            name: newUserData.name,
            email: newUserData.email,
            avatar: `https://picsum.photos/seed/${Math.random()}/40/40`,
            role: newUserData.role,
            status: 'Ativo', // New users are active by default
            permissions: newUserData.permissions,
            companyId: adminUser.uid, // Link to the admin's "company"
        };
        
        // Save the user profile in the top-level 'users' collection
        const userDocRef = doc(firestore, `users`, newUser.uid);
        await setDoc(userDocRef, newUserProfile);
        
        // Add to local state for UI update
        setUsers(prev => [newUserProfile, ...prev]);

        toast({
            title: "Funcionário Adicionado",
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

  const handleUpdateUser = (userId: string, data: Partial<User>) => {
    setUsers(users.map(u => u.id === userId ? { ...u, ...data } : u));
    toast({
      title: "Funcionário atualizado",
      description: `Os dados de ${data.name || 'do funcionário'} foram atualizados.`,
    });
  };

  const confirmDeleteUser = () => {
    if (userToDelete) {
      // In a real app, this should also delete/disable the user in Firebase Auth
      setUsers(users.filter(u => u.id !== userToDelete.id));
      toast({
        title: "Funcionário Removido",
        description: `O funcionário "${userToDelete.name}" foi removido do sistema.`,
      });
      setUserToDelete(null);
    }
  };
  
  const handleToggleStatus = (userId: string, currentStatus: 'Ativo' | 'Pendente') => {
    const newStatus = currentStatus === 'Ativo' ? 'Pendente' : 'Ativo';
    setUsers(users.map(u => u.id === userId ? { ...u, status: newStatus } : u));
     toast({
      title: "Status do funcionário alterado",
      description: `O status foi alterado para ${newStatus}.`,
      duration: 3000,
    });
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
              Esta ação não pode ser desfeita. Isto irá apagar permanentemente o funcionário
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
        <UsersDataTable columns={userColumns} data={users} />
      </div>
    </>
  );
}
