
import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import { renderToStaticMarkup } from 'react-dom/server';
import { ReportPDF } from '@/components/reports/ReportPDF';
import { format } from 'date-fns';
import React from 'react';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { sales, summary, company, date } = body;

        // Render the React component to a static HTML string
        const html = renderToStaticMarkup(
            <ReportPDF 
                sales={sales}
                summary={summary}
                company={company}
                date={date}
            />
        );

        const browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            headless: true
        });

        const page = await browser.newPage();

        // Set the content of the page to our rendered HTML
        // We use 'networkidle0' to ensure any external resources like fonts are loaded
        await page.setContent(html, { waitUntil: 'networkidle0' });

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
        
        const fileName = `relatorio-${format(new Date(date), 'MM-yyyy')}.pdf`;

        // Return the PDF as a response
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
