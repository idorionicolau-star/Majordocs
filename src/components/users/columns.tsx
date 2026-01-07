"use client"

import { ColumnDef } from "@tanstack/react-table"
import { User } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal } from "lucide-react"
import React from "react"

interface ColumnsOptions {
  renderActions: (user: User) => React.ReactNode;
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
      const status = row.original.status;
      return (
        <Badge variant={status === "Ativo" ? "default" : "outline"} className={status === "Ativo" ? "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 border-green-300" : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300 border-yellow-300"}>
          {status}
        </Badge>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Ações</DropdownMenuLabel>
            {options.renderActions(row.original)}
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]
