import React from "react";
import {
  AbsoluteFill,
  Sequence,
  interpolate,
  staticFile,
  useVideoConfig,
} from "remotion";
import { Audio } from "@remotion/media";
import { Hook } from "./Hook";
import { BeforeAfter } from "./BeforeAfter";
import { Showcase } from "./Showcase";
import { Colors } from "./Colors";
import { Cta } from "./Cta";
import { Sweep, SWEEP_LEN } from "./Sweep";
import { BrandTag, Grain } from "./Common";

// Linha do tempo (30 fps)
export const T = {
  hook: 0,
  ad: 84,
  show: 300,
  colors: 552,
  cta: 660,
  end: 810,
} as const;

export const BelosPave: React.FC = () => {
  const { fps } = useVideoConfig();
  const cuts = [T.ad, T.show, T.colors, T.cta];

  return (
    <AbsoluteFill style={{ background: "#020d26" }}>
      <Sequence
        name="Abertura"
        from={T.hook}
        durationInFrames={T.ad - T.hook}
        premountFor={fps}
      >
        <Hook />
      </Sequence>
      <Sequence
        name="Antes e depois"
        from={T.ad}
        durationInFrames={T.show - T.ad}
        premountFor={fps}
      >
        <BeforeAfter />
      </Sequence>
      <Sequence
        name="Modelos"
        from={T.show}
        durationInFrames={T.colors - T.show}
        premountFor={fps}
      >
        <Showcase />
      </Sequence>
      <Sequence
        name="Cores"
        from={T.colors}
        durationInFrames={T.cta - T.colors}
        premountFor={fps}
      >
        <Colors />
      </Sequence>
      <Sequence
        name="Contacto"
        from={T.cta}
        durationInFrames={T.end - T.cta}
        premountFor={fps}
      >
        <Cta />
      </Sequence>

      <Sequence
        name="Marca"
        from={T.ad + 12}
        durationInFrames={T.colors - T.ad - 12}
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
        src={staticFile("musica.mp3")}
        volume={(f) =>
          interpolate(f, [0, 12, T.end - 36, T.end - 1], [0, 1, 1, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })
        }
      />
    </AbsoluteFill>
  );
};
