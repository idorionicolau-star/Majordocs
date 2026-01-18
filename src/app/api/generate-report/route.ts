
import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

export async function GET(req: NextRequest) {
    // For now, we won't use request params, we'll just render the static template
    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month'); // e.g., '2024-07'

    try {
        // Determine the base URL
        const host = req.headers.get('host');
        const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
        const baseUrl = `${protocol}://${host}`;

        // The URL of the page we want to render to PDF
        // IMPORTANT: We will need to pass data to this page later.
        const urlToRender = `${baseUrl}/report-template`;

        const browser = await puppeteer.launch({
            // On production environments (like Vercel), you need to specify the path
            // to a pre-installed Chrome binary. For local dev, it works out of the box.
            // You might also need '--no-sandbox' for Linux environments.
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            headless: true
        });

        const page = await browser.newPage();

        // Navigate to the page and wait for it to be fully loaded
        await page.goto(urlToRender, { waitUntil: 'networkidle0' });

        // Generate the PDF
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true, // Important for styles
            margin: {
                top: '20px',
                right: '20px',
                bottom: '20px',
                left: '20px'
            }
        });

        await browser.close();

        // Return the PDF as a response
        return new NextResponse(pdfBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="relatorio-${month || 'mensal'}.pdf"`,
            },
        });

    } catch (error) {
        console.error('Error generating PDF:', error);
        return new NextResponse('Error generating PDF', { status: 500 });
    }
}
