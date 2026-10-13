"use client";

import { useContext, useEffect } from "react";
import { getAuth } from "firebase/auth";
import { InventoryContext } from "@/context/inventory-context";

/** Avisa o servidor, no máximo uma vez por dia e por empresa, de que a app foi usada (emails de "falta de uso"). */
export function ActivityPing() {
    const inv = useContext(InventoryContext);
    const companyId = inv?.companyId;
    const uid = inv?.firebaseUser?.uid;
    useEffect(() => {
        if (!companyId || !uid) return;
        const key = `majorstockx-active-${companyId}-${uid}`;
        const today = new Date().toISOString().slice(0, 10);
        try { if (localStorage.getItem(key) === today) return; } catch { /* sem storage: envia na mesma */ }
        const t = setTimeout(async () => {
            try {
                const token = await getAuth().currentUser?.getIdToken();
                if (!token) return;
                const r = await fetch("/api/activity", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
                if (r.ok) { try { localStorage.setItem(key, today); } catch { /* ignore */ } }
            } catch { /* offline: tenta na próxima vez */ }
        }, 3000);
        return () => clearTimeout(t);
    }, [companyId, uid]);
    return null;
}
