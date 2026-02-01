import { VirtuosoGrid } from 'react-virtuoso';
import { Sale } from '@/lib/types';
import { SaleCard } from './sale-card';
import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

interface VirtualSalesGridProps {
    sales: Sale[];
    onUpdateSale: (sale: Sale) => void;
    onConfirmPickup: (sale: Sale) => void;
    onDeleteSale: (id: string) => void;
    canEdit: boolean;
    locations: Array<{ id: string, name: string }>;
    gridCols: '3' | '4' | '5';
    loadMore: () => void;
    hasMore: boolean;
    loading: boolean;
}

const GridList = forwardRef<HTMLDivElement, any>(({ className, children, ...props }, ref) => (
    <div
        ref={ref}
        {...props}
        className={cn("flex flex-wrap gap-2 sm:gap-4 pb-4", className)}
    >
        {children}
    </div>
));
GridList.displayName = 'GridList';

export function VirtualSalesGrid({
    sales,
    onUpdateSale,
    onConfirmPickup,
    onDeleteSale,
    canEdit,
    locations,
    gridCols,
    loadMore,
    hasMore,
    loading
}: VirtualSalesGridProps) {

    const ItemContainer = ({ children, ...props }: any) => {
        let widthClass = "w-full";

        if (gridCols === '3') widthClass = "w-full md:w-[calc(33.333%-0.8rem)]";
        else if (gridCols === '4') widthClass = "w-full sm:w-[calc(50%-0.5rem)] md:w-[calc(25%-0.8rem)]";
        else if (gridCols === '5') widthClass = "w-full sm:w-[calc(50%-0.5rem)] md:w-[calc(25%-0.8rem)] lg:w-[calc(20%-0.85rem)]";

        return (
            <div {...props} className={cn(widthClass, "mb-2")}>
                {children}
            </div>
        );
    };

    return (
        <VirtuosoGrid
            style={{ height: 'calc(100vh - 300px)' }}
            useWindowScroll
            data={sales}
            endReached={() => {
                if (hasMore && !loading) {
                    loadMore();
                }
            }}
            overscan={200}
            components={{
                List: GridList,
                Item: ItemContainer,
                Footer: () => loading ? <div className="py-4 text-center text-sm text-muted-foreground">A carregar mais vendas...</div> : null
            }}
            itemContent={(index, sale) => (
                <div style={{ height: '100%' }}>
                    <SaleCard
                        key={sale.id}
                        sale={sale}
                        onUpdateSale={onUpdateSale}
                        onConfirmPickup={onConfirmPickup}
                        onDeleteSale={onDeleteSale}
                        viewMode={gridCols === '5' || gridCols === '4' ? 'condensed' : 'normal'}
                        canEdit={canEdit}
                        locationName={locations.find(l => l.id === sale.location)?.name}
                    />
                </div>
            )}
        />
    );
}
