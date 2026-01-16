
"use client"

import * as React from "react"

type ThemeProviderState = {
  mode: string
  setMode: (mode: string) => void
}

const initialState: ThemeProviderState = {
  mode: "dark",
  setMode: () => null,
}

const ThemeProviderContext = React.createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultMode = "dark",
  storageKeyMode = "majorstockx-mode",
  ...props
}: {
  children: React.ReactNode
  defaultMode?: string
  storageKeyMode?: string
}) {
  const [mode, setMode] = React.useState(
    () => (typeof window !== 'undefined' && localStorage.getItem(storageKeyMode)) || defaultMode
  )

  React.useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove("light", "dark")

    if (mode === "system") {
      const systemMode = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
      root.classList.add(systemMode)
    } else {
      root.classList.add(mode)
    }
  }, [mode])

  const value = {
    mode,
    setMode: (newMode: string) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem(storageKeyMode, newMode)
      }
      setMode(newMode)
    },
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
