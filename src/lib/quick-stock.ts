import {
    collection,
    doc,
    increment,
    serverTimestamp,
    writeBatch,
    type Firestore,
} from "firebase/firestore";
import type { Product, StockMovement } from "@/lib/types";
import { normalizeString } from "@/lib/utils";

export type QuickMode = "in" | "out" | "count";

export type QuickLine = {
    /** name|location — stable key used to merge repeated entries */
    key: string;
    name: string;
    location: string;
    /** Firestore doc ids behind this (possibly merged) product. Empty when isNew. */
    sourceIds: string[];
    /** Stock the system had when the line was created (for previews and audits) */
    systemStock: number;
    unit: string;
    /** Quantity entered / removed, or the physical count in count mode */
    qty: number;
    isNew?: boolean;
    price?: number;
};

export const lineKey = (name: string, location: string) =>
    `${normalizeString(name.trim())}|${location || ""}`;

export const toNumber = (raw: string): number => {
    const n = parseFloat(String(raw).replace(/\s/g, "").replace(",", "."));
    return Number.isFinite(n) ? n : NaN;
};

const NUM = String.raw`(\d+(?:[.,]\d+)?)`;

/**
 * Splits what the user typed into a product search term and an optional quantity.
 *   "bloco 15 x 200"  -> { term: "bloco 15", qty: 200 }
 *   "200x bloco 15"   -> { term: "bloco 15", qty: 200 }
 *   "cimento 20"      -> { term: "cimento", qty: 20 }   (unless a product is literally called "... 20")
 *   "20 cimento"      -> { term: "cimento", qty: 20 }
 */
export function parseQuickInput(
    input: string,
    productNames: string[]
): { term: string; qty: number | null } {
    const text = input.trim().replace(/\s+/g, " ");
    if (!text) return { term: "", qty: null };

    // If the text is a complete product name (or its start, ending on a word boundary),
    // e.g. "Bloco 15" or "Bloco 15x40", it is a name — not name + quantity.
    const norm = normalizeString(text);
    const esc = norm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const boundary = new RegExp(`(^|\\s)${esc}(\\s|$)`);
    if (productNames.some((n) => boundary.test(normalizeString(n)))) return { term: text, qty: null };

    // Explicit multiplier: "nome x 20", "nome *20", "20x nome"
    let m = text.match(new RegExp(`^(.+?)\\s*[x×*]\\s*${NUM}$`, "i"));
    if (m && m[1].trim()) return { term: m[1].trim(), qty: toNumber(m[2]) };
    m = text.match(new RegExp(`^${NUM}\\s*[x×*]\\s*(.+)$`, "i"));
    if (m && m[2].trim()) return { term: m[2].trim(), qty: toNumber(m[1]) };

    // Plain trailing or leading number: "cimento 20", "20 cimento"
    m = text.match(new RegExp(`^(.+?)\\s+${NUM}$`));
    if (m) return { term: m[1].trim(), qty: toNumber(m[2]) };
    m = text.match(new RegExp(`^${NUM}\\s+(.+)$`));
    if (m) return { term: m[2].trim(), qty: toNumber(m[1]) };

    return { term: text, qty: null };
}

/** Fast, typo-tolerant-enough search: every word must appear in the name; prefix matches first. */
export function searchProducts(products: Product[], term: string, limit = 8): Product[] {
    const t = normalizeString(term.trim());
    if (!t) return [];
    const tokens = t.split(" ").filter(Boolean);
    const scored: { p: Product; score: number }[] = [];
    for (const p of products) {
        const name = normalizeString(p.name);
        if (!tokens.every((tok) => name.includes(tok))) continue;
        let score = 0;
        if (name === t) score += 100;
        if (name.startsWith(t)) score += 50;
        if (name.startsWith(tokens[0])) score += 20;
        if (name.split(" ").some((w) => w.startsWith(tokens[0]))) score += 10;
        score -= name.length / 100; // shorter names first on ties
        scored.push({ p, score });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map((s) => s.p);
}

export function lineFromProduct(p: Product, qty: number): QuickLine {
    return {
        key: lineKey(p.name, p.location || ""),
        name: p.name,
        location: p.location || "",
        sourceIds: p.sourceIds?.length ? p.sourceIds : p.id ? [p.id] : [],
        systemStock: p.stock || 0,
        unit: p.unit || "un",
        qty,
        price: p.price,
    };
}

/** Resulting stock after applying a line, for previews. */
export function resultingStock(mode: QuickMode, line: QuickLine): number {
    if (mode === "count") return line.qty;
    if (mode === "out") return line.systemStock - line.qty;
    return line.systemStock + line.qty;
}

const REASON_DEFAULT: Record<QuickMode, string> = {
    in: "Entrada rápida",
    out: "Saída rápida",
    count: "Contagem rápida",
};

type CommitArgs = {
    firestore: Firestore;
    companyId: string;
    user: { id: string; username: string };
    mode: QuickMode;
    lines: QuickLine[];
    note?: string;
};

/**
 * Writes all lines in as few round-trips as possible (Firestore batches of ≤ 450 ops).
 * Entries/exits use atomic increments, so two people working at once never overwrite each other.
 * Returns true when confirmed by the server, false when queued offline (it will sync later).
 */
export async function commitQuickStock({ firestore, companyId, user, mode, lines, note }: CommitArgs): Promise<boolean> {
    const productsRef = collection(firestore, `companies/${companyId}/products`);
    const movementsRef = collection(firestore, `companies/${companyId}/stockMovements`);
    const now = new Date().toISOString();
    const reason = note?.trim() ? `${REASON_DEFAULT[mode]}: ${note.trim()}` : REASON_DEFAULT[mode];

    const batches = [writeBatch(firestore)];
    let ops = 0;
    const next = (needed: number) => {
        if (ops + needed > 450) {
            batches.push(writeBatch(firestore));
            ops = 0;
        }
        ops += needed;
        return batches[batches.length - 1];
    };

    for (const line of lines) {
        if (!(line.qty >= 0) || (mode !== "count" && line.qty === 0)) continue;

        if (line.isNew || line.sourceIds.length === 0) {
            const b = next(2);
            const ref = doc(productsRef);
            const stock = mode === "out" ? 0 : line.qty;
            b.set(ref, {
                name: line.name.trim(),
                category: "Geral",
                price: line.price || 0,
                cost: 0,
                unit: line.unit || "un",
                stock,
                reservedStock: 0,
                location: line.location || "",
                lowStockThreshold: 0,
                criticalStockThreshold: 0,
                lastUpdated: now,
            });
            const movement: Omit<StockMovement, "id" | "timestamp"> = {
                productId: ref.id,
                productName: line.name.trim(),
                type: "IN",
                quantity: stock,
                toLocationId: line.location || "",
                reason: `${reason} (novo produto)`,
                userId: user.id,
                userName: user.username,
            };
            b.set(doc(movementsRef), { ...movement, timestamp: serverTimestamp() });
            continue;
        }

        const [primaryId, ...others] = line.sourceIds;
        const b = next(2 + (mode === "count" ? others.length : 0));
        const primaryRef = doc(productsRef, primaryId);

        let movement: Omit<StockMovement, "id" | "timestamp">;
        if (mode === "count") {
            b.update(primaryRef, { stock: line.qty, lastUpdated: now });
            for (const id of others) b.update(doc(productsRef, id), { stock: 0, reservedStock: 0, lastUpdated: now });
            movement = {
                productId: primaryId,
                productName: line.name,
                type: "ADJUSTMENT",
                quantity: line.qty - line.systemStock,
                toLocationId: line.location,
                reason,
                userId: user.id,
                userName: user.username,
                isAudit: true,
                systemCountBefore: line.systemStock,
                physicalCount: line.qty,
            };
        } else {
            const delta = mode === "in" ? line.qty : -line.qty;
            b.update(primaryRef, { stock: increment(delta), lastUpdated: now });
            movement = {
                productId: primaryId,
                productName: line.name,
                type: mode === "in" ? "IN" : "OUT",
                quantity: delta,
                ...(mode === "in" ? { toLocationId: line.location } : { fromLocationId: line.location }),
                reason,
                userId: user.id,
                userName: user.username,
            };
        }
        b.set(doc(movementsRef), { ...movement, timestamp: serverTimestamp() });
    }

    // With the persistent local cache the writes are applied locally at once;
    // the promise only resolves when the server confirms. Don't block the user on a bad connection.
    const all = Promise.all(batches.map((b) => b.commit()));
    const timeout = new Promise<"queued">((r) => setTimeout(() => r("queued"), 5000));
    const result = await Promise.race([all.then(() => "ok" as const), timeout]);
    all.catch((e) => console.error("Quick stock commit failed", e));
    return result === "ok";
}
