
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
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from '@/hooks/use-toast';
import type { User } from '@/lib/types';

const formSchema = z.object({
  name: z.string().min(2, { message: "O nome deve ter pelo menos 2 caracteres." }),
  email: z.string().email({ message: "Por favor, insira um email válido." }),
  role: z.enum(["Admin", "Funcionário"]),
  password: z.string().min(6, { message: "A senha deve ter pelo menos 6 caracteres." }).optional().or(z.literal('')),
  permissions: z.object({
    canSell: z.boolean(),
    canRegisterProduction: z.boolean(),
    canEditInventory: z.boolean(),
    canTransferStock: z.boolean(),
    canViewReports: z.boolean(),
  })
});

type EditUserFormValues = z.infer<typeof formSchema>;

interface EditUserDialogProps {
  user: User;
  onUpdateUser: (userId: string, data: Partial<User>) => void;
  children: React.ReactNode;
}

const permissionLabels: Record<keyof User['permissions'], string> = {
    canSell: "Realizar vendas",
    canRegisterProduction: "Registrar produção",
    canEditInventory: "Editar inventário",
    canTransferStock: "Transferir estoque",
    canViewReports: "Ver relatórios",
}

export function EditUserDialog({ user, onUpdateUser, children }: EditUserDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<EditUserFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: user.name,
      email: user.email,
      role: user.role,
      password: "",
      permissions: user.permissions,
    },
  });

  function onSubmit(values: EditUserFormValues) {
    const dataToUpdate: Partial<User> = {
        name: values.name,
        email: values.email,
        role: values.role,
        permissions: values.permissions,
    };
    if (values.password) {
        // In a real app, you would hash the password before saving
        console.log("Password change requested. This should be handled securely.");
    }

    onUpdateUser(user.id, dataToUpdate);
    toast({
      title: "Usuário atualizado",
      description: `Os dados de ${values.name} foram atualizados com sucesso.`,
    });
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
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
                  <FormControl>
                    <Input placeholder="Nome completo" {...field} />
                  </FormControl>
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
                  <FormControl>
                    <Input type="email" placeholder="email@exemplo.com" {...field} />
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
             <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nova Senha</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Deixe em branco para não alterar" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="space-y-2">
                <FormLabel>Permissões</FormLabel>
                <FormDescription>Selecione as ações que este usuário pode realizar.</FormDescription>
                <div className="grid gap-2">
                {Object.keys(user.permissions).map((key) => (
                    <FormField
                    key={key}
                    control={form.control}
                    name={`permissions.${key as keyof User['permissions']}`}
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3">
                        <FormControl>
                            <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                            />
                        </FormControl>
                        <FormLabel className="font-normal">
                            {permissionLabels[key as keyof User['permissions']]}
                        </FormLabel>
                        </FormItem>
                    )}
                    />
                ))}
                </div>
            </div>

            <DialogFooter className="mt-4">
                <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="submit">Salvar Alterações</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
