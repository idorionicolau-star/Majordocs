import { describe, it, expect } from 'vitest';
import { parseVoice } from '../voice-parse';

describe('parseVoice — a quantidade só conta com "x"', () => {
  it('x depois do produto', () => {
    expect(parseVoice('cimento x 20')).toEqual([{ qty: 20, term: 'cimento' }]);
    expect(parseVoice('cimento x vinte')).toEqual([{ qty: 20, term: 'cimento' }]);
    expect(parseVoice('cimento xis vinte')).toEqual([{ qty: 20, term: 'cimento' }]);
  });
  it('x colado ao número (como o ditado escreve)', () => {
    expect(parseVoice('cimento x20')).toEqual([{ qty: 20, term: 'cimento' }]);
    expect(parseVoice('x20 cimento')).toEqual([{ qty: 20, term: 'cimento' }]);
    expect(parseVoice('20x cimento')).toEqual([{ qty: 20, term: 'cimento' }]);
  });
  it('quantidade à cabeça', () => {
    expect(parseVoice('20 x cimento')).toEqual([{ qty: 20, term: 'cimento' }]);
    expect(parseVoice('x vinte cimento')).toEqual([{ qty: 20, term: 'cimento' }]);
  });
  it('sem x não há quantidade: os números são do nome', () => {
    expect(parseVoice('dez sacos de cimento')).toEqual([{ qty: null, term: '10 sacos de cimento' }]);
    expect(parseVoice('cimento dez')).toEqual([{ qty: null, term: 'cimento 10' }]);
    expect(parseVoice('bloco quinze')).toEqual([{ qty: null, term: 'bloco 15' }]);
    expect(parseVoice('passadeira oito pistões')).toEqual([{ qty: null, term: 'passadeira 8 pistoes' }]);
  });
  it('tamanho e quantidade juntos', () => {
    expect(parseVoice('bloco quinze x duzentos')).toEqual([{ qty: 200, term: 'bloco 15' }]);
    expect(parseVoice('bloco 15 x 40 x 200')).toEqual([{ qty: 200, term: 'bloco 15 x 40' }]);
  });
  it('número x número: é quantidade, a não ser que "Bloco 15x40" exista como produto', () => {
    expect(parseVoice('bloco 15 x 40')).toEqual([{ qty: 40, term: 'bloco 15' }]);
    expect(parseVoice('bloco 15 x 40', ['Bloco 15'])).toEqual([{ qty: 40, term: 'bloco 15' }]);
    expect(parseVoice('bloco 15 x 40', ['Bloco 15x40', 'Bloco 15'])).toEqual([{ qty: null, term: 'bloco 15 x 40' }]);
  });
  it('medida colada (15x40) fica no nome', () => {
    expect(parseVoice('bloco 15x40')).toEqual([{ qty: null, term: 'bloco 15x40' }]);
    expect(parseVoice('bloco 15x40 x 200')).toEqual([{ qty: 200, term: 'bloco 15x40' }]);
  });
  it('"por" entre números é medida', () => {
    expect(parseVoice('bloco quinze por quarenta')).toEqual([{ qty: null, term: 'bloco 15 x 40' }]);
  });
  it('vários artigos', () => {
    expect(parseVoice('cimento x 10 e areia x 5')).toEqual([{ qty: 10, term: 'cimento' }, { qty: 5, term: 'areia' }]);
    expect(parseVoice('cimento x 10, areia x 5 mais brita x 2').map((i) => i.qty)).toEqual([10, 5, 2]);
  });
  it('"e" entre palavras faz parte do nome', () => {
    expect(parseVoice('pregos e parafusos x 5')).toEqual([{ qty: 5, term: 'pregos e parafusos' }]);
  });
  it('um/uma são artigos, não o número 1', () => {
    expect(parseVoice('uma lata de tinta')).toEqual([{ qty: null, term: 'lata de tinta' }]);
    expect(parseVoice('tinta x uma')).toEqual([{ qty: 1, term: 'tinta' }]);
  });
  it('números compostos na quantidade', () => {
    expect(parseVoice('blocos x vinte e cinco')).toEqual([{ qty: 25, term: 'blocos' }]);
    expect(parseVoice('cimento x cento e vinte')[0].qty).toBe(120);
    expect(parseVoice('blocos x mil e quinhentos')[0].qty).toBe(1500);
    expect(parseVoice('cal x meio')[0].qty).toBe(0.5);
  });
  it('só o nome', () => {
    expect(parseVoice('areia')).toEqual([{ qty: null, term: 'areia' }]);
  });
  it('texto vazio', () => {
    expect(parseVoice('  ')).toEqual([]);
  });
});
