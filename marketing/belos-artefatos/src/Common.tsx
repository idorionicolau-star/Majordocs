import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { C, brandFont, textFont } from "./theme";

export const Grain: React.FC<{ opacity?: number }> = ({ opacity = 0.14 }) => (
  <AbsoluteFill
    style={{ mixBlendMode: "overlay", opacity, pointerEvents: "none" }}
  >
    <Img
      src={staticFile("grao.jpg")}
      style={{ width: "100%", height: "100%", objectFit: "cover" }}
    />
  </AbsoluteFill>
);

export const Vignette: React.FC<{ strength?: number }> = ({
  strength = 0.55,
}) => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 55%, rgba(2,10,30,${strength}) 100%)`,
      pointerEvents: "none",
    }}
  />
);

export const Logo: React.FC<{ size?: number }> = ({ size = 64 }) => (
  <div
    style={{
      fontFamily: brandFont,
      fontWeight: 900,
      fontSize: size,
      lineHeight: 1,
      letterSpacing: -size * 0.01,
      whiteSpace: "nowrap",
    }}
  >
    <span style={{ color: C.cyan }}>Belos</span>{" "}
    <span style={{ color: C.white }}>Artefatos</span>
  </div>
);

export const Tagline: React.FC<{
  size?: number;
  style?: React.CSSProperties;
}> = ({ size = 28, style }) => (
  <div
    style={{
      fontFamily: textFont,
      fontWeight: 700,
      fontSize: size,
      letterSpacing: size * 0.28,
      color: C.cyan,
      textAlign: "center",
      lineHeight: 1.5,
      ...style,
    }}
  >
    ACABAMENTOS QUE
    <br />
    SEU QUINTAL <span style={{ color: C.white }}>MERECE!</span>
  </div>
);

// Pequena marca no canto, durante o filme.
export const BrandTag: React.FC = () => (
  <div
    style={{
      position: "absolute",
      top: 70,
      left: 64,
      display: "flex",
      alignItems: "center",
      gap: 16,
      opacity: 0.95,
    }}
  >
    <div
      style={{
        background: "rgba(2,13,38,0.72)",
        padding: "14px 26px",
        borderRadius: 999,
        border: "2px solid rgba(25,200,255,0.5)",
      }}
    >
      <Logo size={38} />
    </div>
  </div>
);

// Linha de texto que "sobe" de uma máscara (revelação tipográfica).
export const MaskLine: React.FC<{
  frame: number;
  delay: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
  inner?: React.CSSProperties;
}> = ({ frame, delay, children, style, inner }) => {
  const p = Math.max(0, Math.min(1, (frame - delay) / 16));
  const e = 1 - Math.pow(1 - p, 4);
  return (
    <div
      style={{
        overflow: "hidden",
        paddingBottom: "0.12em",
        marginBottom: "-0.12em",
        ...style,
      }}
    >
      <div
        style={{
          translate: `0 ${(1 - e) * 115}%`,
          rotate: `${(1 - e) * 4}deg`,
          transformOrigin: "0 100%",
          ...inner,
        }}
      >
        {children}
      </div>
    </div>
  );
};
