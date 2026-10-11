import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { C, easeInOut } from "./theme";

// Faixa diagonal que cobre o ecrã: a troca de cena acontece a meio, escondida.
export const SWEEP_LEN = 24;
const W = 2000;

export const Sweep: React.FC = () => {
  const frame = useCurrentFrame();
  const left = interpolate(frame, [0, SWEEP_LEN - 1], [-2500, 1580], {
    easing: easeInOut,
  });
  const skew = "skewX(-14deg)";
  return (
    <AbsoluteFill style={{ overflow: "hidden", pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          top: -200,
          height: 2320,
          left: left - 190,
          width: 150,
          background: C.navy,
          transform: skew,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: -200,
          height: 2320,
          left,
          width: W,
          background: C.cyan,
          transform: skew,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: -200,
          height: 2320,
          left: left + W + 24,
          width: 90,
          background: C.white,
          transform: skew,
        }}
      />
    </AbsoluteFill>
  );
};
