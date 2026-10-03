import { describe, it, expect } from 'vitest';
import { holeFor, placePopover, routeMatches, shadesAround } from '@/lib/guide-layout';

describe('guias: geometria', () => {
    it('buraco com folga, sem sair do ecrã', () => {
        expect(holeFor({ top: 100, left: 50, width: 200, height: 40 }, 400, 800)).toEqual({ top: 94, left: 44, width: 212, height: 52 });
        expect(holeFor({ top: -20, left: -10, width: 500, height: 900 }, 400, 800)).toEqual({ top: 0, left: 0, width: 400, height: 800 });
    });
    it('as 4 faixas cobrem tudo menos o buraco', () => {
        const h = { top: 100, left: 50, width: 100, height: 50 };
        const s = shadesAround(h, 400, 800);
        const area = s.reduce((t, b) => t + b.width * b.height, 0);
        expect(area + h.width * h.height).toBe(400 * 800);
    });
    it('telemóvel: o balão fica do lado oposto ao elemento', () => {
        expect(placePopover({ top: 600, left: 10, width: 300, height: 50 }, 390, 844).side).toBe('dock-top');
        expect(placePopover({ top: 100, left: 10, width: 300, height: 50 }, 390, 844).side).toBe('dock-bottom');
    });
    it('computador: por baixo se couber, senão por cima', () => {
        expect(placePopover({ top: 100, left: 400, width: 200, height: 40 }, 1280, 900).side).toBe('below');
        expect(placePopover({ top: 780, left: 400, width: 200, height: 40 }, 1280, 900).side).toBe('above');
        expect(placePopover(null, 1280, 900).side).toBe('center');
    });
    it('compara o endereço do passo', () => {
        expect(routeMatches('/pos?demo=1', '/pos', '?demo=1')).toBe(true);
        expect(routeMatches('/pos?demo=1', '/pos', '')).toBe(false);
        expect(routeMatches('/catalog', '/catalog', '?x=1')).toBe(true);
        expect(routeMatches('/catalog', '/pos', '')).toBe(false);
    });
});
