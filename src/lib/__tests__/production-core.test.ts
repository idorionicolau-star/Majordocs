import { describe, it, expect } from 'vitest';
import { catalogChoices, dateLabel, mostProduced, todayMz, validProductionDate, yesterdayMz } from '@/lib/production-core';
import { isFamilyGroup } from '@/lib/variants';

const now = new Date('2026-10-14T23:30:00Z'); // já é dia 15 em Maputo

describe('Produção: datas', () => {
    it('hoje e ontem em Maputo', () => {
        expect(todayMz(now)).toBe('2026-10-15');
        expect(yesterdayMz(now)).toBe('2026-10-14');
        expect(dateLabel('2026-10-15', now)).toBe('hoje');
        expect(dateLabel('2026-10-14', now)).toBe('ontem');
        expect(dateLabel('2026-10-01', now)).toBe('01/10/2026');
    });
    it('não no futuro, no máximo um ano atrás', () => {
        expect(validProductionDate('2026-10-15', now)).toBe(true);
        expect(validProductionDate('2026-10-16', now)).toBe(false);
        expect(validProductionDate('2025-09-01', now)).toBe(false);
        expect(validProductionDate('15/10/2026', now)).toBe(false);
    });
});

describe('Produção: escolher no catálogo', () => {
    const catalog = [
        { name: 'Pavê Saia - Preto', variantGroup: 'Pavê Saia' },
        { name: 'Pavê Saia - Branco', variantGroup: 'Pavê Saia' },
        { name: 'Bloco 15' },
        { name: 'Lancil' },
    ];
    it('sem texto: tudo, com as variações juntas por família', () => {
        const c = catalogChoices(catalog, '');
        expect(c.map((x) => (isFamilyGroup(x) ? `fam:${x.group}(${x.members.length})` : x.name))).toEqual(['Bloco 15', 'Lancil', 'fam:Pavê Saia(2)']);
    });
    it('pesquisa como na Venda Rápida', () => {
        expect(catalogChoices(catalog, 'bloco').map((x) => (isFamilyGroup(x) ? x.group : x.name))).toEqual(['Bloco 15']);
        const pave = catalogChoices(catalog, 'pave');
        expect(pave).toHaveLength(1);
        expect(isFamilyGroup(pave[0])).toBe(true);
        // a pesquisa já diz qual variação: aparece só essa
        expect(catalogChoices(catalog, 'pave preto').map((x) => (isFamilyGroup(x) ? x.group : x.name))).toEqual(['Pavê Saia - Preto']);
    });
    it('mais produzidos (últimos 60 dias, ainda no catálogo)', () => {
        const prods = [
            { productName: 'Bloco 15', date: '2026-10-10' }, { productName: 'Bloco 15', date: '2026-10-11' },
            { productName: 'Lancil', date: '2026-10-12' }, { productName: 'Velho', date: '2026-10-12' },
            { productName: 'Lancil', date: '2026-01-01' }, { productName: 'Lancil', date: '2026-10-13', deletedAt: 'x' },
        ];
        expect(mostProduced(prods, new Set(catalog.map((c) => c.name)), 6, now)).toEqual(['Bloco 15', 'Lancil']);
    });
});
