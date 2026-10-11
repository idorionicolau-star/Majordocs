import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import {
  C,
  PAVE_CLASSIC,
  PAVE_MONO,
  PAVE_WARM,
  displayFont,
  easeInOut,
  easeOut,
  textFont,
} from "./theme";
import { MaskLine } from "./Common";
import { Pattern, makeFaces } from "./Pattern";

const PW = 900;
const PH = 880;
const S = 66;
const faces = makeFaces(PW, PH, S, "cores");
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const options = [
  { name: "CLÁSSICO", palette: PAVE_CLASSIC, at: 0, cx: 150 },
  { name: "MODERNO", palette: PAVE_MONO, at: 34, cx: 450 },
  { name: "QUENTE", palette: PAVE_WARM, at: 68, cx: 750 },
];

export const Colors: React.FC = () => {
  const frame = useCurrentFrame();
  const enter = interpolate(frame, [0, 16], [0, 1], {
    ...clamp,
    easing: easeOut,
  });
  const activeIdx = frame >= 68 ? 2 : frame >= 34 ? 1 : 0;

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${C.blueDeep}, ${C.navy})`,
      }}
    >
      <div style={{ position: "absolute", top: 190, left: 78 }}>
        <MaskLine frame={frame} delay={0}>
          <div
            style={{
              fontFamily: displayFont,
              fontWeight: 800,
              fontSize: 132,
              lineHeight: 1,
              color: C.white,
              letterSpacing: -4,
            }}
          >
            ESCOLHA
          </div>
        </MaskLine>
        <MaskLine frame={frame} delay={8}>
          <div
            style={{
              fontFamily: displayFont,
              fontWeight: 800,
              fontSize: 132,
              lineHeight: 1,
              color: C.cyan,
              letterSpacing: -4,
            }}
          >
            A SUA COR
          </div>
        </MaskLine>
      </div>

      <div
        style={{
          position: "absolute",
          left: 90,
          top: 590,
          width: PW,
          height: PH,
          borderRadius: 56,
          overflow: "hidden",
          boxShadow:
            "0 40px 120px rgba(0,0,0,0.6), 0 0 0 6px rgba(25,200,255,0.55)",
          opacity: enter,
          scale: 0.92 + 0.08 * enter,
        }}
      >
        {options.map((o, i) => {
          const r = interpolate(frame, [o.at, o.at + 22], [0, 1500], {
            ...clamp,
            easing: easeInOut,
          });
          return (
            <div
              key={o.name}
              style={{
                position: "absolute",
                inset: 0,
                clipPath:
                  i === 0
                    ? undefined
                    : `circle(${r}px at ${o.cx}px ${PH + 180}px)`,
              }}
            >
              <Pattern
                faces={faces}
                width={PW}
                height={PH}
                s={S}
                palette={o.palette}
              />
            </div>
          );
        })}
      </div>

      <div
        style={{
          position: "absolute",
          left: 90,
          top: 1520,
          width: PW,
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        {options.map((o, i) => {
          const on = i === activeIdx;
          return (
            <div
              key={o.name}
              style={{
                width: 280,
                textAlign: "center",
                scale: on ? 1.08 : 0.94,
                opacity: on ? 1 : 0.55,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: 0,
                  marginBottom: 14,
                }}
              >
                {o.palette.map((c, j) => (
                  <div
                    key={j}
                    style={{
                      width: 62,
                      height: 62,
                      borderRadius: 31,
                      background: c,
                      border: `4px solid ${on ? C.cyan : "rgba(255,255,255,0.4)"}`,
                      marginLeft: j ? -16 : 0,
                    }}
                  />
                ))}
              </div>
              <div
                style={{
                  fontFamily: displayFont,
                  fontWeight: 800,
                  fontSize: 36,
                  letterSpacing: 3,
                  color: C.white,
                }}
              >
                {o.name}
              </div>
            </div>
          );
        })}
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 1745,
          textAlign: "center",
          fontFamily: textFont,
          fontWeight: 700,
          fontSize: 38,
          color: "#a9c4ff",
          opacity: interpolate(frame, [20, 40], [0, 1], clamp),
        }}
      >
        Vermelho · Preto · Cinza · Branco
      </div>
    </AbsoluteFill>
  );
};
