
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
import { PlusCircle, ShieldCheck } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { Employee, ModulePermission } from '@/lib/types';
import { allPermissions } from '@/lib/data';
import { Checkbox } from '../ui/checkbox';
import { ScrollArea } from '../ui/scroll-area';


const permissionsEnum = z.enum(allPermissions.map(p => p.id) as [ModulePermission, ...ModulePermission[]]);

const formSchema = z.object({
  username: z.string().min(3, { message: "O nome de utilizador deve ter pelo menos 3 caracteres." }),
  password: z.string().min(6, { message: "A senha deve ter pelo menos 6 caracteres." }),
  role: z.enum(['Admin', 'Employee'], { required_error: "A função é obrigatória." }),
  permissions: z.array(permissionsEnum).optional(),
});


type AddEmployeeFormValues = z.infer<typeof formSchema>;

interface AddEmployeeDialogProps {
  onAddEmployee: (employee: Omit<Employee, 'id' | 'companyId'>) => void;
}

export function AddEmployeeDialog({ onAddEmployee }: AddEmployeeDialogProps) {
  const [open, setOpen] = useState(false);
  
  const form = useForm<AddEmployeeFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password: "",
      role: 'Employee',
      permissions: ['dashboard', 'inventory', 'sales'],
    },
  });

  const role = form.watch('role');

  function onSubmit(values: AddEmployeeFormValues) {
    const employeeData: Omit<Employee, 'id' | 'companyId'> = {
      username: values.username,
      password: values.password,
      role: values.role,
      permissions: role === 'Admin' ? allPermissions.map(p => p.id) : (values.permissions || []),
    };
    onAddEmployee(employeeData);
    form.reset({
        username: "",
        password: "",
        role: 'Employee',
        permissions: ['dashboard', 'inventory', 'sales'],
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
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
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
                <FormField
                  control={form.control}
                  name="permissions"
                  render={() => (
                    <FormItem>
                      <div className="mb-4">
                        <FormLabel className="text-base">Permissões de Acesso</FormLabel>
                        <FormDescription>
                          Selecione quais módulos este funcionário poderá visualizar e editar.
                        </FormDescription>
                      </div>
                      <ScrollArea className="h-48 rounded-md border p-4">
                        <div className="grid grid-cols-2 gap-4">
                          {allPermissions.map((module) => (
                            <FormField
                              key={module.id}
                              control={form.control}
                              name="permissions"
                              render={({ field }) => {
                                return (
                                  <FormItem
                                    key={module.id}
                                    className="flex flex-row items-center space-x-3 space-y-0"
                                  >
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(module.id)}
                                        onCheckedChange={(checked) => {
                                          let updatedPermissions = [...(field.value || [])];
                                          if (checked) {
                                            if (!updatedPermissions.includes('dashboard')) {
                                                updatedPermissions.push('dashboard');
                                            }
                                            updatedPermissions.push(module.id);
                                          } else {
                                            if (module.id !== 'dashboard') {
                                              updatedPermissions = updatedPermissions.filter((value) => value !== module.id);
                                            }
                                          }
                                          return field.onChange(updatedPermissions);
                                        }}
                                        disabled={module.id === 'dashboard'}
                                      />
                                    </FormControl>
                                    <FormLabel className="font-normal cursor-pointer text-sm">
                                      {module.label}
                                    </FormLabel>
                                  </FormItem>
                                );
                              }}
                            />
                          ))}
                        </div>
                      </ScrollArea>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            )}

             {role === 'Admin' && (
                <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 p-4 text-center">
                    <p className="text-sm font-medium text-amber-700 dark:text-amber-300">Administradores têm acesso a todos os módulos.</p>
                </div>
             )}
            <DialogFooter className="pt-4">
                <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="submit">Adicionar Funcionário</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
