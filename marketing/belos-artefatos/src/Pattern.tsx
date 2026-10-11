import React from "react";
import { random } from "remotion";
import type { Palette } from "./theme";
import { C } from "./theme";

// Padrão de cubos ("tumbling blocks"), igual à ilusão 3D do pavê em Y:
// cada cubo tem três faces (topo, esquerda, direita), uma por cor.
export type Face = {
  key: string;
  pts: string;
  tone: 0 | 1 | 2;
  cx: number;
  cy: number;
  jitter: number;
};

const SQ3 = Math.sqrt(3);

export const makeFaces = (
  width: number,
  height: number,
  s: number,
  seed = "p",
): Face[] => {
  const w = SQ3 * s;
  const rowH = 1.5 * s;
  const cols = Math.ceil(width / w) + 2;
  const rows = Math.ceil(height / rowH) + 2;
  const faces: Face[] = [];
  for (let r = -1; r < rows; r++) {
    for (let c = -1; c < cols; c++) {
      const cx = c * w + (Math.abs(r) % 2 ? w / 2 : 0);
      const cy = r * rowH;
      const v = [
        [cx, cy - s],
        [cx + (SQ3 / 2) * s, cy - s / 2],
        [cx + (SQ3 / 2) * s, cy + s / 2],
        [cx, cy + s],
        [cx - (SQ3 / 2) * s, cy + s / 2],
        [cx - (SQ3 / 2) * s, cy - s / 2],
      ];
      const mk = (
        idx: number[],
        tone: 0 | 1 | 2,
        fx: number,
        fy: number,
      ): Face => ({
        key: `${r}_${c}_${tone}`,
        pts: [[cx, cy], ...idx.map((i) => v[i])]
          .map((p) => p.map((n) => n.toFixed(1)).join(","))
          .join(" "),
        tone,
        cx: fx,
        cy: fy,
        jitter: random(`${seed}-${r}-${c}-${tone}`),
      });
      faces.push(mk([5, 0, 1], 0, cx, cy - s * 0.5));
      faces.push(mk([5, 4, 3], 1, cx - s * 0.43, cy + s * 0.25));
      faces.push(mk([1, 2, 3], 2, cx + s * 0.43, cy + s * 0.25));
    }
  }
  return faces;
};

const shade = (hex: string, amt: number) => {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v + amt)));
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
};

type Props = {
  faces: Face[];
  width: number;
  height: number;
  s: number;
  palette: Palette;
  grout?: string;
  /** progresso (0..1) de entrada de cada peça; por omissão aparece tudo */
  popOf?: (f: Face) => number;
  style?: React.CSSProperties;
};

export const Pattern: React.FC<Props> = ({
  faces,
  width,
  height,
  s,
  palette,
  grout = C.grout,
  popOf,
  style,
}) => {
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: "block", ...style }}
    >
      {faces.map((f) => {
        const p = popOf ? popOf(f) : 1;
        if (p <= 0.001) return null;
        const sc = 0.55 + 0.45 * p;
        return (
          <polygon
            key={f.key}
            points={f.pts}
            fill={shade(palette[f.tone], (f.jitter - 0.5) * 14)}
            stroke={grout}
            strokeWidth={s * 0.075}
            strokeLinejoin="round"
            style={{
              transformBox: "fill-box",
              transformOrigin: "50% 50%",
              scale: sc,
              translate: `0px ${(1 - p) * -s * 0.7}px`,
              opacity: Math.min(1, p * 2.2),
            }}
          />
        );
      })}
    </svg>
  );
};
