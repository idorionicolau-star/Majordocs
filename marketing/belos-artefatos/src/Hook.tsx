import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { C, PAVE_BRAND, displayFont, easeOut } from "./theme";
import { MaskLine, Vignette } from "./Common";
import { Pattern, makeFaces } from "./Pattern";

const faces = makeFaces(1080, 2100, 96, "hook");

const line: React.CSSProperties = {
  fontFamily: displayFont,
  fontWeight: 800,
  color: C.white,
  lineHeight: 1,
  letterSpacing: -2,
  whiteSpace: "nowrap",
};

export const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const drift = interpolate(frame, [0, 84], [0, -120]);
  const underline = interpolate(frame, [58, 78], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easeOut,
  });

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 50% 38%, ${C.blue} 0%, ${C.blueDeep} 62%, ${C.navy} 100%)`,
      }}
    >
      <AbsoluteFill style={{ translate: `0 ${drift}px`, opacity: 0.5 }}>
        <Pattern
          faces={faces}
          width={1080}
          height={2100}
          s={96}
          palette={PAVE_BRAND}
          grout="#031238"
          popOf={(f) => {
            const d = Math.hypot(f.cx - 540, f.cy - 760) / 1100;
            return interpolate(frame, [d * 26, d * 26 + 16], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: easeOut,
            });
          }}
        />
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at 50% 46%, rgba(2,13,38,0.9) 0%, rgba(2,13,38,0.55) 48%, rgba(2,13,38,0) 78%)",
        }}
      />
      <AbsoluteFill style={{ justifyContent: "center", paddingLeft: 78 }}>
        <div style={{ marginTop: 40 }}>
          <MaskLine frame={frame} delay={4}>
            <div style={{ ...line, fontSize: 118 }}>O SEU CHÃO</div>
          </MaskLine>
          <MaskLine frame={frame} delay={14} style={{ marginTop: 6 }}>
            <div style={{ ...line, fontSize: 118 }}>MERECE SER</div>
          </MaskLine>
          <MaskLine frame={frame} delay={28} style={{ marginTop: 18 }}>
            <div
              style={{
                ...line,
                fontSize: 300,
                color: C.cyan,
                letterSpacing: -8,
              }}
            >
              OBRA
            </div>
          </MaskLine>
          <MaskLine frame={frame} delay={40} style={{ marginTop: 6 }}>
            <div style={{ ...line, fontSize: 170 }}>DE ARTE.</div>
          </MaskLine>
          <div
            style={{
              height: 14,
              width: `${underline}%`,
              maxWidth: 560,
              background: C.cyan,
              borderRadius: 8,
              marginTop: 34,
            }}
          />
        </div>
      </AbsoluteFill>
      <Vignette strength={0.5} />
    </AbsoluteFill>
  );
};
