
"use client";

import { useEffect, useState } from "react";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { LocationsManager } from "@/components/settings/locations-manager";
import { currentUser } from "@/lib/data";
import { EmployeeManager } from "@/components/settings/employee-manager";
import { cn } from "@/lib/utils";

const colorOptions = [
  { name: 'Primary', value: 'hsl(var(--primary))', className: 'bg-primary' },
  { name: 'Accent', value: 'hsl(var(--accent))', className: 'bg-accent' },
  { name: 'Destructive', value: 'hsl(var(--destructive))', className: 'bg-destructive' },
  { name: 'Foreground', value: 'hsl(var(--foreground))', className: 'bg-foreground' },
  { name: 'Border', value: 'hsl(var(--border))', className: 'bg-border' },
];

export default function SettingsPage() {
  const [isClient, setIsClient] = useState(false);
  const [borderRadius, setBorderRadius] = useState(0.8);
  const [borderWidth, setBorderWidth] = useState(1);
  const [borderColor, setBorderColor] = useState('hsl(var(--primary))');
  const [iconSize, setIconSize] = useState(16);

  useEffect(() => {
    setIsClient(true);
    if (typeof window !== 'undefined') {
      const root = document.documentElement;

      const storedRadius = localStorage.getItem('majorstockx-border-radius');
      if (storedRadius) {
        setBorderRadius(parseFloat(storedRadius));
      }

      const storedBorderWidth = localStorage.getItem('majorstockx-border-width');
      if (storedBorderWidth) {
        setBorderWidth(parseFloat(storedBorderWidth));
      }

      const storedBorderColor = localStorage.getItem('majorstockx-border-color');
      if (storedBorderColor) {
        setBorderColor(storedBorderColor);
      }
       const storedIconSize = localStorage.getItem('majorstockx-icon-size');
      if (storedIconSize) {
        setIconSize(parseFloat(storedIconSize));
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && isClient) {
      document.documentElement.style.setProperty('--radius', `${borderRadius}rem`);
    }
  }, [borderRadius, isClient]);

   useEffect(() => {
    if (typeof window !== 'undefined' && isClient) {
      const root = document.documentElement;
      root.style.setProperty('--card-border-width', `${borderWidth}px`);
    }
  }, [borderWidth, isClient]);

  useEffect(() => {
    if (typeof window !== 'undefined' && isClient) {
      const root = document.documentElement;
      root.style.setProperty('--card-border-color', borderColor);
    }
  }, [borderColor, isClient]);
  
    useEffect(() => {
    if (typeof window !== 'undefined' && isClient) {
      const root = document.documentElement;
      root.style.setProperty('--stats-icon-size', `${iconSize}px`);
    }
  }, [iconSize, isClient]);

  const handleBorderRadiusChange = (value: number[]) => {
    const newRadius = value[0];
    setBorderRadius(newRadius);
    if (typeof window !== 'undefined') {
      localStorage.setItem('majorstockx-border-radius', newRadius.toString());
    }
  };

  const handleBorderWidthChange = (value: number[]) => {
    const newWidth = value[0];
    setBorderWidth(newWidth);
    if (typeof window !== 'undefined') {
      localStorage.setItem('majorstockx-border-width', newWidth.toString());
    }
  };

  const handleBorderColorChange = (color: string) => {
    setBorderColor(color);
    if (typeof window !== 'undefined') {
      localStorage.setItem('majorstockx-border-color', color);
    }
  };

  const handleIconSizeChange = (value: number[]) => {
    const newSize = value[0];
    setIconSize(newSize);
    if (typeof window !== 'undefined') {
      localStorage.setItem('majorstockx-icon-size', newSize.toString());
    }
  };


  if (!isClient) {
    return null; // Or a loading skeleton
  }

  return (
    <div className="flex flex-col gap-6 pb-20 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl md:text-3xl font-headline font-[900] text-slate-900 dark:text-white tracking-tighter">Configurações</h1>
        <p className="text-sm font-medium text-slate-500 mt-1">
          Ajuste as preferências da aplicação e da sua empresa.
        </p>
      </div>
      <Card className="glass-card shadow-sm">
        <CardHeader className="p-6 sm:p-8">
          <CardTitle className="font-headline font-[900] tracking-tighter text-xl sm:text-2xl">Aparência</CardTitle>
          <CardDescription>
            Personalize a aparência da aplicação.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 p-6 sm:p-8 pt-0">
          <div className="flex items-center justify-between">
            <Label htmlFor="theme">Tema</Label>
            <ThemeSwitcher />
          </div>
          <div className="space-y-2">
            <Label htmlFor="border-radius">Arredondamento dos Cantos</Label>
             <p className="text-sm text-muted-foreground">Ajuste o raio das bordas dos elementos.</p>
            <div className="flex items-center gap-4">
              <Slider
                id="border-radius"
                min={0}
                max={2}
                step={0.1}
                value={[borderRadius]}
                onValueChange={handleBorderRadiusChange}
                className="w-[calc(100%-4rem)]"
              />
              <span className="w-12 text-right font-mono text-sm text-muted-foreground">
                {borderRadius.toFixed(1)}rem
              </span>
            </div>
          </div>
           <div className="space-y-2">
            <Label htmlFor="border-width">Largura da Borda do Card</Label>
             <p className="text-sm text-muted-foreground">Ajuste a espessura da borda dos cards.</p>
            <div className="flex items-center gap-4">
              <Slider
                id="border-width"
                min={0}
                max={4}
                step={0.1}
                value={[borderWidth]}
                onValueChange={handleBorderWidthChange}
                className="w-[calc(100%-4rem)]"
              />
              <span className="w-12 text-right font-mono text-sm text-muted-foreground">
                {borderWidth.toFixed(1)}px
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="border-color">Cor da Borda do Card</Label>
             <p className="text-sm text-muted-foreground">Selecione a cor da borda para os cards.</p>
            <div className="flex items-center gap-2 pt-2">
              {colorOptions.map(color => (
                <button
                  key={color.name}
                  onClick={() => handleBorderColorChange(color.value)}
                  className={cn(
                    "h-8 w-8 rounded-full border-2 transition-all",
                    borderColor === color.value ? 'border-ring' : 'border-transparent',
                    color.className
                  )}
                  title={color.name}
                />
              ))}
            </div>
          </div>
           <div className="space-y-2">
            <Label htmlFor="icon-size">Tamanho do Ícone do Dashboard</Label>
             <p className="text-sm text-muted-foreground">Ajuste o tamanho dos ícones nos cards de estatísticas.</p>
            <div className="flex items-center gap-4">
              <Slider
                id="icon-size"
                min={12}
                max={24}
                step={1}
                value={[iconSize]}
                onValueChange={handleIconSizeChange}
                className="w-[calc(100%-4rem)]"
              />
              <span className="w-12 text-right font-mono text-sm text-muted-foreground">
                {iconSize.toFixed(0)}px
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {currentUser.role === 'Admin' && (
        <>
          <Card className="glass-card shadow-sm">
            <CardHeader className="p-6 sm:p-8">
              <CardTitle className="font-headline font-[900] tracking-tighter text-xl sm:text-2xl">Gestão de Localizações</CardTitle>
              <CardDescription>
                Ative e gerencie múltiplas localizações para o seu negócio.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 sm:p-8 pt-0">
              <LocationsManager />
            </CardContent>
          </Card>
           <Card className="glass-card shadow-sm">
            <CardHeader className="p-6 sm:p-8">
              <CardTitle className="font-headline font-[900] tracking-tighter text-xl sm:text-2xl">Gestão de Funcionários</CardTitle>
              <CardDescription>
                Convide e gerencie os funcionários da sua empresa.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 sm:p-8 pt-0">
              <EmployeeManager />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
