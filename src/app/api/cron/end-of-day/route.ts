import { NextResponse } from 'next/server';
import { initializeAdmin } from '@/lib/firebase-admin';
import { Resend } from 'resend';
import { formatCurrency } from '@/lib/utils';
import { format, startOfDay, endOfDay } from 'date-fns';

export async function GET(req: Request) {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const adminApp = initializeAdmin();
        const db = adminApp.firestore();
        const apiKey = process.env.RESEND_API_KEY;
        const resend = new Resend(apiKey);

        // Obtém o horário exato de agora e subtrai 24 horas
        const now = new Date();
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        const startISO = yesterday.toISOString();
        const endISO = now.toISOString();
        const formattedDate = format(now, 'dd/MM/yyyy');

        // Fetch all companies
        const companiesSnapshot = await db.collection('companies').get();

        const emailsPromises: Promise<any>[] = [];

        companiesSnapshot.forEach((companyDoc) => {
            const companyData = companyDoc.data();
            const settings = companyData.notificationSettings;

            const targetEmails: any[] = [];
            if (settings?.emails && Array.isArray(settings.emails)) {
                targetEmails.push(...settings.emails.filter((e: any) => e.onEndOfDayReport && e.email && e.email.trim() !== ''));
            }

            if (targetEmails.length > 0) {
                // We need to fetch stats for this company
                const companyId = companyDoc.id;

                const computeAndSend = async () => {
                    // 1. Fetch Sales for the last 24h
                    const salesSnapshot = await db.collection(`companies/${companyId}/sales`)
                        .where('date', '>=', startISO)
                        .where('date', '<=', endISO)
                        .get();

                    let totalSalesCount = 0;
                    let totalSalesValue = 0;

                    salesSnapshot.forEach(saleDoc => {
                        const sale = saleDoc.data();
                        if (sale.documentType !== 'Factura Proforma') {
                            totalSalesCount++;
                            totalSalesValue += (sale.amountPaid ?? (sale.totalValue || 0));
                        }
                    });

                    // 2. Fetch Critical Stock
                    const productsSnapshot = await db.collection(`companies/${companyId}/products`).get();
                    let criticalItemsCount = 0;

                    productsSnapshot.forEach(prodDoc => {
                        const prod = prodDoc.data();
                        if (prod.deletedAt) return;
                        const availableStock = (prod.stock || 0) - (prod.reservedStock || 0);
                        if (availableStock <= (prod.criticalStockThreshold || 0)) {
                            criticalItemsCount++;
                        }
                    });

                    // 3. Prepare HTML
                    const displayName = companyData.name || 'MajorStockX';
                    const logoUrl = companyData.logoUrl;
                    const logoHtml = logoUrl
                        ? `<img src="${logoUrl}" alt="${displayName}" style="max-height: 48px; max-width: 180px; object-fit: contain; margin-bottom: 8px;" /><br/>`
                        : '';

                    const headerHtml = `
               <div style="background-color: #0f172a; padding: 24px; text-align: center;">
                 ${logoHtml}
                 <h1 style="color: white; margin: 0; font-size: 20px; font-weight: bold;">${displayName}</h1>
               </div>
             `;
                    const footerHtml = `
               <div style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8;">
                 &copy; ${now.getFullYear()} MajorStockX
               </div>
           `;

                    const color = '#f59e0b'; // Amber
                    const accentColor = '#fffbeb';

                    const htmlContent = `
             ${headerHtml}
             <div style="padding: 24px;">
               <h2 style="color: ${color}; font-size: 22px; margin-top: 0;">
                 📊 Relatório de Fecho do Dia
               </h2>
               <p>Olá,</p>
               <p>Aqui está o resumo das atividades da sua empresa no dia <strong>${formattedDate}</strong>:</p>
               
               <div style="background-color: ${accentColor}; border: 1px solid ${color}; padding: 16px; border-radius: 8px; margin: 20px 0;">
                 <p style="margin: 4px 0; font-size: 16px;"><strong>Vendas Realizadas:</strong> ${totalSalesCount}</p>
                 <p style="margin: 4px 0; font-size: 16px;"><strong>Valor Total de Vendas:</strong> <span style="font-weight: bold; color: #15803d;">${formatCurrency(totalSalesValue)}</span></p>
                 <p style="margin: 4px 0; font-size: 16px;"><strong>Produtos em Stock Crítico:</strong> <span style="font-weight: bold; color: #b91c1c;">${criticalItemsCount}</span></p>
               </div>
 
               <p style="font-size: 14px; color: #64748b;">Aceda ao seu painel para ver mais detalhes.</p>
             </div>
             ${footerHtml}
         `;

                    const finalHtml = `
           <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 20px auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
             ${htmlContent}
           </div>
         `;

                    const toEmails = targetEmails.map((t: any) => t.email);

                    return resend.emails.send({
                        from: 'Major Assistant <assistant@majorgroup.app>',
                        to: toEmails,
                        subject: `📊 Relatório Diário - ${displayName}`,
                        html: finalHtml,
                    });
                };

                emailsPromises.push(computeAndSend());
            }
        });

        await Promise.allSettled(emailsPromises);

        return NextResponse.json({ success: true, message: "End of day reports generated and dispatched" });
    } catch (error: any) {
        console.error('Error executing End-of-Day cron:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
