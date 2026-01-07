
"use client";

import { useEffect, useState } from "react";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { LocationsManager } from "@/components/settings/locations-manager";
import { currentUser } from "@/lib/data";

export default function SettingsPage() {
  const [isClient, setIsClient] = useState(false);
  const [radius, setRadius] = useState(0.8);
  const [shadowIntensity, setShadowIntensity] = useState(60);

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

  if (!isClient) {
    return null; // Or a loading skeleton
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-headline font-bold">Configurações</h1>
        <p className="text-muted-foreground">
          Ajuste as preferências da aplicação.
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
        </CardContent>
      </Card>

      {currentUser.role === 'Admin' && (
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
      )}
    </div>
  );
}
