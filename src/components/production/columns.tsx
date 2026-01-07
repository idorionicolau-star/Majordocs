"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Production } from "@/lib/types"

export const columns: ColumnDef<Production>[] = [
  {
    accessorKey: "productName",
    header: "Produto Fabricado",
  },
  {
    accessorKey: "quantity",
    header: "Quantidade",
  },
  {
    accessorKey: "date",
    header: "Data",
  },
  {
    accessorKey: "registeredBy",
    header: "Registrado por",
  },
]
