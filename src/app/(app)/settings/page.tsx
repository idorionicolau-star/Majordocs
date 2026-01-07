
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
  const [shadowY, setShadowY] = useState(8);
  const [shadowBlur, setShadowBlur] = useState(25);
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

      const storedShadowY = localStorage.getItem('majorstockx-shadow-y');
      if (storedShadowY) {
        setShadowY(parseFloat(storedShadowY));
        root.style.setProperty('--shadow-y', `${parseFloat(storedShadowY)}px`);
      }

      const storedShadowBlur = localStorage.getItem('majorstockx-shadow-blur');
      if (storedShadowBlur) {
        setShadowBlur(parseFloat(storedShadowBlur));
        root.style.setProperty('--shadow-blur', `${parseFloat(storedShadowBlur)}px`);
      }

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
      root.style.setProperty('--shadow-y', `${shadowY}px`);
      root.style.setProperty('--shadow-blur', `${shadowBlur}px`);
      root.style.setProperty('--shadow-opacity', shadowsEnabled ? `${shadowOpacity}` : '0');
    }
  }, [radius, shadowsEnabled, shadowY, shadowBlur, shadowOpacity]);

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

  const handleShadowYChange = (value: number[]) => {
    const newShadowY = value[0];
    setShadowY(newShadowY);
    if (typeof window !== 'undefined') {
      localStorage.setItem('majorstockx-shadow-y', newShadowY.toString());
    }
  };

  const handleShadowBlurChange = (value: number[]) => {
    const newShadowBlur = value[0];
    setShadowBlur(newShadowBlur);
    if (typeof window !== 'undefined') {
      localStorage.setItem('majorstockx-shadow-blur', newShadowBlur.toString());
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
            <Label htmlFor="shadow-y" className={`${!shadowsEnabled ? 'text-muted-foreground' : ''}`}>Deslocamento da Sombra</Label>
            <div className="flex items-center gap-4">
              <Slider
                id="shadow-y"
                min={0}
                max={20}
                step={1}
                value={[shadowY]}
                onValueChange={handleShadowYChange}
                className="w-[calc(100%-4rem)]"
                disabled={!shadowsEnabled}
              />
              <span className="w-12 text-right font-mono text-sm text-muted-foreground">
                {shadowY}px
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="shadow-blur" className={`${!shadowsEnabled ? 'text-muted-foreground' : ''}`}>Desfoque da Sombra</Label>
            <div className="flex items-center gap-4">
              <Slider
                id="shadow-blur"
                min={5}
                max={50}
                step={1}
                value={[shadowBlur]}
                onValueChange={handleShadowBlurChange}
                className="w-[calc(100%-4rem)]"
                disabled={!shadowsEnabled}
              />
              <span className="w-12 text-right font-mono text-sm text-muted-foreground">
                {shadowBlur}px
              </span>
            </div>
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
