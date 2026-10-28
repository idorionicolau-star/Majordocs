// "Puxar para atualizar" da própria app (o do Chrome recarregava a app inteira: animação, menu a piscar…).
// Aqui só as contas do gesto; o componente está em components/layout/pull-to-refresh.tsx.

/** quanto é preciso puxar (já com resistência) para atualizar ao largar */
export const PULL_TRIGGER = 72;
/** o indicador não desce mais do que isto */
export const PULL_MAX = 110;
/** movimento mínimo antes de decidir se é puxar para baixo ou outra coisa (scroll, deslizar para o lado) */
export const PULL_START = 8;

/** Distância do indicador para um dedo que desceu `dy` px: segue o dedo a metade e trava perto do máximo. */
export function pullDistance(dy: number): number {
    if (dy <= 0) return 0;
    const d = dy * 0.5;
    return d <= PULL_TRIGGER ? d : Math.min(PULL_MAX, PULL_TRIGGER + (d - PULL_TRIGGER) * 0.35);
}

/** É mesmo puxar para baixo (e não scroll para cima nem deslizar para o lado)? */
export function isPullDown(dx: number, dy: number): boolean {
    return dy > PULL_START && dy > Math.abs(dx) * 1.5;
}

export type RefreshResult = "updated" | "offline" | "unreachable";

export const refreshMessage = (r: RefreshResult) =>
    r === "updated" ? "Atualizado" : r === "offline" ? "Sem internet: últimos dados guardados" : "Sem ligação ao servidor: tente de novo";
