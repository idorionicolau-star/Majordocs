
"use client";

import { useEffect, useState } from "react";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

export default function SettingsPage() {
  const [isClient, setIsClient] = useState(false);
  const [radius, setRadius] = useState(1);
  const [shadowsEnabled, setShadowsEnabled] = useState(true);
  const [shadowOpacity, setShadowOpacity] = useState(0.1);

  useEffect(() => {
    setIsClient(true);
    if (typeof window !== 'undefined') {
      const root = document.documentElement;

      const storedRadius = localStorage.getItem('majorstockx-radius');
      if (storedRadius) {
        setRadius(parseFloat(storedRadius));
        root.style.setProperty('--radius', `${parseFloat(storedRadius)}rem`);
      }

      const storedShadowsEnabled = localStorage.getItem('majorstockx-shadows-enabled');
      const shadowsAreEnabled = storedShadowsEnabled ? JSON.parse(storedShadowsEnabled) : true;
      setShadowsEnabled(shadowsAreEnabled);

      const storedShadowOpacity = localStorage.getItem('majorstockx-shadow-opacity');
      if (storedShadowOpacity) {
        setShadowOpacity(parseFloat(storedShadowOpacity));
        root.style.setProperty('--shadow-opacity', shadowsAreEnabled ? storedShadowOpacity : '0');
      } else {
        root.style.setProperty('--shadow-opacity', shadowsAreEnabled ? '0.1' : '0');
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const root = document.documentElement;
      root.style.setProperty('--radius', `${radius}rem`);
      root.style.setProperty('--shadow-opacity', shadowsEnabled ? `${shadowOpacity}` : '0');
    }
  }, [radius, shadowsEnabled, shadowOpacity]);

  const handleRadiusChange = (value: number[]) => {
    const newRadius = value[0];
    setRadius(newRadius);
    if (typeof window !== 'undefined') {
      localStorage.setItem('majorstockx-radius', newRadius.toString());
    }
  };

  const handleShadowsEnabledChange = (checked: boolean) => {
    setShadowsEnabled(checked);
    if (typeof window !== 'undefined') {
      localStorage.setItem('majorstockx-shadows-enabled', JSON.stringify(checked));
    }
  };

  const handleShadowOpacityChange = (value: number[]) => {
    const newShadowOpacity = value[0];
    setShadowOpacity(newShadowOpacity);
    if (typeof window !== 'undefined') {
      localStorage.setItem('majorstockx-shadow-opacity', newShadowOpacity.toString());
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
          <div className="flex items-center justify-between">
             <Label htmlFor="shadows-enabled" className={`${!shadowsEnabled ? 'text-muted-foreground' : ''}`}>
                Sombras
             </Label>
             <Switch
                id="shadows-enabled"
                checked={shadowsEnabled}
                onCheckedChange={handleShadowsEnabledChange}
             />
          </div>
          <div className="space-y-2">
            <Label htmlFor="shadow-opacity" className={`${!shadowsEnabled ? 'text-muted-foreground' : ''}`}>Intensidade da Sombra</Label>
            <div className="flex items-center gap-4">
              <Slider
                id="shadow-opacity"
                min={0.05}
                max={0.3}
                step={0.01}
                value={[shadowOpacity]}
                onValueChange={handleShadowOpacityChange}
                className="w-[calc(100%-4rem)]"
                disabled={!shadowsEnabled}
              />
              <span className="w-12 text-right font-mono text-sm text-muted-foreground">
                {shadowOpacity.toFixed(2)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
