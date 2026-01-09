
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
import { FirebaseError } from 'firebase/app';
import { doc, setDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
// This is a simplified function. In a real-world scenario, you would use Firebase Admin SDK
// via a Cloud Function to create users to avoid exposing auth-creation logic on the client.
// For this prototype, we'll simulate the creation flow.
async function temp_createUser(email: string, name: string) {
    // This is a placeholder. A real implementation would call a backend function.
    console.log(`Simulating user creation for ${email} with name ${name}`);
    // In a real app, this would return a user object with a uid.
    return {
        uid: `simulated_${Date.now()}`,
        email,
        displayName: name,
    };
}


const formSchema = z.object({
  name: z.string().min(2, 'O nome é obrigatório.'),
  email: z.string().email('Email inválido.'),
  role: z.enum(['Employee', 'Admin']),
});

interface AddEmployeeDialogProps {
  companyId: string;
}

export function AddEmployeeDialog({ companyId }: AddEmployeeDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
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
      // Step 1: Simulate creating the auth user.
      // In a real app, you'd call a Cloud Function here that uses the Admin SDK.
      const pseudoUser = await temp_createUser(values.email, values.name);

      // Step 2: Create the user profile in Firestore, linking them to the company.
      const userDocRef = doc(firestore, 'users', pseudoUser.uid);
      await setDoc(userDocRef, {
        name: values.name,
        email: values.email,
        role: values.role,
        companyId: companyId, // The crucial link!
      });

      toast({
        title: 'Funcionário Adicionado!',
        description: `${values.name} foi adicionado à sua empresa.`,
      });

      form.reset();
      setOpen(false);

    } catch (error) {
      let description = 'Ocorreu um erro desconhecido.';
      if (error instanceof FirebaseError) {
        // Handle potential errors from a real backend call
      }
      toast({
        variant: 'destructive',
        title: 'Erro ao Adicionar Funcionário',
        description,
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
            Crie um perfil para um novo membro da equipa. A palavra-passe inicial deverá ser partilhada separadamente.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Completo</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome do funcionário" {...field} />
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
                    <Input type="email" placeholder="email@empresa.com" {...field} />
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

    