import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { Sale, Company } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

const styles = StyleSheet.create({
    page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica' },
    header: { borderBottom: 2, borderBottomColor: '#eee', paddingBottom: 10, marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between' },
    companyName: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
    docType: { fontSize: 24, fontWeight: 'bold', color: '#3b82f6' },
    detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 20 },
    detailBox: { width: '50%', padding: 8, backgroundColor: '#f8fafc', borderRadius: 4, marginBottom: 4 },
    label: { fontSize: 8, color: '#64748b', textTransform: 'uppercase', marginBottom: 2 },
    value: { fontSize: 11, fontWeight: 'bold' },
    table: { marginTop: 20, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 4 },
    tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', padding: 8 },
    tableHeader: { backgroundColor: '#f8fafc', fontWeight: 'bold' },
    colProduct: { width: '40%' },
    colQty: { width: '15%', textAlign: 'right' },
    colPrice: { width: '20%', textAlign: 'right' },
    colTotal: { width: '25%', textAlign: 'right' },
    totalsArea: { marginTop: 20, alignSelf: 'flex-end', width: '40%' },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
    finalTotal: { borderTopWidth: 2, borderTopColor: '#333', marginTop: 10, paddingTop: 10 },
    footer: { position: 'absolute', bottom: 30, left: 40, right: 40, textAlign: 'center', fontSize: 8, color: '#94a3b8' }
});

interface SalePDFProps {
    sale: Sale;
    company: Company | null;
}

export function SalePDF({ sale, company }: SalePDFProps) {
    return (
        <Document>
            <Page size="A4" style={styles.page}>
                <View style={styles.header}>
                    <View>
                        <Text style={styles.companyName}>{company?.name || 'MajorStockX'}</Text>
                        <Text>{company?.address}</Text>
                        <Text>NUIT: {company?.taxId}</Text>
                    </View>
                    <Text style={styles.docType}>{sale.documentType}</Text>
                </View>

                <View style={styles.detailsGrid}>
                    <View style={styles.detailBox}>
                        <Text style={styles.label}>Data</Text>
                        <Text style={styles.value}>{new Date(sale.date).toLocaleDateString('pt-BR')}</Text>
                    </View>
                    <View style={styles.detailBox}>
                        <Text style={styles.label}>N.º do Documento</Text>
                        <Text style={styles.value}>{sale.guideNumber}</Text>
                    </View>
                    <View style={styles.detailBox}>
                        <Text style={styles.label}>Cliente</Text>
                        <Text style={styles.value}>{sale.clientName || 'Venda a Dinheiro'}</Text>
                    </View>
                    <View style={styles.detailBox}>
                        <Text style={styles.label}>Vendedor</Text>
                        <Text style={styles.value}>{sale.soldBy}</Text>
                    </View>
                </View>

                <View style={styles.table}>
                    <View style={[styles.tableRow, styles.tableHeader]}>
                        <Text style={styles.colProduct}>Produto</Text>
                        <Text style={styles.colQty}>Qtd</Text>
                        <Text style={styles.colPrice}>Preço Unit.</Text>
                        <Text style={styles.colTotal}>Total</Text>
                    </View>
                    <View style={styles.tableRow}>
                        <Text style={styles.colProduct}>{sale.productName}</Text>
                        <Text style={styles.colQty}>{sale.quantity}</Text>
                        <Text style={styles.colPrice}>{formatCurrency(sale.unitPrice)}</Text>
                        <Text style={styles.colTotal}>{formatCurrency(sale.subtotal)}</Text>
                    </View>
                </View>

                <View style={styles.totalsArea}>
                    <View style={styles.totalRow}>
                        <Text>Subtotal:</Text>
                        <Text>{formatCurrency(sale.subtotal)}</Text>
                    </View>
                    {sale.discount !== undefined && sale.discount > 0 && (
                        <View style={styles.totalRow}>
                            <Text>Desconto:</Text>
                            <Text>-{formatCurrency(sale.discount)}</Text>
                        </View>
                    )}
                    {sale.vat !== undefined && sale.vat > 0 && (
                        <View style={styles.totalRow}>
                            <Text>IVA (16%):</Text>
                            <Text>{formatCurrency(sale.vat)}</Text>
                        </View>
                    )}
                    <View style={[styles.totalRow, styles.finalTotal]}>
                        <Text style={{ fontWeight: 'bold' }}>TOTAL:</Text>
                        <Text style={{ fontWeight: 'bold' }}>{formatCurrency(sale.totalValue)}</Text>
                    </View>
                </View>

                <View style={{ marginTop: 50 }}>
                    <Text>Assinatura (Vendedor): __________________________________</Text>
                    <Text style={{ marginTop: 20 }}>Assinatura (Cliente): __________________________________</Text>
                </View>

                <Text style={styles.footer}>
                    Gerado por MajorStockX - Gestão Inteligente
                </Text>
            </Page>
        </Document>
    );
}
