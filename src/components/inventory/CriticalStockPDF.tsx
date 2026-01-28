import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { Product, Company } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

const styles = StyleSheet.create({
    page: { padding: 30, fontSize: 9, fontFamily: 'Helvetica', backgroundColor: '#f8fafc' },
    header: { borderBottomWidth: 2, borderBottomColor: '#3b82f6', paddingBottom: 15, marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    companyInfo: { flexDirection: 'column' },
    companyName: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
    reportTitle: { fontSize: 22, fontWeight: 'bold', color: '#ef4444' },
    date: { fontSize: 10, color: '#64748b', marginTop: 4 },

    cardsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'flex-start' },
    card: {
        width: '31%',
        backgroundColor: '#ffffff',
        borderRadius: 8,
        padding: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#fee2e2',
        flexDirection: 'column'
    },
    cardHeader: { borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingBottom: 6, marginBottom: 8 },
    productName: { fontSize: 11, fontWeight: 'bold', color: '#1e293b' },
    category: { fontSize: 8, color: '#64748b', marginTop: 2 },

    cardBody: { flexGrow: 1, gap: 6 },
    stockRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
    stockValue: { fontSize: 20, fontWeight: 'bold', color: '#ef4444' },
    stockUnit: { fontSize: 9, color: '#64748b', fontWeight: 'bold' },

    infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
    infoLabel: { fontSize: 8, color: '#94a3b8' },
    infoValue: { fontSize: 9, color: '#475569', fontWeight: 'bold' },

    statusBadge: {
        marginTop: 8,
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 4,
        backgroundColor: '#fef2f2',
        borderWidth: 1,
        borderColor: '#fee2e2',
        alignSelf: 'flex-start'
    },
    statusText: { color: '#ef4444', fontSize: 7, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 },

    footer: { position: 'absolute', bottom: 30, left: 30, right: 30, textAlign: 'center', fontSize: 8, color: '#94a3b8' }
});

interface CriticalStockPDFProps {
    products: Product[];
    company: Company | null;
}

export function CriticalStockPDF({ products, company }: CriticalStockPDFProps) {
    return (
        <Document>
            <Page size="A4" style={styles.page}>
                <View style={styles.header}>
                    <View style={styles.companyInfo}>
                        <Text style={styles.companyName}>{company?.name || 'MajorStockX'}</Text>
                        <Text style={styles.date}>{new Date().toLocaleDateString('pt-BR')}</Text>
                    </View>
                    <View style={{ textAlign: 'right' }}>
                        <Text style={styles.reportTitle}>ALERTA DE STOCK CRÍTICO</Text>
                        <Text style={styles.date}>{products.length} itens necessitam de reposição</Text>
                    </View>
                </View>

                <View style={styles.cardsContainer}>
                    {products.map((product, index) => {
                        const availableStock = product.stock - (product.reservedStock || 0);
                        const isOutOfStock = availableStock <= 0;

                        return (
                            <View key={index} style={styles.card} wrap={false}>
                                <View style={styles.cardHeader}>
                                    <Text style={styles.productName}>{product.name}</Text>
                                    <Text style={styles.category}>{product.category}</Text>
                                </View>

                                <View style={styles.cardBody}>
                                    <View style={styles.stockRow}>
                                        <Text style={styles.stockValue}>{availableStock}</Text>
                                        <Text style={styles.stockUnit}>/ {product.unit || 'un'}</Text>
                                    </View>

                                    <View style={styles.infoRow}>
                                        <Text style={styles.infoLabel}>Mínimo Sugerido:</Text>
                                        <Text style={styles.infoValue}>{product.criticalStockThreshold} {product.unit || 'un'}</Text>
                                    </View>

                                    <View style={styles.infoRow}>
                                        <Text style={styles.infoLabel}>Preço Unitário:</Text>
                                        <Text style={styles.infoValue}>{formatCurrency(product.price)}</Text>
                                    </View>

                                    <View style={styles.statusBadge}>
                                        <Text style={styles.statusText}>
                                            {isOutOfStock ? 'ESGOTADO' : 'STOCK CRÍTICO'}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        );
                    })}
                </View>

                <Text style={styles.footer} fixed render={({ pageNumber, totalPages }) => (
                    `MajorStockX © ${new Date().getFullYear()} - Relatório de Reposição Urgente - Página ${pageNumber} de ${totalPages}`
                )} />
            </Page>
        </Document>
    );
}
