import React from "react";
import {
  AbsoluteFill,
  Sequence,
  interpolate,
  staticFile,
  useVideoConfig,
} from "remotion";
import { Audio } from "@remotion/media";
import { CoboHook } from "./CoboHook";
import { CoboMontage } from "./CoboMontage";
import { CoboXl } from "./CoboXl";
import { CoboLadder } from "./CoboLadder";
import { Cta } from "./Cta";
import { Sweep, SWEEP_LEN } from "./Sweep";
import { BrandTag, Grain } from "./Common";

// Linha do tempo (30 fps; 15 frames = 1 batida a 120 bpm)
export const TC = {
  hook: 0,
  mont: 90,
  xl: 240,
  ladder: 402,
  cta: 522,
  end: 672,
} as const;

export const BelosCobogos: React.FC = () => {
  const { fps } = useVideoConfig();
  const cuts = [TC.mont, TC.xl, TC.ladder, TC.cta];

  return (
    <AbsoluteFill style={{ background: "#020d26" }}>
      <Sequence
        name="Abertura"
        from={TC.hook}
        durationInFrames={TC.mont - TC.hook}
        premountFor={fps}
      >
        <CoboHook />
      </Sequence>
      <Sequence
        name="9 desenhos"
        from={TC.mont}
        durationInFrames={TC.xl - TC.mont}
        premountFor={fps}
      >
        <CoboMontage />
      </Sequence>
      <Sequence
        name="Painéis"
        from={TC.xl}
        durationInFrames={TC.ladder - TC.xl}
        premountFor={fps}
      >
        <CoboXl />
      </Sequence>
      <Sequence
        name="Tamanhos"
        from={TC.ladder}
        durationInFrames={TC.cta - TC.ladder}
        premountFor={fps}
      >
        <CoboLadder />
      </Sequence>
      <Sequence
        name="Contacto"
        from={TC.cta}
        durationInFrames={TC.end - TC.cta}
        premountFor={fps}
      >
        <Cta footer="COBOGÓS · PAVÊS · LANCIS · MOBILIÁRIO DE JARDIM" />
      </Sequence>

      <Sequence
        name="Marca"
        from={TC.mont + 12}
        durationInFrames={TC.cta - TC.mont - 12}
        premountFor={fps}
      >
        <BrandTag />
      </Sequence>

      {cuts.map((c) => (
        <Sequence
          key={c}
          name={`Transição ${c}`}
          from={c - SWEEP_LEN / 2}
          durationInFrames={SWEEP_LEN}
          premountFor={fps}
        >
          <Sweep />
        </Sequence>
      ))}

      <Grain opacity={0.1} />
      <Audio
        src={staticFile("musica-cobogos.mp3")}
        volume={(f) =>
          interpolate(f, [0, 12, TC.end - 36, TC.end - 1], [0, 1, 1, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })
        }
      />
    </AbsoluteFill>
  );
};
