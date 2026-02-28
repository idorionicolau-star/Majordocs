
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const registerSchema = z.object({
  companyName: z.string().min(3, 'O nome da empresa deve ter pelo menos 3 caracteres.').refine(s => !s.includes('@'), 'O nome da empresa não pode conter "@".'),
  adminUsername: z.string().min(3, 'O nome de utilizador deve ter pelo menos 3 caracteres.').refine(s => !s.includes('@'), 'O nome de utilizador não pode conter "@".'),
  adminEmail: z.string().email("O email do administrador não é válido."),
  adminPassword: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres.'),
  businessType: z.enum(['manufacturer', 'reseller'], { required_error: 'Por favor, selecione o tipo de negócio.' }),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const context = useContext(InventoryContext);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      businessType: 'manufacturer',
    }
  });
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = form;

  const companyName = watch('companyName');
  const adminUsername = watch('adminUsername');

  const handleRegister = async (data: RegisterFormValues) => {
    setIsLoading(true);
    if (!context?.registerCompany) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Função de registo não disponível.' });
      setIsLoading(false);
      return;
    }

    try {
      const success = await context.registerCompany(data.companyName, data.adminUsername, data.adminEmail, data.adminPassword, data.businessType);
      if (success) {
        toast({
          title: 'Empresa Registada com Sucesso!',
          description: `A fazer login com a conta "${data.adminEmail}"...`,
        });
        // The onAuthStateChanged listener in context will handle redirection to the dashboard
      }
    } catch (error: any) {
      // The toast for the error is already handled inside the registerCompany function
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleRegister = async (e: React.MouseEvent) => {
    e.preventDefault();
    setIsGoogleLoading(true);

    if (!context?.registerCompanyWithGoogle) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Função de registo com Google não disponível.' });
      setIsGoogleLoading(false);
      return;
    }

    // Validate only companyName and businessType
    const isCompanyValid = await form.trigger(['companyName', 'businessType']);
    if (!isCompanyValid) {
      toast({ variant: 'destructive', title: 'Campos obrigatórios', description: 'Preencha o Nome da Empresa e Tipo de Negócio antes de continuar com o Google.' });
      setIsGoogleLoading(false);
      return;
    }

    const currentCompanyName = form.getValues('companyName');
    const currentBusinessType = form.getValues('businessType');

    try {
      const success = await context.registerCompanyWithGoogle(currentCompanyName, currentBusinessType);
      if (success) {
        toast({
          title: 'Empresa Registada com Sucesso!',
          description: `A sua conta Google foi associada à empresa. A redirecionar...`,
        });
        // dashboard redirect handled by auth state change
      }
    } catch (error: any) {
      // Error handled in context
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900 px-4 py-8">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Image src="/logo.svg" alt="MajorStockX Logo" width={48} height={48} />
          </div>
          <CardTitle className="text-2xl font-bold">Crie a sua Conta</CardTitle>
          <CardDescription>Registe a sua empresa para começar a usar o MajorStockX.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={handleSubmit(handleRegister)} className="space-y-4">
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <Label htmlFor="companyName">Nome da Empresa</Label>
                    <Input id="companyName" {...field} placeholder="O nome da sua empresa" />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="businessType"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <Label>Qual é o seu tipo de negócio?</Label>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-2 pt-2"
                      >
                        <FormItem className="flex items-center space-x-3 space-y-0 p-4 border rounded-2xl has-[[data-state=checked]]:border-primary">
                          <FormControl>
                            <RadioGroupItem value="manufacturer" />
                          </FormControl>
                          <div>
                            <FormLabel className="font-bold cursor-pointer">
                              Fábrica / Produtor
                            </FormLabel>
                            <p className="text-xs text-muted-foreground">Eu fabrico os meus próprios produtos.</p>
                          </div>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0 p-4 border rounded-2xl has-[[data-state=checked]]:border-primary">
                          <FormControl>
                            <RadioGroupItem value="reseller" />
                          </FormControl>
                          <div>
                            <FormLabel className="font-normal cursor-pointer">
                              Loja / Revendedor
                            </FormLabel>
                            <p className="text-xs text-muted-foreground">Eu compro produtos para revender.</p>
                          </div>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="adminUsername"
                render={({ field }) => (
                  <FormItem>
                    <Label htmlFor="adminUsername">Nome de Utilizador do Administrador</Label>
                    <Input id="adminUsername" {...field} placeholder="Ex: admin" />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="adminEmail"
                render={({ field }) => (
                  <FormItem>
                    <Label htmlFor="adminEmail">Email do Administrador</Label>
                    <Input id="adminEmail" {...field} placeholder="Ex: admin@suaempresa.com" type="email" />
                    <p className="text-[11px] text-muted-foreground bg-muted p-2 rounded-md">
                      Se usar o Registo com o Google, o email manual será ignorado.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="adminPassword"
                render={({ field }) => (
                  <FormItem>
                    <Label htmlFor="adminPassword">Senha do Administrador</Label>
                    <Input id="adminPassword" type={showPassword ? 'text' : 'password'} {...field} placeholder="Crie uma senha segura" />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex items-center space-x-2">
                <Checkbox id="show-password" checked={showPassword} onCheckedChange={(checked) => setShowPassword(!!checked)} />
                <label
                  htmlFor="show-password"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Mostrar senha
                </label>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading || isGoogleLoading}>
                {isLoading ? 'A registar...' : 'Registar Manualmente'}
              </Button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Ou continuar com</span>
                </div>
              </div>

              <Button
                variant="outline"
                type="button"
                disabled={isLoading || isGoogleLoading}
                onClick={handleGoogleRegister}
                className="w-full bg-white text-black hover:bg-gray-100 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
              >
                {isGoogleLoading ? (
                  'A autenticar...'
                ) : (
                  <>
                    <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                      <path d="M1 1h22v22H1z" fill="none" />
                    </svg>
                    Registar com o Google
                  </>
                )}
              </Button>

            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex justify-center text-sm">
          <p className="text-muted-foreground">
            Já tem uma conta? <Link href="/login" className="text-primary hover:underline">Faça login.</Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
