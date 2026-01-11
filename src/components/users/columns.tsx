
"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Employee } from "@/lib/types"
import { Button } from "../ui/button"
import { Trash2 } from "lucide-react"
import { atob } from "buffer"

interface ColumnsOptions {
    onDelete: (employee: Employee) => void;
    currentUserId?: string | null;
    isAdmin: boolean;
    companyName: string | null;
}

export const columns = (options: ColumnsOptions): ColumnDef<Employee>[] => {

    const baseColumns: ColumnDef<Employee>[] = [
    {
        accessorKey: "username",
        header: "Nome de Utilizador",
    },
    {
        id: 'loginFormat',
        header: 'Formato de Login',
        cell: ({ row }) => {
            const username = row.original.username;
            const loginFormat = `${username}@${options.companyName || ''}`;
            return (
                <span className="font-mono text-xs p-2 rounded-md bg-muted text-muted-foreground">{loginFormat}</span>
            )
        }
    },
    {
        accessorKey: "role",
        header: "Função",
        cell: ({ row }) => {
            const role = row.original.role;
            return (
                 <span className={`text-[10px] font-black px-3 py-1.5 rounded-full ${
                    role === 'Admin' 
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                 } uppercase tracking-wider`}>
                    {role}
                </span>
            )
        }
    }];
    
    if (options.isAdmin) {
        baseColumns.push({
            accessorKey: "password",
            header: "Senha",
            cell: ({ row }) => {
                try {
                    // Try to decode from Base64
                    return atob(row.original.password || "");
                } catch (e) {
                    // If it fails, it's probably plain text
                    return row.original.password;
                }
            }
        });
    }

    if (options.isAdmin) {
        baseColumns.push({
            id: "actions",
            cell: ({ row }) => {
                const employee = row.original;
                // Prevent deleting oneself
                const isCurrentUser = employee.id === options.currentUserId;

                return (
                    <div className="text-right">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-destructive hover:text-destructive"
                            onClick={() => options.onDelete(employee)}
                            disabled={isCurrentUser}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                )
            }
        });
    }

    return baseColumns;
};
