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
  CommandSeparator,
} from "@/components/ui/command"
import { mainNavItems } from "@/lib/data"
import { InventoryContext } from "@/context/inventory-context"
import type { ModulePermission, Product } from "@/lib/types"
import { Box } from "lucide-react"

interface CommandMenuProps {
  open: boolean
  setOpen: (open: boolean) => void
}

export function CommandMenu({ open, setOpen }: CommandMenuProps) {
  const router = useRouter()
  const { canView, products } = React.useContext(InventoryContext) || { canView: () => false, products: [] };

  const navItems = mainNavItems.filter(item => {
    if (item.isSubItem) return false;
    return canView(item.id as ModulePermission);
  });

  const runCommand = React.useCallback((command: () => unknown) => {
    setOpen(false)
    command()
  }, [setOpen])
  
  const uniqueProducts = React.useMemo(() => {
      if (!products) return [];
      const seen = new Set<string>();
      return products.filter(p => {
          if (seen.has(p.name)) {
              return false;
          }
          seen.add(p.name);
          return true;
      });
  }, [products]);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Pesquisar por páginas ou produtos..." />
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
        {uniqueProducts.length > 0 && <CommandSeparator />}
        {uniqueProducts.length > 0 && (
            <CommandGroup heading="Produtos do Inventário">
                {uniqueProducts.map((product: Product) => (
                    <CommandItem
                        key={product.instanceId}
                        value={product.name}
                        onSelect={() => {
                            runCommand(() => router.push(`/inventory?filter=${encodeURIComponent(product.name)}`))
                        }}
                    >
                        <Box className="mr-2 h-4 w-4" />
                        <span>{product.name}</span>
                    </CommandItem>
                ))}
            </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  )
}
