import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import {
  C,
  PAVE_CLASSIC,
  displayFont,
  easeBack,
  easeInOut,
  easeOut,
  textFont,
} from "./theme";
import { Grain, MaskLine, Vignette } from "./Common";
import { Pattern, makeFaces } from "./Pattern";

const S = 92;
const faces = makeFaces(1080, 1920, S, "ad");

export const SWEEP_START = 54;
export const SWEEP_END = 132;
export const SLAM = 138;
const TILT = 0.13;

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const BeforeAfter: React.FC = () => {
  const frame = useCurrentFrame();

  const lineX = interpolate(frame, [SWEEP_START, SWEEP_END], [-300, 1420], {
    ...clamp,
    easing: easeInOut,
  });
  const xAt = (y: number) => lineX + (y - 960) * TILT;
  const cam = interpolate(frame, [0, 216], [1, 1.09]);

  const slamP = interpolate(frame, [SLAM, SLAM + 12], [0, 1], {
    ...clamp,
    easing: easeBack,
  });
  const shake =
    frame >= SLAM && frame < SLAM + 16
      ? Math.sin((frame - SLAM) * 2.6) * 14 * (1 - (frame - SLAM) / 16)
      : 0;
  const flash =
    frame < SLAM ? 0 : interpolate(frame, [SLAM, SLAM + 9], [0.75, 0], clamp);
  const cardIn = interpolate(frame, [SLAM + 6, SLAM + 26], [0, 1], {
    ...clamp,
    easing: easeOut,
  });
  const lineVisible = frame > SWEEP_START - 8 && frame < SWEEP_END + 14;
  const beforeOpacity = interpolate(frame, [0, 6], [0, 1], clamp);

  return (
    <AbsoluteFill
      style={{
        background: "#2a1c12",
        translate: `${shake}px ${shake * 0.4}px`,
      }}
    >
      <AbsoluteFill style={{ scale: cam, overflow: "hidden" }}>
        {/* ANTES: terra */}
        <Img
          src={staticFile("areia.jpg")}
          style={{
            width: 1080,
            height: 1920,
            objectFit: "cover",
            filter: "saturate(0.85) brightness(0.82) contrast(1.05)",
            opacity: beforeOpacity,
          }}
        />
        <AbsoluteFill
          style={{
            background:
              "linear-gradient(180deg, rgba(2,13,38,0.35), rgba(2,13,38,0.1) 40%, rgba(2,13,38,0.5))",
          }}
        />

        <AbsoluteFill style={{ justifyContent: "center", paddingLeft: 80 }}>
          {["Terra.", "Pó.", "Lama."].map((t, i) => (
            <MaskLine
              key={t}
              frame={frame}
              delay={6 + i * 12}
              style={{ marginTop: i ? 10 : 0 }}
            >
              <div
                style={{
                  fontFamily: displayFont,
                  fontWeight: 800,
                  fontSize: 170,
                  color: C.white,
                  lineHeight: 1.02,
                  letterSpacing: -5,
                  textShadow: "0 10px 40px rgba(0,0,0,0.55)",
                }}
              >
                {t}
              </div>
            </MaskLine>
          ))}
        </AbsoluteFill>

        {/* DEPOIS: pavê a montar-se à passagem da linha */}
        <AbsoluteFill>
          <Pattern
            faces={faces}
            width={1080}
            height={1920}
            s={S}
            palette={PAVE_CLASSIC}
            grout="#1a1410"
            popOf={(f) =>
              easeOut(Math.max(0, Math.min(1, (xAt(f.cy) - f.cx - 10) / 190)))
            }
          />
        </AbsoluteFill>
        <Grain opacity={0.28} />
      </AbsoluteFill>

      {/* linha de comparação */}
      {lineVisible ? (
        <>
          <div
            style={{
              position: "absolute",
              left: xAt(960) - 5,
              top: -260,
              width: 10,
              height: 2440,
              background: C.white,
              rotate: `${-Math.atan(TILT) * (180 / Math.PI)}deg`,
              boxShadow: `0 0 26px 6px ${C.cyan}, 0 0 90px 28px rgba(25,200,255,0.45)`,
              borderRadius: 6,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: xAt(960) - 66,
              top: 960 - 66,
              width: 132,
              height: 132,
              borderRadius: 66,
              background: C.white,
              border: `8px solid ${C.cyan}`,
              boxShadow: "0 12px 40px rgba(0,0,0,0.45)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: displayFont,
              fontWeight: 800,
              fontSize: 50,
              color: C.blue,
              letterSpacing: 2,
            }}
          >
            ‹›
          </div>
          <Chip
            text="DEPOIS"
            left={xAt(330) - 30}
            align="right"
            bg={C.cyan}
            color={C.navy}
          />
          <Chip
            text="ANTES"
            left={xAt(330) + 30}
            align="left"
            bg={C.navy}
            color={C.white}
          />
        </>
      ) : null}

      <AbsoluteFill style={{ background: C.white, opacity: flash }} />
      <Vignette strength={0.5} />

      {/* resultado */}
      <div
        style={{
          position: "absolute",
          left: 64,
          right: 64,
          bottom: 170,
          opacity: cardIn,
          translate: `0 ${(1 - cardIn) * 60}px`,
        }}
      >
        <div
          style={{
            display: "inline-block",
            background: C.cyan,
            color: C.navy,
            fontFamily: displayFont,
            fontWeight: 800,
            fontSize: 74,
            letterSpacing: 4,
            padding: "10px 34px 14px",
            borderRadius: 18,
            scale: 0.4 + 0.6 * slamP,
            transformOrigin: "0 100%",
            rotate: `${(1 - slamP) * -8}deg`,
          }}
        >
          DEPOIS
        </div>
        <div
          style={{
            marginTop: 22,
            background: "rgba(2,13,38,0.9)",
            borderRadius: 30,
            padding: "34px 44px 38px",
            border: "2px solid rgba(25,200,255,0.45)",
          }}
        >
          <div
            style={{
              fontFamily: displayFont,
              fontWeight: 800,
              fontSize: 84,
              lineHeight: 1.04,
              color: C.white,
              letterSpacing: -2,
            }}
          >
            Pavê que <span style={{ color: C.cyan }}>valoriza</span>
            <br />o seu espaço.
          </div>
          <div
            style={{
              fontFamily: textFont,
              fontWeight: 700,
              fontSize: 38,
              color: "#a9c4ff",
              marginTop: 14,
              letterSpacing: 1,
            }}
          >
            Cores e modelos à sua escolha
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Chip: React.FC<{
  text: string;
  left: number;
  align: "left" | "right";
  bg: string;
  color: string;
}> = ({ text, left, align, bg, color }) => (
  <div
    style={{
      position: "absolute",
      top: 330,
      left,
      translate: align === "right" ? "-100% 0" : "0 0",
      background: bg,
      color,
      fontFamily: displayFont,
      fontWeight: 800,
      fontSize: 46,
      letterSpacing: 4,
      padding: "10px 28px 12px",
      borderRadius: 14,
      whiteSpace: "nowrap",
      boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
    }}
  >
    {text}
  </div>
);
