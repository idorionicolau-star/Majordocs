import { describe, expect, it } from 'vitest';
import { activeCatalog, adjustPrice, categoryCounts, filterCatalog, findDuplicate, nameKey, parsePct, searchCatalog } from '../catalog-view';

const item = (id: string, name: string, category = 'Geral', price = 10, extra: object = {}) => ({ id, name, category, price, unit: 'un', ...extra });
const cat = [
    item('1', 'Tábua de Pinho', 'Madeiras', 120),
    item('2', 'Cimento Cola', 'Cimentos', 450),
    item('3', 'Cimento 32.5N', 'Cimentos', 600),
    item('4', 'Tinta Branca 20L', 'Tintas', 2300),
    item('5', 'Bloco 15', 'Blocos', 45),
    item('6', 'Bloco 20', 'Blocos', 55),
    item('7', 'Pavê Borbulha', 'Pavimentos', 380),
    item('8', 'Apagado', 'Geral', 1, { deletedAt: '2026-01-01' }),
];
const names = (l: { name: string }[]) => l.map((x) => x.name);

describe('pesquisa no catálogo', () => {
    it('ignora acentos e maiúsculas', () => {
        expect(names(searchCatalog(cat, 'tabua'))).toEqual(['Tábua de Pinho']);
        expect(names(searchCatalog(cat, 'PAVE borbulha'))).toEqual(['Pavê Borbulha']);
    });
    it('tolera gralhas', () => {
        expect(names(searchCatalog(cat, 'cimeto cola'))[0]).toBe('Cimento Cola');
    });
    it('aceita o plural', () => {
        expect(names(searchCatalog(cat, 'blocos')).sort()).toEqual(['Bloco 15', 'Bloco 20']);
    });
    it('procura também na categoria', () => {
        expect(names(searchCatalog(cat, 'tintas'))).toEqual(['Tinta Branca 20L']);
        expect(names(searchCatalog(cat, 'madeiras'))).toEqual(['Tábua de Pinho']);
    });
    it('números não se confundem', () => {
        expect(names(searchCatalog(cat, 'bloco 15'))).toEqual(['Bloco 15']);
    });
    it('sem texto devolve tudo; nada parecido devolve vazio', () => {
        expect(searchCatalog(cat, '  ')).toBe(cat);
        expect(searchCatalog(cat, 'martelo de borracha')).toEqual([]);
    });
});

describe('filtros e ordenação', () => {
    it('por categoria', () => {
        expect(names(filterCatalog(cat, { category: 'Cimentos' })).sort()).toEqual(['Cimento 32.5N', 'Cimento Cola']);
        expect(filterCatalog(cat, { category: 'all' }).length).toBe(cat.length);
    });
    it('por nome e por preço, sem alterar a lista original', () => {
        const copy = [...cat];
        expect(names(filterCatalog(cat, { sort: 'price-desc' }))[0]).toBe('Tinta Branca 20L');
        expect(names(filterCatalog(cat, { sort: 'price-asc' }))[0]).toBe('Apagado');
        expect(names(filterCatalog(cat, { sort: 'name' }))[0]).toBe('Apagado');
        expect(cat).toEqual(copy);
    });
    it('ordem natural dos números: Bloco 15 antes de Bloco 100', () => {
        const l = [item('a', 'Bloco 100'), item('b', 'Bloco 15'), item('c', 'Bloco 20')];
        expect(names(filterCatalog(l, { sort: 'name' }))).toEqual(['Bloco 15', 'Bloco 20', 'Bloco 100']);
    });
    it('com texto mantém a ordem de relevância', () => {
        expect(names(filterCatalog(cat, { term: 'cimento', sort: 'relevance' })).length).toBe(2);
    });
});

describe('lixeira, duplicados e preços', () => {
    it('só os activos', () => {
        expect(activeCatalog(cat).length).toBe(7);
        expect(activeCatalog(null)).toEqual([]);
    });
    it('duplicados ignoram acentos, maiúsculas e espaços', () => {
        expect(findDuplicate(cat, '  pave   BORBULHA ')?.id).toBe('7');
        expect(findDuplicate(cat, 'Pavê Borbulha', '7')).toBeUndefined();
        expect(findDuplicate(cat, 'Pavê Liso')).toBeUndefined();
        expect(findDuplicate(cat, '   ')).toBeUndefined();
    });
    it('ajuste de preço em %', () => {
        expect(adjustPrice(100, 10)).toBe(110);
        expect(adjustPrice(100, -25)).toBe(75);
        expect(adjustPrice(33.33, 7.5)).toBe(35.83);
        expect(adjustPrice(10, -100)).toBe(0);
        expect(adjustPrice(NaN as unknown as number, 10)).toBe(0);
    });
    it('percentagem escrita pela pessoa', () => {
        expect(parsePct('10')).toBe(10);
        expect(parsePct('-5')).toBe(-5);
        expect(parsePct('7,5')).toBe(7.5);
        expect(parsePct('abc')).toBeNull();
        expect(parsePct('-100')).toBeNull();
    });
    it('contagem por categoria e chave de nome', () => {
        expect(categoryCounts(cat).get('Blocos')).toBe(2);
        expect(nameKey(' Pavê  X ')).toBe('pave x');
    });
});
