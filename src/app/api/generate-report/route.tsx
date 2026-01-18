
import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import { Buffer } from 'buffer';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // Serialize and Base64-encode the data to pass in the URL
        const dataString = JSON.stringify(body);
        const encodedData = Buffer.from(dataString).toString('base64');
        
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:9002';
        const reportUrl = new URL(`${baseUrl}/reports/preview`);
        reportUrl.searchParams.append('data', encodedData);

        const browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            headless: true
        });

        const page = await browser.newPage();
        
        await page.goto(reportUrl.toString(), { waitUntil: 'networkidle0' });

        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '20px',
                right: '20px',
                bottom: '20px',
                left: '20px'
            }
        });

        await browser.close();
        
        const fileName = `relatorio-${new Date().toISOString().slice(0, 7)}.pdf`;

        return new NextResponse(pdfBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${fileName}"`,
            },
        });

    } catch (error) {
        console.error('Error generating PDF:', error);
        return new NextResponse('Error generating PDF', { status: 500 });
    }
}
