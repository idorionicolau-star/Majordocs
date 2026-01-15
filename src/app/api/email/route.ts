import { Resend } from 'resend';
import { NextResponse } from 'next/server';

if (!process.env.RESEND_API_KEY) {
  console.warn("RESEND_API_KEY is not set. Email notifications will fail. Please add it to your .env.local file.");
}

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'RESEND_API_KEY is not configured on the server.' }, { status: 500 });
  }

  try {
    const { to, subject, productName, quantity, type, location, threshold } = await req.json();

    const title = type === 'CRITICAL' 
      ? '⚠️ Alerta de Stock Crítico' 
      : '📄 Relatório de Movimentação';

    const color = type === 'CRITICAL' ? '#ef4444' : '#3b82f6';
    const accentColor = type === 'CRITICAL' ? '#fef2f2' : '#eff6ff';

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 20px auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background-color: #0f172a; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 20px; font-weight: bold;">Notificação do MajorStockX</h1>
        </div>
        <div style="padding: 24px;">
          <h2 style="color: ${color}; font-size: 22px; margin-top: 0;">
            ${title}
          </h2>
          <p>Olá,</p>
          <p>O sistema registou uma atualização importante no seu inventário:</p>
          <div style="background-color: ${accentColor}; border: 1px solid ${color}; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 4px 0; font-size: 16px;"><strong>Produto:</strong> ${productName}</p>
            <p style="margin: 4px 0; font-size: 16px;"><strong>Localização:</strong> ${location}</p>
            <p style="margin: 4px 0; font-size: 16px;"><strong>Quantidade Atual:</strong> <span style="font-size: 20px; font-weight: bold; color: ${color};">${quantity}</span></p>
            ${type === 'CRITICAL' ? `<p style="margin: 4px 0; font-size: 16px;"><strong>Limite Crítico:</strong> ${threshold}</p>` : ''}
          </div>
          <p style="font-size: 14px; color: #64748b;">Este é um e-mail automático enviado pelo seu Sistema de Gestão de Inventário, MajorStockX.</p>
        </div>
        <div style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8;">
          &copy; ${new Date().getFullYear()} MajorStockX
        </div>
      </div>
    `;

    const { data, error } = await resend.emails.send({
      from: 'MajorStockX <onboarding@resend.dev>',
      to: [to],
      subject: subject,
      html: htmlContent,
    });

    if (error) {
      console.error('Resend API Error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Internal Server Error:', error);
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 });
  }
}
