import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { C, displayFont, easeInOut, textFont } from "./theme";
import { MaskLine, Vignette } from "./Common";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const XL_PER = 54;
const items = [
  {
    img: "cobogos/c19.jpg",
    size: "80×80",
    price: "1200",
    note: "Painel decorativo",
  },
  {
    img: "cobogos/c29.jpg",
    size: "60×60",
    price: "600",
    note: "Desenho geométrico",
  },
  {
    img: "cobogos/c21.jpg",
    size: "100×60",
    price: "1200",
    note: "Padrão escamas",
  },
];

export const CoboXl: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${C.blueDeep}, ${C.navy})`,
      }}
    >
      {items.map((it, k) => {
        const local = frame - k * XL_PER;
        if (local < -2) return null;
        const slide =
          k === 0
            ? 1
            : interpolate(local, [0, 16], [0, 1], {
                ...clamp,
                easing: easeInOut,
              });
        const zoom = interpolate(local, [0, XL_PER + 10], [1.0, 1.12], clamp);
        return (
          <AbsoluteFill
            key={it.size}
            style={{ translate: `${(1 - slide) * 1080}px 0` }}
          >
            <AbsoluteFill
              style={{
                background: `linear-gradient(180deg, ${C.blueDeep}, ${C.navy})`,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 330,
                width: 1080,
                height: 740,
                overflow: "hidden",
                boxShadow: "0 30px 90px rgba(0,0,0,0.6)",
              }}
            >
              <Img
                src={staticFile(it.img)}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  scale: zoom,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(180deg, rgba(2,13,38,0) 70%, rgba(2,13,38,0.5))",
                }}
              />
            </div>
            <div style={{ position: "absolute", left: 64, top: 275 }}>
              <MaskLine frame={local} delay={6}>
                <div
                  style={{
                    display: "inline-block",
                    background: C.cyan,
                    color: C.navy,
                    fontFamily: textFont,
                    fontWeight: 700,
                    fontSize: 40,
                    letterSpacing: 5,
                    padding: "8px 26px 10px",
                    borderRadius: 12,
                  }}
                >
                  {it.note.toUpperCase()}
                </div>
              </MaskLine>
            </div>
            <div
              style={{ position: "absolute", left: 64, right: 64, top: 1250 }}
            >
              <MaskLine frame={local} delay={10}>
                <div
                  style={{
                    fontFamily: displayFont,
                    fontWeight: 800,
                    fontSize: 168,
                    lineHeight: 1,
                    color: C.white,
                    letterSpacing: -6,
                    whiteSpace: "nowrap",
                  }}
                >
                  {it.size}{" "}
                  <span
                    style={{
                      fontSize: 80,
                      color: "#a9c4ff",
                      letterSpacing: -1,
                    }}
                  >
                    cm
                  </span>
                </div>
              </MaskLine>
              <MaskLine frame={local} delay={18} style={{ marginTop: 22 }}>
                <div
                  style={{
                    fontFamily: displayFont,
                    fontWeight: 800,
                    fontSize: 190,
                    lineHeight: 1,
                    color: C.cyan,
                    letterSpacing: -6,
                    whiteSpace: "nowrap",
                  }}
                >
                  {it.price}{" "}
                  <span style={{ fontSize: 100, letterSpacing: -2 }}>MT</span>
                </div>
              </MaskLine>
            </div>
          </AbsoluteFill>
        );
      })}
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
        {items.map((it, k) => (
          <div
            key={it.size}
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
                width: `${interpolate(frame, [k * XL_PER, (k + 1) * XL_PER], [0, 100], clamp)}%`,
                height: "100%",
                background: C.cyan,
              }}
            />
          </div>
        ))}
      </div>
      <Vignette strength={0.35} />
    </AbsoluteFill>
  );
};
