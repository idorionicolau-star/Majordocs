import { describe, expect, it } from "vitest";
import { PULL_MAX, PULL_TRIGGER, isPullDown, pullDistance, refreshMessage } from "../pull-refresh";

describe("puxar para atualizar", () => {
    it("o indicador segue o dedo com resistência e tem um máximo", () => {
        expect(pullDistance(-20)).toBe(0);
        expect(pullDistance(40)).toBe(20);
        expect(pullDistance(PULL_TRIGGER * 2)).toBe(PULL_TRIGGER);
        expect(pullDistance(2000)).toBe(PULL_MAX);
        // sempre a crescer
        let last = 0;
        for (let dy = 0; dy < 600; dy += 10) { const d = pullDistance(dy); expect(d).toBeGreaterThanOrEqual(last); last = d; }
    });

    it("só conta como puxar para baixo se for claramente vertical", () => {
        expect(isPullDown(0, 30)).toBe(true);
        expect(isPullDown(30, 30)).toBe(false); // diagonal: pode ser o deslizar entre páginas
        expect(isPullDown(0, -30)).toBe(false); // scroll
        expect(isPullDown(0, 5)).toBe(false); // ainda não decidiu
    });

    it("mensagens", () => {
        expect(refreshMessage("updated")).toBe("Atualizado");
        expect(refreshMessage("offline")).toMatch(/Sem internet/);
        expect(refreshMessage("unreachable")).toMatch(/Sem ligação/);
    });
});
