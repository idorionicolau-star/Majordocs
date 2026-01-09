
'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { Employee } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

const editEmployeeSchema = z.object({
  username: z.string().min(3, { message: 'O nome de utilizador deve ter pelo menos 3 caracteres.' }),
  password: z.string().min(6, { message: 'A nova senha deve ter pelo menos 6 caracteres.' }).optional().or(z.literal('')),
  role: z.enum(['Admin', 'Employee'], { required_error: 'A função é obrigatória.' }),
});

type EditEmployeeFormValues = z.infer<typeof editEmployeeSchema>;

interface EditEmployeeDialogProps {
  employee: Employee;
  onUpdate: (updatedData: Employee) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditEmployeeDialog({ employee, onUpdate, open, onOpenChange }: EditEmployeeDialogProps) {
  const { toast } = useToast();

  const form = useForm<EditEmployeeFormValues>({
    resolver: zodResolver(editEmployeeSchema),
    defaultValues: {
      username: employee.username,
      password: '',
      role: employee.role,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        username: employee.username,
        password: '',
        role: employee.role,
      });
    }
  }, [open, employee, form]);

  function onSubmit(values: EditEmployeeFormValues) {
    const dataToUpdate: Partial<Employee> = {
        id: employee.id,
        username: values.username,
        role: values.role,
    };
    if (values.password) {
        dataToUpdate.password = values.password;
    }
    
    onUpdate(dataToUpdate as Employee);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Utilizador</DialogTitle>
          <DialogDescription>
            Atualize os dados do utilizador "{employee.username}".
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                    <Input type="password" placeholder="Deixe em branco para não alterar" {...field} />
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
                  <FormLabel>Função</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma função" />
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
            <DialogFooter className="pt-4">
              <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit">Salvar Alterações</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
