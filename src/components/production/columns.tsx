
"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Production } from "@/lib/types"

interface ColumnsOptions {}

export const columns = (options: ColumnsOptions): ColumnDef<Production>[] => {

  const baseColumns: ColumnDef<Production>[] = [
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
    }
  ];

  return baseColumns;
}
