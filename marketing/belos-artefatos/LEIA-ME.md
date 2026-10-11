# Belos Artefatos: anúncios em vídeo (Remotion)

Dois vídeos verticais no mesmo projecto: **Pavê** (`BelosPave`, 27 s) e **Cobogós** (`BelosCobogos`, 22 s). Ficheiros prontos: `belos-artefatos-pave.mp4` e `belos-artefatos-cobogos.mp4`.

## Pavê

Vídeo vertical (1080×1920, 27 s, 30 fps) para Reels, Stories e WhatsApp Status.
Estilo premium com cortes em faixa diagonal e um antes/depois animado: o pavê monta-se peça a peça sobre a terra.

Cenas (linha do tempo em `src/Video.tsx`):

| Cena | Ficheiro | Duração |
| --- | --- | --- |
| Abertura tipográfica | `src/Hook.tsx` | 2,8 s |
| Antes e depois (terra → pavê) | `src/BeforeAfter.tsx` | 7,2 s |
| Modelos (Y 3D, ondulado, xadrez, zig-zag, espinha) | `src/Showcase.tsx` | 8,4 s |
| Escolha a sua cor | `src/Colors.tsx` | 3,6 s |
| Contactos | `src/Cta.tsx` | 5 s |

- Fotos reais dos pavês em `public/fotos/`; textura de terra em `public/areia.jpg`.
- Padrão de cubos 3D desenhado em código (`src/Pattern.tsx`), com paletas em `src/theme.ts`.
- Música e efeitos sonoros sintetizados: `public/musica.mp3`.
- Contactos (editar em `src/Cta.tsx`): 877 778 286 (WhatsApp e chamadas) e 843 427 497 (só chamadas).

Editar e voltar a gerar:

```bash
cd marketing/belos-artefatos
npm i
npx remotion studio                       # pré-visualizar e editar
npx remotion render BelosPave out/belos-artefatos-pave.mp4
```

Esta pasta fica fora da compilação da app (tsconfig e eslint ignoram `marketing/`).

## Cobogós (`BelosCobogos`, 22,4 s)

| Cena | Ficheiro | Duração |
| --- | --- | --- |
| Abertura: luz a atravessar um muro de cobogós | `src/CoboHook.tsx` | 3 s |
| 9 desenhos de 30×30 cm a 120 MT (um por batida) + grelha final | `src/CoboMontage.tsx` | 5 s |
| Painéis grandes: 80×80, 60×60 e 100×60 | `src/CoboXl.tsx` | 5,4 s |
| Escolha o tamanho (20 a 80 cm, desenhado à escala) | `src/CoboLadder.tsx` | 4 s |
| Contactos | `src/Cta.tsx` | 5 s |

Fotos recortadas em `public/cobogos/`; música em `public/musica-cobogos.mp3`. Preços e tamanhos estão nos próprios ficheiros das cenas.

```bash
npx remotion render BelosCobogos out/belos-artefatos-cobogos.mp4
```
