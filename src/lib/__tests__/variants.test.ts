import { describe, it, expect } from 'vitest';
import { cleanOptions, combinations, countCombinations, optionsOfFamily, planVariants, siblingsOf, variantName, MAX_VARIANTS } from '@/lib/variants';

describe('variações', () => {
    const cor = { name: 'Cor', values: ['Vermelho', 'Cinzento'] };
    const tex = { name: 'Textura', values: ['Lisa', 'Borbulha'] };

    it('limpa espaços, vazios e repetidos', () => {
        const o = cleanOptions([{ name: ' Cor ', values: ['Vermelho', ' vermelho', '', 'Azul'] }, { name: 'cor', values: ['x'] }, { name: 'Vazio', values: [' '] }]);
        expect(o).toEqual([{ name: 'Cor', values: ['Vermelho', 'Azul'] }]);
    });
    it('conta e gera as combinações', () => {
        expect(countCombinations([cor])).toBe(2);
        expect(countCombinations([cor, tex])).toBe(4);
        expect(countCombinations([])).toBe(0);
        expect(combinations([cor, tex])).toHaveLength(4);
        expect(combinations([cor, tex])[1]).toEqual({ Cor: 'Vermelho', Textura: 'Borbulha' });
    });
    it('monta o nome', () => {
        expect(variantName('Pavê Borbulha', { Cor: 'Vermelho' })).toBe('Pavê Borbulha - Vermelho');
        expect(variantName('Camisa', { Textura: 'Lisa', Cor: 'Azul' }, ['Cor', 'Textura'])).toBe('Camisa - Azul / Lisa');
        expect(variantName('Pavê', {})).toBe('Pavê');
    });
    it('planeia só o que ainda não existe', () => {
        const p = planVariants('Pavê', [cor], ['pave - vermelho', 'Outro']);
        expect(p.create.map((v) => v.name)).toEqual(['Pavê - Cinzento']);
        expect(p.existing).toEqual(['Pavê - Vermelho']);
    });
    it('recusa listas enormes', () => {
        const big = [{ name: 'A', values: Array.from({ length: 8 }, (_, i) => `a${i}`) }, { name: 'B', values: Array.from({ length: 8 }, (_, i) => `b${i}`) }];
        expect(countCombinations(big)).toBeGreaterThan(MAX_VARIANTS);
        expect(planVariants('X', big, []).tooMany).toBe(true);
    });
    it('encontra a família e os tipos usados', () => {
        const all = [
            { name: 'Pavê - Vermelho', variantGroup: 'Pavê', variantValues: { Cor: 'Vermelho' } },
            { name: 'Pavê - Azul', variantGroup: 'pavê', variantValues: { Cor: 'Azul' } },
            { name: 'Cimento' },
        ];
        expect(siblingsOf(all[0], all).map((p) => p.name)).toEqual(['Pavê - Azul', 'Pavê - Vermelho']);
        expect(siblingsOf(all[2], all)).toEqual([]);
        expect(optionsOfFamily(all)).toEqual([{ name: 'Cor', values: ['Vermelho', 'Azul'] }]);
    });
});
