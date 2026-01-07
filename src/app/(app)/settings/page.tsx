
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
  const [radius, setRadius] = useState(0.8);
  const [shadowIntensity, setShadowIntensity] = useState(60);
  const [borderWidth, setBorderWidth] = useState(2);
  const [borderColor, setBorderColor] = useState('hsl(var(--primary))');


  useEffect(() => {
    setIsClient(true);
    if (typeof window !== 'undefined') {
      const root = document.documentElement;

      const storedRadius = localStorage.getItem('majorstockx-radius');
      if (storedRadius) {
        setRadius(parseFloat(storedRadius));
      }

      const storedShadowIntensity = localStorage.getItem('majorstockx-shadow-intensity');
      if (storedShadowIntensity) {
        setShadowIntensity(parseInt(storedShadowIntensity, 10));
      }

      const storedBorderWidth = localStorage.getItem('majorstockx-border-width');
      if (storedBorderWidth) {
        setBorderWidth(parseInt(storedBorderWidth, 10));
      }

      const storedBorderColor = localStorage.getItem('majorstockx-border-color');
      if (storedBorderColor) {
        setBorderColor(storedBorderColor);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && isClient) {
      const root = document.documentElement;
      root.style.setProperty('--radius', `${radius}rem`);
    }
  }, [radius, isClient]);

  useEffect(() => {
    if (typeof window !== 'undefined' && isClient) {
      const root = document.documentElement;
      root.style.setProperty('--shadow-intensity', (shadowIntensity / 100).toString());
    }
  }, [shadowIntensity, isClient]);

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


  const handleRadiusChange = (value: number[]) => {
    const newRadius = value[0];
    setRadius(newRadius);
    if (typeof window !== 'undefined') {
      localStorage.setItem('majorstockx-radius', newRadius.toString());
    }
  };

  const handleShadowIntensityChange = (value: number[]) => {
    const newIntensity = value[0];
    setShadowIntensity(newIntensity);
    if (typeof window !== 'undefined') {
      localStorage.setItem('majorstockx-shadow-intensity', newIntensity.toString());
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

  if (!isClient) {
    return null; // Or a loading skeleton
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-headline font-bold">Configurações</h1>
        <p className="text-muted-foreground">
          Ajuste as preferências da aplicação e da sua empresa.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Aparência</CardTitle>
          <CardDescription>
            Personalize a aparência da aplicação.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <Label htmlFor="theme">Tema</Label>
            <ThemeSwitcher />
          </div>
          <div className="space-y-2">
            <Label htmlFor="radius">Aredondamento dos Cantos</Label>
            <div className="flex items-center gap-4">
              <Slider
                id="radius"
                min={0}
                max={2}
                step={0.1}
                value={[radius]}
                onValueChange={handleRadiusChange}
                className="w-[calc(100%-4rem)]"
              />
              <span className="w-12 text-right font-mono text-sm text-muted-foreground">
                {radius.toFixed(1)}rem
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="shadow-intensity">Intensidade das Sombras</Label>
             <p className="text-sm text-muted-foreground">Ajuste a profundidade das sombras dos elementos.</p>
            <div className="flex items-center gap-4">
              <Slider
                id="shadow-intensity"
                min={0}
                max={100}
                step={1}
                value={[shadowIntensity]}
                onValueChange={handleShadowIntensityChange}
                className="w-[calc(100%-4rem)]"
              />
              <span className="w-12 text-right font-mono text-sm text-muted-foreground">
                {shadowIntensity}
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
                step={0.5}
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
        </CardContent>
      </Card>

      {currentUser.role === 'Admin' && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Gestão de Localizações</CardTitle>
              <CardDescription>
                Ative e gerencie múltiplas localizações para o seu negócio.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LocationsManager />
            </CardContent>
          </Card>
           <Card>
            <CardHeader>
              <CardTitle>Gestão de Funcionários</CardTitle>
              <CardDescription>
                Convide e gerencie os funcionários da sua empresa.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EmployeeManager />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
