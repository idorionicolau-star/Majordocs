
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
import type { User } from '@/lib/types';
import { Checkbox } from '../ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

const permissionSchema = z.object({
    canSell: z.boolean(),
    canRegisterProduction: z.boolean(),
    canEditInventory: z.boolean(),
    canTransferStock: z.boolean(),
    canViewReports: z.boolean(),
});

const formSchema = z.object({
  name: z.string().min(2, { message: "O nome deve ter pelo menos 2 caracteres." }),
  email: z.string().email({ message: "Por favor, insira um email válido." }),
  role: z.enum(["Admin", "Funcionário"]),
  permissions: permissionSchema,
});

type EditUserFormValues = z.infer<typeof formSchema>;

interface EditUserDialogProps {
    user: User;
    onUpdateUser: (userId: string, data: Partial<User>) => void;
}

const permissionLabels = {
  canSell: 'Vendas',
  canRegisterProduction: 'Produção',
  canEditInventory: 'Inventário',
  canTransferStock: 'Transferências',
  canViewReports: 'Relatórios',
};

function EditUserDialogContent({ user, onUpdateUser }: EditUserDialogProps) {
  const [open, setOpen] = useState(false);
  const form = useForm<EditUserFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        name: user.name,
        email: user.email,
        role: user.role,
        permissions: { ...user.permissions },
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: user.name,
        email: user.email,
        role: user.role,
        permissions: { ...user.permissions },
      });
    }
  }, [open, user, form]);

  function onSubmit(values: EditUserFormValues) {
    onUpdateUser(user.id, values);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Edit className="h-4 w-4" />
                    <span className="sr-only">Editar</span>
                </Button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Editar Usuário</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Usuário</DialogTitle>
          <DialogDescription>
            Atualize os dados e permissões do usuário.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl><Input type="email" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Papel</FormLabel>
                   <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um papel" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Admin">Admin</SelectItem>
                      <SelectItem value="Funcionário">Funcionário</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
                <FormLabel>Permissões</FormLabel>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-2 p-4 border rounded-md">
                    {Object.keys(permissionLabels).map((key) => (
                        <FormField
                        key={key}
                        control={form.control}
                        name={`permissions.${key as keyof typeof permissionLabels}`}
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                <FormControl>
                                    <Checkbox
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                    />
                                </FormControl>
                                <FormLabel className="text-sm font-normal">
                                    {permissionLabels[key as keyof typeof permissionLabels]}
                                </FormLabel>
                            </FormItem>
                        )}
                        />
                    ))}
                </div>
            </div>
            
            <DialogFooter>
                <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="submit">Salvar Alterações</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export function EditUserDialog(props: EditUserDialogProps) {
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    return isClient ? <EditUserDialogContent {...props} /> : (
        <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
            <Edit className="h-4 w-4" />
            <span className="sr-only">Editar</span>
        </Button>
    );
}
