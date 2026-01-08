
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background p-4 animate-in">
      <div className="w-full max-w-md">
        <div className="flex flex-col justify-center items-center gap-3 mb-6">
          <Image src="/logo.svg" alt="MajorStockX Logo" width={40} height={40} className="text-primary" />
          <h1 className="text-3xl font-headline font-bold text-primary">MajorStockX</h1>
        </div>
        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Entrar</TabsTrigger>
            <TabsTrigger value="register">Registrar Empresa</TabsTrigger>
          </TabsList>
          <TabsContent value="login" className="mt-4">
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl font-headline">Bem-vindo de volta</CardTitle>
                <CardDescription>
                  Insira suas credenciais para aceder ao sistema.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="email-login">Email</Label>
                    <Input
                      id="email-login"
                      type="email"
                      placeholder="seu.email@exemplo.com"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <div className="flex items-center">
                      <Label htmlFor="password-login">Senha</Label>
                      <Link
                        href="#"
                        className="ml-auto inline-block text-sm underline"
                      >
                        Esqueceu sua senha?
                      </Link>
                    </div>
                    <Input id="password-login" type="password" required />
                  </div>
                  <Button type="submit" className="w-full" asChild>
                      <Link href="/dashboard">Entrar</Link>
                  </Button>
                  <Button variant="outline" className="w-full">
                    <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 126 23.4 172.9 61.9l-69.5 69.5c-24.3-23.2-56.2-37.4-92.4-37.4-69.5 0-126 56.5-126 126s56.5 126 126 126c76.2 0 109.5-58.2 113.5-87.2H248v-85.3h236.1c2.3 12.7 3.9 26.9 3.9 41.4z"></path></svg>
                    Entrar com Google
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="register" className="mt-4">
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl font-headline">Registre sua Empresa</CardTitle>
                <CardDescription>
                  Crie uma conta e comece a gerenciar seu negócio.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                   <div className="grid gap-2">
                    <Label htmlFor="company-name">Nome da Empresa</Label>
                    <Input id="company-name" placeholder="Ex: Construções & Filhos, Lda" required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email-register">Email do Proprietário</Label>
                    <Input id="email-register" type="email" placeholder="seu.email@exemplo.com" required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="password-register">Senha</Label>
                    <Input id="password-register" type="password" required />
                  </div>
                  <Button type="submit" className="w-full" asChild>
                     <Link href="/dashboard">Registrar Minha Empresa</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
