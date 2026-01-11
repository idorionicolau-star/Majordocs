
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
import { Edit } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { Employee } from '@/lib/types';

const formSchema = z.object({
  username: z.string().min(3, { message: "O nome de utilizador deve ter pelo menos 3 caracteres." }),
  password: z.string().optional(),
  role: z.enum(['Admin', 'Employee'], { required_error: "A função é obrigatória." }),
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
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        username: employee.username,
        password: "",
        role: employee.role,
      });
    }
  }, [open, employee, form]);

  function onSubmit(values: EditEmployeeFormValues) {
    // Validate password only if it's entered
    if (values.password && values.password.length > 0 && values.password.length < 6) {
      form.setError("password", { message: "A nova senha deve ter pelo menos 6 caracteres."});
      return;
    }

    const updatedEmployee: Employee = {
      ...employee,
      username: values.username,
      role: values.role,
    };
    
    // Only include password in update if a new one was provided
    if (values.password && values.password.length >= 6) {
      updatedEmployee.password = values.password;
    } else {
      // Important: if we don't do this, the existing password might be overwritten with undefined
      delete updatedEmployee.password; 
    }
    
    onUpdateEmployee(updatedEmployee);
    setOpen(false);
  }
  
  const displayPassword = (password: string | undefined): string => {
    if (!password) {
      return '';
    }
    try {
      // Try to decode. If it fails, it's not Base64, so return original.
      const decoded = Buffer.from(password, 'base64').toString('utf-8');
      // This check helps detect if the decoded string is garbled binary data.
      if (/[\x00-\x08\x0E-\x1F]/.test(decoded) && decoded !== password) {
          return password; 
      }
      return decoded;
    } catch (e) {
      return password; // Not a base64 string
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Funcionário</DialogTitle>
          <DialogDescription>
            Atualize o nome de utilizador, senha (opcional) e função deste funcionário.
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
                  <FormLabel>Função na Empresa</FormLabel>
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
