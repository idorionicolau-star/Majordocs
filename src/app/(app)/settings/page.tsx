
"use client";

import { useEffect, useState } from "react";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

export default function SettingsPage() {
  const [radius, setRadius] = useState(1);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedRadius = localStorage.getItem('majorstockx-radius');
      if (storedRadius) {
        setRadius(parseFloat(storedRadius));
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.body.style.setProperty('--radius', `${radius}rem`);
    }
  }, [radius]);

  const handleRadiusChange = (value: number[]) => {
    const newRadius = value[0];
    setRadius(newRadius);
    if (typeof window !== 'undefined') {
      localStorage.setItem('majorstockx-radius', newRadius.toString());
    }
  };

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
        </CardContent>
      </Card>
    </div>
  );
}
