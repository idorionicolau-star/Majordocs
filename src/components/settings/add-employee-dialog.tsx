
"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
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
} from "@/components/ui/select";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle } from 'lucide-react';
import { useFirestore } from '@/firebase';
import { collection, addDoc } from 'firebase/firestore';

const formSchema = z.object({
  username: z.string().min(3, 'O username deve ter pelo menos 3 caracteres.'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres.'),
  role: z.enum(['Employee', 'Admin']),
});

interface AddEmployeeDialogProps {
  companyId: string;
}

export function AddEmployeeDialog({ companyId }: AddEmployeeDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: '',
      password: '',
      role: 'Employee' as 'Employee' | 'Admin',
    },
  });

  const { isSubmitting } = form.formState;

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!firestore) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Base de dados indisponível. Tente novamente.',
      });
      return;
    }

    try {
      const employeesCollectionRef = collection(firestore, `companies/${companyId}/employees`);
      
      // NOTA DE SEGURANÇA: Num ambiente de produção, a senha nunca deve ser armazenada
      // em texto simples. Utilizaríamos uma Cloud Function para gerar um hash seguro (ex: bcrypt)
      // antes de guardar. Para este protótipo, guardamos a senha em base64 como um placeholder.
      const encodedPassword = btoa(values.password);

      await addDoc(employeesCollectionRef, {
        username: values.username,
        password: encodedPassword,
        role: values.role,
      });

      toast({
        title: 'Funcionário Adicionado!',
        description: `O utilizador ${values.username} foi criado com sucesso.`,
      });

      form.reset();
      setOpen(false);

    } catch (error) {
      console.error("Error adding employee: ", error);
      toast({
        variant: 'destructive',
        title: 'Erro ao Adicionar Funcionário',
        description: 'Não foi possível criar o novo utilizador.',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={!companyId}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Adicionar Funcionário
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Adicionar Novo Funcionário</DialogTitle>
          <DialogDescription>
            Crie um utilizador e senha para um novo membro da equipa.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
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
                    <Input type="password" placeholder="••••••••" {...field} />
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
                <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'A adicionar...' : 'Adicionar Funcionário'}
                </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
