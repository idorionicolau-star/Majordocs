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
import { InventoryContext } from "@/context/inventory-context"
import type { Product } from "@/lib/types"
import { Box } from "lucide-react"

interface CommandMenuProps {
  open: boolean
  setOpen: (open: boolean) => void
}

export function CommandMenu({ open, setOpen }: CommandMenuProps) {
  const router = useRouter()
  const { products } = React.useContext(InventoryContext) || { products: [] };

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
      <CommandInput placeholder="Pesquisar por produto..." />
      <CommandList>
        <CommandEmpty>Nenhum produto encontrado.</CommandEmpty>
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
