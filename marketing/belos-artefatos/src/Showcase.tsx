import React from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { C, displayFont, easeOut, textFont } from "./theme";
import { MaskLine, Vignette } from "./Common";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const CARD = 50; // frames por modelo
const cards = [
  {
    img: "fotos/y3d.jpg",
    title: "PAVÊ Y 3D",
    sub: "Efeito 3D que impressiona",
    pos: "50% 50%",
  },
  {
    img: "fotos/ondulado.jpg",
    title: "ONDULADO",
    sub: "Fluidez em cada passo",
    pos: "50% 55%",
  },
  {
    img: "fotos/xadrez.jpg",
    title: "XADREZ",
    sub: "Clássico e elegante",
    pos: "50% 50%",
  },
  {
    img: "fotos/rua.jpg",
    title: "ZIG-ZAG",
    sub: "Ruas, entradas e passeios",
    pos: "50% 60%",
  },
  {
    img: "fotos/espinha.jpg",
    title: "ESPINHA",
    sub: "Retangular e intemporal",
    pos: "50% 50%",
  },
];

// Revelação em "V" (lembra o pavê em Y), a subir de baixo para cima.
const vClip = (p: number) => {
  const apex = 1920 - p * 2900;
  const edge = apex + 520;
  return `polygon(0px ${edge}px, 540px ${apex}px, 1080px ${edge}px, 1080px 2200px, 0px 2200px)`;
};

export const Showcase: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ background: C.navy }}>
      {cards.map((c, k) => {
        const start = k * CARD;
        const local = frame - start;
        if (local < -2) return null;
        const reveal =
          k === 0
            ? 1
            : interpolate(local, [0, 22], [0, 1], {
                ...clamp,
                easing: Easing.bezier(0.5, 0, 0.2, 1),
              });
        const zoom = interpolate(local, [0, 70], [1.14, 1.0], clamp);
        const active = Math.min(1, Math.max(0, local));
        void active;
        return (
          <AbsoluteFill
            key={c.title}
            style={{ clipPath: k === 0 ? undefined : vClip(reveal) }}
          >
            <Img
              src={staticFile(c.img)}
              style={{
                width: 1080,
                height: 1920,
                objectFit: "cover",
                objectPosition: c.pos,
                scale: zoom,
                filter: "contrast(1.06) saturate(1.1)",
              }}
            />
            <AbsoluteFill
              style={{
                background:
                  "linear-gradient(0deg, rgba(2,13,38,0.95) 0%, rgba(2,13,38,0.55) 30%, rgba(2,13,38,0) 52%)",
              }}
            />
            <AbsoluteFill
              style={{
                background:
                  "linear-gradient(180deg, rgba(2,13,38,0.65) 0%, rgba(2,13,38,0) 22%)",
              }}
            />

            <div
              style={{
                position: "absolute",
                left: 64,
                top: 214,
                fontFamily: displayFont,
                fontWeight: 800,
                fontSize: 250,
                lineHeight: 0.9,
                color: "rgba(2,13,38,0.35)",
                WebkitTextStroke: `5px ${C.cyan}`,
                opacity: interpolate(local, [4, 18], [0, 0.95], clamp),
                translate: `${interpolate(local, [4, 22], [-60, 0], { ...clamp, easing: easeOut })}px 0`,
              }}
            >
              0{k + 1}
            </div>

            <div
              style={{ position: "absolute", left: 64, right: 64, bottom: 250 }}
            >
              <MaskLine frame={local} delay={8}>
                <div
                  style={{
                    fontFamily: displayFont,
                    fontWeight: 800,
                    fontSize: 138,
                    color: C.white,
                    lineHeight: 1,
                    letterSpacing: -4,
                    whiteSpace: "nowrap",
                  }}
                >
                  {c.title}
                </div>
              </MaskLine>
              <MaskLine frame={local} delay={16} style={{ marginTop: 24 }}>
                <div
                  style={{
                    display: "inline-block",
                    background: C.cyan,
                    color: C.navy,
                    fontFamily: textFont,
                    fontWeight: 700,
                    fontSize: 44,
                    padding: "10px 28px 12px",
                    borderRadius: 14,
                  }}
                >
                  {c.sub}
                </div>
              </MaskLine>
            </div>
          </AbsoluteFill>
        );
      })}

      {/* progresso */}
      <div
        style={{
          position: "absolute",
          left: 64,
          right: 64,
          bottom: 150,
          display: "flex",
          gap: 14,
        }}
      >
        {cards.map((c, k) => {
          const fill = interpolate(
            frame,
            [k * CARD, (k + 1) * CARD],
            [0, 100],
            clamp,
          );
          return (
            <div
              key={c.title}
              style={{
                flex: 1,
                height: 10,
                borderRadius: 6,
                background: "rgba(255,255,255,0.28)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${fill}%`,
                  height: "100%",
                  background: C.cyan,
                }}
              />
            </div>
          );
        })}
      </div>
      <Vignette strength={0.35} />
    </AbsoluteFill>
  );
};
