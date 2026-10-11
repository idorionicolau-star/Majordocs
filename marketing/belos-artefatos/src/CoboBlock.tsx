import React from "react";

// Cobogó em betão: moldura quadrada com cantos em "L" e janela central.
// Os vazados deixam passar o que estiver atrás (luz, cor).
const HOLES = [
  "M38 38H62V62H38Z",
  "M12 12H46V24H24V46H12Z",
  "M88 12H54V24H76V46H88Z",
  "M12 88H46V76H24V54H12Z",
  "M88 88H54V76H76V54H88Z",
].join(" ");
const BODY = `M0 0H100V100H0Z ${HOLES}`;

export const CoboBlock: React.FC<{
  size: number;
  concrete?: string;
  depth?: number;
  style?: React.CSSProperties;
}> = ({ size, concrete = "#d9dce1", depth = 5, style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    style={{ display: "block", overflow: "visible", ...style }}
  >
    <defs>
      <linearGradient id="cb-shade" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#ffffff" stopOpacity="0.55" />
        <stop offset="0.55" stopColor="#ffffff" stopOpacity="0" />
        <stop offset="1" stopColor="#000000" stopOpacity="0.22" />
      </linearGradient>
    </defs>
    {/* espessura: a sombra interior dá relevo aos vazados */}
    <path
      d={BODY}
      fillRule="evenodd"
      fill="#3a3f48"
      transform={`translate(${depth * 0.5} ${depth * 0.5})`}
    />
    <path d={BODY} fillRule="evenodd" fill={concrete} />
    <path d={BODY} fillRule="evenodd" fill="url(#cb-shade)" />
    <path
      d={BODY}
      fillRule="evenodd"
      fill="none"
      stroke="rgba(0,0,0,0.28)"
      strokeWidth="0.8"
    />
  </svg>
);
