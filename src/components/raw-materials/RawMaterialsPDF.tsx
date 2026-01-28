import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { RawMaterial, Recipe, Company } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

const styles = StyleSheet.create({
    page: { padding: 30, fontSize: 9, fontFamily: 'Helvetica' },
    header: { borderBottom: 2, borderBottomColor: '#eee', paddingBottom: 10, marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between' },
    companyName: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
    reportTitle: { fontSize: 18, fontWeight: 'bold', color: '#3b82f6' },
    table: { marginTop: 10, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 4, overflow: 'hidden' },
    tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', padding: 6, alignItems: 'center' },
    tableHeader: { backgroundColor: '#f8fafc', fontWeight: 'bold' },
    footer: { position: 'absolute', bottom: 30, left: 30, right: 30, textAlign: 'center', fontSize: 8, color: '#94a3b8' },
    sectionTitle: { fontSize: 12, fontWeight: 'bold', marginTop: 15, marginBottom: 5, borderBottomWidth: 1, borderBottomColor: '#eee' }
});

interface RawMaterialsPDFProps {
    type: 'materials' | 'recipes' | 'costs';
    data: any[];
    company: Company | null;
}

export function RawMaterialsPDF({ type, data, company }: RawMaterialsPDFProps) {
    const titleMap = {
        materials: 'Relatório de Matérias-Primas',
        recipes: 'Relatório de Receitas',
        costs: 'Relatório de Custos de Produção'
    };

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                <View style={styles.header}>
                    <View>
                        <Text style={styles.companyName}>{company?.name || 'MajorStockX'}</Text>
                    </View>
                    <View style={{ textAlign: 'right' }}>
                        <Text style={styles.reportTitle}>{titleMap[type]}</Text>
                        <Text style={{ fontSize: 9, color: '#64748b' }}>Data: {new Date().toLocaleDateString('pt-BR')}</Text>
                    </View>
                </View>

                {type === 'materials' && (
                    <View style={styles.table}>
                        <View style={[styles.tableRow, styles.tableHeader]}>
                            <Text style={{ width: '30%' }}>Nome</Text>
                            <Text style={{ width: '15%', textAlign: 'right' }}>Stock</Text>
                            <Text style={{ width: '20%', textAlign: 'right' }}>Custo Unit.</Text>
                            <Text style={{ width: '15%' }}>Unidade</Text>
                            <Text style={{ width: '20%', textAlign: 'right' }}>Nível Mín.</Text>
                        </View>
                        {data.map((m: RawMaterial, i) => (
                            <View key={i} style={styles.tableRow}>
                                <Text style={{ width: '30%' }}>{m.name}</Text>
                                <Text style={{ width: '15%', textAlign: 'right' }}>{m.stock}</Text>
                                <Text style={{ width: '20%', textAlign: 'right' }}>{m.cost ? formatCurrency(m.cost) : 'N/A'}</Text>
                                <Text style={{ width: '15%' }}>{m.unit}</Text>
                                <Text style={{ width: '20%', textAlign: 'right' }}>{m.lowStockThreshold}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {type === 'recipes' && (
                    <View>
                        {data.map((r: Recipe, i) => (
                            <View key={i} wrap={false}>
                                <Text style={styles.sectionTitle}>{r.productName}</Text>
                                <View style={styles.table}>
                                    <View style={[styles.tableRow, styles.tableHeader]}>
                                        <Text style={{ width: '70%' }}>Ingrediente</Text>
                                        <Text style={{ width: '30%', textAlign: 'right' }}>Quantidade</Text>
                                    </View>
                                    {r.ingredients.map((ing, idx) => (
                                        <View key={idx} style={styles.tableRow}>
                                            <Text style={{ width: '70%' }}>{ing.rawMaterialName}</Text>
                                            <Text style={{ width: '30%', textAlign: 'right' }}>{ing.quantity}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                {type === 'costs' && (
                    <View style={styles.table}>
                        <View style={[styles.tableRow, styles.tableHeader]}>
                            <Text style={{ width: '60%' }}>Produto Final</Text>
                            <Text style={{ width: '40%', textAlign: 'right' }}>Custo de Produção / Unidade</Text>
                        </View>
                        {data.map((r: any, i) => (
                            <View key={i} style={styles.tableRow}>
                                <Text style={{ width: '60%' }}>{r.productName}</Text>
                                <Text style={{ width: '40%', textAlign: 'right' }}>
                                    {r.isCalculable ? formatCurrency(r.totalCost) : 'Não calculado'}
                                </Text>
                            </View>
                        ))}
                    </View>
                )}

                <Text style={styles.footer} fixed render={({ pageNumber, totalPages }) => (
                    `MajorStockX © ${new Date().getFullYear()} - Página ${pageNumber} de ${totalPages}`
                )} />
            </Page>
        </Document>
    );
}
