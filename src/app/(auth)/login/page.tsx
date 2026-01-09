
'use client';

import { useState } from 'react';
import Image from 'next/image';
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
import { signInWithGoogle, signInWithEmail } from '@/firebase/auth/auth';
import { useToast } from '@/hooks/use-toast';
import { FirebaseError } from 'firebase/app';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // For now, we keep Google Sign-In for the main admin/company owner
  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
      router.push('/');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro de Login',
        description: 'Não foi possível fazer login com o Google.',
      });
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // This function will now handle both admin email login and employee username login
      await signInWithEmail(email, password);
      router.push('/');
    } catch (error) {
       let description = 'Ocorreu um erro desconhecido.';
       if (error instanceof FirebaseError) {
         switch (error.code) {
            case 'auth/user-not-found':
              description = 'Nenhum utilizador encontrado com este email.';
              break;
            case 'auth/wrong-password':
              description = 'A senha está incorreta. Tente novamente.';
              break;
            case 'auth/invalid-email':
                description = 'O formato do email é inválido.';
                break;
            // Custom error code from our new login logic
            case 'auth/custom-user-not-found':
              description = 'Utilizador ou senha inválidos.';
              break;
            default:
              description = 'Não foi possível fazer login. Verifique as suas credenciais.';
          }
       } else if (error instanceof Error) {
           description = error.message;
       }
        toast({
            variant: 'destructive',
            title: 'Erro de Login',
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
            <CardTitle className="text-2xl font-headline">Bem-vindo!</CardTitle>
            <CardDescription>
              Insira as suas credenciais para aceder à sua conta.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleEmailSignIn} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email ou Utilizador</Label>
                <Input
                  id="email"
                  type="text"
                  placeholder="seu@email.com ou utilizador"
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
                {isSubmitting ? 'A entrar...' : 'Entrar'}
              </Button>
            </form>
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Ou para administradores
                </span>
              </div>
            </div>
             <Button variant="outline" className="w-full" onClick={handleGoogleSignIn}>
                Entrar com Google
            </Button>
          </CardContent>
          <CardFooter className="flex justify-center text-sm">
            <p>
              Não tem uma conta de administrador?{' '}
              <Link href="/register" className="font-bold text-primary hover:underline">
                Registe a sua empresa
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
