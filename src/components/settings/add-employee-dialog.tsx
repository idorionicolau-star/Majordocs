
'use client';

import { useState, useContext } from 'react';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { createUserWithEmail, updateUserProfile } from '@/firebase/auth/auth';
import { useFirestore } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { FirebaseError } from 'firebase/app';

const formSchema = z.object({
  name: z.string().min(2, { message: 'O nome é obrigatório.' }),
  email: z.string().email({ message: 'Por favor, insira um email válido.' }),
  password: z.string().min(6, { message: 'A senha deve ter pelo menos 6 caracteres.' }),
});

type FormValues = z.infer<typeof formSchema>;

interface AddEmployeeDialogProps {
    companyId: string | null;
}

export function AddEmployeeDialog({ companyId }: AddEmployeeDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    if (!firestore || !companyId) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível identificar a sua empresa. Tente novamente.',
      });
      return;
    }
    
    toast({ title: "A criar conta de funcionário..." });

    try {
        const userCredential = await createUserWithEmail(values.email, values.password);
        const user = userCredential.user;

        await updateUserProfile(user, { displayName: values.name });
        
        const userDocRef = doc(firestore, 'users', user.uid);
        await setDoc(userDocRef, {
            name: values.name,
            email: values.email,
            role: 'Employee',
            companyId: companyId,
        });

        toast({ title: "Sucesso!", description: `A conta para ${values.name} foi criada.` });
        form.reset();
        setOpen(false);

    } catch (error) {
        let description = 'Ocorreu um erro desconhecido.';
        if (error instanceof FirebaseError) {
            if (error.code === 'auth/email-already-in-use') {
                description = 'Este email já está a ser utilizado por outra conta.';
            }
        }
        toast({ variant: 'destructive', title: 'Erro ao criar conta', description });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <PlusCircle className="mr-2 h-4 w-4" />
          Adicionar Funcionário
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar Novo Funcionário</DialogTitle>
          <DialogDescription>
            Crie uma conta de acesso para um novo membro da sua equipa.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
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
                    <Input type="email" placeholder="email@exemplo.com" {...field} />
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
                  <FormLabel>Senha Temporária</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className='pt-4'>
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'A adicionar...' : 'Adicionar Funcionário'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
