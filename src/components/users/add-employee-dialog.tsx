
"use client";

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { Employee, ModulePermission, PermissionLevel } from '@/lib/types';
import { allPermissions } from '@/lib/data';
import { Checkbox } from '../ui/checkbox';
import { ScrollArea } from '../ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

const formSchema = z.object({
  username: z.string().min(3, { message: "O nome de utilizador deve ter pelo menos 3 caracteres." }),
  password: z.string().min(6, { message: "A senha deve ter pelo menos 6 caracteres." }),
  role: z.enum(['Admin', 'Employee'], { required_error: "A função é obrigatória." }),
  permissions: z.record(z.string(), z.enum(['none', 'read', 'write'])),
});


type AddEmployeeFormValues = z.infer<typeof formSchema>;

interface AddEmployeeDialogProps {
  onAddEmployee: (employee: Omit<Employee, 'id' | 'companyId'>) => void;
}

export function AddEmployeeDialog({ onAddEmployee }: AddEmployeeDialogProps) {
  const [open, setOpen] = useState(false);
  
  const defaultPermissions = allPermissions.reduce((acc, perm) => {
    acc[perm.id] = (['dashboard', 'inventory', 'sales'].includes(perm.id)) ? 'read' : 'none';
    return acc;
  }, {} as Record<ModulePermission, PermissionLevel>);
  
  const form = useForm<AddEmployeeFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password: "",
      role: 'Employee',
      permissions: defaultPermissions,
    },
  });

  const role = form.watch('role');

  const handlePermissionChange = (moduleId: ModulePermission, level: 'read' | 'write', checked: boolean) => {
    const currentPermissions = form.getValues("permissions");
    const currentLevel = currentPermissions[moduleId];
    let newLevel: PermissionLevel;

    if (level === 'write') {
      // Logic for the 'Editar' checkbox
      newLevel = checked ? 'write' : 'read';
    } else { // level === 'read'
      // Logic for the 'Ver' checkbox
      if (checked) {
        // If we are checking 'Ver', it becomes 'read' (it can't become 'write' from here)
        newLevel = 'read';
      } else {
        // If we are un-checking 'Ver', everything goes to 'none'
        newLevel = 'none';
      }
    }
    
    // Ensure dashboard is always readable
    if (moduleId === 'dashboard' && newLevel === 'none') {
      newLevel = 'read';
    }

    form.setValue(`permissions.${moduleId}`, newLevel, { shouldDirty: true });
  }


  function onSubmit(values: AddEmployeeFormValues) {
    const permissionsForAdmin = allPermissions.reduce((acc, perm) => {
        acc[perm.id] = 'write';
        return acc;
    }, {} as Record<ModulePermission, PermissionLevel>);

    const employeeData: Omit<Employee, 'id' | 'companyId'> = {
      username: values.username,
      password: values.password,
      role: values.role,
      permissions: role === 'Admin' ? permissionsForAdmin : values.permissions,
    };
    onAddEmployee(employeeData);
    form.reset({
        username: "",
        password: "",
        role: 'Employee',
        permissions: defaultPermissions,
    });
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Adicionar Funcionário
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Adicionar Novo Funcionário</DialogTitle>
          <DialogDescription>
            Crie uma conta interna para um novo membro da equipe e defina as suas permissões de acesso.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] -mr-3 pr-3">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4 pr-2">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome de Utilizador</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: joao.silva" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Mínimo 6 caracteres" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Função Principal</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a função" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Employee">Funcionário</SelectItem>
                        <SelectItem value="Admin">Administrador</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {role === 'Employee' && (
                  <FormItem>
                    <div className="mb-4">
                      <FormLabel className="text-base">Permissões de Acesso</FormLabel>
                      <FormDescription>
                        Defina o nível de acesso para cada módulo.
                      </FormDescription>
                    </div>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Módulo</TableHead>
                                    <TableHead className="text-center">Ver</TableHead>
                                    <TableHead className="text-center">Editar</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {allPermissions.filter(p => !p.adminOnly).map((module) => (
                                    <TableRow key={module.id}>
                                        <TableCell className="font-medium">{module.label}</TableCell>
                                        <TableCell className="text-center">
                                            <Checkbox
                                                checked={form.watch(`permissions.${module.id}`) === 'read' || form.watch(`permissions.${module.id}`) === 'write'}
                                                onCheckedChange={(checked) => handlePermissionChange(module.id, 'read', !!checked)}
                                                disabled={module.id === 'dashboard'}
                                            />
                                        </TableCell>
                                         <TableCell className="text-center">
                                            <Checkbox
                                                checked={form.watch(`permissions.${module.id}`) === 'write'}
                                                onCheckedChange={(checked) => handlePermissionChange(module.id, 'write', !!checked)}
                                                disabled={module.id === 'dashboard'}
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                  </FormItem>
              )}

              {role === 'Admin' && (
                  <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 p-4 text-center">
                      <p className="text-sm font-medium text-amber-700 dark:text-amber-300">Administradores têm acesso de escrita a todos os módulos.</p>
                  </div>
              )}
              <DialogFooter className="pt-4">
                  <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
                  <Button type="submit">Adicionar Funcionário</Button>
              </DialogFooter>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
