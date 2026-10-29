import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  spring,
  useVideoConfig,
  interpolate,
  Easing,
  staticFile,
} from "remotion";

const inter = "Inter, system-ui, sans-serif";
const playfair = "'Playfair Display', Georgia, serif";

const fontCss = `
@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 400;
  font-display: block;
  src: url(${staticFile("fonts/inter-latin-400-normal.woff2")}) format('woff2');
}
@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 500;
  font-display: block;
  src: url(${staticFile("fonts/inter-latin-500-normal.woff2")}) format('woff2');
}
@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 600;
  font-display: block;
  src: url(${staticFile("fonts/inter-latin-600-normal.woff2")}) format('woff2');
}
@font-face {
  font-family: 'Playfair Display';
  font-style: normal;
  font-weight: 500;
  font-display: block;
  src: url(${staticFile("fonts/playfair-display-latin-500-normal.woff2")}) format('woff2');
}
@font-face {
  font-family: 'Playfair Display';
  font-style: italic;
  font-weight: 500;
  font-display: block;
  src: url(${staticFile("fonts/playfair-display-latin-500-italic.woff2")}) format('woff2');
}
`;

// Palette — from the concept's visual brief
const INK = "#141008";
const PEAT_DEEP = "#2C1E12";
const PEAT = "#3B2A1A";
const TEA = "#8A6236";
const SPHAG = "#A8B373";
const PARCH = "#D7B98A";
const RUST = "#C47B4A";
const GRAY = "#857A6B";
const PAPER = "#EDE2CC";

// ── Stratigraphic column data ────────────────────────────────────────────
type Stratum = {
  top: number;
  bottom: number;
  tint: string;
  texture: "sphagnum" | "fibrous" | "humified" | "basal";
  grain: number;
};

const STRATA: Stratum[] = [
  { top: 0.00, bottom: 0.07, tint: "#9DB064", texture: "sphagnum", grain: 42 },
  { top: 0.07, bottom: 0.19, tint: "#7A7A3C", texture: "fibrous", grain: 58 },
  { top: 0.19, bottom: 0.35, tint: "#5A4323", texture: "fibrous", grain: 78 },
  { top: 0.35, bottom: 0.57, tint: PEAT, texture: "humified", grain: 92 },
  { top: 0.57, bottom: 0.78, tint: PEAT_DEEP, texture: "humified", grain: 76 },
  { top: 0.78, bottom: 0.92, tint: "#1F1510", texture: "humified", grain: 54 },
  { top: 0.92, bottom: 1.00, tint: "#120A08", texture: "basal", grain: 30 },
];

type Card = {
  depth: number;
  acc: string;
  age: string;
  title: string;
  sub: string;
  delay: number;
};

const CARDS: Card[] = [
  {
    depth: 0.02,
    acc: "ACC. 2026·M",
    age: "LIVING",
    title: "Sphagnum capitula",
    sub: "sphagnan secretion · pH 3.8",
    delay: 0.0,
  },
  {
    depth: 0.21,
    acc: "ACC. 1984·N",
    age: "c. 2 CE",
    title: "Lindow Man",
    sub: "ligature, triple death, intact skin",
    delay: 0.15,
  },
  {
    depth: 0.42,
    acc: "ACC. 1950·H",
    age: "c. 400 BCE",
    title: "Tollund Man",
    sub: "hair, skin, last porridge intact",
    delay: 0.3,
  },
  {
    depth: 0.63,
    acc: "ACC. 1891·T",
    age: "c. 1200 BCE",
    title: "Trundholm sun chariot",
    sub: "bronze & gilt disc, Nordic Bronze Age",
    delay: 0.45,
  },
  {
    depth: 0.86,
    acc: "ACC. P·VII",
    age: "c. 8000 BCE",
    title: "Pine pollen horizon",
    sub: "Mesolithic boreal expansion",
    delay: 0.6,
  },
];

const hash = (s: string): number => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = (h ^ s.charCodeAt(i)) * 16777619;
  return ((h >>> 0) % 10000) / 10000;
};

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ── Page layout (1080 × 1350 portrait) ─────────────────────────────
  //  0–160     : header band
  //  160–470   : title lockup (role / headline / hook)
  //  490–1180  : stratigraphy hero
  //  1200–1230 : caption strip
  //  1280      : footer
  const COL = { x: 420, y: 500, w: 200, h: 660 };

  const depositStart = fps * 0.2;
  const depositEnd = fps * 2.8;
  const depT = interpolate(frame, [depositStart, depositEnd], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const titleSpring = spring({
    frame: frame - fps * 0.1,
    fps,
    config: { damping: 200, mass: 0.9 },
  });

  const hookOpacity = interpolate(frame, [fps * 0.9, fps * 1.9], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const stratumVisible = (s: Stratum): number => {
    const ageMid = 1 - (s.top + s.bottom) / 2;
    const t = depT * 1.08 - ageMid * 0.9;
    return Math.max(0, Math.min(1, t * 1.6));
  };

  const cardOpacity = (c: Card): number => {
    const start = fps * (2.9 + c.delay);
    return interpolate(frame, [start, start + fps * 0.5], [0, 1], {
      easing: Easing.out(Easing.cubic),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  };
  const cardSlide = (c: Card): number => {
    const start = fps * (2.9 + c.delay);
    return interpolate(frame, [start, start + fps * 0.6], [18, 0], {
      easing: Easing.out(Easing.cubic),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  };

  const flecks = (s: Stratum, i: number) => {
    const bandY = COL.y + s.top * COL.h;
    const bandH = (s.bottom - s.top) * COL.h;
    const nodes: React.ReactElement[] = [];
    for (let k = 0; k < s.grain; k++) {
      const seed = hash(`${i}-${k}-f`);
      const seed2 = hash(`${i}-${k}-g`);
      const seed3 = hash(`${i}-${k}-h`);
      const x = COL.x + 6 + seed * (COL.w - 12);
      const y = bandY + 4 + seed2 * (bandH - 8);
      const r = 0.6 + seed3 * 1.6;
      const op = 0.18 + seed3 * 0.28;
      const col =
        s.texture === "sphagnum"
          ? seed > 0.75
            ? PARCH
            : "#CFD79A"
          : s.texture === "fibrous"
            ? seed > 0.6
              ? "#8B6A3C"
              : "#5B4322"
            : seed > 0.75
              ? "#6A4B2A"
              : "#2A1C10";
      nodes.push(
        <circle key={`f-${i}-${k}`} cx={x} cy={y} r={r} fill={col} opacity={op} />,
      );
    }
    if (s.texture === "fibrous" || s.texture === "humified") {
      for (let k = 0; k < 8; k++) {
        const seed = hash(`${i}-${k}-l`);
        const seed2 = hash(`${i}-${k}-m`);
        const y = bandY + 6 + seed * (bandH - 12);
        const len = 20 + seed2 * (COL.w - 40);
        const x = COL.x + 6 + seed2 * (COL.w - 12 - len);
        nodes.push(
          <line
            key={`l-${i}-${k}`}
            x1={x}
            y1={y}
            x2={x + len}
            y2={y}
            stroke={s.tint}
            strokeOpacity={0.35}
            strokeWidth={0.6}
          />,
        );
      }
    }
    return nodes;
  };

  const AXIS_TICKS = [
    { frac: 0.00, label: "0", sub: "SURFACE" },
    { frac: 0.21, label: "2 ka", sub: "" },
    { frac: 0.42, label: "2.4 ka", sub: "" },
    { frac: 0.63, label: "3.2 ka", sub: "" },
    { frac: 0.86, label: "10 ka", sub: "" },
    { frac: 1.00, label: "BASE", sub: "" },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: INK, fontFamily: inter }}>
      <style>{fontCss}</style>

      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          <radialGradient id="bg-vignette" cx="30%" cy="20%" r="100%">
            <stop offset="0%" stopColor="#1E170F" stopOpacity={1} />
            <stop offset="100%" stopColor={INK} stopOpacity={1} />
          </radialGradient>
          <filter id="grain" x="0%" y="0%" width="100%" height="100%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.9"
              numOctaves="2"
              seed="7"
            />
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 0.09
                      0 0 0 0 0.07
                      0 0 0 0 0.05
                      0 0 0 0.18 0"
            />
          </filter>
          <clipPath id="col-clip">
            <rect x={COL.x} y={COL.y} width={COL.w} height={COL.h} />
          </clipPath>
          <linearGradient id="sphag-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#B8C080" />
            <stop offset="100%" stopColor="#6E6B3B" />
          </linearGradient>
        </defs>

        <rect x={0} y={0} width={1080} height={1350} fill="url(#bg-vignette)" />
        <rect
          x={0}
          y={0}
          width={1080}
          height={1350}
          fill="url(#bg-vignette)"
          filter="url(#grain)"
          opacity={0.6}
        />

        {/* ── Top meta band ─────────────────────────────────────────── */}
        <g
          fontFamily={inter}
          fontSize={13}
          letterSpacing={4.5}
          fontWeight={500}
        >
          <text x={80} y={100} fill={GRAY}>
            EVERYDAY MOTIVATION · NO. 003
          </text>
          <text x={1000} y={100} fill={SPHAG} textAnchor="end">
            2026 · 10 · 29
          </text>
          <line
            x1={80}
            y1={122}
            x2={1000}
            y2={122}
            stroke="#2A2218"
            strokeWidth={1}
          />
        </g>

        {/* ── Left specimen-plate panel ─────────────────────────────── */}
        <g>
          {/* panel label */}
          <text
            x={80}
            y={COL.y - 34}
            fill={PARCH}
            fontFamily={inter}
            fontSize={10}
            fontWeight={600}
            letterSpacing={3}
          >
            I · SPHAGNUM FUSCUM
          </text>

          {/* Sphagnum frond illustration — a compact botanical sketch */}
          {(() => {
            const px = 110;
            const py = COL.y + 40;
            // Draw a central stem with branches of fascicles
            const stem = (
              <line
                x1={px}
                y1={py - 10}
                x2={px}
                y2={py + 220}
                stroke={SPHAG}
                strokeWidth={1.6}
                opacity={0.9}
              />
            );
            // capitulum (top cluster)
            const capitulum = (
              <g>
                {Array.from({ length: 10 }).map((_, i) => {
                  const a = -Math.PI / 2 + (i / 9 - 0.5) * Math.PI * 0.9;
                  const r = 16 + (i % 3) * 3;
                  const x2 = px + Math.cos(a) * r;
                  const y2 = py - 10 + Math.sin(a) * r;
                  return (
                    <g key={`cap-${i}`}>
                      <line
                        x1={px}
                        y1={py - 10}
                        x2={x2}
                        y2={y2}
                        stroke="#B8C080"
                        strokeWidth={1.2}
                      />
                      <circle cx={x2} cy={y2} r={2.2} fill="#C7D08A" />
                    </g>
                  );
                })}
              </g>
            );
            // whorls of branches
            const whorls = Array.from({ length: 7 }).map((_, i) => {
              const y = py + 10 + i * 30;
              const dir = i % 2 === 0 ? 1 : -1;
              const base = (
                <g key={`whorl-${i}`}>
                  {[0, 1, 2].map((j) => {
                    const spread = 18 + j * 10;
                    const drop = 8 + j * 4;
                    const tipX = px + dir * spread;
                    const tipY = y + drop;
                    return (
                      <g key={`b-${j}`}>
                        <path
                          d={`M ${px} ${y} Q ${
                            px + dir * (spread * 0.5)
                          } ${y + drop * 0.3} ${tipX} ${tipY}`}
                          stroke="#8A9A58"
                          strokeWidth={1.1}
                          fill="none"
                        />
                        {[0.4, 0.65, 0.85].map((f, k) => {
                          const bx =
                            px +
                            (tipX - px) * f +
                            dir * (1 - f) * 2;
                          const by = y + drop * f - 0.5;
                          return (
                            <circle
                              key={`l-${k}`}
                              cx={bx}
                              cy={by}
                              r={1.2}
                              fill="#A8B373"
                            />
                          );
                        })}
                      </g>
                    );
                  })}
                  {/* opposite side pendant branches */}
                  {[0, 1].map((j) => {
                    const spread = 12 + j * 8;
                    const drop = 14 + j * 6;
                    return (
                      <path
                        key={`p-${j}`}
                        d={`M ${px} ${y + 2} Q ${
                          px - dir * (spread * 0.4)
                        } ${y + drop * 0.4} ${px - dir * spread} ${
                          y + drop
                        }`}
                        stroke="#6E7B3F"
                        strokeWidth={1}
                        fill="none"
                        opacity={0.85}
                      />
                    );
                  })}
                </g>
              );
              return base;
            });
            return (
              <g opacity={0.9}>
                {stem}
                {whorls}
                {capitulum}
                {/* scale bar under frond */}
                <g
                  transform={`translate(${px - 25}, ${py + 240})`}
                  stroke={GRAY}
                  fill={GRAY}
                  fontFamily={inter}
                  fontSize={9}
                  letterSpacing={2}
                  fontWeight={500}
                >
                  <line x1={0} y1={0} x2={50} y2={0} strokeWidth={1} />
                  <line x1={0} y1={-3} x2={0} y2={3} strokeWidth={1} />
                  <line x1={50} y1={-3} x2={50} y2={3} strokeWidth={1} />
                  <text x={25} y={14} textAnchor="middle" stroke="none">
                    2 CM
                  </text>
                </g>
              </g>
            );
          })()}

          {/* small spec sheet below the frond */}
          <g transform={`translate(80, ${COL.y + 340})`}>
            <text
              fontFamily={inter}
              fontSize={10}
              fontWeight={600}
              letterSpacing={3}
              fill={PARCH}
            >
              FIELD CONDITIONS
            </text>
            {[
              ["pH", "3.8", "acidic humic"],
              ["O₂", "< 0.1 mg/L", "anoxic water"],
              ["AGENT", "SPHAGNAN", "polysaccharide"],
              ["GROWTH", "~1 mm/yr", "accumulation"],
              ["OLDEST", "~10 ka", "intact matter"],
            ].map((row, i) => {
              const y = 26 + i * 44;
              return (
                <g key={`r-${i}`}>
                  <text
                    x={0}
                    y={y}
                    fontFamily={inter}
                    fontSize={10}
                    fontWeight={600}
                    letterSpacing={2.4}
                    fill={GRAY}
                  >
                    {row[0]}
                  </text>
                  <text
                    x={0}
                    y={y + 22}
                    fontFamily={playfair}
                    fontStyle="italic"
                    fontSize={18}
                    fill={PARCH}
                  >
                    {row[1]}
                  </text>
                  <text
                    x={250}
                    y={y + 22}
                    textAnchor="end"
                    fontFamily={inter}
                    fontSize={10}
                    fill={TEA}
                    letterSpacing={1.6}
                  >
                    {row[2]}
                  </text>
                  <line
                    x1={0}
                    y1={y + 30}
                    x2={250}
                    y2={y + 30}
                    stroke="#2A2218"
                    strokeWidth={1}
                  />
                </g>
              );
            })}
          </g>
        </g>

        {/* ── Section header: a single line above the hero ───────────── */}
        <g>
          <text
            x={COL.x + COL.w / 2}
            y={COL.y - 34}
            textAnchor="middle"
            fill={PARCH}
            fontFamily={inter}
            fontWeight={600}
            fontSize={10}
            letterSpacing={3}
          >
            II · STRATIGRAPHIC CORE
          </text>
          <text
            x={1000}
            y={COL.y - 34}
            textAnchor="end"
            fill={PARCH}
            fontFamily={inter}
            fontWeight={600}
            fontSize={10}
            letterSpacing={3}
          >
            III · ACCESSION INDEX
          </text>
          {/* corner crop marks around the hero area */}
          {(
            [
              [COL.x - 50, COL.y - 18, 1, 1],
              [COL.x + COL.w + 50, COL.y - 18, -1, 1],
              [COL.x - 50, COL.y + COL.h + 18, 1, -1],
              [COL.x + COL.w + 50, COL.y + COL.h + 18, -1, -1],
            ] as const
          ).map(([cx, cy, sx, sy], i) => (
            <g key={`cm-${i}`} stroke={RUST} strokeWidth={1.2} fill="none" opacity={0.6}>
              <line x1={cx} y1={cy} x2={cx + sx * 18} y2={cy} />
              <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 18} />
            </g>
          ))}
        </g>

        {/* ── Depth axis (left of column) ────────────────────────────── */}
        <g>
          <line
            x1={COL.x - 20}
            y1={COL.y}
            x2={COL.x - 20}
            y2={COL.y + COL.h}
            stroke={GRAY}
            strokeOpacity={0.55}
            strokeWidth={1}
          />
          {AXIS_TICKS.map((t, i) => {
            const y = COL.y + t.frac * COL.h;
            const op = Math.min(1, Math.max(0, depT * 1.2 - t.frac * 0.4));
            return (
              <g key={`tick-${i}`} opacity={op}>
                <line
                  x1={COL.x - 26}
                  y1={y}
                  x2={COL.x - 14}
                  y2={y}
                  stroke={GRAY}
                  strokeWidth={1}
                />
                <text
                  x={COL.x - 32}
                  y={y + 4}
                  textAnchor="end"
                  fill={PARCH}
                  fontFamily={inter}
                  fontSize={11}
                  letterSpacing={1.6}
                  fontWeight={600}
                >
                  {t.label}
                </text>
                {t.sub ? (
                  <text
                    x={COL.x - 32}
                    y={y + 17}
                    textAnchor="end"
                    fill={GRAY}
                    fontFamily={inter}
                    fontSize={9}
                    letterSpacing={2.6}
                    fontWeight={500}
                  >
                    {t.sub}
                  </text>
                ) : null}
              </g>
            );
          })}
        </g>

        {/* ── Column frame ─────────────────────────────────────────── */}
        <rect
          x={COL.x - 2}
          y={COL.y - 2}
          width={COL.w + 4}
          height={COL.h + 4}
          fill="none"
          stroke={PARCH}
          strokeOpacity={0.35}
          strokeWidth={1}
        />
        <rect
          x={COL.x}
          y={COL.y}
          width={COL.w}
          height={COL.h}
          fill="#120D08"
        />

        {/* ── Stratigraphic deposition ────────────────────────────────── */}
        <g clipPath="url(#col-clip)">
          {STRATA.map((s, i) => {
            const vis = stratumVisible(s);
            const topY = COL.y + s.top * COL.h;
            const bottomY = COL.y + s.bottom * COL.h;
            const bandH = bottomY - topY;
            const slide = (1 - vis) * 20;
            return (
              <g key={`st-${i}`} opacity={vis}>
                <rect
                  x={COL.x}
                  y={topY + slide}
                  width={COL.w}
                  height={bandH}
                  fill={s.tint}
                />
                <line
                  x1={COL.x}
                  y1={topY + slide}
                  x2={COL.x + COL.w}
                  y2={topY + slide}
                  stroke="#1A110A"
                  strokeOpacity={0.65}
                  strokeWidth={1}
                />
                <g transform={`translate(0, ${slide})`}>{flecks(s, i)}</g>
              </g>
            );
          })}
        </g>

        {/* Sphagnum crown — living moss hairs along the surface */}
        <g opacity={Math.min(1, Math.max(0, depT * 1.3 - 0.6))}>
          {Array.from({ length: 44 }).map((_, i) => {
            const seed = hash(`crown-${i}`);
            const x = COL.x + 4 + (i / 43) * (COL.w - 8);
            const y = COL.y + 2;
            const h = 8 + seed * 11;
            const wob = (seed - 0.5) * 4;
            return (
              <g key={`c-${i}`}>
                <line
                  x1={x}
                  y1={y + 2}
                  x2={x + wob}
                  y2={y - h}
                  stroke="url(#sphag-grad)"
                  strokeWidth={1.1}
                  strokeOpacity={0.9}
                  strokeLinecap="round"
                />
                <circle
                  cx={x + wob}
                  cy={y - h}
                  r={1.7}
                  fill="#C7D08A"
                  opacity={0.95}
                />
              </g>
            );
          })}
        </g>

        {/* Water-table dashed line */}
        <g opacity={Math.min(1, Math.max(0, depT - 0.3) * 2)}>
          <line
            x1={COL.x - 4}
            y1={COL.y + 0.11 * COL.h}
            x2={COL.x + COL.w + 4}
            y2={COL.y + 0.11 * COL.h}
            stroke={TEA}
            strokeOpacity={0.6}
            strokeDasharray="2 3"
            strokeWidth={1}
          />
        </g>

        {/* ── Accession cards (right of column) ──────────────────────── */}
        {CARDS.map((c, i) => {
          const op = cardOpacity(c);
          const dx = cardSlide(c);
          const yAnchor = COL.y + c.depth * COL.h;
          const cardY = yAnchor - 34;
          const cardX = 660 + dx;
          const cardW = 340;
          const cardH = 68;
          return (
            <g key={`card-${i}`} opacity={op}>
              <line
                x1={COL.x + COL.w + 2}
                y1={yAnchor}
                x2={cardX - 4}
                y2={yAnchor}
                stroke={RUST}
                strokeOpacity={0.8}
                strokeWidth={1}
              />
              <circle
                cx={COL.x + COL.w + 2}
                cy={yAnchor}
                r={3}
                fill={RUST}
              />
              <rect
                x={cardX}
                y={cardY}
                width={cardW}
                height={cardH}
                fill={PAPER}
                stroke={RUST}
                strokeOpacity={0.75}
                strokeWidth={1}
              />
              <circle
                cx={cardX + cardW - 14}
                cy={cardY + 14}
                r={3.5}
                fill="none"
                stroke="#8E6A3C"
                strokeWidth={1}
              />
              <rect
                x={cardX + 10}
                y={cardY + 9}
                width={82}
                height={16}
                fill="none"
                stroke={RUST}
                strokeWidth={1}
              />
              <text
                x={cardX + 51}
                y={cardY + 21}
                textAnchor="middle"
                fill={RUST}
                fontFamily={inter}
                fontSize={10}
                fontWeight={700}
                letterSpacing={1.4}
              >
                {c.acc}
              </text>
              <text
                x={cardX + 102}
                y={cardY + 21}
                fill="#5A4428"
                fontFamily={inter}
                fontSize={10}
                fontWeight={600}
                letterSpacing={2.4}
              >
                {c.age}
              </text>
              <text
                x={cardX + 10}
                y={cardY + 45}
                fill="#1E140A"
                fontFamily={playfair}
                fontStyle="italic"
                fontWeight={500}
                fontSize={19}
              >
                {c.title}
              </text>
              <text
                x={cardX + 10}
                y={cardY + 61}
                fill="#5A4428"
                fontFamily={inter}
                fontSize={11}
                letterSpacing={0.4}
              >
                {c.sub}
              </text>
            </g>
          );
        })}

        {/* ── Caption strip just below the column area ─────────────── */}
        <g
          transform={`translate(80, 1200)`}
          fill={GRAY}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
        >
          <text>PEAT CORE · 10 M · HOLOCENE</text>
          <text x={920} textAnchor="end" fill={SPHAG} opacity={0.85}>
            NOTHING THROWN OUT · EVERYTHING FILED
          </text>
        </g>
      </svg>

      {/* ── Type lockup (top block, full width above the hero) ──────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          top: 170,
          width: 920,
          opacity: titleSpring,
          transform: `translateY(${interpolate(
            titleSpring,
            [0, 1],
            [16, 0],
          )}px)`,
        }}
      >
        <div
          style={{
            color: SPHAG,
            fontFamily: inter,
            fontSize: 13,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 20,
            fontWeight: 600,
          }}
        >
          Role <span style={{ color: GRAY, margin: "0 4px" }}>/</span>
          <span style={{ color: PARCH, letterSpacing: 5 }}>Archivist</span>
        </div>

        <div
          style={{
            color: PARCH,
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 92,
            lineHeight: 0.94,
            letterSpacing: -1.6,
            fontStyle: "italic",
          }}
        >
          The patient archivist.
        </div>

        <div
          style={{
            marginTop: 26,
            color: "#C5BDA9",
            fontFamily: inter,
            fontSize: 19,
            lineHeight: 1.45,
            fontWeight: 400,
            maxWidth: 820,
            opacity: hookOpacity,
          }}
        >
          A Sphagnum bog secretes{" "}
          <span style={{ color: SPHAG, fontWeight: 600 }}>sphagnan</span> — a
          polysaccharide that binds the enzymes of its own microbes. Combined
          with pH&nbsp;3.8 and anoxic water, it keeps the archive{" "}
          <span style={{ color: PARCH, fontWeight: 600 }}>
            intact for millennia
          </span>
          .
        </div>
      </div>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          bottom: 48,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          color: GRAY,
          fontFamily: inter,
          fontSize: 11,
          letterSpacing: 3,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Painter 1991 · Carbohydrate Polymers 15 (2) 83–101</span>
        <span>
          <span style={{ color: RUST }}>●</span> Accessioned, not decomposed
        </span>
      </div>
    </AbsoluteFill>
  );
};
