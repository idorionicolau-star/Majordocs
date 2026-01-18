import { format } from 'date-fns';
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
}

export function ReportPDF({ sales, summary, company, date, aiSummary }: ReportPDFProps) {
    const styles = `
        body { font-family: 'PT Sans', sans-serif; line-height: 1.6; color: #333; margin: 0; background-color: #fff; }
        .container { max-width: 800px; margin: auto; padding: 2rem; }
        .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #eee; padding-bottom: 1rem; margin-bottom: 2rem; }
        .header h1 { font-family: 'Space Grotesk', sans-serif; font-size: 2rem; color: #3498db; margin: 0; }
        .logo span { font-family: 'Space Grotesk', sans-serif; font-size: 1.5rem; font-weight: bold; color: #3498db; }
        .summary-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem; margin: 2rem 0; text-align: center; }
        .summary-card { background-color: #f9fafb; padding: 1rem; border-radius: 6px; border: 1px solid #eee; }
        .summary-card strong { display: block; margin-bottom: 0.5rem; color: #374151; font-size: 0.8rem; font-family: 'Space Grotesk', sans-serif; }
        .summary-card span { font-size: 1.2rem; font-weight: bold; }
        h2 { font-family: 'Space Grotesk', sans-serif; font-size: 1.5rem; border-bottom: 1px solid #eee; padding-bottom: 0.5rem; margin-top: 2rem; margin-bottom: 1rem;}
        table { width: 100%; border-collapse: collapse; margin-top: 1rem; font-size: 12px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f9fafb; font-family: 'Space Grotesk', sans-serif; }
        .footer { text-align: center; margin-top: 3rem; font-size: 0.8rem; color: #999; }
    `;

    return (
        <html>
            <head>
                <title>Relatório Mensal de Vendas</title>
                 <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link href="https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&family=Space+Grotesk:wght@400;700&display=swap" rel="stylesheet" />
                <style>{styles}</style>
            </head>
            <body>
                <div className="container">
                    <div className="header">
                        <div className="logo">
                            <span>{company?.name || 'MajorStockX'}</span>
                        </div>
                        <h1>Relatório Mensal</h1>
                    </div>
                    <h2>Mês: {format(new Date(date), 'MMMM yyyy', { locale: pt })}</h2>

                    {aiSummary && (
                      <div>
                        <h2 style={{fontSize: '1.2rem', marginTop: '1.5rem'}}>Análise da IA</h2>
                        <div style={{backgroundColor: '#f9fafb', padding: '1rem', borderRadius: '6px', border: '1px solid #eee', marginBottom: '2rem'}}>
                            {aiSummary.split('\n').map((p, i) => <p key={i} style={{margin: '0 0 0.5rem 0'}}>{p}</p>)}
                        </div>
                      </div>
                    )}

                    <h2>Resumo das Vendas</h2>
                    <div className="summary-grid">
                        <div className="summary-card"><strong>Total de Vendas</strong><span>{summary.totalSales}</span></div>
                        <div className="summary-card"><strong>Valor Total</strong><span>{formatCurrency(summary.totalValue)}</span></div>
                        <div className="summary-card"><strong>Ticket Médio</strong><span>{formatCurrency(summary.averageTicket)}</span></div>
                        <div className="summary-card" style={{gridColumn: 'span 3'}}><strong>Produto Mais Vendido</strong><span>{summary.bestSellingProduct.name} ({summary.bestSellingProduct.quantity} un)</span></div>
                    </div>

                    <h2>Detalhes das Vendas</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>Data</th>
                                <th>Guia N.º</th>
                                <th>Produto</th>
                                <th>Qtd</th>
                                <th>Valor Total</th>
                                <th>Vendedor</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sales.map(sale => (
                                <tr key={sale.id}>
                                    <td>{format(new Date(sale.date), 'dd/MM/yy')}</td>
                                    <td>{sale.guideNumber}</td>
                                    <td>{sale.productName}</td>
                                    <td>{sale.quantity}</td>
                                    <td>{formatCurrency(sale.totalValue)}</td>
                                    <td>{sale.soldBy}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="footer">
                        <p>{company?.name || 'MajorStockX'} &copy; {new Date().getFullYear()}</p>
                    </div>
                </div>
            </body>
        </html>
    );
}
