import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { C, displayFont, easeBack, easeOut } from "./theme";
import { MaskLine } from "./Common";
import { CoboBlock } from "./CoboBlock";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const K = 6.2; // px por cm: o desenho é proporcional ao tamanho real
const rows = [
  [
    { cm: 20, price: "100" },
    { cm: 24, price: "100" },
    { cm: 30, price: "120" },
  ],
  [
    { cm: 60, price: "600" },
    { cm: 80, price: "1200" },
  ],
];

export const CoboLadder: React.FC = () => {
  const frame = useCurrentFrame();
  let order = 0;
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
            O TAMANHO
          </div>
        </MaskLine>
      </div>

      {rows.map((row, ri) => (
        <div
          key={ri}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: ri === 0 ? 520 : 930,
            height: ri === 0 ? 320 : 640,
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-end",
            gap: ri === 0 ? 56 : 90,
          }}
        >
          {row.map((it) => {
            const i = order++;
            const d = 18 + i * 12;
            const p = interpolate(frame, [d, d + 18], [0, 1], {
              ...clamp,
              easing: easeBack,
            });
            const labelP = interpolate(frame, [d + 8, d + 22], [0, 1], {
              ...clamp,
              easing: easeOut,
            });
            const s = it.cm * K;
            return (
              <div
                key={it.cm}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    position: "relative",
                    width: s,
                    height: s,
                    scale: p,
                    transformOrigin: "50% 100%",
                    opacity: Math.min(1, p * 3),
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background:
                        "radial-gradient(circle at 30% 25%, #ffd27a 0%, #ff8a3d 45%, #7b2a3a 100%)",
                    }}
                  />
                  <CoboBlock
                    size={s}
                    depth={Math.max(2, s / 40)}
                    style={{ position: "absolute", inset: 0 }}
                  />
                </div>
                <div
                  style={{
                    marginTop: 16,
                    opacity: labelP,
                    translate: `0 ${(1 - labelP) * 20}px`,
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      fontFamily: displayFont,
                      fontWeight: 800,
                      fontSize: ri === 0 ? 40 : 52,
                      color: C.white,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {it.cm}×{it.cm}
                  </div>
                  <div
                    style={{
                      marginTop: 6,
                      display: "inline-block",
                      background: C.cyan,
                      color: C.navy,
                      fontFamily: displayFont,
                      fontWeight: 800,
                      fontSize: ri === 0 ? 38 : 50,
                      padding: "4px 18px 6px",
                      borderRadius: 12,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {it.price} MT
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </AbsoluteFill>
  );
};
