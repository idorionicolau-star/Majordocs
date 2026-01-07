
"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Production, Location } from "@/lib/types"
import { useEffect, useState } from "react";

interface ColumnsOptions {
  locations: Location[];
}

export const columns = (options: ColumnsOptions): ColumnDef<Production>[] => {
  const [isMultiLocation, setIsMultiLocation] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const multiLocationEnabled = localStorage.getItem('majorstockx-multi-location-enabled') === 'true';
      setIsMultiLocation(multiLocationEnabled);
    }
  }, []);

  const baseColumns: ColumnDef<Production>[] = [
    {
      accessorKey: "productName",
      header: "Produto Fabricado",
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
      accessorKey: "registeredBy",
      header: "Registrado por",
    }
  );

  return baseColumns;
}
