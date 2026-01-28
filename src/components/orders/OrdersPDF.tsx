import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { Order, Company } from '@/lib/types';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/utils';

const styles = StyleSheet.create({
    page: { padding: 30, fontSize: 9, fontFamily: 'Helvetica' },
    header: { borderBottom: 2, borderBottomColor: '#eee', paddingBottom: 10, marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between' },
    companyName: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
    reportTitle: { fontSize: 20, fontWeight: 'bold', color: '#3b82f6' },
    table: { marginTop: 10, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 4, overflow: 'hidden' },
    tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', padding: 6, alignItems: 'center' },
    tableHeader: { backgroundColor: '#f8fafc', fontWeight: 'bold' },
    colProduct: { width: '25%' },
    colClient: { width: '20%' },
    colDelivery: { width: '15%' },
    colQty: { width: '12%', textAlign: 'right' },
    colTotal: { width: '15%', textAlign: 'right' },
    colStatus: { width: '13%' },
    footer: { position: 'absolute', bottom: 30, left: 30, right: 30, textAlign: 'center', fontSize: 8, color: '#94a3b8' }
});

interface OrdersPDFProps {
    orders: Order[];
    company: Company | null;
}

export function OrdersPDF({ orders, company }: OrdersPDFProps) {
    return (
        <Document>
            <Page size="A4" orientation="landscape" style={styles.page}>
                <View style={styles.header}>
                    <View>
                        <Text style={styles.companyName}>{company?.name || 'MajorStockX'}</Text>
                    </View>
                    <View style={{ textAlign: 'right' }}>
                        <Text style={styles.reportTitle}>Relatório de Encomendas</Text>
                        <Text style={{ fontSize: 9, color: '#64748b' }}>Gerado em: {new Date().toLocaleDateString('pt-BR')}</Text>
                    </View>
                </View>

                <View style={styles.table}>
                    <View style={[styles.tableRow, styles.tableHeader]}>
                        <Text style={styles.colProduct}>Produto</Text>
                        <Text style={styles.colClient}>Cliente</Text>
                        <Text style={styles.colDelivery}>Entrega</Text>
                        <Text style={styles.colQty}>Qtd.</Text>
                        <Text style={styles.colTotal}>Valor Total</Text>
                        <Text style={styles.colStatus}>Status</Text>
                    </View>
                    {orders.map((order, index) => (
                        <View key={index} style={styles.tableRow} wrap={false}>
                            <Text style={styles.colProduct}>{order.productName}</Text>
                            <Text style={styles.colClient}>{order.clientName || 'N/A'}</Text>
                            <Text style={styles.colDelivery}>{order.deliveryDate ? format(new Date(order.deliveryDate), 'dd/MM/yyyy') : 'N/A'}</Text>
                            <Text style={styles.colQty}>{order.quantity} {order.unit}</Text>
                            <Text style={styles.colTotal}>{order.totalValue ? formatCurrency(order.totalValue) : 'N/A'}</Text>
                            <Text style={styles.colStatus}>{order.status}</Text>
                        </View>
                    ))}
                </View>

                <Text style={styles.footer} fixed render={({ pageNumber, totalPages }) => (
                    `MajorStockX © ${new Date().getFullYear()} - Página ${pageNumber} de ${totalPages}`
                )} />
            </Page>
        </Document>
    );
}
