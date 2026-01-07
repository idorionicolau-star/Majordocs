'use client';

import { useState } from 'react';
import { users as initialUsers } from '@/lib/data';
import { columns } from '@/components/users/columns';
import { UsersDataTable } from '@/components/users/data-table';
import { AddUserDialog } from '@/components/users/add-user-dialog';
import type { User } from '@/lib/types';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>(initialUsers);

  const handleAddUser = (newUser: Omit<User, 'id' | 'avatar' | 'status' | 'permissions'>) => {
    const user: User = {
      ...newUser,
      id: `USR${(users.length + 1).toString().padStart(3, '0')}`,
      avatar: `/avatars/${(users.length % 5) + 1}.png`,
      status: 'Pendente',
      permissions: {
        canSell: false,
        canRegisterProduction: false,
        canEditInventory: false,
        canTransferStock: false,
        canViewReports: false,
      },
    };
    setUsers([user, ...users]);
  };

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
      <UsersDataTable columns={columns} data={users} />
    </div>
  );
}
