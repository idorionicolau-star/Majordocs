
"use client"

import * as React from "react"

const THEMES = ["blue", "stone", "sky", "emerald", "orange", "violet"];

type ThemeProviderState = {
  theme: string
  setTheme: (theme: string) => void
  mode: string
  setMode: (mode: string) => void
  themes: string[]
}

const initialState: ThemeProviderState = {
  theme: "blue",
  setTheme: () => null,
  mode: "system",
  setMode: () => null,
  themes: THEMES,
}

const ThemeProviderContext = React.createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme = "blue",
  defaultMode = "system",
  storageKeyTheme = "majorstockx-theme",
  storageKeyMode = "majorstockx-mode",
  ...props
}: {
  children: React.ReactNode
  defaultTheme?: string
  defaultMode?: string
  storageKeyTheme?: string
  storageKeyMode?: string
}) {
  const [theme, setTheme] = React.useState(
    () => (typeof window !== 'undefined' && localStorage.getItem(storageKeyTheme)) || defaultTheme
  )
  const [mode, setMode] = React.useState(
    () => (typeof window !== 'undefined' && localStorage.getItem(storageKeyMode)) || defaultMode
  )

  React.useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove("light", "dark", ...THEMES.map(t => `theme-${t}`))

    if (mode === "system") {
      const systemMode = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
      root.classList.add(systemMode)
    } else {
      root.classList.add(mode)
    }

    root.classList.add(`theme-${theme}`);
  }, [theme, mode])

  const value = {
    theme,
    setTheme: (newTheme: string) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem(storageKeyTheme, newTheme)
      }
      setTheme(newTheme)
    },
    mode,
    setMode: (newMode: string) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem(storageKeyMode, newMode)
      }
      setMode(newMode)
    },
    themes: THEMES,
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
