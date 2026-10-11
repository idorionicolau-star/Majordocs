# Belos Artefatos: anúncio "Pavê" (Remotion)

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
