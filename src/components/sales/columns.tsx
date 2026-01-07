
"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Sale, Location } from "@/lib/types"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal } from "lucide-react"
import { useEffect, useState } from "react"

interface ColumnsOptions {
  locations: Location[];
}

export const columns = (options: ColumnsOptions): ColumnDef<Sale>[] => {
  const [isMultiLocation, setIsMultiLocation] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const multiLocationEnabled = localStorage.getItem('majorstockx-multi-location-enabled') === 'true';
      setIsMultiLocation(multiLocationEnabled);
    }
  }, []);

  const baseColumns: ColumnDef<Sale>[] = [
    {
      accessorKey: "guideNumber",
      header: "Guia",
    },
    {
      accessorKey: "productName",
      header: "Produto",
    },
  ];

  if (isMultiLocation) {
    baseColumns.push({
      accessorKey: "location",
      header: "Localização",
      cell: ({ row }) => {
        const location = options.locations.find(l => l.id === row.original.location);
        return location ? location.name : 'N/A';
      },
    });
  }

  baseColumns.push(
    {
      accessorKey: "quantity",
      header: "Quantidade",
    },
    {
      accessorKey: "date",
      header: "Data",
    },
    {
      accessorKey: "soldBy",
      header: "Vendedor",
    },
    {
      id: "actions",
      cell: ({ row }) => {
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Ações</DropdownMenuLabel>
              <DropdownMenuItem>Ver Detalhes</DropdownMenuItem>
              <DropdownMenuItem>Imprimir Guia</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    }
  );

  return baseColumns;
}
