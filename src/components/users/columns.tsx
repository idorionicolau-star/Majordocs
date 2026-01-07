
"use client"

import { ColumnDef } from "@tanstack/react-table"
import { User } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Edit, MoreHorizontal } from "lucide-react"
import React from "react"
import { EditUserDialog } from "@/components/users/edit-user-dialog"

interface ColumnsOptions {
  onUpdateUser: (userId: string, data: Partial<User>) => void;
  onToggleStatus: (userId: string, currentStatus: 'Ativo' | 'Pendente') => void;
}

export const columns = (options: ColumnsOptions): ColumnDef<User>[] => [
  {
    accessorKey: "name",
    header: "Nome",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Avatar className="h-8 w-8">
            <AvatarImage src={row.original.avatar} alt={row.original.name} />
            <AvatarFallback>{row.original.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
            <span className="font-medium">{row.original.name}</span>
            <span className="text-xs text-muted-foreground">{row.original.email}</span>
        </div>
      </div>
    ),
  },
  {
    accessorKey: "role",
    header: "Papel",
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const user = row.original;
      const status = user.status;
      return (
        <Button
          variant={status === "Ativo" ? "default" : "outline"}
          size="sm"
          onClick={() => options.onToggleStatus(user.id, user.status)}
          className={`h-auto px-2 py-0.5 text-xs font-semibold ${status === "Ativo" ? "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 border-green-300 hover:bg-green-200" : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300 border-yellow-300 hover:bg-yellow-200"}`}
        >
          {status}
        </Button>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const user = row.original
      return (
        <div className="flex items-center justify-end gap-2">
            <EditUserDialog user={user} onUpdateUser={options.onUpdateUser}>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Edit className="h-4 w-4" />
                    <span className="sr-only">Editar</span>
                </Button>
            </EditUserDialog>
        </div>
      )
    },
  },
]
