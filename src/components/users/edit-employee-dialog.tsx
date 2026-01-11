
"use client"

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
import { Edit, ShieldCheck } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { Employee, ModulePermission } from '@/lib/types';
import { allPermissions } from '@/lib/data';
import { Switch } from '../ui/switch';

const formSchema = z.object({
  username: z.string().min(3, { message: "O nome de utilizador deve ter pelo menos 3 caracteres." }),
  password: z.string().optional(),
  role: z.enum(['Admin', 'Employee'], { required_error: "A função é obrigatória." }),
  permissions: z.array(z.nativeEnum(allPermissions.reduce((acc, p) => ({...acc, [p.id]: p.id}), {} as Record<ModulePermission, ModulePermission>))).optional(),
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
      password: "",
      role: employee.role,
      permissions: employee.permissions || [],
    },
  });
  
  const role = form.watch('role');

  useEffect(() => {
    if (open) {
      form.reset({
        username: employee.username,
        password: "",
        role: employee.role,
        permissions: employee.permissions || [],
      });
    }
  }, [open, employee, form]);

  function onSubmit(values: EditEmployeeFormValues) {
    if (values.password && values.password.length > 0 && values.password.length < 6) {
      form.setError("password", { message: "A nova senha deve ter pelo menos 6 caracteres."});
      return;
    }

    const updatedEmployee: Employee = {
      ...employee,
      username: values.username,
      role: values.role,
      permissions: role === 'Admin' ? allPermissions.map(p => p.id) : (values.permissions || []),
    };
    
    if (values.password && values.password.length >= 6) {
      updatedEmployee.password = values.password;
    } else {
      delete updatedEmployee.password; 
    }
    
    onUpdateEmployee(updatedEmployee);
    setOpen(false);
  }
  
  const displayPassword = (password?: string): string => {
    if (!password) return '';
    try {
      return Buffer.from(password, 'base64').toString('utf-8');
    } catch (e) {
      return password; 
    }
  };
  
  const currentPassword = displayPassword(employee.password);


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
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
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
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nova Senha (Opcional)</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} placeholder="Deixar em branco para manter a atual" />
                  </FormControl>
                   {currentPassword && <p className="text-xs text-muted-foreground">Senha atual: {currentPassword}</p>}
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
                <div className="space-y-4 rounded-lg border p-4">
                   <div className='flex items-center gap-2'>
                    <ShieldCheck className="h-5 w-5 text-primary" />
                    <h3 className="text-md font-semibold">Permissões do Módulo</h3>
                  </div>
                    <div className="grid grid-cols-2 gap-4">
                        {allPermissions.filter(p => !p.adminOnly).map((permission) => (
                           <Controller
                                key={permission.id}
                                name="permissions"
                                control={form.control}
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                        <FormLabel className="text-sm font-normal">{permission.label}</FormLabel>
                                        <FormControl>
                                            <Switch
                                                checked={field.value?.includes(permission.id)}
                                                onCheckedChange={(checked) => {
                                                    const newPermissions = checked
                                                        ? [...(field.value || []), permission.id]
                                                        : (field.value || []).filter((id) => id !== permission.id);
                                                    field.onChange(newPermissions);
                                                }}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        ))}
                    </div>
                </div>
            )}
            {role === 'Admin' && (
                <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 p-4 text-center">
                    <p className="text-sm font-medium text-amber-700 dark:text-amber-300">Administradores têm acesso a todos os módulos.</p>
                </div>
             )}

            <DialogFooter className="pt-4">
                <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="submit">Salvar Alterações</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
