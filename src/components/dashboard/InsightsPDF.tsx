
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

const styles = StyleSheet.create({
    page: {
        padding: 30,
        fontFamily: 'Helvetica',
        fontSize: 10,
        lineHeight: 1.5,
        color: '#334155',
    },
    header: {
        marginBottom: 20,
        borderBottom: '1px solid #e2e8f0',
        paddingBottom: 10,
    },
    title: {
        fontSize: 18,
        fontFamily: 'Helvetica-Bold',
        color: '#0f172a',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 10,
        color: '#64748b',
    },
    content: {
        marginTop: 10,
    },
    paragraph: {
        marginBottom: 10,
        textAlign: 'justify',
    },
    bold: {
        fontFamily: 'Helvetica-Bold',
    },
    bulletPoint: {
        flexDirection: 'row',
        marginBottom: 5,
        paddingLeft: 10,
    },
    bullet: {
        width: 10,
    },
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 30,
        right: 30,
        textAlign: 'center',
        fontSize: 8,
        color: '#94a3b8',
        borderTop: '1px solid #f1f5f9',
        paddingTop: 10,
    },
});

interface InsightsPDFProps {
    insights: string;
    companyName: string;
    date: Date;
}

export function InsightsPDF({ insights, companyName, date }: InsightsPDFProps) {
    // Simple markdown-ish parser for PDF (since react-pdf doesn't support html/markdown natively well)
    const lines = insights.split('\n');

    return (
        <Document title={`Insights - ${companyName}`}>
            <Page size="A4" style={styles.page}>
                <View style={styles.header}>
                    <Text style={styles.title}>Relatório de Insights Operacionais</Text>
                    <Text style={styles.subtitle}>
                        {companyName} • {format(date, "dd 'de' MMMM 'de' yyyy", { locale: pt })}
                    </Text>
                </View>

                <View style={styles.content}>
                    {lines.map((line, index) => {
                        const cleanLine = line.trim();
                        if (!cleanLine) return <View key={index} style={{ height: 10 }} />;

                        // Simple check for bullet points
                        const isBullet = cleanLine.startsWith('-') || cleanLine.startsWith('*');
                        const textContent = isBullet ? cleanLine.substring(1).trim() : cleanLine;

                        // Simple bold parser (only for whole lines or simple segments) - keeping it simple for react-pdf
                        const isBold = cleanLine.startsWith('**') && cleanLine.endsWith('**');
                        const finalContent = isBold ? cleanLine.replace(/\*\*/g, '') : textContent;

                        if (isBullet) {
                            return (
                                <View key={index} style={styles.bulletPoint}>
                                    <Text style={styles.bullet}>•</Text>
                                    <Text style={{ flex: 1 }}>{finalContent}</Text>
                                </View>
                            );
                        }

                        return (
                            <Text
                                key={index}
                                style={[
                                    styles.paragraph,
                                    isBold ? styles.bold : {}
                                ]}
                            >
                                {finalContent}
                            </Text>
                        );
                    })}
                </View>

                <Text style={styles.footer} fixed render={({ pageNumber, totalPages }) => (
                    `${companyName} © MajorStockX - Página ${pageNumber} de ${totalPages}`
                )} />
            </Page>
        </Document>
    );
}
