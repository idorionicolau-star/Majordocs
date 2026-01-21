
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { pt } from 'date-fns/locale';
import { formatCurrency } from '@/lib/utils';
import type { Sale, Company } from '@/lib/types';

type ReportSummary = {
  totalSales: number;
  totalValue: number;
  averageTicket: number;
  bestSellingProduct: { name: string; quantity: number };
}

interface ReportPDFProps {
  sales: Sale[];
  summary: ReportSummary;
  company: Company | null;
  date: Date;
  aiSummary?: string;
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
}

// Register fonts for consistent rendering (optional but recommended)
// Font.register({ family: 'Helvetica', fonts: [
//   { src: 'path/to/your/font.ttf' },
//   { src: 'path/to/your/bold-font.ttf', fontWeight: 'bold' },
// ]});

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    paddingTop: 35,
    paddingBottom: 65,
    paddingHorizontal: 35,
    lineHeight: 1.4,
    color: '#333',
    backgroundColor: 'white'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 2,
    borderBottomColor: '#eee',
    paddingBottom: 10,
    marginBottom: 20,
  },
  companyName: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: '#1e293b',
  },
  reportTitle: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: '#3b82f6',
    textAlign: 'right',
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 5,
    marginTop: 15,
    marginBottom: 10,
    color: '#0f172a',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    justifyContent: 'space-between',
  },
  summaryCard: {
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    width: '48.5%',
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 8,
    color: '#64748b',
    marginBottom: 4,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase'
  },
  summaryValue: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
  },
  aiSummaryBox: {
      backgroundColor: '#f1f5f9',
      padding: 12,
      borderRadius: 6,
      borderLeftWidth: 3,
      borderLeftColor: '#3b82f6',
      marginBottom: 15,
  },
  aiSummaryText: {
      fontSize: 9,
      fontFamily: 'Helvetica-Oblique',
      color: '#475569'
  },
  table: {
    display: "flex",
    width: "auto",
    borderStyle: "solid",
    borderWidth: 1,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderColor: '#e2e8f0',
    borderRadius: 4,
    overflow: 'hidden'
  },
  tableRow: {
    flexDirection: "row",
    borderBottomStyle: 'solid',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#fff'
  },
  tableHeader: {
    backgroundColor: '#f8fafc',
  },
  tableColHeader: {
    padding: 6,
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    textTransform: 'uppercase',
    color: '#475569',
  },
  tableCell: {
    padding: 6,
  },
  colDate: { width: '15%' },
  colGuide: { width: '15%' },
  colProduct: { width: '25%' },
  colQty: { width: '10%', textAlign: 'right' },
  colValue: { width: '15%', textAlign: 'right' },
  colSeller: { width: '20%' },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 35,
    right: 35,
    textAlign: 'center',
    fontSize: 8,
    color: '#94a3b8',
  },
});

export function ReportPDF({ sales, summary, company, date, aiSummary, period }: ReportPDFProps) {
    const getPeriodTitle = (period: string) => {
        switch (period) {
            case 'daily': return 'Relatório Diário';
            case 'weekly': return 'Relatório Semanal';
            case 'monthly': return 'Relatório Mensal';
            case 'yearly': return 'Relatório Anual';
            default: return 'Relatório';
        }
    }
    const getPeriodSubtitle = (period: string, date: Date) => {
        if (!date) return "";
        switch (period) {
            case 'daily': return format(date, "dd 'de' MMMM 'de' yyyy", { locale: pt });
            case 'weekly':
                const start = startOfWeek(date, { locale: pt });
                const end = endOfWeek(date, { locale: pt });
                return `${format(start, 'dd/MM')} a ${format(end, 'dd/MM/yyyy')}`;
            case 'monthly': return format(date, 'MMMM yyyy', { locale: pt });
            case 'yearly': return format(date, 'yyyy');
            default: return format(date, 'MMMM yyyy', { locale: pt });
        }
    }

    const reportTitle = getPeriodTitle(period);
    const reportSubtitle = getPeriodSubtitle(period, date);

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                <View style={styles.header} fixed>
                    <View>
                        <Text style={styles.companyName}>{company?.name || 'MajorStockX'}</Text>
                        <Text style={{fontSize: 9, color: '#475569'}}>{company?.address}</Text>
                        <Text style={{fontSize: 9, color: '#475569'}}>NUIT: {company?.taxId}</Text>
                    </View>
                    <View>
                      <Text style={styles.reportTitle}>{reportTitle}</Text>
                      <Text style={{fontSize: 11, textAlign: 'right', color: '#475569'}}>
                        {reportSubtitle}
                      </Text>
                    </View>
                </View>

                {aiSummary && (
                  <View>
                    <Text style={styles.sectionTitle}>Análise da IA</Text>
                    <View style={styles.aiSummaryBox}>
                        <Text style={styles.aiSummaryText}>{aiSummary}</Text>
                    </View>
                  </View>
                )}
                
                <Text style={styles.sectionTitle}>Resumo do Mês</Text>
                <View style={styles.summaryGrid}>
                    <View style={styles.summaryCard}><Text style={styles.summaryLabel}>Total de Vendas</Text><Text style={styles.summaryValue}>{summary.totalSales}</Text></View>
                    <View style={styles.summaryCard}><Text style={styles.summaryLabel}>Valor Total</Text><Text style={styles.summaryValue}>{formatCurrency(summary.totalValue)}</Text></View>
                    <View style={styles.summaryCard}><Text style={styles.summaryLabel}>Ticket Médio</Text><Text style={styles.summaryValue}>{formatCurrency(summary.averageTicket)}</Text></View>
                    <View style={styles.summaryCard}><Text style={styles.summaryLabel}>Mais Vendido</Text><Text style={styles.summaryValue}>{summary.bestSellingProduct.name} ({summary.bestSellingProduct.quantity} un)</Text></View>
                </View>

                <Text style={styles.sectionTitle}>Detalhes das Vendas</Text>
                <View style={styles.table}>
                    <View style={[styles.tableRow, styles.tableHeader]} fixed>
                        <Text style={[styles.tableColHeader, styles.colDate]}>Data</Text>
                        <Text style={[styles.tableColHeader, styles.colGuide]}>Guia N.º</Text>
                        <Text style={[styles.tableColHeader, styles.colProduct]}>Produto</Text>
                        <Text style={[styles.tableColHeader, styles.colQty]}>Qtd</Text>
                        <Text style={[styles.tableColHeader, styles.colValue]}>Valor Total</Text>
                        <Text style={[styles.tableColHeader, styles.colSeller]}>Vendedor</Text>
                    </View>
                    {sales.map(sale => (
                        <View key={sale.id} style={styles.tableRow} wrap={false}>
                            <Text style={[styles.tableCell, styles.colDate]}>{format(new Date(sale.date), 'dd/MM/yy')}</Text>
                            <Text style={[styles.tableCell, styles.colGuide]}>{sale.guideNumber}</Text>
                            <Text style={[styles.tableCell, styles.colProduct]}>{sale.productName}</Text>
                            <Text style={[styles.tableCell, styles.colQty]}>{sale.quantity}</Text>
                            <Text style={[styles.tableCell, styles.colValue]}>{formatCurrency(sale.totalValue)}</Text>
                            <Text style={[styles.tableCell, styles.colSeller]}>{sale.soldBy}</Text>
                        </View>
                    ))}
                    {sales.length === 0 && (
                        <View style={styles.tableRow}>
                            <Text style={[styles.tableCell, {textAlign: 'center', width: '100%', padding: 20}]}>Nenhuma venda encontrada para este período.</Text>
                        </View>
                    )}
                </View>

                <Text style={styles.footer} fixed render={({ pageNumber, totalPages }) => (
                    `${company?.name || 'MajorStockX'} © ${new Date().getFullYear()} - Página ${pageNumber} / ${totalPages}`
                )} />
            </Page>
        </Document>
    );
}

    