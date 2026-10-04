"use client";

import { useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { GraduationCap, HelpCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InventoryContext } from "@/context/inventory-context";
import { tutorialFor } from "./guides";
import { isGuideDone, startGuide, useGuideState } from "./guide-store";
import { isWelcomePending } from "@/components/onboarding/welcome";
import { rememberSeen, seenReady } from "@/lib/seen-store";

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
const HINTS_OFF = "majorstockx-hints-off";
/** um convite por sessão, no máximo: não persegue a pessoa de página em página */
const SESSION_KEY = "majorstockx-hint-session";

const flag = (k: string) => { try { return localStorage.getItem(k) === "1"; } catch { return false; } };
const setFlag = (k: string) => { try { localStorage.setItem(k, "1"); } catch { /* ignore */ } rememberSeen(k); };

/**
 * Na primeira visita a uma página, um convite discreto: "Primeira vez aqui? Ver como funciona".
 * Pergunta UMA vez por página (mesmo que seja ignorado), no máximo uma vez por sessão, some sozinho
 * e pode desligar-se de vez. O que já foi visto fica guardado na conta (vale em todos os aparelhos).
 */
export function PageTutorialHint() {
    const pathname = usePathname();
    const ctx = useContext(InventoryContext);
    const guide = useGuideState();
    const t = tutorialFor(pathname);
    const [show, setShow] = useState(false);

    useEffect(() => {
        setShow(false);
        if (!t) return;
        const wanted = () => {
            if (flag(HINTS_OFF) || flag(hintKey(t.guide)) || isGuideDone(t.guide)) return false;
            try { if (sessionStorage.getItem(SESSION_KEY)) return false; } catch { /* ignore */ }
            return true;
        };
        let tries = 0;
        let id = 0;
        // espera que a conta diga o que já foi visto (até ~6 s), para não perguntar o que já foi respondido noutro aparelho
        const check = () => {
            if (!seenReady() && tries++ < 8) { id = window.setTimeout(check, 750); return; }
            // no início com os "Primeiros passos" à vista, o cartão já faz este papel
            if (wanted() && !document.querySelector("[data-tour=dash-started]")) setShow(true);
        };
        id = window.setTimeout(check, 1500);
        // a conta pode dizer, entretanto, que isto já foi feito noutro aparelho (o convite desta vez não conta)
        const recheck = () => { if (flag(HINTS_OFF) || isGuideDone(t.guide)) setShow(false); };
        window.addEventListener("msx:seen-sync", recheck);
        return () => { window.clearTimeout(id); window.removeEventListener("msx:seen-sync", recheck); };
    }, [t?.guide]); // eslint-disable-line react-hooks/exhaustive-deps

    // quem acabou de fazer um tutorial já sabe onde está o "?": não pergunta mais nada nesta sessão
    useEffect(() => {
        if (guide) try { sessionStorage.setItem(SESSION_KEY, "1"); } catch { /* ignore */ }
    }, [guide]);

    const visible = show && !!t && !guide && !!ctx && !ctx.loading && !isWelcomePending(ctx, pathname);

    // mostrado = respondido: não volta a perguntar nesta página; e some sozinho
    useEffect(() => {
        if (!visible || !t) return;
        setFlag(hintKey(t.guide));
        try { sessionStorage.setItem(SESSION_KEY, "1"); } catch { /* ignore */ }
        const id = window.setTimeout(() => setShow(false), 15000);
        return () => window.clearTimeout(id);
    }, [visible, t?.guide]); // eslint-disable-line react-hooks/exhaustive-deps

    if (!visible || !t) return null;

    const dismiss = () => setShow(false);
    const never = () => { setFlag(HINTS_OFF); setShow(false); };

    return (
        <div role="status" className="fixed left-3 right-3 top-[4.5rem] z-40 rounded-2xl border border-primary/30 bg-card px-3 py-2 shadow-lg md:bottom-6 md:left-[17rem] md:right-auto md:top-auto md:w-[24rem]">
            <div className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 shrink-0 text-primary" />
                <p className="min-w-0 flex-1 text-sm leading-tight">
                    <b>Primeira vez em {t.title}?</b>
                    <button type="button" onClick={never} className="block text-xs text-muted-foreground underline-offset-2 hover:underline">
                        Não mostrar mais convites
                    </button>
                </p>
                <Button type="button" size="sm" className="h-8 shrink-0" onClick={() => { dismiss(); startGuide(t.guide); }}>
                    <span className="sm:hidden">Mostrar</span><span className="hidden sm:inline">Ver como funciona</span>
                </Button>
                <button type="button" onClick={dismiss} aria-label="Fechar" className="-mr-1 shrink-0 rounded-full p-1.5 text-muted-foreground hover:bg-muted">
                    <X className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}
