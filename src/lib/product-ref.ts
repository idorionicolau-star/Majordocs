import { collection, doc, getDoc, getDocs, limit, query, where, type DocumentReference, type Firestore } from 'firebase/firestore';

/**
 * O documento do produto no INVENTÁRIO. O `productId` de uma encomenda pode ser o ID do inventário, o ID do
 * catálogo (são diferentes) ou o nome — por isso tenta o ID e, se não existir, procura por nome + localização.
 */
export async function resolveInventoryProductRef(
    firestore: Firestore,
    companyId: string,
    ref: { productId?: string; productName: string; location?: string },
): Promise<DocumentReference | null> {
    const products = collection(firestore, `companies/${companyId}/products`);
    if (ref.productId) {
        const direct = doc(products, ref.productId);
        if ((await getDoc(direct)).exists()) return direct;
    }
    const snap = await getDocs(query(products, where('name', '==', ref.productName), where('location', '==', ref.location || ''), limit(1)));
    return snap.empty ? null : snap.docs[0].ref;
}
