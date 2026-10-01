import { describe, it, expect } from 'vitest';
import { parseVoice } from '../voice-parse';

describe('parseVoice', () => {
  it('quantidade antes do produto, com unidade e "de"', () => {
    expect(parseVoice('dez sacos de cimento')).toEqual([{ qty: 10, term: 'cimento' }]);
  });
  it('dígitos', () => {
    expect(parseVoice('20 sacos de cimento')).toEqual([{ qty: 20, term: 'cimento' }]);
  });
  it('produto e depois quantidade', () => {
    expect(parseVoice('cimento dez')).toEqual([{ qty: 10, term: 'cimento' }]);
  });
  it('vários artigos separados por "e" + número', () => {
    expect(parseVoice('dez sacos de cimento e duas latas de tinta branca')).toEqual([
      { qty: 10, term: 'cimento' },
      { qty: 2, term: 'tinta branca' },
    ]);
  });
  it('"e" entre palavras faz parte do nome', () => {
    expect(parseVoice('cinco caixas de pregos e parafusos')).toEqual([{ qty: 5, term: 'pregos e parafusos' }]);
  });
  it('sem quantidade', () => {
    expect(parseVoice('areia')).toEqual([{ qty: null, term: 'areia' }]);
  });
  it('números compostos', () => {
    expect(parseVoice('vinte e cinco blocos')).toEqual([{ qty: 25, term: 'blocos' }]);
    expect(parseVoice('cento e vinte sacos de cimento')[0].qty).toBe(120);
    expect(parseVoice('duzentos blocos')[0].qty).toBe(200);
    expect(parseVoice('mil e quinhentos blocos')[0].qty).toBe(1500);
  });
  it('meio', () => {
    expect(parseVoice('meio saco de cal')).toEqual([{ qty: 0.5, term: 'cal' }]);
  });
  it('medida no nome do produto', () => {
    expect(parseVoice('cem blocos 15 x 40')).toEqual([{ qty: 100, term: 'blocos 15 x 40' }]);
  });
  it('vírgula e "mais" separam', () => {
    expect(parseVoice('dois cimento, três areia mais quatro brita').map((i) => i.qty)).toEqual([2, 3, 4]);
  });
  it('texto vazio', () => {
    expect(parseVoice('  ')).toEqual([]);
  });
});
