
'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import { createUserWithEmail, updateUserProfile } from '@/firebase/auth/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { FirebaseError } from 'firebase/app';

export default function RegisterPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'A base de dados não está pronta. Tente novamente.',
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const userCredential = await createUserWithEmail(email, password);
      const user = userCredential.user;

      await updateUserProfile(user, { displayName: fullName });

      // **LÓGICA DA `companyId` - PASSO 1: CRIAÇÃO DA CONTA-MÃE**
      // Ao criar o perfil do primeiro utilizador (o Admin):
      // 1. A sua `role` é definida como 'Admin'.
      // 2. A `companyId` é definida como o próprio `uid` do utilizador.
      // Isto estabelece este utilizador como o "dono" da empresa.
      const userDocRef = doc(firestore, 'users', user.uid);
      await setDoc(userDocRef, {
        name: fullName,
        email: user.email,
        role: 'Admin',
        companyId: user.uid, 
      });
      
      // **LÓGICA DA `companyId` - PASSO 2: CRIAÇÃO DO DOCUMENTO DA EMPRESA**
      // É criado um documento na coleção `companies` cujo ID é o `uid` do Admin.
      // Todos os dados da empresa (produtos, vendas, etc.) viverão dentro deste documento.
      const companyDocRef = doc(firestore, 'companies', user.uid);
      await setDoc(companyDocRef, {
        name: `Empresa de ${fullName}`,
        ownerId: user.uid,
      });

      router.push('/dashboard');

    } catch (error) {
      let description = 'Ocorreu um erro desconhecido.';
      if (error instanceof FirebaseError) {
        switch (error.code) {
          case 'auth/email-already-in-use':
            description = 'Este email já está a ser utilizado por outra conta.';
            break;
          case 'auth/invalid-email':
            description = 'O formato do email é inválido.';
            break;
          case 'auth/weak-password':
            description = 'A senha é muito fraca. Tente uma mais forte.';
            break;
        }
      }
      toast({
        variant: 'destructive',
        title: 'Erro de Registo',
        description,
      });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col justify-center items-center gap-3 mb-6">
          <Image
            src="/logo.svg"
            alt="MajorStockX Logo"
            width={40}
            height={40}
            className="text-primary"
          />
          <h1 className="text-3xl font-headline font-bold text-primary">
            MajorStockX
          </h1>
        </div>
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-headline">Crie a sua Conta</CardTitle>
            <CardDescription>
              Comece a gerir o seu negócio hoje mesmo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegister} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="full-name">Nome Completo</Label>
                <Input
                  id="full-name"
                  placeholder="Seu nome"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'A registar...' : 'Registar'}
              </Button>
            </form>
          </CardContent>
           <CardFooter className="flex justify-center text-sm">
            <p>
              Já tem uma conta?{' '}
              <Link href="/login" className="font-bold text-primary hover:underline">
                Entrar
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
