import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { Product, Company } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

const styles = StyleSheet.create({
    page: { padding: 30, fontSize: 9, fontFamily: 'Helvetica' },
    header: { borderBottom: 2, borderBottomColor: '#eee', paddingBottom: 10, marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between' },
    companyName: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
    reportTitle: { fontSize: 20, fontWeight: 'bold', color: '#3b82f6' },
    date: { fontSize: 10, color: '#64748b', marginTop: 4 },
    table: { marginTop: 10, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 4, overflow: 'hidden' },
    tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', padding: 6, alignItems: 'center' },
    tableHeader: { backgroundColor: '#f8fafc', fontWeight: 'bold' },
    colProduct: { width: '35%' },
    colCategory: { width: '20%' },
    colStock: { width: '15%', textAlign: 'right' },
    colPrice: { width: '15%', textAlign: 'right' },
    colTotal: { width: '15%', textAlign: 'right' },
    footer: { position: 'absolute', bottom: 30, left: 30, right: 30, textAlign: 'center', fontSize: 8, color: '#94a3b8' },
    grandTotal: { marginTop: 20, padding: 10, backgroundColor: '#f1f5f9', borderRadius: 4, alignSelf: 'flex-end', width: '40%' },
    grandTotalLabel: { fontSize: 10, fontWeight: 'bold', color: '#1e293b' },
    grandTotalValue: { fontSize: 12, fontWeight: 'bold', color: '#3b82f6', marginTop: 2 }
});

interface InventoryPDFProps {
    products: Product[];
    company: Company | null;
    locationName: string;
}

export function InventoryPDF({ products, company, locationName }: InventoryPDFProps) {
    const totalInventoryValue = products.reduce((acc, p) => acc + (p.stock - (p.reservedStock || 0)) * p.price, 0);

    return (
        <Document>
            <Page size="A4" orientation="landscape" style={styles.page}>
                <View style={styles.header}>
                    <View>
                        <Text style={styles.companyName}>{company?.name || 'MajorStockX'}</Text>
                        <Text>{company?.address}</Text>
                    </View>
                    <View style={{ textAlign: 'right' }}>
                        <Text style={styles.reportTitle}>Relatório de Inventário</Text>
                        <Text style={styles.date}>{locationName} • {new Date().toLocaleDateString('pt-BR')}</Text>
                    </View>
                </View>

                <View style={styles.table}>
                    <View style={[styles.tableRow, styles.tableHeader]}>
                        <Text style={styles.colProduct}>Produto</Text>
                        <Text style={styles.colCategory}>Categoria</Text>
                        <Text style={styles.colStock}>Stock Disp.</Text>
                        <Text style={styles.colPrice}>Preço Unit.</Text>
                        <Text style={styles.colTotal}>Valor Total</Text>
                    </View>
                    {products.map((product, index) => {
                        const availableStock = product.stock - (product.reservedStock || 0);
                        const stockValue = availableStock * product.price;
                        return (
                            <View key={index} style={styles.tableRow} wrap={false}>
                                <Text style={styles.colProduct}>{product.name}</Text>
                                <Text style={styles.colCategory}>{product.category}</Text>
                                <Text style={styles.colStock}>{availableStock} {product.unit || 'un.'}</Text>
                                <Text style={styles.colPrice}>{formatCurrency(product.price)}</Text>
                                <Text style={styles.colTotal}>{formatCurrency(stockValue)}</Text>
                            </View>
                        );
                    })}
                </View>

                <View style={styles.grandTotal}>
                    <Text style={styles.grandTotalLabel}>VALOR TOTAL DO INVENTÁRIO</Text>
                    <Text style={styles.grandTotalValue}>{formatCurrency(totalInventoryValue)}</Text>
                </View>

                <Text style={styles.footer} fixed render={({ pageNumber, totalPages }) => (
                    `MajorStockX © ${new Date().getFullYear()} - Página ${pageNumber} de ${totalPages}`
                )} />
            </Page>
        </Document>
    );
}
