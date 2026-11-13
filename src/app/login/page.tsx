'use client';

import { haul } from '@/lib/haul';
import { useState, useContext, useEffect, useRef } from 'react';
import { emailLink, SUPPORT, whatsappLink } from "@/lib/support";
import { useRouter, useSearchParams } from 'next/navigation';
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
import {
  Info,
  Building2,
  Lock,
  Mail,
  ArrowRight,
  CheckCircle2,
  LogIn,
  UserPlus,
} from 'lucide-react';
import { enterGuestMode, applyServerRemaining } from '@/lib/guest-mode';
import { guestTrialStart } from '@/lib/guest-trial-client';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { deriveUsername } from '@/lib/onboarding';
import { savePendingCoupon, PENDING_COUPON_KEY } from '@/components/billing/pending-coupon';
import { saveOrigin } from '@/components/billing/escalepay-claim';
import { ESCALEPAY_SOURCE } from '@/lib/escalepay-core';

// --- Schemas de validação ---

const loginSchema = z.object({
  email: z.string().email('O email fornecido não é válido.'),
  password: z.string().min(1, 'A senha é obrigatória.'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const registerSchema = z.object({
  companyName: z
    .string()
    .min(3, 'O nome da empresa deve ter pelo menos 3 caracteres.')
    .refine((s) => !s.includes('@'), 'O nome da empresa não pode conter "@".'),
  adminUsername: z.string().optional(),
  adminEmail: z.string().email('O email do administrador não é válido.'),
  adminPassword: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres.'),
  businessType: z.enum(['manufacturer', 'reseller'], {
    required_error: 'Por favor, selecione o tipo de negócio.',
  }),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

// Ícone oficial Google SVG limpo
function GoogleIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
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
  );
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const context = useContext(InventoryContext);
  const { login, loginWithGoogle, registerCompany, registerCompanyWithGoogle } = context || {};

  // Aba ativa: 'login' ou 'register'
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

  // Estados de loading
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [isLoginGoogleLoading, setIsLoginGoogleLoading] = useState(false);
  const [isRegisterLoading, setIsRegisterLoading] = useState(false);
  const [isRegisterGoogleLoading, setIsRegisterGoogleLoading] = useState(false);
  const [isGuestLoading, setIsGuestLoading] = useState(false);

  // Visibilidade de senhas
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);

  // Ref para foco no campo de nome da empresa
  const companyNameInputRef = useRef<HTMLInputElement | null>(null);

  // Parâmetros especiais (convite, escalepay, google)
  const [inviteCode, setInviteCode] = useState('');
  const [fromEscalepay, setFromEscalepay] = useState(false);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'register' || searchParams.get('google') === '1') {
      setActiveTab('register');
    }

    const c = searchParams.get('codigo') || searchParams.get('convite') || searchParams.get('cupao') || searchParams.get('code');
    if (c) setInviteCode(c.trim().toUpperCase());

    if ((searchParams.get('origem') || '').toLowerCase() === ESCALEPAY_SOURCE) {
      setFromEscalepay(true);
      saveOrigin(ESCALEPAY_SOURCE);
    }
  }, [searchParams]);

  const keepInvite = () => savePendingCoupon(inviteCode);
  const dropInvite = () => {
    try {
      localStorage.removeItem(PENDING_COUPON_KEY);
    } catch {
      /* ignore */
    }
  };

  // Forms
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      companyName: '',
      adminEmail: '',
      adminPassword: '',
      businessType: 'manufacturer',
    },
    mode: 'onTouched',
  });

  // --- Fluxo Convidado ---
  const handleGuestLogin = async () => {
    setIsGuestLoading(true);
    const reply = await guestTrialStart();
    if (reply?.tracked && !reply.allowed) {
      setIsGuestLoading(false);
      toast({
        variant: 'destructive',
        title: reply.reason === 'network' ? 'Testes a mais nesta rede' : 'Tempo de teste esgotado',
        description:
          reply.reason === 'network'
            ? 'Esta rede já abriu muitos testes. Crie a sua conta para continuar.'
            : 'Os 30 minutos de teste já foram usados neste aparelho. Crie a sua conta para continuar.',
      });
      return;
    }
    if (reply?.tracked) applyServerRemaining(reply.remainingMs);
    if (!enterGuestMode()) {
      setIsGuestLoading(false);
      toast({
        variant: 'destructive',
        title: 'Tempo de teste esgotado',
        description: 'Os 30 minutos de teste já foram usados neste aparelho. Crie a sua conta para continuar.',
      });
      return;
    }
    toast({
      title: 'Modo Convidado Activado!',
      description: 'A entrar com dados completos de demonstração dos últimos 30 dias...',
    });
    router.push('/dashboard');
  };

  // --- Fluxo Login Manual ---
  const handleLoginSubmit = async (data: LoginFormValues) => {
    setIsLoginLoading(true);
    if (!login) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Serviço de autenticação indisponível.' });
      setIsLoginLoading(false);
      return;
    }
    try {
      const success = await haul('auth', 'A entrar…', 'Bem-vindo', async () => {
        const ok = await login(data.email, data.password);
        if (!ok) throw new Error('login');
        return ok;
      }).catch(() => false);
      if (success) {
        toast({
          title: 'Login bem-sucedido!',
          description: 'A redirecionar para o dashboard...',
        });
        router.push('/dashboard');
      }
    } catch {
      // Erro tratado pelo toast do context
    } finally {
      setIsLoginLoading(false);
    }
  };

  // --- Fluxo Google na aba "Iniciar Sessão" ---
  // REGRA: Apenas utilizadores que JÁ possuem registo no Firestore podem entrar aqui.
  // Se não tiver empresa/registo:
  // a) signOut imediato é garantido em auth-actions.ts;
  // b) Apresentar toast orientando a criar conta;
  // c) Comutar para a aba "Criar Conta";
  // d) Foco no campo do Nome da Empresa.
  const handleGoogleLogin = async () => {
    setIsLoginGoogleLoading(true);
    if (!loginWithGoogle) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Serviço de autenticação com Google indisponível.' });
      setIsLoginGoogleLoading(false);
      return;
    }
    try {
      const result = await loginWithGoogle();

      if (result && typeof result === 'object' && 'noCompany' in result) {
        // Usuário autenticou no Google mas não tem registo/empresa no Firestore
        toast({
          variant: 'destructive',
          title: 'Empresa não encontrada',
          description: 'Esta conta Google ainda não tem uma empresa registada. Por favor, crie a sua conta na aba Criar Conta.',
          duration: 7000,
        });

        // Se houver email retornado pelo Google, preenche no form de registo
        if (result.noCompany) {
          registerForm.setValue('adminEmail', result.noCompany);
        }

        // Comuta automaticamente para a aba "Criar Conta"
        setActiveTab('register');

        // Aplica foco imediato no campo do Nome da Empresa
        setTimeout(() => {
          companyNameInputRef.current?.focus();
        }, 150);
        return;
      }

      if (result === true) {
        toast({
          title: 'Login com Google bem-sucedido!',
          description: 'A redirecionar para o dashboard...',
        });
        router.push('/dashboard');
      }
    } catch (error: any) {
      console.error('Google login error:', error);
    } finally {
      setIsLoginGoogleLoading(false);
    }
  };

  // --- Fluxo Registo Manual ---
  const handleRegisterSubmit = async (data: RegisterFormValues) => {
    setIsRegisterLoading(true);
    if (!registerCompany) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Função de registo não disponível.' });
      setIsRegisterLoading(false);
      return;
    }

    keepInvite();
    try {
      const success = await haul('auth', 'A criar a sua empresa…', 'Empresa criada', async () => {
        const r = await registerCompany(
          data.companyName,
          data.adminUsername?.trim() || deriveUsername(data.adminEmail),
          data.adminEmail,
          data.adminPassword,
          data.businessType
        );
        if (!r) throw new Error('registo');
        return r;
      }).catch(() => false as const);

      if (success === 'existing') {
        dropInvite();
        toast({ title: 'Já tinha conta', description: 'Este email já tinha uma empresa — a entrar nela…' });
      } else if (success) {
        toast({
          title: 'Empresa Registada com Sucesso!',
          description: `A fazer login com a conta "${data.adminEmail}"...`,
        });
      } else {
        dropInvite();
      }
    } catch {
      dropInvite();
    } finally {
      setIsRegisterLoading(false);
    }
  };

  // --- Fluxo Google na aba "Criar Conta" ---
  // REGRA: O utilizador DEVE preencher o Nome da Empresa (>=3 caracteres, sem '@') ANTES de clicar.
  // Gravação atómica no Firestore antes de libertar a sessão e navegar direto para /dashboard.
  const handleGoogleRegister = async (e: React.MouseEvent) => {
    e.preventDefault();

    // Validação estrita do Nome da Empresa
    const currentCompanyName = registerForm.getValues('companyName')?.trim() || '';
    const currentBusinessType = registerForm.getValues('businessType');

    if (!currentCompanyName || currentCompanyName.length < 3 || currentCompanyName.includes('@')) {
      registerForm.setError('companyName', {
        type: 'manual',
        message: currentCompanyName.includes('@')
          ? 'O nome da empresa não pode conter "@".'
          : 'Preencha o Nome da Empresa (mínimo de 3 caracteres) antes de continuar com o Google.',
      });
      toast({
        variant: 'destructive',
        title: 'Nome da empresa obrigatório',
        description: 'Por favor, preencha o Nome da Empresa antes de criar a sua conta com o Google.',
      });
      companyNameInputRef.current?.focus();
      return;
    }

    setIsRegisterGoogleLoading(true);

    if (!registerCompanyWithGoogle) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Função de registo com Google não disponível.' });
      setIsRegisterGoogleLoading(false);
      return;
    }

    keepInvite();
    try {
      const success = await registerCompanyWithGoogle(currentCompanyName, currentBusinessType);
      if (!success) {
        dropInvite();
        return;
      }

      toast({
        title: 'Empresa Criada com Sucesso!',
        description: 'A sua conta Google foi configurada com sucesso. A entrar no dashboard...',
      });
      router.push('/dashboard');
    } catch (error: any) {
      console.error('Google register error:', error);
      dropInvite();
    } finally {
      setIsRegisterGoogleLoading(false);
    }
  };

  const isAnyLoading =
    isLoginLoading || isLoginGoogleLoading || isRegisterLoading || isRegisterGoogleLoading || isGuestLoading;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900 px-4 py-8">
      <Card className="w-full max-w-md shadow-xl border-border/60">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-3">
            <Image src="/logo.svg" alt="MajorStockX Logo" width={52} height={52} priority />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">MajorStockX</CardTitle>
          <CardDescription>Gestão e controlo de stock para materiais de construção</CardDescription>
        </CardHeader>

        <CardContent className="pt-0">
          <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as 'login' | 'register')} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 h-11 p-1 bg-muted/80 rounded-xl">
              <TabsTrigger
                value="login"
                className="flex items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
              >
                <LogIn className="h-4 w-4" />
                Iniciar Sessão
              </TabsTrigger>
              <TabsTrigger
                value="register"
                className="flex items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
              >
                <UserPlus className="h-4 w-4" />
                Criar Conta
              </TabsTrigger>
            </TabsList>

            {/* ============================================================== */}
            {/* ABA 1: INICIAR SESSÃO                                          */}
            {/* ============================================================== */}
            <TabsContent value="login" className="space-y-4 focus-visible:outline-none">
              <form onSubmit={loginForm.handleSubmit(handleLoginSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="login-email">Email de Login</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="p-1 rounded-full hover:bg-muted"
                          aria-label="Ajuda sobre o formato do email"
                        >
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 max-w-xs" side="top" align="end">
                        <div className="p-3 text-xs space-y-2">
                          <p className="font-bold">Formato do Email de Login</p>
                          <p>
                            <strong className="text-primary">Admin:</strong> Use o email completo do registo (ex:{' '}
                            <code>admin@empresa.com</code>).
                          </p>
                          <p>
                            <strong className="text-primary">Funcionário:</strong> Use o formato{' '}
                            <code>utilizador@nome-da-empresa.com</code>.
                          </p>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="login-email"
                      {...loginForm.register('email')}
                      placeholder="ex: admin@suaempresa.com"
                      type="email"
                      className="pl-9"
                    />
                  </div>
                  {loginForm.formState.errors.email && (
                    <p className="text-xs text-red-500">{loginForm.formState.errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="login-password">Senha</Label>
                    <ForgotPasswordDialog />
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="login-password"
                      type={showLoginPassword ? 'text' : 'password'}
                      {...loginForm.register('password')}
                      placeholder="A sua senha"
                      className="pl-9"
                    />
                  </div>
                  {loginForm.formState.errors.password && (
                    <p className="text-xs text-red-500">{loginForm.formState.errors.password.message}</p>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="show-login-password"
                    checked={showLoginPassword}
                    onCheckedChange={(checked) => setShowLoginPassword(!!checked)}
                  />
                  <label
                    htmlFor="show-login-password"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Mostrar senha
                  </label>
                </div>

                <Button type="submit" className="w-full font-semibold" disabled={isAnyLoading}>
                  {isLoginLoading ? 'A entrar...' : 'Entrar com Email'}
                </Button>
              </form>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Ou continuar com</span>
                </div>
              </div>

              {/* Botão específico da Aba de Login: NÃO CRIA CONTA NOVA */}
              <Button
                variant="outline"
                type="button"
                disabled={isAnyLoading}
                onClick={handleGoogleLogin}
                className="w-full font-medium bg-white text-black hover:bg-gray-50 border-gray-300 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800 dark:border-zinc-700"
              >
                {isLoginGoogleLoading ? (
                  'A verificar conta...'
                ) : (
                  <>
                    <GoogleIcon className="mr-2 h-5 w-5" />
                    Continuar com o Google
                  </>
                )}
              </Button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Sem conta de acesso?</span>
                </div>
              </div>

              {/* Modo Convidado limpo e sem ícones de IA */}
              <Button
                type="button"
                disabled={isAnyLoading}
                onClick={handleGuestLogin}
                variant="outline"
                className="h-auto w-full rounded-xl border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 p-3 transition-colors text-foreground"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-3 text-left">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold leading-tight">
                        {isGuestLoading ? 'A carregar ambiente...' : 'Experimentar como Convidado'}
                      </p>
                      <p className="text-xs text-muted-foreground">30 min de teste com dados reais de exemplo</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Button>
            </TabsContent>

            {/* ============================================================== */}
            {/* ABA 2: CRIAR CONTA                                             */}
            {/* ============================================================== */}
            <TabsContent value="register" className="space-y-4 focus-visible:outline-none">
              {fromEscalepay && (
                <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm">
                  <p className="font-semibold text-emerald-700 dark:text-emerald-400">Comprou na EscalePay? 🎉</p>
                  <p className="mt-1 text-muted-foreground">
                    Registe-se com o <b className="text-foreground">mesmo email da compra</b>. A conta fica activa sozinha assim que a compra for confirmada.
                  </p>
                </div>
              )}

              <Form {...registerForm}>
                <form onSubmit={registerForm.handleSubmit(handleRegisterSubmit)} className="space-y-4">
                  {/* Nome da Empresa com ref para foco automático */}
                  <FormField
                    control={registerForm.control}
                    name="companyName"
                    render={({ field }) => (
                      <FormItem>
                        <Label htmlFor="reg-companyName" className="font-semibold flex items-center gap-1.5">
                          <Building2 className="h-4 w-4 text-primary" />
                          Nome da Empresa <span className="text-red-500">*</span>
                        </Label>
                        <FormControl>
                          <Input
                            id="reg-companyName"
                            placeholder="Ex: Cerâmica Progresso Lda"
                            {...field}
                            ref={(e) => {
                              field.ref(e);
                              companyNameInputRef.current = e;
                            }}
                            className={
                              registerForm.formState.errors.companyName ? 'border-red-500 focus-visible:ring-red-500' : ''
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Tipo de negócio */}
                  <FormField
                    control={registerForm.control}
                    name="businessType"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <Label className="font-semibold">Qual é o seu tipo de negócio?</Label>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="grid grid-cols-2 gap-2 pt-1"
                          >
                            <FormItem className="flex items-center space-x-2 space-y-0 p-3 border rounded-xl has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5 cursor-pointer">
                              <FormControl>
                                <RadioGroupItem value="manufacturer" />
                              </FormControl>
                              <div>
                                <FormLabel className="text-xs font-bold cursor-pointer block leading-tight">
                                  Fábrica / Produtor
                                </FormLabel>
                                <span className="text-[10px] text-muted-foreground">Produzo materiais</span>
                              </div>
                            </FormItem>

                            <FormItem className="flex items-center space-x-2 space-y-0 p-3 border rounded-xl has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5 cursor-pointer">
                              <FormControl>
                                <RadioGroupItem value="reseller" />
                              </FormControl>
                              <div>
                                <FormLabel className="text-xs font-bold cursor-pointer block leading-tight">
                                  Loja / Revenda
                                </FormLabel>
                                <span className="text-[10px] text-muted-foreground">Compro e revendo</span>
                              </div>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Botão Dedicado: Criar Conta com o Google */}
                  <div className="pt-1">
                    <Button
                      variant="outline"
                      type="button"
                      disabled={isAnyLoading}
                      onClick={handleGoogleRegister}
                      className="w-full h-11 font-semibold border-2 border-primary/40 bg-white text-black hover:bg-gray-50 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800 dark:border-primary/50 shadow-sm"
                    >
                      {isRegisterGoogleLoading ? (
                        'A criar empresa com o Google...'
                      ) : (
                        <>
                          <GoogleIcon className="mr-2 h-5 w-5" />
                          Criar Conta com o Google
                        </>
                      )}
                    </Button>
                    <p className="mt-1.5 text-center text-[11px] text-muted-foreground">
                      Cria a empresa e a conta admin no Google num só clique.
                    </p>
                  </div>

                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">Ou com email e senha</span>
                    </div>
                  </div>

                  <FormField
                    control={registerForm.control}
                    name="adminEmail"
                    render={({ field }) => (
                      <FormItem>
                        <Label htmlFor="reg-adminEmail">Email do Administrador</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input id="reg-adminEmail" placeholder="admin@suaempresa.com" type="email" className="pl-9" {...field} />
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={registerForm.control}
                    name="adminPassword"
                    render={({ field }) => (
                      <FormItem>
                        <Label htmlFor="reg-adminPassword">Senha do Administrador</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="reg-adminPassword"
                            type={showRegisterPassword ? 'text' : 'password'}
                            placeholder="Mínimo de 6 caracteres"
                            className="pl-9"
                            {...field}
                          />
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-1.5">
                    <Label htmlFor="reg-inviteCode" className="text-xs text-muted-foreground">
                      Código de convite (opcional)
                    </Label>
                    <Input
                      id="reg-inviteCode"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                      placeholder="Ex: PROMO2026"
                      autoComplete="off"
                      autoCapitalize="characters"
                      className="text-xs"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="show-reg-password"
                      checked={showRegisterPassword}
                      onCheckedChange={(checked) => setShowRegisterPassword(!!checked)}
                    />
                    <label
                      htmlFor="show-reg-password"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      Mostrar senha
                    </label>
                  </div>

                  <Button type="submit" className="w-full font-semibold" disabled={isAnyLoading}>
                    {isRegisterLoading ? 'A criar a empresa...' : 'Registar Empresa com Email'}
                  </Button>

                  <p className="text-center text-[11px] text-muted-foreground leading-relaxed">
                    Ao registar-se, aceita os{' '}
                    <a href="/termos" target="_blank" className="underline hover:text-foreground">
                      Termos de Uso
                    </a>{' '}
                    e a{' '}
                    <a href="/privacidade" target="_blank" className="underline hover:text-foreground">
                      Política de Privacidade
                    </a>
                    .
                  </p>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </CardContent>

        <CardFooter className="flex flex-col items-center gap-2 pt-2 text-center text-xs border-t bg-muted/20">
          <p className="text-muted-foreground flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            14 dias de teste grátis sem necessidade de cartão de crédito.
          </p>
          <p className="text-muted-foreground">
            Precisa de ajuda?{' '}
            <a
              href={whatsappLink('Olá, preciso de ajuda com a autenticação no MajorStockX.')}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary hover:underline"
            >
              WhatsApp {SUPPORT.whatsappDisplay}
            </a>
            {' '}ou{' '}
            <a href={emailLink('Ajuda com o registo no MajorStockX')} className="font-medium text-primary hover:underline">
              email
            </a>
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
    } catch {
      // Notificado via toast no contexto
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