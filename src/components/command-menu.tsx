"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { mainNavItems } from "@/lib/data"
import { InventoryContext } from "@/context/inventory-context"
import type { ModulePermission } from "@/lib/types"

interface CommandMenuProps {
  open: boolean
  setOpen: (open: boolean) => void
}

export function CommandMenu({ open, setOpen }: CommandMenuProps) {
  const router = useRouter()
  const { canView } = React.useContext(InventoryContext) || { canView: () => false };

  const navItems = mainNavItems.filter(item => {
    if (item.isSubItem) return false;
    return canView(item.id as ModulePermission);
  });

  const runCommand = React.useCallback((command: () => unknown) => {
    setOpen(false)
    command()
  }, [setOpen])

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Pesquise ou navegue..." />
      <CommandList>
        <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
        <CommandGroup heading="Navegação">
          {navItems.map((item) => (
            <CommandItem
              key={item.href}
              value={item.title}
              onSelect={() => {
                runCommand(() => router.push(item.href))
              }}
            >
              <item.icon className="mr-2 h-4 w-4" />
              {item.title}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
