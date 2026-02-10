import { TableVirtuoso } from 'react-virtuoso';
import { Product, Location } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { TableCell, TableRow } from '@/components/ui/table';
import { flexRender, ColumnDef, useReactTable, getCoreRowModel } from '@tanstack/react-table';
import { Card, CardContent } from '@/components/ui/card';
import { forwardRef, useState, useMemo } from 'react';

interface VirtualInventoryListProps {
    products: Product[];
    columns: ColumnDef<Product, any>[];
    loadMore: () => void;
    hasMore: boolean;
    loading: boolean;
}

export function VirtualInventoryList({
    products,
    columns,
    loadMore,
    hasMore,
    loading
}: VirtualInventoryListProps) {

    // We use a simplified table instance just for headers and cell rendering logic
    const table = useReactTable({
        data: products,
        columns,
        getCoreRowModel: getCoreRowModel(),
        manualPagination: true,
        manualSorting: true,
    });

    const { rows } = table.getRowModel();

    return (
        <Card className="glass-card shadow-sm overflow-hidden h-full flex flex-col">
            <CardContent className="p-0 flex-1 h-full">
                <TableVirtuoso
                    style={{ height: '100%' }}
                    data={rows}
                    components={{
                        Table: (props) => <table {...props} className="w-full caption-bottom text-sm" />,
                        TableHead: forwardRef((props, ref) => <thead {...props} ref={ref} className="[&_tr]:border-b" />),
                        TableBody: forwardRef((props, ref) => <tbody {...props} ref={ref} className="[&_tr:last-child]:border-0" />),
                        TableRow: (props) => <tr {...props} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted" />,
                    }}
                    fixedHeaderContent={() => (
                        <TableRow className="bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800 hover:bg-transparent">
                            {table.getHeaderGroups().map((headerGroup) => (
                                headerGroup.headers.map((header) => (
                                    <th
                                        key={header.id}
                                        colSpan={header.colSpan}
                                        className="h-12 px-4 sm:px-8 py-6 text-left align-middle text-[11px] font-[800] text-slate-400 uppercase tracking-[0.1em] [&:has([role=checkbox])]:pr-0"
                                        style={{ width: header.getSize() }}
                                    >
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(
                                                header.column.columnDef.header,
                                                header.getContext()
                                            )}
                                    </th>
                                ))
                            ))}
                        </TableRow>
                    )}
                    itemContent={(index, row) => (
                        <>
                            {row.getVisibleCells().map((cell) => (
                                <TableCell key={cell.id} className="px-4 sm:px-8 py-4">
                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                </TableCell>
                            ))}
                        </>
                    )}
                    endReached={() => {
                        if (hasMore && !loading) {
                            loadMore();
                        }
                    }}
                />
            </CardContent>
        </Card>
    );
}
