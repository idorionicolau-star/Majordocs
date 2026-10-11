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
  PAVE_BRAND,
  displayFont,
  easeBack,
  easeOut,
  textFont,
} from "./theme";
import { Logo, MaskLine, Tagline, Vignette } from "./Common";
import { Pattern, makeFaces } from "./Pattern";

const faces = makeFaces(1080, 2100, 110, "cta");
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const Phone: React.FC<{ color: string }> = ({ color }) => (
  <svg width="56" height="56" viewBox="0 0 24 24" fill={color}>
    <path d="M6.6 10.8a15 15 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.6a1 1 0 0 1-.25 1z" />
  </svg>
);

const Bubble: React.FC = () => (
  <svg width="68" height="68" viewBox="0 0 24 24" fill="none">
    <path
      d="M12 2.5a9.5 9.5 0 0 0-8.2 14.3L2.6 21.4l4.8-1.2A9.5 9.5 0 1 0 12 2.5z"
      stroke="#fff"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <path
      transform="translate(5.4 5.2) scale(0.55)"
      fill="#fff"
      d="M6.6 10.8a15 15 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.6a1 1 0 0 1-.25 1z"
    />
  </svg>
);

export const Cta: React.FC = () => {
  const frame = useCurrentFrame();
  const logoIn = interpolate(frame, [0, 22], [0, 1], {
    ...clamp,
    easing: easeBack,
  });
  const pulse = (frame % 45) / 45;
  const ring = interpolate(pulse, [0, 1], [1, 1.9]);
  const ringO = interpolate(pulse, [0, 1], [0.6, 0]);
  const rowIn = (d: number) =>
    interpolate(frame, [d, d + 18], [0, 1], { ...clamp, easing: easeOut });

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 50% 30%, ${C.blue} 0%, ${C.blueDeep} 70%, ${C.navy} 100%)`,
      }}
    >
      <AbsoluteFill style={{ opacity: 0.2 }}>
        <Img
          src={staticFile("fotos/noite.jpg")}
          style={{ width: 1080, height: 1920, objectFit: "cover" }}
        />
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          opacity: 0.28,
          translate: `0 ${interpolate(frame, [0, 150], [0, -90])}px`,
        }}
      >
        <Pattern
          faces={faces}
          width={1080}
          height={2100}
          s={110}
          palette={PAVE_BRAND}
          grout="#031238"
        />
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at 50% 50%, rgba(2,13,38,0.82) 0%, rgba(2,13,38,0.55) 55%, rgba(2,13,38,0.15) 100%)",
        }}
      />

      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "flex-start",
          paddingTop: 250,
        }}
      >
        <div style={{ scale: 0.5 + 0.5 * logoIn, opacity: logoIn }}>
          <Logo size={136} />
        </div>
        <div style={{ marginTop: 34, opacity: rowIn(14) }}>
          <Tagline size={30} />
        </div>

        <div style={{ marginTop: 150 }}>
          <MaskLine frame={frame} delay={26} inner={{ textAlign: "center" }}>
            <div
              style={{
                fontFamily: displayFont,
                fontWeight: 800,
                fontSize: 104,
                lineHeight: 1.05,
                color: C.white,
                letterSpacing: -3,
                textAlign: "center",
              }}
            >
              PEÇA O SEU
            </div>
          </MaskLine>
          <MaskLine frame={frame} delay={34} inner={{ textAlign: "center" }}>
            <div
              style={{
                fontFamily: displayFont,
                fontWeight: 800,
                fontSize: 138,
                lineHeight: 1.05,
                color: C.cyan,
                letterSpacing: -4,
                textAlign: "center",
              }}
            >
              ORÇAMENTO
            </div>
          </MaskLine>
        </div>

        <div
          style={{
            marginTop: 120,
            width: 900,
            opacity: rowIn(50),
            translate: `0 ${(1 - rowIn(50)) * 50}px`,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 34,
              background: C.green,
              borderRadius: 120,
              padding: "26px 48px 26px 30px",
              boxShadow: "0 24px 70px rgba(0,0,0,0.5)",
              position: "relative",
            }}
          >
            <div
              style={{
                position: "relative",
                width: 110,
                height: 110,
                borderRadius: 55,
                background: "rgba(0,0,0,0.18)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flex: "none",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: 55,
                  border: "4px solid #fff",
                  scale: ring,
                  opacity: ringO,
                }}
              />
              <Bubble />
            </div>
            <div>
              <div
                style={{
                  fontFamily: displayFont,
                  fontWeight: 800,
                  fontSize: 82,
                  color: C.white,
                  letterSpacing: -1,
                  lineHeight: 1,
                }}
              >
                877 778 286
              </div>
              <div
                style={{
                  fontFamily: textFont,
                  fontWeight: 700,
                  fontSize: 34,
                  color: "rgba(255,255,255,0.95)",
                  marginTop: 6,
                }}
              >
                WhatsApp e chamadas
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 40,
            width: 900,
            opacity: rowIn(64),
            translate: `0 ${(1 - rowIn(64)) * 50}px`,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 34,
              background: "rgba(255,255,255,0.1)",
              border: `3px solid ${C.cyan}`,
              borderRadius: 120,
              padding: "20px 48px 20px 30px",
            }}
          >
            <div
              style={{
                width: 110,
                height: 110,
                borderRadius: 55,
                background: C.cyan,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flex: "none",
              }}
            >
              <Phone color={C.navy} />
            </div>
            <div>
              <div
                style={{
                  fontFamily: displayFont,
                  fontWeight: 800,
                  fontSize: 72,
                  color: C.white,
                  letterSpacing: -1,
                  lineHeight: 1,
                }}
              >
                843 427 497
              </div>
              <div
                style={{
                  fontFamily: textFont,
                  fontWeight: 700,
                  fontSize: 32,
                  color: "#a9c4ff",
                  marginTop: 6,
                }}
              >
                Apenas chamadas
              </div>
            </div>
          </div>
        </div>
      </AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 150,
          textAlign: "center",
          opacity: rowIn(84),
          fontFamily: textFont,
          fontWeight: 700,
          fontSize: 29,
          letterSpacing: 3,
          color: "#a9c4ff",
        }}
      >
        PAVÊS · COBOGÓS · LANCIS · MOBILIÁRIO DE JARDIM
      </div>
      <Vignette strength={0.4} />
    </AbsoluteFill>
  );
};
