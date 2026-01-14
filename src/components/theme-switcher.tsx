
"use client"

import * as React from "react"
import { Check, Moon, Paintbrush, Sun } from "lucide-react"

import { useTheme } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSubContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-mobile"

const themes = [
  { name: "slate", color: "bg-slate-500" },
  { name: "stone", color: "bg-stone-500" },
  { name: "sky", color: "bg-sky-500" },
  { name: "emerald", color: "bg-emerald-500" },
  { name: "orange", color: "bg-orange-500" },
  { name: "violet", color: "bg-violet-500" },
];

export function ThemeSwitcher() {
  const { theme, setTheme, mode, setMode } = useTheme()
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon">
            <Paintbrush className="h-[1.2rem] w-[1.2rem]" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Tema</DropdownMenuLabel>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Cor</DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                {themes.map((t) => (
                  <DropdownMenuItem key={t.name} onClick={() => setTheme(t.name)}>
                    <div
                      className={cn(
                        "mr-2 h-5 w-5 rounded-full border border-border",
                        t.color
                      )}
                    />
                    <span className="capitalize">{t.name}</span>
                    {theme === t.name && <Check className="ml-auto h-4 w-4" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Modo</DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={() => setMode("light")}>
                  <Sun className="mr-2 h-4 w-4" />
                  Claro
                  {mode === "light" && <Check className="ml-auto h-4 w-4" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setMode("dark")}>
                  <Moon className="mr-2 h-4 w-4" />
                  Escuro
                   {mode === "dark" && <Check className="ml-auto h-4 w-4" />}
                </DropdownMenuItem>
                 <DropdownMenuItem onClick={() => setMode("system")}>
                  Sistema
                   {mode === "system" && <Check className="ml-auto h-4 w-4" />}
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <Paintbrush className="mr-2 h-4 w-4" />
          <span className="capitalize">{theme}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <div className="grid grid-cols-3 gap-2 p-2">
          {themes.map((t) => (
            <Button
              key={t.name}
              variant={theme === t.name ? "default" : "outline"}
              size="sm"
              onClick={() => setTheme(t.name)}
              className="justify-start gap-2"
            >
              <span className={cn("h-5 w-5 rounded-full", t.color)} />
              <span className="capitalize">{t.name}</span>
            </Button>
          ))}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setMode("light")}>
          <Sun className="mr-2 h-4 w-4" />
          Claro
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setMode("dark")}>
          <Moon className="mr-2 h-4 w-4" />
          Escuro
        </DropdownMenuItem>
         <DropdownMenuItem onClick={() => setMode("system")}>
          Sistema
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
