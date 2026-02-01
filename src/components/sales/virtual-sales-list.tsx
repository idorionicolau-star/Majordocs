import { TableVirtuoso } from 'react-virtuoso';
import { Sale } from '@/lib/types';
import { TableCell, TableRow } from '@/components/ui/table';
import { flexRender, ColumnDef, useReactTable, getCoreRowModel } from '@tanstack/react-table';
import { Card, CardContent } from '@/components/ui/card';
import { forwardRef } from 'react';

interface VirtualSalesListProps {
    sales: Sale[];
    columns: ColumnDef<Sale, any>[];
    loadMore: () => void;
    hasMore: boolean;
    loading: boolean;
}

export function VirtualSalesList({
    sales,
    columns,
    loadMore,
    hasMore,
    loading
}: VirtualSalesListProps) {

    const table = useReactTable({
        data: sales,
        columns,
        getCoreRowModel: getCoreRowModel(),
        manualPagination: true,
        manualSorting: true,
    });

    const { rows } = table.getRowModel();

    return (
        <Card className="glass-card shadow-sm overflow-hidden">
            <CardContent className="p-0">
                <TableVirtuoso
                    useWindowScroll
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
                    footer={() => loading ? (
                        <div className="p-4 text-center text-sm text-muted-foreground w-full bg-background border-t">
                            A carregar mais vendas...
                        </div>
                    ) : null}
                />
            </CardContent>
        </Card>
    );
}
