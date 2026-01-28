
'use client';

import { useState, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { InventoryContext } from '@/context/inventory-context';
import Image from 'next/image';
import Link from 'next/link';
import { Checkbox } from '@/components/ui/checkbox';
import { Info } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';


const loginSchema = z.object({
  email: z.string().email('O email fornecido não é válido.'),
  password: z.string().min(1, 'A senha é obrigatória.'),
});

type LoginFormValues = z.infer<typeof loginSchema>;


export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { login } = useContext(InventoryContext) || {};
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const handleLogin = async (data: LoginFormValues) => {
    setIsLoading(true);
    if (!login) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Serviço de autenticação indisponível.' });
      setIsLoading(false);
      return;
    }
    try {
      const success = await login(data.email, data.password);
      if (success) {
        toast({
          title: 'Login bem-sucedido!',
          description: 'A redirecionar para o dashboard...',
        });
        router.push('/dashboard');
      }
    } catch (error: any) {
      // Errors are toasted within the login function in the context
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Image src="/logo.svg" alt="MajorStockX Logo" width={48} height={48} />
          </div>
          <CardTitle className="text-2xl font-bold">Bem-vindo de volta!</CardTitle>
          <CardDescription>Faça login para aceder ao MajorStockX.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <form onSubmit={handleSubmit(handleLogin)} className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="email">Email de Login</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button type="button" className="p-1 rounded-full hover:bg-muted" aria-label="Ajuda sobre o formato do email">
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 max-w-xs" side="top" align="end">
                      <div className="p-3 text-xs space-y-2">
                        <p className="font-bold">Formato do Email de Login</p>
                        <p><strong className="text-primary">Admin:</strong> Use o email completo do registo (ex: `admin@empresa.com`).</p>
                        <p><strong className="text-primary">Funcionário:</strong> Use o formato `utilizador@nome-da-empresa.com`.</p>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                <Input id="email" {...register('email')} placeholder="ex: admin@suaempresa.com" type="email" />
                {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Senha</Label>
                  <ForgotPasswordDialog />
                </div>
                <Input id="password" type={showPassword ? 'text' : 'password'} {...register('password')} placeholder="A sua senha" />
                {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="show-password" checked={showPassword} onCheckedChange={(checked) => setShowPassword(!!checked)} />
                <label
                  htmlFor="show-password"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Mostrar senha
                </label>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'A entrar...' : 'Entrar'}
              </Button>
            </form>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center text-sm">
          <p className="text-muted-foreground">
            Não tem uma conta? <Link href="/register" className="text-primary hover:underline">Crie uma aqui.</Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

function ForgotPasswordDialog() {
  const { resetPassword } = useContext(InventoryContext) || {};
  const [email, setEmail] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPassword || !email) return;

    setIsLoading(true);
    try {
      await resetPassword(email);
      setIsOpen(false);
    } catch (error) {
      // Error is handled in the context with a toast
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="link" className="px-0 font-normal h-auto text-xs text-primary underline-offset-4 hover:underline">
          Esqueceu a senha?
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Recuperar Senha</DialogTitle>
          <DialogDescription>
            Insira o seu e-mail para receber um link de redefinição de senha.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleReset} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reset-email">E-mail</Label>
            <Input
              id="reset-email"
              type="email"
              placeholder="ex: voce@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? 'A enviar...' : 'Enviar Link'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
