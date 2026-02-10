
"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
// import { useTheme } from "next-themes" // TODO: USER INSTALL 'next-themes'

import { Button } from "@/components/ui/button"
/* import {
     DropdownMenu,
     DropdownMenuContent,
     DropdownMenuItem,
     DropdownMenuTrigger,
 } from "@/components/ui/dropdown-menu" */

export function ThemeToggle() {
    // const { setTheme } = useTheme()

    return (
        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full opacity-50 cursor-not-allowed" title="Instalar next-themes para ativar">
            <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Alternar tema (Requer next-themes)</span>
        </Button>
    )
}
