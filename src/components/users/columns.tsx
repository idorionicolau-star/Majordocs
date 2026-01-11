
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

const displayPassword = (password: string | undefined): string => {
  if (!password) {
    return '';
  }
  try {
    const decoded = Buffer.from(password, 'base64').toString('utf-8');
    // Verifica se a string decodificada contém caracteres de controle inválidos,
    // o que pode indicar que não era uma string Base64 válida para texto.
    if (/[\x00-\x08\x0E-\x1F]/.test(decoded) && decoded !== password) {
        return password; // Retorna a string original se a decodificação resultar em lixo
    }
    return decoded;
  } catch (e) {
    // Se a decodificação falhar (não era Base64), retorna o texto original
    return password;
  }
};

const LoginFormatCell = ({ row, companyName, isAdmin }: { row: any, companyName: string | null, isAdmin: boolean }) => {
    const { toast } = useToast();
    const username = row.original.username;
    
    // A senha só estará disponível se o utilizador for admin
    const password = isAdmin ? displayPassword(row.original.password) : '********';

    const loginFormat = `${username}@${companyName || ''}`;
    
    const handleCopy = () => {
        if (!isAdmin) {
            toast({
                variant: "destructive",
                title: "Ação não permitida",
                description: "Apenas administradores podem copiar credenciais.",
            });
            return;
        }
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
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCopy} disabled={!isAdmin}>
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
        cell: ({ row }) => <LoginFormatCell row={row} companyName={options.companyName} isAdmin={options.isAdmin} />
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
