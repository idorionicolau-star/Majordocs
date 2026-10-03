import type { ReactNode } from "react";

export type GuideStep = {
    /** `data-tour` do elemento a destacar; vários separados por "|" (usa o primeiro que estiver visível). Sem alvo = balão ao centro. */
    target?: string;
    title: string;
    body: ReactNode;
    /** Como se passa ao passo seguinte: botão "Seguinte" (por defeito), tocar no elemento, ou quando `done` ficar verdadeiro. */
    advance?: "next" | "click" | "auto";
    done?: () => boolean;
    /** O que a pessoa tem de fazer (aparece a piscar no lugar do "Seguinte"). */
    hint?: string;
    /** Página onde o passo acontece: o guia navega para lá se for preciso. */
    route?: string;
    /** Botão extra (ex.: começar outro guia, abrir uma página). */
    cta?: { label: string; guide?: string; href?: string };
    /** Se o elemento não estiver no ecrã (ex.: lista vazia, sem permissão), salta o passo. Por defeito: sim nos tutoriais de página. */
    optional?: boolean;
};

export type Guide = {
    id: string;
    title: string;
    steps: GuideStep[];
    /** Guia que começa a seguir a este (ex.: demonstração → catálogo). */
    next?: string;
    /** Tutorial de página: a rota onde aparece o botão "?" e o convite da primeira visita. */
    path?: string;
};

/** O primeiro elemento visível com este `data-tour` (aceita alternativas: "a|b"). */
export function findTarget(names: string): HTMLElement | null {
    if (typeof document === "undefined") return null;
    for (const raw of names.split("|")) {
        const n = raw.trim();
        if (!n) continue;
        const all = document.querySelectorAll<HTMLElement>(`[data-tour="${n}"]`);
        for (const el of Array.from(all)) {
            const r = el.getBoundingClientRect();
            if (r.width > 0 && r.height > 0) return el;
        }
    }
    return null;
}

/** Condições para `done`: quando um elemento aparece / desaparece do ecrã. */
export const appears = (names: string) => () => !!findTarget(names);
export const disappears = (names: string) => () => !findTarget(names);
