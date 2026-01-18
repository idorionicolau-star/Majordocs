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
import { Box, Sparkles, Loader2 as Loader } from "lucide-react"

interface CommandMenuProps {
  open: boolean
  setOpen: (open: boolean) => void
}

export function CommandMenu({ open, setOpen }: CommandMenuProps) {
  const router = useRouter()
  const { products, sales, dashboardStats } = React.useContext(InventoryContext) || { products: [], sales: [], dashboardStats: {} };

  const [search, setSearch] = React.useState("")
  const [aiResponse, setAiResponse] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)

  // Reset state when dialog is closed
  React.useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setSearch("")
        setAiResponse("")
        setIsLoading(false)
      }, 200);
    }
  }, [open])


  const runCommand = React.useCallback((command: () => unknown) => {
    setOpen(false)
    command()
  }, [setOpen])

  const handleAiSearch = async () => {
    if (!search) return
    setIsLoading(true)
    setAiResponse("")

    try {
      const response = await fetch('/api/ai-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: search,
          contextData: {
            stats: dashboardStats,
            recentSales: sales?.slice(0, 10),
            inventoryProducts: products?.slice(0, 10),
          }
        }),
      });

      if (!response.ok) {
        throw new Error('A resposta da rede não foi OK');
      }

      const data = await response.json();
      setAiResponse(data.text);

    } catch (error) {
      console.error("Erro na pesquisa com IA:", error);
      setAiResponse("Desculpe, não consegui encontrar uma resposta para isso. Tente refazer a sua pergunta.");
    } finally {
      setIsLoading(false)
    }
  }
  
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

  const onSearchChange = (value: string) => {
    setSearch(value);
    if (aiResponse) {
      setAiResponse("");
    }
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Pesquisar produtos ou perguntar à IA..."
        value={search}
        onValueChange={onSearchChange}
      />
      <CommandList>
        {isLoading && (
          <CommandItem disabled className="flex items-center justify-center text-muted-foreground">
            <Loader className="mr-2 h-4 w-4 animate-spin" />
            <span>O MajorAssistant está a pensar...</span>
          </CommandItem>
        )}

        {aiResponse && !isLoading && (
           <CommandGroup heading="Resposta do MajorAssistant">
              <div className="p-3 text-sm text-foreground whitespace-pre-wrap">{aiResponse}</div>
           </CommandGroup>
        )}

        {!aiResponse && !isLoading && (
          <>
            <CommandEmpty>Nenhum produto encontrado com esse nome.</CommandEmpty>

            {search && (
              <CommandGroup>
                <CommandItem onSelect={handleAiSearch} value={`ai-search-${search}`}>
                  <Sparkles className="mr-2 h-4 w-4 text-primary" />
                  <span>Perguntar ao MajorAssistant: "{search}"</span>
                </CommandItem>
              </CommandGroup>
            )}
            
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
          </>
        )}
      </CommandList>
    </CommandDialog>
  )
}
