export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextResponse } from 'next/server';
import { runFollowups } from '@/lib/followups-run';

/** Emails de acompanhamento à mão (o diário corre com o relatório do fim do dia). ?dry=1 mostra sem enviar. */
export async function GET(req: Request) {
    if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const dry = new URL(req.url).searchParams.get('dry') === '1';
    return NextResponse.json(await runFollowups({ dry }));
}
