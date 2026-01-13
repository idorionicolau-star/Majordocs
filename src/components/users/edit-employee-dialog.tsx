
"use client";

import { useState, useEffect } from 'react';
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
import { Edit } from "lucide-react";
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
  role: z.enum(['Admin', 'Employee'], { required_error: "A função é obrigatória." }),
  permissions: z.record(z.string(), z.enum(['none', 'read', 'write'])),
});

type EditEmployeeFormValues = z.infer<typeof formSchema>;

interface EditEmployeeDialogProps {
  employee: Employee;
  onUpdateEmployee: (employee: Employee) => void;
}

export function EditEmployeeDialog({ employee, onUpdateEmployee }: EditEmployeeDialogProps) {
  const [open, setOpen] = useState(false);
  
  const form = useForm<EditEmployeeFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: employee.username,
      role: employee.role,
      permissions: employee.permissions || {},
    },
  });
  
  const role = form.watch('role');

  useEffect(() => {
    if (open) {
      const initialPermissions = { ...allPermissions.reduce((acc, p) => ({ ...acc, [p.id]: 'none' }), {}), ...employee.permissions };
      form.reset({
        username: employee.username,
        role: employee.role,
        permissions: initialPermissions,
      });
    }
  }, [open, employee, form]);

  const handlePermissionChange = (moduleId: ModulePermission, level: 'read' | 'write') => {
    const currentPermissions = form.getValues('permissions');
    const currentLevel = currentPermissions[moduleId];
  
     if (level === 'write') {
        const newLevel = currentLevel === 'write' ? 'read' : 'write';
        form.setValue(`permissions.${moduleId}`, newLevel, { shouldDirty: true });
    } else { // 'read'
        const newLevel = currentLevel === 'read' || currentLevel === 'write' ? 'none' : 'read';
        if (newLevel === 'none') {
          form.setValue(`permissions.${moduleId}`, 'none', { shouldDirty: true });
        } else {
          form.setValue(`permissions.${moduleId}`, 'read', { shouldDirty: true });
        }
    }
  };


  function onSubmit(values: EditEmployeeFormValues) {
    const permissionsForAdmin = allPermissions.reduce((acc, perm) => {
      acc[perm.id] = 'write';
      return acc;
    }, {} as Record<ModulePermission, PermissionLevel>);

    const updatedEmployeeData: Partial<Employee> = {
      username: values.username,
      role: values.role,
      permissions: values.role === 'Admin' ? permissionsForAdmin : values.permissions,
    };
    
    onUpdateEmployee({
      ...employee,
      ...updatedEmployeeData,
    });

    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
            <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar Funcionário</DialogTitle>
          <DialogDescription>
            Atualize as informações e permissões de acesso deste funcionário.
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
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormItem>
                <FormLabel>Email de Login</FormLabel>
                <p className="text-sm text-muted-foreground font-mono p-2 bg-muted rounded-md">{employee.email}</p>
                <FormDescription>O email de login não pode ser alterado.</FormDescription>
              </FormItem>

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
                                {allPermissions.filter(p => !p.adminOnly).map((module) => {
                                    const permissionValue = form.watch(`permissions.${module.id}`);
                                    const canRead = permissionValue === 'read' || permissionValue === 'write';
                                    const canWrite = permissionValue === 'write';

                                    return (
                                        <TableRow key={module.id}>
                                            <TableCell className="font-medium">{module.label}</TableCell>
                                            <TableCell className="text-center">
                                                <Checkbox
                                                    checked={canRead}
                                                    onCheckedChange={() => handlePermissionChange(module.id, 'read')}
                                                    disabled={module.id === 'dashboard'}
                                                />
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Checkbox
                                                    checked={canWrite}
                                                    onCheckedChange={() => handlePermissionChange(module.id, 'write')}
                                                    disabled={module.id === 'dashboard'}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
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
                  <Button type="submit">Salvar Alterações</Button>
              </DialogFooter>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
