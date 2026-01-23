"use client"

import * as React from "react"
import { themes } from "@/lib/themes"

type ThemeProviderState = {
  mode: string
  setMode: (mode: string) => void
  colorTheme: string
  setColorTheme: (themeName: string) => void
  borderRadius: number
  setBorderRadius: (radius: number) => void
}

const initialState: ThemeProviderState = {
  mode: "light",
  setMode: () => null,
  colorTheme: "Red",
  setColorTheme: () => null,
  borderRadius: 2.0,
  setBorderRadius: () => null,
}

const ThemeProviderContext = React.createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultMode = "light",
  defaultColorTheme = "Red",
  storageKeyMode = "majorstockx-mode",
  storageKeyColor = "majorstockx-color-theme",
  storageKeyRadius = "majorstockx-border-radius",
  ...props
}: {
  children: React.ReactNode
  defaultMode?: string
  defaultColorTheme?: string
  storageKeyMode?: string
  storageKeyColor?: string
  storageKeyRadius?: string
}) {
  const [mode, setMode] = React.useState(
    () => (typeof window !== 'undefined' && localStorage.getItem(storageKeyMode)) || defaultMode
  )

  const [colorTheme, setColorTheme] = React.useState(
    () => (typeof window !== 'undefined' && localStorage.getItem(storageKeyColor)) || defaultColorTheme
  )
  
  const [borderRadius, setBorderRadiusState] = React.useState(() => {
    if (typeof window === 'undefined') return 2.0;
    const storedRadius = localStorage.getItem(storageKeyRadius);
    return storedRadius ? parseFloat(storedRadius) : 2.0;
  });


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

    const [h, s] = colors.split(" ").map(val => val.replace('%', ''));
    if (h && s) {
        if (effectiveMode === 'light') {
            root.style.setProperty('--accent', `${h} ${s}% 95%`);
        } else {
            root.style.setProperty('--accent', `${h} ${s}% 25%`);
        }
    }

  }, [mode, colorTheme])
  
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.style.setProperty('--radius', `${borderRadius}rem`);
    }
  }, [borderRadius])


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
    },
    borderRadius,
    setBorderRadius: (radius: number) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem(storageKeyRadius, radius.toString())
      }
      setBorderRadiusState(radius)
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
