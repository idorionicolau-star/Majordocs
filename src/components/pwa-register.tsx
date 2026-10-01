"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import { mainNavItems } from "@/lib/data";

const WARM_KEY = "majorstockx-sw-warm";
const WARM_EVERY_MS = 12 * 60 * 60 * 1000;

/**
 * Regista o service worker (modo offline + notificações) e, uma vez por dia, pede-lhe para
 * guardar as páginas principais. Só em produção: em desenvolvimento a cache atrapalha.
 */
export function PwaRegister() {
    useEffect(() => {
        if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
        let cancelled = false;

        const start = async () => {
            try {
                const reg = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
                await navigator.serviceWorker.ready;
                if (cancelled || !navigator.onLine) return;
                let last = 0;
                try { last = Number(localStorage.getItem(WARM_KEY) || 0); } catch { /* ignore */ }
                if (Date.now() - last < WARM_EVERY_MS) return;
                const urls = Array.from(new Set(["/dashboard", ...mainNavItems.map((i) => i.href)]));
                (reg.active || navigator.serviceWorker.controller)?.postMessage({ type: "WARM", urls });
                try { localStorage.setItem(WARM_KEY, String(Date.now())); } catch { /* ignore */ }
            } catch (e) {
                console.warn("[PWA] service worker não registou:", e);
            }
        };

        // Espera a app carregar para não competir com o primeiro ecrã
        if (document.readyState === "complete") start();
        else window.addEventListener("load", start, { once: true });
        return () => { cancelled = true; };
    }, []);

    return null;
}

/** Faixa que avisa quando não há internet — e tranquiliza: o trabalho fica guardado. */
export function OfflineBanner() {
    const [online, setOnline] = useState(true);

    useEffect(() => {
        const update = () => setOnline(navigator.onLine);
        update();
        window.addEventListener("online", update);
        window.addEventListener("offline", update);
        return () => {
            window.removeEventListener("online", update);
            window.removeEventListener("offline", update);
        };
    }, []);

    if (online) return null;
    return (
        <div role="status" className="mb-3 flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
            <WifiOff className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <p className="min-w-0 flex-1">
                <b>Sem internet.</b> Pode consultar stock, vendas e clientes, e registar entradas e contagens no Stock Rápido (ficam guardadas e seguem quando a ligação voltar). Vender, levantar e transferir precisam de internet, para não gastar stock que já não existe. Não limpe os dados do navegador até sincronizar.
            </p>
        </div>
    );
}
