
'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { PlusCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { collection, addDoc } from 'firebase/firestore';

const employeeSchema = z.object({
  username: z.string().min(3, { message: 'O nome de utilizador deve ter pelo menos 3 caracteres.' }),
  password: z.string().min(6, { message: 'A senha deve ter pelo menos 6 caracteres.' }),
  role: z.enum(['Admin', 'Employee'], { required_error: 'A função é obrigatória.' }),
});

type EmployeeFormValues = z.infer<typeof employeeSchema>;

interface AddEmployeeDialogProps {
  companyId: string | null;
}

export function AddEmployeeDialog({ companyId }: AddEmployeeDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();

  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      username: '',
      password: '',
      role: 'Employee',
    },
  });

  async function onSubmit(values: EmployeeFormValues) {
    if (!firestore || !companyId) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'A identificação da empresa não foi encontrada. Não é possível adicionar funcionário.',
      });
      return;
    }

    try {
      const employeesCollectionRef = collection(firestore, `companies/${companyId}/employees`);
      
      // In a real app, hash the password using a proper library (e.g., bcrypt) in a Cloud Function.
      // For this prototype, we'll use base64 encoding as a placeholder for "not plain text".
      // THIS IS NOT SECURE FOR PRODUCTION.
      const insecurePassword = btoa(values.password);
      
      await addDoc(employeesCollectionRef, {
        username: values.username,
        password: insecurePassword,
        role: values.role,
      });

      toast({
        title: 'Funcionário Adicionado',
        description: `O utilizador "${values.username}" foi criado com sucesso.`,
      });
      form.reset();
      setOpen(false);

    } catch (error) {
      console.error("Error adding employee: ", error);
      toast({
        variant: 'destructive',
        title: 'Erro ao Adicionar Funcionário',
        description: 'Não foi possível guardar o novo funcionário. Tente novamente.',
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={!companyId}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Adicionar Utilizador
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar Novo Utilizador</DialogTitle>
          <DialogDescription>
            Crie credenciais de login para um novo membro da equipa.
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
                    <Input placeholder="ex: joao.silva" {...field} />
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
              <Button type="submit">Adicionar Utilizador</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
