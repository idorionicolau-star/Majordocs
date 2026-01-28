import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { Production, Company } from '@/lib/types';
import { format } from 'date-fns';

const styles = StyleSheet.create({
    page: { padding: 30, fontSize: 9, fontFamily: 'Helvetica' },
    header: { borderBottom: 2, borderBottomColor: '#eee', paddingBottom: 10, marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between' },
    companyName: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
    reportTitle: { fontSize: 20, fontWeight: 'bold', color: '#3b82f6' },
    table: { marginTop: 10, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 4, overflow: 'hidden' },
    tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', padding: 6, alignItems: 'center' },
    tableHeader: { backgroundColor: '#f8fafc', fontWeight: 'bold' },
    colDate: { width: '12%' },
    colProduct: { width: '25%' },
    colQty: { width: '10%', textAlign: 'right' },
    colUnit: { width: '10%' },
    colLocation: { width: '15%' },
    colUser: { width: '15%' },
    colStatus: { width: '13%' },
    footer: { position: 'absolute', bottom: 30, left: 30, right: 30, textAlign: 'center', fontSize: 8, color: '#94a3b8' }
});

interface ProductionPDFProps {
    productions: Production[];
    company: Company | null;
    locations: any[];
}

export function ProductionPDF({ productions, company, locations }: ProductionPDFProps) {
    return (
        <Document>
            <Page size="A4" orientation="landscape" style={styles.page}>
                <View style={styles.header}>
                    <View>
                        <Text style={styles.companyName}>{company?.name || 'MajorStockX'}</Text>
                    </View>
                    <View style={{ textAlign: 'right' }}>
                        <Text style={styles.reportTitle}>Relatório de Produção</Text>
                        <Text style={{ fontSize: 9, color: '#64748b' }}>Gerado em: {new Date().toLocaleDateString('pt-BR')}</Text>
                    </View>
                </View>

                <View style={styles.table}>
                    <View style={[styles.tableRow, styles.tableHeader]}>
                        <Text style={styles.colDate}>Data</Text>
                        <Text style={styles.colProduct}>Produto</Text>
                        <Text style={styles.colQty}>Qtd.</Text>
                        <Text style={styles.colUnit}>Und.</Text>
                        <Text style={styles.colLocation}>Localização</Text>
                        <Text style={styles.colUser}>Registado por</Text>
                        <Text style={styles.colStatus}>Status</Text>
                    </View>
                    {productions.map((prod, index) => (
                        <View key={index} style={styles.tableRow} wrap={false}>
                            <Text style={styles.colDate}>{format(new Date(prod.date), 'dd/MM/yyyy')}</Text>
                            <Text style={styles.colProduct}>{prod.productName}</Text>
                            <Text style={styles.colQty}>{prod.quantity}</Text>
                            <Text style={styles.colUnit}>{prod.unit || 'un.'}</Text>
                            <Text style={styles.colLocation}>{locations.find(l => l.id === prod.location)?.name || 'N/A'}</Text>
                            <Text style={styles.colUser}>{prod.registeredBy}</Text>
                            <Text style={styles.colStatus}>{prod.status}</Text>
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
