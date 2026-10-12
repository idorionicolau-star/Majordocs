export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextResponse } from 'next/server';
import { del, list, put } from '@vercel/blob';
import type { DocumentReference, Firestore } from 'firebase-admin/firestore';
import { initializeAdmin } from '@/lib/firebase-admin';
import { backupPath, BACKUP_PREFIX, dayOf, expiredBackups } from '@/lib/backup-core';

/**
 * Cópia de segurança diária (Vercel Cron): os dados de cada empresa num JSON privado no Vercel Blob,
 * guardados 14 dias. Precisa de um Blob store PRIVADO e do seu token em BACKUP_BLOB_READ_WRITE_TOKEN
 * (as fotos usam outro store, público). Sem o token não faz nada.
 */
async function dumpDoc(ref: DocumentReference, depth = 0): Promise<Record<string, unknown>> {
    const snap = await ref.get();
    const out: Record<string, unknown> = { id: ref.id, data: snap.exists ? snap.data() : null };
    if (depth < 2) {
        const subs = await ref.listCollections();
        for (const col of subs) {
            const docs = await col.listDocuments();
            out[col.id] = await Promise.all(docs.map((d) => dumpDoc(d, depth + 1)));
        }
    }
    return out;
}

async function dumpCollection(db: Firestore, name: string) {
    const qs = await db.collection(name).get();
    return qs.docs.map((d) => ({ id: d.id, data: d.data() }));
}

export async function GET(req: Request) {
    if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = process.env.BACKUP_BLOB_READ_WRITE_TOKEN;
    if (!token) return NextResponse.json({ skipped: 'BACKUP_BLOB_READ_WRITE_TOKEN não configurado' });

    const db = initializeAdmin().firestore();
    const now = new Date();
    const day = dayOf(now);
    const opts = { access: 'private' as const, token, addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json' };
    const saved: string[] = [];
    const failed: string[] = [];

    const companies = await db.collection('companies').listDocuments();
    for (const ref of companies) {
        try {
            const data = await dumpDoc(ref);
            await put(backupPath(day, ref.id), JSON.stringify({ at: now.toISOString(), company: data }), opts);
            saved.push(ref.id);
        } catch (e) {
            console.error('backup', ref.id, e);
            failed.push(ref.id);
        }
    }
    try {
        const global = { users: await dumpCollection(db, 'users'), escalepaySales: await dumpCollection(db, 'escalepaySales'), billingRefs: await dumpCollection(db, 'billingRefs') };
        await put(backupPath(day, '_global'), JSON.stringify({ at: now.toISOString(), ...global }), opts);
    } catch (e) {
        console.error('backup global', e);
        failed.push('_global');
    }

    // apaga as cópias com mais de 14 dias
    let removed = 0;
    try {
        let cursor: string | undefined;
        do {
            const page = await list({ prefix: BACKUP_PREFIX, cursor, token });
            const old = expiredBackups(page.blobs.map((b) => b.pathname), now);
            if (old.length) {
                await del(page.blobs.filter((b) => old.includes(b.pathname)).map((b) => b.url), { token });
                removed += old.length;
            }
            cursor = page.hasMore ? page.cursor : undefined;
        } while (cursor);
    } catch (e) {
        console.error('backup cleanup', e);
    }

    return NextResponse.json({ day, saved: saved.length, failed, removed }, { status: failed.length ? 500 : 200 });
}
