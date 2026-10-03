"use client";

import { useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { GraduationCap, HelpCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InventoryContext } from "@/context/inventory-context";
import { tutorialFor } from "./guides";
import { isGuideDone, startGuide, useGuideState } from "./guide-store";
import { isWelcomePending } from "@/components/onboarding/welcome";

/** Botão "?" no topo: explica a página aberta. Só aparece onde há tutorial. */
export function PageHelpButton() {
    const pathname = usePathname();
    const t = tutorialFor(pathname);
    if (!t) return null;
    return (
        <Button
            type="button"
            variant="ghost"
            size="icon"
            data-tour="help-button"
            className="h-9 w-9 md:h-10 md:w-10"
            aria-label={`Como funciona: ${t.title}`}
            title="Como funciona esta página"
            onClick={() => startGuide(t.guide)}
        >
            <HelpCircle className="h-5 w-5" />
        </Button>
    );
}

const hintKey = (id: string) => `majorstockx-hint-dismissed-${id}`;

/** Na primeira visita a uma página, um convite discreto: "Primeira vez aqui? Ver como funciona". */
export function PageTutorialHint() {
    const pathname = usePathname();
    const ctx = useContext(InventoryContext);
    const guide = useGuideState();
    const t = tutorialFor(pathname);
    const [show, setShow] = useState(false);

    useEffect(() => {
        setShow(false);
        if (!t) return;
        let dismissed = false;
        try { dismissed = localStorage.getItem(hintKey(t.guide)) === "1"; } catch { /* ignore */ }
        if (dismissed || isGuideDone(t.guide)) return;
        const id = window.setTimeout(() => setShow(true), 1500);
        return () => window.clearTimeout(id);
    }, [t?.guide]); // eslint-disable-line react-hooks/exhaustive-deps

    if (!show || !t || guide || !ctx || ctx.loading) return null;
    // no primeiro dashboard quem fala é a janela de boas-vindas
    if (isWelcomePending(ctx, pathname)) return null;

    const dismiss = () => {
        try { localStorage.setItem(hintKey(t.guide), "1"); } catch { /* ignore */ }
        setShow(false);
    };

    return (
        <div role="status" className="fixed left-3 right-3 top-[4.5rem] z-40 rounded-2xl border border-primary/30 bg-card p-3 shadow-xl md:bottom-6 md:left-[17rem] md:right-auto md:top-auto md:w-[26rem]">
            <div className="flex items-start gap-2.5">
                <GraduationCap className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <p className="min-w-0 flex-1 text-sm">
                    <b>Primeira vez em {t.title}?</b>
                    <span className="block text-muted-foreground">Mostramos-lhe como funciona, a apontar onde tocar.</span>
                </p>
                <button type="button" onClick={dismiss} aria-label="Fechar" className="-mr-1 -mt-1 shrink-0 rounded-full p-1.5 text-muted-foreground hover:bg-muted">
                    <X className="h-4 w-4" />
                </button>
            </div>
            <div className="mt-2.5 flex justify-end gap-2">
                <Button type="button" size="sm" variant="ghost" onClick={dismiss}>Agora não</Button>
                <Button type="button" size="sm" onClick={() => { dismiss(); startGuide(t.guide); }}>Ver como funciona</Button>
            </div>
        </div>
    );
}
