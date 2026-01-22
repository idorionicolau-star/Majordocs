
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
                              Este será o seu email para fazer login no sistema.
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
                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? 'A registar...' : 'Registar Empresa'}
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
