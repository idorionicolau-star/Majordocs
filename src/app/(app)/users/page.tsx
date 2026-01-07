'use client';

import { useState } from 'react';
import { users as initialUsers } from '@/lib/data';
import { columns } from '@/components/users/columns';
import { UsersDataTable } from '@/components/users/data-table';
import { AddUserDialog } from '@/components/users/add-user-dialog';
import type { User } from '@/lib/types';
import { EditUserDialog } from '@/components/users/edit-user-dialog';
import { ApproveUserDialog } from '@/components/users/approve-user-dialog';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>(initialUsers);

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
    // In a real app, this would be an API call to Firestore
    console.log(`Updating user ${userId}`, data);
    setUsers(users.map(u => u.id === userId ? { ...u, ...data } : u));
  };
  
  const handleApproveUser = (userId: string) => {
    // In a real app, this would be an API call to Firestore
    console.log(`Approving user ${userId}`);
    setUsers(users.map(u => u.id === userId ? { ...u, status: 'Ativo' } : u));
  };

  const userColumns = columns({
    renderActions: (user) => (
      <>
        <EditUserDialog user={user} onUpdateUser={handleUpdateUser}>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                Editar Usuário
            </DropdownMenuItem>
        </EditUserDialog>
        {user.status === 'Pendente' && (
            <ApproveUserDialog user={user} onApprove={handleApproveUser}>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    Aprovar Usuário
                </DropdownMenuItem>
            </ApproveUserDialog>
        )}
      </>
    )
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-headline font-bold">Usuários</h1>
          <p className="text-muted-foreground">
            Gerencie os usuários e permissões do sistema.
          </p>
        </div>
        <AddUserDialog onAddUser={handleAddUser} />
      </div>
      <UsersDataTable columns={userColumns} data={users} />
    </div>
  );
}
