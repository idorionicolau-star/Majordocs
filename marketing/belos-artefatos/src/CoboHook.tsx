import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { C, displayFont, easeBack, easeOut } from "./theme";
import { MaskLine, Vignette } from "./Common";
import { CoboBlock } from "./CoboBlock";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const BS = 360; // tamanho do bloco no ecrã
const COLS = 3;
const ROWS = 3;

const line: React.CSSProperties = {
  fontFamily: displayFont,
  fontWeight: 800,
  color: C.white,
  lineHeight: 1,
  letterSpacing: -2,
  whiteSpace: "nowrap",
};

export const CoboHook: React.FC = () => {
  const frame = useCurrentFrame();
  // o "sol" atravessa o muro por trás dos vazados
  const sunX = interpolate(frame, [0, 90], [-120, 1200], { easing: (t) => t });
  const sunY = interpolate(frame, [0, 90], [820, 360]);
  const cam = interpolate(frame, [0, 90], [1.06, 1.0]);

  return (
    <AbsoluteFill style={{ background: C.navy }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at ${sunX}px ${sunY}px, #fff2c2 0%, #ffc15a 9%, #ff7a2f 22%, #7b2a3a 42%, #0b1636 72%)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 70,
          width: 1080,
          height: BS * ROWS,
          scale: cam,
          transformOrigin: "50% 50%",
        }}
      >
        {Array.from({ length: COLS * ROWS }).map((_, i) => {
          const c = i % COLS;
          const r = Math.floor(i / COLS);
          const d = (c + r) * 4;
          const p = interpolate(frame, [d, d + 16], [0, 1], {
            ...clamp,
            easing: easeBack,
          });
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: c * BS,
                top: r * BS,
                width: BS,
                height: BS,
                scale: 0.6 + 0.4 * p,
                opacity: Math.min(1, p * 3),
                transformOrigin: "50% 50%",
              }}
            >
              <CoboBlock size={BS} depth={7} />
            </div>
          );
        })}
      </div>
      {/* feixe de luz */}
      <AbsoluteFill
        style={{
          mixBlendMode: "screen",
          opacity: 0.35,
          background: `linear-gradient(105deg, rgba(255,214,140,0) ${sunX / 14 + 20}%, rgba(255,214,140,0.5) ${sunX / 14 + 30}%, rgba(255,214,140,0) ${sunX / 14 + 42}%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(2,13,38,0) 40%, rgba(2,13,38,0.96) 58%, #020d26 100%)",
        }}
      />

      <div style={{ position: "absolute", left: 78, top: 1250 }}>
        <MaskLine frame={frame} delay={34}>
          <div style={{ ...line, fontSize: 124 }}>DEIXE A LUZ</div>
        </MaskLine>
        <MaskLine frame={frame} delay={42} style={{ marginTop: 6 }}>
          <div style={{ ...line, fontSize: 124 }}>ENTRAR COM</div>
        </MaskLine>
        <MaskLine frame={frame} delay={52} style={{ marginTop: 14 }}>
          <div
            style={{ ...line, fontSize: 200, color: C.cyan, letterSpacing: -6 }}
          >
            ESTILO.
          </div>
        </MaskLine>
        <div
          style={{
            height: 14,
            width: interpolate(frame, [68, 86], [0, 520], {
              ...clamp,
              easing: easeOut,
            }),
            background: C.cyan,
            borderRadius: 8,
            marginTop: 30,
          }}
        />
      </div>
      <Vignette strength={0.45} />
    </AbsoluteFill>
  );
};
