
"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Employee, ModulePermission, PermissionLevel } from "@/lib/types"
import { Button } from "../ui/button"
import { Trash2, Edit, Copy, Eye, Pencil } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { EditEmployeeDialog } from "./edit-employee-dialog"
import { allPermissions } from "@/lib/data"
import { cn } from "@/lib/utils"

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
    // Check if it might be base64. A simple check is to see if it decodes.
    // A more robust check might be needed if passwords can naturally look like base64.
    const decoded = Buffer.from(password, 'base64').toString('utf-8');
     // Simple heuristic: if decoding results in non-printable chars, it wasn't valid text.
    if (/[\x00-\x08\x0E-\x1F]/.test(decoded) && decoded !== password) {
       return password;
    }
    return decoded;
  } catch (e) {
    // If it fails to decode, it's plain text.
    return password;
  }
};


const LoginFormatCell = ({ row, companyName, isAdmin }: { row: any, companyName: string | null, isAdmin: boolean }) => {
    const { toast } = useToast();
    const username = row.original.username;
    const password = isAdmin ? displayPassword(row.original.password) : '********';
    const loginFormat = `${username}@${companyName || ''}`;
    
    const handleCopy = async () => {
        if (!isAdmin) {
            toast({
                variant: "destructive",
                title: "Ação não permitida",
                description: "Apenas administradores podem copiar credenciais.",
            });
            return;
        }

        const textToCopy = `Login: ${loginFormat}\nSenha: ${password}`;

        if (!document.hasFocus()) {
            window.focus();
        }

        try {
            await navigator.clipboard.writeText(textToCopy);
            toast({
            title: "Credenciais Copiadas",
            description: "O login e a senha foram copiados.",
            });
        } catch (err) {
            const textArea = document.createElement("textarea");
            textArea.value = textToCopy;
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                toast({ title: "Copiado", description: "Credenciais copiadas (via fallback)." });
            } catch (e) {
                console.error("Erro ao copiar: ", e);
                toast({ variant: "destructive", title: "Erro", description: "Não foi possível copiar as credenciais." });
            }
            document.body.removeChild(textArea);
        }
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
                 <span className={cn(
                    "text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-wider",
                    role === 'Admin' 
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                 )}>
                    {role}
                </span>
            )
        }
    },
    {
        accessorKey: 'permissions',
        header: 'Permissões',
        cell: ({ row }) => {
            const permissions = row.original.permissions || {};
            const role = row.original.role;
            if (role === 'Admin') {
                return <span className="text-xs text-muted-foreground italic">Acesso total de escrita</span>;
            }
            
            const grantedPermissions = Object.entries(permissions)
                .filter(([, level]) => level !== 'none')
                .map(([id, level]) => ({
                    label: allPermissions.find(p => p.id === id)?.label || id,
                    level
                }));
            
            if (grantedPermissions.length === 0) {
                return <span className="text-xs text-muted-foreground italic">Nenhuma</span>;
            }

            return (
                <div className="flex flex-wrap gap-1 max-w-sm">
                    {grantedPermissions.map(({label, level}) => (
                        <span key={label} className={cn(
                            "flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full",
                             level === 'write'
                                ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                        )}>
                            {level === 'write' ? <Pencil className="h-2.5 w-2.5" /> : <Eye className="h-2.5 w-2.5" />}
                            {label}
                        </span>
                    ))}
                </div>
            )
        }
    }
];
    
    if (options.isAdmin) {
        baseColumns.push({
            id: "actions",
            cell: ({ row }) => {
                const employee = row.original;
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
