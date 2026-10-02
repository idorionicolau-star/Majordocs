import { describe, expect, it } from 'vitest';
import { pickVoiceMatch, searchProducts } from '../quick-stock';
import { parseVoice } from '../voice-parse';
import type { Product } from '../types';

const p = (name: string): Product => ({ name, category: 'Geral', stock: 10, reservedStock: 0, price: 1, lowStockThreshold: 0, criticalStockThreshold: 0, lastUpdated: '', instanceId: name });
const catalog = ['Banco Praça', 'Banco Simples', 'Bloco 15', 'Bloco 20', 'Cimento Cola', 'Cimento 32.5N', 'Passadeira 8 Pistões', 'Passadeira Circular', 'Mesa Rectangular', 'Pó de pedra', 'Colher de pedreiro', 'Grelha Quadrada'].map(p);

/** O que a app faz com o que se disse: interpreta e procura o primeiro item. */
const say = (text: string) => {
    const it = parseVoice(text)[0];
    return { qty: it?.qty, hit: it ? searchProducts(catalog, it.term, 1)[0]?.name : undefined };
};

describe('procura por voz', () => {
    it('plural encontra o nome no singular', () => {
        expect(say('dois bancos praça')).toEqual({ qty: 2, hit: 'Banco Praça' });
        expect(say('cinco grelhas quadradas')).toEqual({ qty: 5, hit: 'Grelha Quadrada' });
        expect(say('três colheres de pedreiro')).toEqual({ qty: 3, hit: 'Colher de pedreiro' });
    });
    it('palavras de ligação não impedem', () => {
        expect(say('cem blocos de quinze')).toEqual({ qty: 100, hit: 'Bloco 15' });
        expect(say('pó pedra')).toMatchObject({ hit: 'Pó de pedra' });
    });
    it('a unidade depois do número não fica no nome', () => {
        expect(say('cimento cola dez sacos')).toEqual({ qty: 10, hit: 'Cimento Cola' });
        expect(say('dez sacos de cimento cola')).toEqual({ qty: 10, hit: 'Cimento Cola' });
    });
    it('um número a meio é parte do nome, não a quantidade', () => {
        expect(say('passadeira oito pistões')).toEqual({ qty: null, hit: 'Passadeira 8 Pistões' });
        expect(say('passadeira oito pistões vinte')).toEqual({ qty: 20, hit: 'Passadeira 8 Pistões' });
    });
    it('erros pequenos do ditado', () => {
        expect(say('cimento colla').hit).toBe('Cimento Cola');
        expect(say('mesa retangular').hit).toBe('Mesa Rectangular');
    });
    it('números diferentes são produtos diferentes', () => {
        expect(searchProducts(catalog, 'bloco 15', 1)[0].name).toBe('Bloco 15');
        expect(searchProducts(catalog, 'bloco 20', 1)[0].name).toBe('Bloco 20');
    });
    it('com vários parecidos não adivinha: pergunta', () => {
        const r = pickVoiceMatch(catalog, 'bloco');
        expect(r.hit).toBeUndefined();
        expect(r.ambiguous.map((x) => x.name).sort()).toEqual(['Bloco 15', 'Bloco 20']);
        expect(pickVoiceMatch(catalog, 'bloco 15').hit?.name).toBe('Bloco 15');
        expect(pickVoiceMatch(catalog, 'banco praca').hit?.name).toBe('Banco Praça');
        expect(pickVoiceMatch(catalog, 'tijolo').hit).toBeUndefined();
    });
    it('o que não existe continua a não ser encontrado', () => {
        expect(say('tijolo vermelho').hit).toBeUndefined();
        expect(searchProducts(catalog, 'bloco 99')).toEqual([]);
    });
});

describe('searchProducts (teclado)', () => {
    it('continua a ordenar começos de nome primeiro', () => {
        const r = searchProducts(catalog, 'cimento').map((x) => x.name);
        expect(r.slice(0, 2).sort()).toEqual(['Cimento 32.5N', 'Cimento Cola']);
    });
    it('pesquisa só com palavras de ligação não rebenta', () => {
        expect(() => searchProducts(catalog, 'de')).not.toThrow();
    });
});
