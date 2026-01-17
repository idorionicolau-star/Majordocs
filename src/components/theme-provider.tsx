
"use client"

import * as React from "react"
import { themes } from "@/lib/themes"

type ThemeProviderState = {
  mode: string
  setMode: (mode: string) => void
  colorTheme: string
  setColorTheme: (themeName: string) => void
}

const initialState: ThemeProviderState = {
  mode: "dark",
  setMode: () => null,
  colorTheme: "Default",
  setColorTheme: () => null,
}

const ThemeProviderContext = React.createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultMode = "dark",
  defaultColorTheme = "Default",
  storageKeyMode = "majorstockx-mode",
  storageKeyColor = "majorstockx-color-theme",
  ...props
}: {
  children: React.ReactNode
  defaultMode?: string
  defaultColorTheme?: string
  storageKeyMode?: string
  storageKeyColor?: string
}) {
  const [mode, setMode] = React.useState(
    () => (typeof window !== 'undefined' && localStorage.getItem(storageKeyMode)) || defaultMode
  )

  const [colorTheme, setColorTheme] = React.useState(
    () => (typeof window !== 'undefined' && localStorage.getItem(storageKeyColor)) || defaultColorTheme
  )

  React.useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove("light", "dark")

    const systemMode = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
    const effectiveMode = mode === "system" ? systemMode : mode;

    root.classList.add(effectiveMode)
    
    // Apply color theme
    const theme = themes.find(t => t.name === colorTheme) || themes[0];
    const colors = theme.primary[effectiveMode as 'light' | 'dark'];
    
    root.style.setProperty('--primary', colors);
    root.style.setProperty('--ring', colors); // Sync ring color

  }, [mode, colorTheme])


  const value = {
    mode,
    setMode: (newMode: string) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem(storageKeyMode, newMode)
      }
      setMode(newMode)
    },
    colorTheme,
    setColorTheme: (themeName: string) => {
       if (typeof window !== 'undefined') {
        localStorage.setItem(storageKeyColor, themeName)
      }
      setColorTheme(themeName)
    }
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = React.useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider")

  return context
}
