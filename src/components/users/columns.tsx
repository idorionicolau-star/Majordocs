
"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Employee } from "@/lib/types"
import { Button } from "../ui/button"
import { Trash2, Edit, Copy } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { EditEmployeeDialog } from "./edit-employee-dialog"

interface ColumnsOptions {
    onDelete: (employee: Employee) => void;
    onUpdate: (employee: Employee) => void;
    currentUserId?: string | null;
    isAdmin: boolean;
    companyName: string | null;
}

const LoginFormatCell = ({ row, companyName }: { row: any, companyName: string | null }) => {
    const { toast } = useToast();
    const username = row.original.username;
    // Use window.atob for client-side decoding
    const password = row.original.password && typeof window !== 'undefined' ? window.atob(row.original.password) : '';
    const loginFormat = `${username}@${companyName || ''}`;
    
    const handleCopy = () => {
        const textToCopy = `Login: ${loginFormat}\nSenha: ${password}`;
        navigator.clipboard.writeText(textToCopy);
        toast({
            title: "Credenciais Copiadas",
            description: "O login e a senha foram copiados.",
        });
    };

    return (
        <div className="flex items-center gap-2">
            <span className="font-mono text-xs p-2 rounded-md bg-muted text-muted-foreground">{loginFormat}</span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCopy}>
                <Copy className="h-4 w-4" />
            </Button>
        </div>
    )
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
        cell: ({ row }) => <LoginFormatCell row={row} companyName={options.companyName} />
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
    },
    {
        accessorKey: "password",
        header: "Senha",
        cell: ({ row }) => {
            try {
                // Use window.atob for client-side decoding
                if (row.original.password && typeof window !== 'undefined') {
                    return window.atob(row.original.password);
                }
                return "";
            } catch (e) {
                // If it fails, it might be plain text from older data
                return row.original.password;
            }
        }
    }];
    
    if (options.isAdmin) {
        baseColumns.push({
            id: "actions",
            cell: ({ row }) => {
                const employee = row.original;
                // Prevent deleting oneself
                const isCurrentUser = employee.id === options.currentUserId;

                return (
                    <div className="text-right">
                        <EditEmployeeDialog 
                            employee={employee}
                            onUpdateEmployee={options.onUpdate}
                        />
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
