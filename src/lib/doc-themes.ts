// Temas de exportação dos documentos (PDF). Cada tema decide o aspecto; a cor de destaque é escolhida à parte.
export type RGB = [number, number, number];
export type DocThemeId = 'classico' | 'moderno' | 'minimalista' | 'elegante' | 'corporativo' | 'vibrante';

export type DocTheme = {
    id: DocThemeId;
    name: string;
    description: string;
    font: 'helvetica' | 'times';
    header: 'line' | 'band' | 'minimal' | 'centered' | 'sidebar' | 'block';
    table: 'plain' | 'striped' | 'grid' | 'minimal' | 'filled';
    boxes: 'boxed' | 'plain' | 'bar';
    totals: 'line' | 'block';
    defaultAccent: RGB;
};

export const DOC_THEMES: DocTheme[] = [
    { id: 'classico', name: 'Clássico', description: 'Sóbrio e familiar: linhas finas e caixas cinzentas.', font: 'helvetica', header: 'line', table: 'plain', boxes: 'boxed', totals: 'line', defaultAccent: [24, 24, 27] },
    { id: 'moderno', name: 'Moderno', description: 'Faixa de cor no topo, linhas alternadas e destaque no total.', font: 'helvetica', header: 'band', table: 'striped', boxes: 'bar', totals: 'block', defaultAccent: [37, 99, 235] },
    { id: 'minimalista', name: 'Minimalista', description: 'Muito espaço em branco, só o essencial.', font: 'helvetica', header: 'minimal', table: 'minimal', boxes: 'plain', totals: 'line', defaultAccent: [39, 39, 42] },
    { id: 'elegante', name: 'Elegante', description: 'Letra com serifa, cabeçalho centrado e dupla linha.', font: 'times', header: 'centered', table: 'grid', boxes: 'plain', totals: 'line', defaultAccent: [30, 58, 95] },
    { id: 'corporativo', name: 'Corporativo', description: 'Barra lateral de cor e tabela com cabeçalho preenchido.', font: 'helvetica', header: 'sidebar', table: 'filled', boxes: 'boxed', totals: 'block', defaultAccent: [4, 120, 87] },
    { id: 'vibrante', name: 'Vibrante', description: 'Bloco de cor com o título e total em destaque.', font: 'helvetica', header: 'block', table: 'filled', boxes: 'bar', totals: 'block', defaultAccent: [234, 88, 12] },
];

export const ACCENT_PRESETS: { name: string; rgb: RGB }[] = [
    { name: 'Grafite', rgb: [39, 39, 42] },
    { name: 'Azul', rgb: [37, 99, 235] },
    { name: 'Marinho', rgb: [30, 58, 95] },
    { name: 'Verde', rgb: [4, 120, 87] },
    { name: 'Turquesa', rgb: [13, 148, 136] },
    { name: 'Laranja', rgb: [234, 88, 12] },
    { name: 'Vermelho', rgb: [190, 18, 60] },
    { name: 'Roxo', rgb: [109, 40, 217] },
    { name: 'Dourado', rgb: [161, 98, 7] },
    { name: 'Rosa', rgb: [219, 39, 119] },
];

export const themeById = (id?: string): DocTheme => DOC_THEMES.find((t) => t.id === id) || DOC_THEMES[0];

export const hexToRgb = (hex?: string | null): RGB | null => {
    const m = /^#?([0-9a-f]{6})$/i.exec((hex || '').trim());
    if (!m) return null;
    const n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
export const rgbToHex = (c: RGB) => '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');

/** Mistura a cor com branco: t=0 é a cor, t=1 é branco. Serve para fundos suaves. */
export const tint = (c: RGB, t: number): RGB => c.map((v) => Math.round(v + (255 - v) * t)) as RGB;

/** Texto legível sobre a cor (branco ou quase preto). */
export const readableOn = (c: RGB): RGB => ((c[0] * 299 + c[1] * 587 + c[2] * 114) / 1000 > 150 ? [24, 24, 27] : [255, 255, 255]);
