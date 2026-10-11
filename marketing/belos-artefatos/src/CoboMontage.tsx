import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { C, displayFont, easeOut, textFont } from "./theme";
import { MaskLine } from "./Common";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const IMGS = [
  "c22",
  "c23",
  "c25",
  "c27",
  "c28",
  "c30",
  "c31",
  "c32",
  "c33",
].map((n) => `cobogos/${n}.jpg`);
export const PER = 15; // um modelo por batida (120 bpm)
const GRID_AT = IMGS.length * PER; // 135

export const CoboMontage: React.FC = () => {
  const frame = useCurrentFrame();
  const idx = Math.min(IMGS.length - 1, Math.floor(frame / PER));
  const local = frame - idx * PER;
  const grid = frame >= GRID_AT;
  const reveal = interpolate(local, [0, 6], [0, 1], {
    ...clamp,
    easing: easeOut,
  });
  const beat = interpolate(local, [0, 8], [1.07, 1], {
    ...clamp,
    easing: easeOut,
  });
  const gridFade = interpolate(frame, [GRID_AT, GRID_AT + 6], [0, 1], clamp);

  return (
    <AbsoluteFill style={{ background: C.navy }}>
      <AbsoluteFill style={{ overflow: "hidden" }}>
        <Img
          src={staticFile(IMGS[idx])}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: "blur(40px) brightness(0.38) saturate(1.2)",
            scale: 1.3,
          }}
        />
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(4,26,69,0.55), rgba(2,13,38,0.8))",
        }}
      />

      <div
        style={{
          position: "absolute",
          left: 64,
          top: 190,
          display: "flex",
          alignItems: "baseline",
          gap: 18,
          opacity: grid ? 0 : 1,
        }}
      >
        <div
          style={{
            fontFamily: displayFont,
            fontWeight: 800,
            fontSize: 190,
            lineHeight: 1,
            color: "rgba(2,13,38,0.4)",
            WebkitTextStroke: `5px ${C.cyan}`,
            scale: beat,
            transformOrigin: "0 100%",
          }}
        >
          {String(idx + 1).padStart(2, "0")}
        </div>
        <div
          style={{
            fontFamily: displayFont,
            fontWeight: 800,
            fontSize: 64,
            color: C.white,
            opacity: 0.9,
          }}
        >
          / 09
        </div>
      </div>

      {!grid ? (
        <div
          style={{
            position: "absolute",
            left: 40,
            top: 440,
            width: 1000,
            height: 780,
            borderRadius: 40,
            overflow: "hidden",
            boxShadow:
              "0 40px 100px rgba(0,0,0,0.6), 0 0 0 6px rgba(25,200,255,0.6)",
            clipPath: `inset(${(1 - reveal) * 50}% 0% ${(1 - reveal) * 50}% 0% round 40px)`,
          }}
        >
          <Img
            src={staticFile(IMGS[idx])}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              scale: beat,
            }}
          />
        </div>
      ) : null}

      {!grid ? (
        <div
          style={{
            position: "absolute",
            left: 64,
            right: 64,
            top: 1310,
            scale: beat,
            transformOrigin: "0 50%",
          }}
        >
          <div
            style={{
              fontFamily: textFont,
              fontWeight: 700,
              fontSize: 46,
              letterSpacing: 6,
              color: C.cyan,
            }}
          >
            COBOGÓ 30×30 CM
          </div>
          <div
            style={{
              fontFamily: displayFont,
              fontWeight: 800,
              fontSize: 230,
              lineHeight: 1,
              color: C.white,
              letterSpacing: -8,
              marginTop: 6,
            }}
          >
            120{" "}
            <span style={{ color: C.cyan, fontSize: 120, letterSpacing: -2 }}>
              MT
            </span>
          </div>
        </div>
      ) : null}

      {/* resumo em grelha 3×3 */}
      {grid ? (
        <AbsoluteFill style={{ opacity: gridFade }}>
          <div style={{ position: "absolute", left: 64, top: 180 }}>
            <MaskLine frame={frame - GRID_AT} delay={0}>
              <div
                style={{
                  fontFamily: displayFont,
                  fontWeight: 800,
                  fontSize: 118,
                  color: C.white,
                  lineHeight: 1,
                  letterSpacing: -3,
                }}
              >
                9 DESENHOS.
              </div>
            </MaskLine>
            <MaskLine
              frame={frame - GRID_AT}
              delay={3}
              style={{ marginTop: 8 }}
            >
              <div
                style={{
                  fontFamily: displayFont,
                  fontWeight: 800,
                  fontSize: 118,
                  color: C.cyan,
                  lineHeight: 1,
                  letterSpacing: -3,
                }}
              >
                120 MT.
              </div>
            </MaskLine>
          </div>
          <div
            style={{
              position: "absolute",
              left: 40,
              top: 560,
              width: 1000,
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 16,
            }}
          >
            {IMGS.map((src, i) => {
              const p = interpolate(
                frame - GRID_AT,
                [i * 0.8, i * 0.8 + 6],
                [0, 1],
                { ...clamp, easing: easeOut },
              );
              return (
                <div
                  key={src}
                  style={{
                    height: 300,
                    borderRadius: 22,
                    overflow: "hidden",
                    scale: 0.7 + 0.3 * p,
                    opacity: p,
                    boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
                  }}
                >
                  <Img
                    src={staticFile(src)}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                </div>
              );
            })}
          </div>
        </AbsoluteFill>
      ) : null}

      <div
        style={{
          position: "absolute",
          left: 64,
          right: 64,
          bottom: 150,
          display: "flex",
          gap: 10,
        }}
      >
        {IMGS.map((s, i) => (
          <div
            key={s}
            style={{
              flex: 1,
              height: 10,
              borderRadius: 6,
              background: i <= idx ? C.cyan : "rgba(255,255,255,0.28)",
            }}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
};
