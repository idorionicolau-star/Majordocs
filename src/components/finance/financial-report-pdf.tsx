
import React from 'react';
import { Page, Text, View, Document, StyleSheet, Font } from '@react-pdf/renderer';
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Sale, Expense } from "@/lib/types";

// Register fonts (optional, using standard fonts for now for reliability)
// Font.register({ family: 'Roboto', src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-light-webfont.ttf' });

const styles = StyleSheet.create({
    page: {
        padding: 40,
        fontFamily: 'Helvetica',
        fontSize: 10,
        color: '#333',
    },
    header: {
        marginBottom: 20,
        borderBottom: 1,
        borderBottomColor: '#eee',
        paddingBottom: 10,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 5,
        color: '#1e293b',
    },
    subtitle: {
        fontSize: 12,
        color: '#64748b',
    },
    summaryGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 30,
        gap: 10,
    },
    summaryCard: {
        flex: 1,
        padding: 15,
        backgroundColor: '#f8fafc',
        borderRadius: 4,
        border: 1,
        borderColor: '#e2e8f0',
    },
    cardLabel: {
        fontSize: 10,
        textTransform: 'uppercase',
        color: '#64748b',
        marginBottom: 5,
    },
    cardValue: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 10,
        marginTop: 20,
        paddingBottom: 5,
        borderBottom: 1,
        borderBottomColor: '#e2e8f0',
        color: '#334155',
    },
    table: {
        width: '100%',
        borderRight: 1,
        borderBottom: 1,
        borderColor: '#e2e8f0',
    },
    tableRow: {
        flexDirection: 'row',
    },
    tableHeader: {
        backgroundColor: '#f8fafc',
        fontWeight: 'bold',
        color: '#475569',
    },
    tableCol: {
        padding: 8,
        borderLeft: 1,
        borderTop: 1,
        borderColor: '#e2e8f0',
    },
    colDate: { width: '20%' },
    colDesc: { width: '40%' },
    colCat: { width: '20%' },
    colAmount: { width: '20%', textAlign: 'right' },

    footer: {
        position: 'absolute',
        bottom: 30,
        left: 40,
        right: 40,
        textAlign: 'center',
        color: '#94a3b8',
        fontSize: 8,
        borderTop: 1,
        borderTopColor: '#eee',
        paddingTop: 10,
    }
});

interface FinancialReportPDFProps {
    companyName: string;
    period: string;
    totalIncome: number;
    totalExpenses: number;
    netProfit: number;
    sales: Sale[];
    expenses: Expense[];
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-MZ', {
        style: 'currency',
        currency: 'MZN'
    }).format(value);
};

export const FinancialReportPDF = ({
    companyName,
    period,
    totalIncome,
    totalExpenses,
    netProfit,
    expenses
}: FinancialReportPDFProps) => (
    <Document>
        <Page size="A4" style={styles.page}>

            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>Relatório Financeiro</Text>
                <Text style={styles.subtitle}>{companyName} • {period}</Text>
            </View>

            {/* Summary Cards */}
            <View style={styles.summaryGrid}>
                <View style={styles.summaryCard}>
                    <Text style={styles.cardLabel}>Entradas</Text>
                    <Text style={[styles.cardValue, { color: '#16a34a' }]}>{formatCurrency(totalIncome)}</Text>
                </View>
                <View style={styles.summaryCard}>
                    <Text style={styles.cardLabel}>Saídas</Text>
                    <Text style={[styles.cardValue, { color: '#dc2626' }]}>{formatCurrency(totalExpenses)}</Text>
                </View>
                <View style={styles.summaryCard}>
                    <Text style={styles.cardLabel}>Lucro Líquido</Text>
                    <Text style={[styles.cardValue, { color: netProfit >= 0 ? '#2563eb' : '#dc2626' }]}>
                        {formatCurrency(netProfit)}
                    </Text>
                </View>
            </View>

            {/* Expenses Table */}
            <Text style={styles.sectionTitle}>Despesas do Período</Text>
            <View style={styles.table}>
                <View style={[styles.tableRow, styles.tableHeader]}>
                    <View style={[styles.tableCol, styles.colDate]}><Text>Data</Text></View>
                    <View style={[styles.tableCol, styles.colDesc]}><Text>Descrição</Text></View>
                    <View style={[styles.tableCol, styles.colCat]}><Text>Categoria</Text></View>
                    <View style={[styles.tableCol, styles.colAmount]}><Text>Valor</Text></View>
                </View>

                {expenses.length > 0 ? expenses.map((expense, index) => (
                    <View key={index} style={styles.tableRow}>
                        <View style={[styles.tableCol, styles.colDate]}>
                            <Text>{format(new Date(expense.date), "dd/MM/yyyy", { locale: ptBR })}</Text>
                        </View>
                        <View style={[styles.tableCol, styles.colDesc]}>
                            <Text>{expense.description}</Text>
                        </View>
                        <View style={[styles.tableCol, styles.colCat]}>
                            <Text>{expense.category}</Text>
                        </View>
                        <View style={[styles.tableCol, styles.colAmount]}>
                            <Text style={{ color: '#dc2626' }}>-{formatCurrency(expense.amount)}</Text>
                        </View>
                    </View>
                )) : (
                    <View style={styles.tableRow}>
                        <View style={[styles.tableCol, { width: '100%', textAlign: 'center', padding: 20 }]}>
                            <Text style={{ color: '#94a3b8' }}>Nenhuma despesa registada.</Text>
                        </View>
                    </View>
                )}
            </View>

            {/* Footer */}
            <View style={styles.footer}>
                <Text>Gerado no dia {format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })} • MajorStockX Sistema de Gestão</Text>
            </View>

        </Page>
    </Document>
);
