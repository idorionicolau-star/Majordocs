
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
import { PlusCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '../ui/checkbox';
import type { User } from '@/lib/types';


const permissionSchema = z.object({
    canSell: z.boolean().default(false),
    canRegisterProduction: z.boolean().default(false),
    canEditInventory: z.boolean().default(false),
    canTransferStock: z.boolean().default(false),
    canViewReports: z.boolean().default(false),
});

const formSchema = z.object({
  name: z.string().min(2, { message: "O nome deve ter pelo menos 2 caracteres." }),
  email: z.string().email({ message: "Por favor, insira um email válido." }),
  password: z.string().min(6, { message: "A senha deve ter pelo menos 6 caracteres." }),
  role: z.enum(["Admin", "Funcionário"]),
  permissions: permissionSchema,
});

type AddUserFormValues = z.infer<typeof formSchema>;

interface AddUserDialogProps {
    onAddUser: (user: AddUserFormValues) => void;
}

const permissionLabels = {
  canSell: 'Vendas',
  canRegisterProduction: 'Produção',
  canEditInventory: 'Inventário',
  canTransferStock: 'Transferências',
  canViewReports: 'Relatórios',
};

function AddUserDialogContent({ onAddUser }: AddUserDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const form = useForm<AddUserFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "Funcionário",
      permissions: {
        canSell: false,
        canRegisterProduction: false,
        canEditInventory: false,
        canTransferStock: false,
        canViewReports: false,
      },
    },
  });

  function onSubmit(values: AddUserFormValues) {
    onAddUser(values);
    toast({
        title: "Convite Enviado",
        description: `Um convite foi enviado para ${values.name} (${values.email}).`,
    })
    form.reset();
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <PlusCircle className="mr-2 h-4 w-4" />
          Convidar Funcionário
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Convidar Novo Funcionário</DialogTitle>
          <DialogDescription>
            Crie uma conta e defina as permissões para um novo membro da equipe.
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
                    <Input placeholder="Nome completo do funcionário" {...field} />
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
                    <Input type="email" placeholder="email.funcionario@exemplo.com" {...field} />
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
                    <Input type="password" placeholder="Senha de acesso inicial" {...field} />
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
                <Button type="submit">Criar Funcionário</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export function AddUserDialog(props: AddUserDialogProps) {
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    return isClient ? <AddUserDialogContent {...props} /> : null;
}

    