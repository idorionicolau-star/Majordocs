
"use client";

import { useState } from 'react';
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

export function EmployeeManager() {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const { toast } = useToast();

  const handleAddUser = (newUser: Omit<User, 'id' | 'avatar' | 'status' | 'permissions'>) => {
    const user: User = {
      ...newUser,
      id: `USR${(users.length + 1).toString().padStart(3, '0')}`,
      avatar: `https://picsum.photos/seed/${users.length + 1}/40/40`,
      status: 'Pendente',
      permissions: {
        canSell: newUser.role === 'Admin',
        canRegisterProduction: newUser.role === 'Admin',
        canEditInventory: newUser.role === 'Admin',
        canTransferStock: newUser.role === 'Admin',
        canViewReports: newUser.role === 'Admin',
      },
    };
    setUsers([user, ...users]);
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

