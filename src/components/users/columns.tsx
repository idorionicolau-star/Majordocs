
"use client"

import { ColumnDef } from "@tanstack/react-table"
import { User } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip"
import React from "react"
import { EditUserDialog } from "./edit-user-dialog"

interface ColumnsOptions {
  onUpdateUser: (userId: string, data: Partial<User>) => void;
  onToggleStatus: (userId: string, currentStatus: 'Ativo' | 'Pendente') => void;
  onAttemptDelete: (user: User) => void;
}

export const columns = (options: ColumnsOptions): ColumnDef<User>[] => [
  {
    accessorKey: "name",
    header: "Funcionário",
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10 rounded-xl">
            <AvatarImage src={row.original.avatar} alt={row.original.name} />
            <AvatarFallback className="rounded-xl">{row.original.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
            <span className="font-bold text-slate-800 dark:text-white">{row.original.name}</span>
            <span className="text-xs text-slate-500">{row.original.email}</span>
        </div>
      </div>
    ),
  },
  {
    accessorKey: "role",
    header: "Papel",
    cell: ({ row }) => (
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{row.original.role}</span>
    )
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const user = row.original;
      const status = user.status;
      const isActive = status === 'Ativo';
      return (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => options.onToggleStatus(user.id, user.status)}
          className={`h-auto px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider ${isActive ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600" : "bg-amber-50 dark:bg-amber-500/10 text-amber-600"}`}
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
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <EditUserDialog user={user} onUpdateUser={options.onUpdateUser} />
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="p-3 h-auto w-auto text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all"
                            onClick={() => options.onAttemptDelete(user)}
                        >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Apagar</span>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Apagar Funcionário</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>
      )
    },
  },
]
