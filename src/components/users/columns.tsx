
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
          className={`h-auto px-2 py-0.5 text-xs font-semibold ${status === "Ativo" ? "border-transparent bg-green-500/20 text-green-700 dark:text-green-400 hover:bg-green-500/30" : "border-transparent bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-500/30"}`}
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
            <EditUserDialog user={user} onUpdateUser={options.onUpdateUser} />
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
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
