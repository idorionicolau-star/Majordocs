import { collection, doc, getDoc, getDocs, query, where, type DocumentReference, type Firestore } from 'firebase/firestore';

/**
 * O documento do produto no INVENTÁRIO. O `productId` de uma encomenda pode ser o ID do inventário, o ID do
 * catálogo (são diferentes) ou o nome — por isso tenta o ID e, se não existir, procura por nome + localização.
 */
/** O primeiro produto que NÃO está na lixeira. Os da lixeira continuam na base de dados e nunca devem receber stock nem reservas. */
export function pickActive<T extends { data(): any }>(docs: T[]): T | undefined {
    return docs.find((d) => !d.data()?.deletedAt);
}

export async function resolveInventoryProductRef(
    firestore: Firestore,
    companyId: string,
    ref: { productId?: string; productName: string; location?: string },
): Promise<DocumentReference | null> {
    const products = collection(firestore, `companies/${companyId}/products`);
    if (ref.productId) {
        const direct = doc(products, ref.productId);
        const snap = await getDoc(direct);
        if (snap.exists() && !snap.data()?.deletedAt) return direct;
    }
    const snap = await getDocs(query(products, where('name', '==', ref.productName), where('location', '==', ref.location || '')));
    return pickActive(snap.docs)?.ref ?? null;
}
