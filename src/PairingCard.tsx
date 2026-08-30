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
const INK = "#0F1114";
const WOOD = "#E8DDC7";
const HEART = "#B8843F";
const NEEDLE = "#4A6858";
const SKY = "#7B8FA3";

// Slight tints/shades derived from the palette (no new hues)
const WOOD_DIM = "#8B846F";
const WOOD_DARK = "#2A2822"; // deepest ring line (near-black shade of WOOD)
const WOOD_MID = "#8A7B60"; // mid-tone latewood grain
const HEART_GLOW = "#D9A365";
const BOARD = "#141618";
const BOARD_VIGNETTE = "#181A1D";
const GRID_LINE = "#1F2226";
const GRID_MAJOR_LINE = "#292D33";
// Bleached slab background — light warm WOOD tints
const SLAB_HI = "#D6C9AC"; // bright bleached highlight
const SLAB_BASE = "#B0A386"; // slightly cooler shadow side

// ── Ring layout ───────────────────────────────────────────────────────
// The slab-slice sits inside the drafting frame. The pith is at the top;
// rings march downward as calendar years increase, so a leader-line
// timeline on the right maps 1:1 to y-position.

type RingSpec = {
  y: number; // vertical position within slab (0 = pith / top)
  weight: number; // stroke width in slab-space (px)
  brightness: number; // 0..1 — narrower rings are darker (compressed)
  year: number; // calendar year (negative = BCE)
};

// Build rings across ~4855 years, so year(0) = 2831 BCE, year(N-1) = 2026 CE.
// A pseudo-random walk gives realistic climate-stressed spacing:
// mostly narrow (bristlecone at 3000m rarely lays down wide rings), with
// bands of drought and a few wet decades.
const YEAR_START = -2831; // BCE (2831 BCE)
const YEAR_END = 2026;
const TOTAL_YEARS = YEAR_END - YEAR_START; // 4857
const RING_COUNT = 128; // visual rings; each rendered ring spans ~38 years

const rings: RingSpec[] = (() => {
  // Deterministic pseudo-random via mulberry32
  let s = 0x9e3779b9;
  const rand = () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const arr: RingSpec[] = [];
  // Build "spacing" per ring; sum is normalised to SLAB_H later.
  const spacings: number[] = [];
  // Curated dramatic bands (climate signals visible in the record)
  const droughtBands = new Set([8, 9, 10, 34, 35, 55, 56, 57, 78, 100, 101]);
  const wetBands = new Set([21, 22, 46, 47, 66, 89, 90, 116]);
  for (let i = 0; i < RING_COUNT; i++) {
    const wave =
      0.55 +
      0.35 * Math.sin(i * 0.31 + 1.2) +
      0.25 * Math.sin(i * 0.11 + 2.9) +
      0.15 * Math.sin(i * 0.73);
    const noise = rand() * 0.9 + 0.2;
    let s = Math.max(0.35, wave * 0.6 + noise * 0.6);
    if (droughtBands.has(i)) s *= 0.25;
    else if (rand() < 0.07) s *= 0.4;
    if (wetBands.has(i)) s *= 2.4;
    else if (rand() < 0.04) s *= 1.7;
    spacings.push(s);
  }

  let acc = 0;
  const cum: number[] = [];
  for (const g of spacings) {
    acc += g;
    cum.push(acc);
  }
  const total = acc;

  for (let i = 0; i < RING_COUNT; i++) {
    const yNorm = cum[i] / total; // 0..1 down the slab
    const gap = spacings[i];
    // Narrow rings are dark and thin; wide rings brighter/heavier
    const gNorm = Math.min(1, gap / 2.4);
    const brightness = 0.35 + gNorm * 0.65;
    const weight = 0.5 + gNorm * 1.3;
    const yr = Math.round(YEAR_START + (i / (RING_COUNT - 1)) * TOTAL_YEARS);
    arr.push({ y: yNorm, weight, brightness, year: yr });
  }
  return arr;
})();

type Marker = {
  year: number;
  label: string;
  sub: string;
  labelDy?: number; // vertical offset (px) applied to the LABEL only
};
const MARKERS: Marker[] = [
  { year: -2560, label: "GREAT PYRAMID · FINISHED", sub: "c. 2560 BCE" },
  { year: -800, label: "HOMER · ILIAD", sub: "c. 800 BCE" },
  { year: 476, label: "ROME · FALLS", sub: "476 CE" },
  { year: 1492, label: "COLUMBUS · LANDFALL", sub: "1492 CE", labelDy: -22 },
  { year: 1969, label: "APOLLO 11 · MOON", sub: "1969 CE", labelDy: 26 },
];

const yearToNorm = (yr: number) =>
  (yr - YEAR_START) / TOTAL_YEARS;

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ── Timing ─────────────────────────────────────────────────────────
  // 0.0..2.6s : rings grow downward (spring-eased)
  // 1.6..3.2s : leader lines whip out, staggered
  // 2.4..3.0s : title/role snap
  // 3.0..3.9s : hook fades in
  // 4.0..5.0s : gentle "reading" indicator sweep along the ledger
  const growSpan = fps * 2.6;
  const growT = Math.max(0, Math.min(1, frame / growSpan));
  const growEased = 1 - Math.pow(1 - growT, 3);

  const titleSpring = spring({
    frame: frame - fps * 2.4,
    fps,
    config: { damping: 200, mass: 0.8 },
  });

  const hookOpacity = interpolate(frame, [fps * 3.0, fps * 3.9], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Page layout (1080 × 1350) ─────────────────────────────────────
  // Metadata band  : top 56..90
  // Drafting frame : 130..820  (h 690, w 960)
  // Title lockup   : 880..
  // Hook           : 1090..
  // Footer         : 1280..
  const FRAME = { x: 60, y: 130, w: 960, h: 690 };

  // Slab occupies the LEFT portion of the frame; the ledger sits to its right.
  const SLAB = {
    x: FRAME.x + 46,
    y: FRAME.y + 46,
    w: 480,
    h: FRAME.h - 92,
  };
  // Ledger axis position
  const LEDGER_X = SLAB.x + SLAB.w + 60;
  const LEDGER_LABEL_X = LEDGER_X + 14;

  return (
    <AbsoluteFill style={{ backgroundColor: INK, fontFamily: inter }}>
      <style>{fontCss}</style>

      {/* Top metadata band */}
      <div
        style={{
          position: "absolute",
          top: 56,
          left: 80,
          right: 80,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          color: SKY,
          fontFamily: inter,
          fontSize: 13,
          letterSpacing: 4.5,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Everyday Motivation · No. 003</span>
        <span style={{ color: HEART }}>2026 · 08 · 30</span>
      </div>

      {/* Main SVG canvas */}
      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          <pattern
            id="grid"
            x={FRAME.x}
            y={FRAME.y}
            width={40}
            height={40}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M 40 0 L 0 0 0 40`}
              fill="none"
              stroke={GRID_LINE}
              strokeWidth={1}
            />
          </pattern>
          <pattern
            id="grid-major"
            x={FRAME.x}
            y={FRAME.y}
            width={160}
            height={160}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M 160 0 L 0 0 0 160`}
              fill="none"
              stroke={GRID_MAJOR_LINE}
              strokeWidth={1}
            />
          </pattern>

          <radialGradient id="board-vignette" cx="30%" cy="40%" r="90%">
            <stop offset="0%" stopColor={BOARD_VIGNETTE} stopOpacity={1} />
            <stop offset="100%" stopColor={BOARD} stopOpacity={1} />
          </radialGradient>

          {/* Vertical gradient down the slab: pith slightly warmer / heartwood */}
          <linearGradient id="slab-warmth" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={HEART} stopOpacity={0.35} />
            <stop offset="45%" stopColor={HEART} stopOpacity={0.1} />
            <stop offset="100%" stopColor={HEART} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="slab-base" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={SLAB_HI} stopOpacity={1} />
            <stop offset="100%" stopColor={SLAB_BASE} stopOpacity={1} />
          </linearGradient>

          {/* Subtle vertical grain streaks */}
          <pattern
            id="grain"
            x="0"
            y="0"
            width="9"
            height="120"
            patternUnits="userSpaceOnUse"
          >
            <rect width="9" height="120" fill="transparent" />
            <line
              x1="0.5"
              y1="0"
              x2="0.5"
              y2="120"
              stroke={WOOD_DARK}
              strokeOpacity="0.18"
              strokeWidth="0.5"
            />
          </pattern>

          {/* Mask that reveals rings from top down as growT progresses */}
          <clipPath id="slab-clip">
            <rect
              x={SLAB.x}
              y={SLAB.y}
              width={SLAB.w}
              height={SLAB.h * growEased}
            />
          </clipPath>
        </defs>

        {/* Drafting board */}
        <rect
          x={FRAME.x}
          y={FRAME.y}
          width={FRAME.w}
          height={FRAME.h}
          fill="url(#board-vignette)"
        />
        <rect
          x={FRAME.x}
          y={FRAME.y}
          width={FRAME.w}
          height={FRAME.h}
          fill="url(#grid)"
        />
        <rect
          x={FRAME.x}
          y={FRAME.y}
          width={FRAME.w}
          height={FRAME.h}
          fill="url(#grid-major)"
        />

        {/* Inner border */}
        <rect
          x={FRAME.x + 0.5}
          y={FRAME.y + 0.5}
          width={FRAME.w - 1}
          height={FRAME.h - 1}
          fill="none"
          stroke="#2B2E33"
          strokeWidth={1}
        />

        {/* Corner crop marks */}
        {(
          [
            [FRAME.x, FRAME.y, 1, 1],
            [FRAME.x + FRAME.w, FRAME.y, -1, 1],
            [FRAME.x, FRAME.y + FRAME.h, 1, -1],
            [FRAME.x + FRAME.w, FRAME.y + FRAME.h, -1, -1],
          ] as const
        ).map(([cx, cy, sx, sy], i) => (
          <g key={i} stroke={HEART} strokeWidth={1.5} fill="none">
            <line x1={cx} y1={cy} x2={cx + sx * 24} y2={cy} />
            <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 24} />
          </g>
        ))}

        {/* Frame caption at top-left of the drafting board */}
        <g
          transform={`translate(${FRAME.x + 26}, ${FRAME.y + 30})`}
          fill={SKY}
          fontFamily={inter}
          fontSize={11}
          fontWeight={500}
          letterSpacing={3}
        >
          <text>SLAB · P. LONGAEVA · ×1 SCALE</text>
        </g>

        {/* ── The slab (wood block) ────────────────────────────────── */}
        {/* Slab base: bleached wood, warmer near pith */}
        <rect
          x={SLAB.x}
          y={SLAB.y}
          width={SLAB.w}
          height={SLAB.h}
          fill="url(#slab-base)"
        />
        <rect
          x={SLAB.x}
          y={SLAB.y}
          width={SLAB.w}
          height={SLAB.h}
          fill="url(#slab-warmth)"
        />
        {/* Slab hairline border */}
        <rect
          x={SLAB.x + 0.5}
          y={SLAB.y + 0.5}
          width={SLAB.w - 1}
          height={SLAB.h - 1}
          fill="none"
          stroke={WOOD_DARK}
          strokeOpacity={0.55}
          strokeWidth={1}
        />
        {/* Vertical grain, faint */}
        <rect
          x={SLAB.x}
          y={SLAB.y}
          width={SLAB.w}
          height={SLAB.h}
          fill="url(#grain)"
          opacity={0.35}
        />


        {/* Rings — dark ring lines on pale wood, masked to grow top→bottom.
             Real bristlecone: each year is a boundary between early- and
             latewood; narrow rings look almost solid dark, wide rings show a
             thin dark line with a lighter grain below. */}
        <g clipPath="url(#slab-clip)">
          {rings.map((r, i) => {
            const y = SLAB.y + r.y * SLAB.h;
            const shadowW = r.brightness < 0.5 ? r.weight + 1.6 : r.weight + 0.6;
            const shadowOp = r.brightness < 0.5 ? 0.92 : 0.72;
            const showLate = r.brightness > 0.55;
            return (
              <g key={`ring-${i}`}>
                <line
                  x1={SLAB.x + 2}
                  y1={y}
                  x2={SLAB.x + SLAB.w - 2}
                  y2={y}
                  stroke={WOOD_DARK}
                  strokeWidth={shadowW}
                  strokeOpacity={shadowOp}
                  strokeLinecap="butt"
                />
                {showLate && (
                  <line
                    x1={SLAB.x + 2}
                    y1={y + shadowW * 0.5 + 0.6}
                    x2={SLAB.x + SLAB.w - 2}
                    y2={y + shadowW * 0.5 + 0.6}
                    stroke={WOOD_MID}
                    strokeWidth={Math.max(0.5, r.weight * 0.5)}
                    strokeOpacity={0.35}
                    strokeLinecap="butt"
                  />
                )}
              </g>
            );
          })}
        </g>

        {/* Pith marker at the top edge */}
        <g opacity={Math.min(1, growEased * 2)}>
          <text
            x={SLAB.x + 6}
            y={SLAB.y - 8}
            fill={HEART}
            fontFamily={inter}
            fontSize={10}
            fontWeight={600}
            letterSpacing={3}
          >
            PITH · 2831 BCE
          </text>
        </g>
        {/* Bark marker at bottom */}
        <g opacity={Math.min(1, Math.max(0, growEased - 0.8) * 5)}>
          <text
            x={SLAB.x + 6}
            y={SLAB.y + SLAB.h + 20}
            fill={HEART}
            fontFamily={inter}
            fontSize={10}
            fontWeight={600}
            letterSpacing={3}
          >
            BARK · 2026 CE · +4855 YR
          </text>
        </g>

        {/* ── Ledger axis (vertical timeline) ──────────────────────── */}
        <line
          x1={LEDGER_X}
          y1={SLAB.y}
          x2={LEDGER_X}
          y2={SLAB.y + SLAB.h}
          stroke={SKY}
          strokeOpacity={0.35}
          strokeWidth={1}
        />
        {/* Axis end-caps */}
        <line
          x1={LEDGER_X - 5}
          y1={SLAB.y}
          x2={LEDGER_X + 5}
          y2={SLAB.y}
          stroke={SKY}
          strokeOpacity={0.35}
          strokeWidth={1}
        />
        <line
          x1={LEDGER_X - 5}
          y1={SLAB.y + SLAB.h}
          x2={LEDGER_X + 5}
          y2={SLAB.y + SLAB.h}
          stroke={SKY}
          strokeOpacity={0.35}
          strokeWidth={1}
        />

        {/* Leader lines + markers */}
        {MARKERS.map((m, idx) => {
          const yn = yearToNorm(m.year);
          const ySlab = SLAB.y + yn * SLAB.h;
          const dy = m.labelDy ?? 0;
          const yLabel = ySlab + dy;
          const t0 = fps * (1.6 + idx * 0.18);
          const localT = interpolate(frame, [t0, t0 + fps * 0.55], [0, 1], {
            easing: Easing.out(Easing.cubic),
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const dashLen = Math.hypot(LEDGER_X - (SLAB.x + SLAB.w), 0) + Math.abs(dy);
          const dashOff = dashLen * (1 - Math.min(1, localT * 1.4));
          const labelOp = interpolate(localT, [0.55, 1], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const tickOp = Math.min(1, localT * 2.5);

          // Elbow leader path: horizontal from slab, then vertical jog, then
          // horizontal to ledger axis. dy=0 → straight line.
          const xSlabEdge = SLAB.x + SLAB.w;
          const xElbow = xSlabEdge + 24;
          const path =
            dy === 0
              ? `M ${xSlabEdge} ${ySlab} L ${LEDGER_X} ${ySlab}`
              : `M ${xSlabEdge} ${ySlab} L ${xElbow} ${ySlab} L ${xElbow} ${yLabel} L ${LEDGER_X} ${yLabel}`;

          return (
            <g key={`m-${idx}`}>
              {/* Tick INSIDE the slab, at the real ring */}
              <line
                x1={SLAB.x + SLAB.w - 14}
                y1={ySlab}
                x2={SLAB.x + SLAB.w}
                y2={ySlab}
                stroke={HEART}
                strokeWidth={1.6}
                opacity={tickOp}
              />
              {/* Leader */}
              <path
                d={path}
                stroke={HEART}
                strokeWidth={1.2}
                fill="none"
                strokeDasharray={dashLen}
                strokeDashoffset={dashOff}
              />
              {/* Ledger tick */}
              <circle
                cx={LEDGER_X}
                cy={yLabel}
                r={3}
                fill={HEART_GLOW}
                opacity={labelOp}
              />
              {/* Label block */}
              <g opacity={labelOp}>
                <text
                  x={LEDGER_LABEL_X}
                  y={yLabel - 4}
                  fill={WOOD}
                  fontFamily={inter}
                  fontSize={13}
                  fontWeight={600}
                  letterSpacing={2.6}
                >
                  {m.label}
                </text>
                <text
                  x={LEDGER_LABEL_X}
                  y={yLabel + 14}
                  fill={SKY}
                  fontFamily={inter}
                  fontSize={11}
                  fontWeight={500}
                  letterSpacing={2.2}
                >
                  {m.sub}
                </text>
              </g>
            </g>
          );
        })}

        {/* Ledger heading — placed above the ledger axis */}
        <g opacity={Math.min(1, growEased * 1.3)}>
          <text
            x={LEDGER_X - 6}
            y={FRAME.y + 30}
            fill={SKY}
            fontFamily={inter}
            fontSize={11}
            fontWeight={600}
            letterSpacing={3.2}
          >
            LEDGER · EMBEDDED EVENTS
          </text>
        </g>

        {/* Caption strip just below the drafting frame */}
        <g
          transform={`translate(${FRAME.x}, ${FRAME.y + FRAME.h + 22})`}
          fill={SKY}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
        >
          <text>FIG. 3 · CROSS-DATED RING SEQUENCE, ~4855 YR</text>
          <text
            x={FRAME.w}
            textAnchor="end"
            fill={HEART}
            opacity={0.85}
          >
            METHUSELAH GROVE · 3050 M
          </text>
        </g>
      </svg>

      {/* ── Type lockup ────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 900,
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
            color: HEART,
            fontFamily: inter,
            fontSize: 13,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 18,
            fontWeight: 600,
          }}
        >
          Role <span style={{ color: SKY, margin: "0 4px" }}>/</span>
          <span style={{ color: "#EDEDEF", letterSpacing: 5 }}>
            Archivist
          </span>
        </div>

        <div
          style={{
            color: "#F4F1EA",
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 82,
            lineHeight: 0.96,
            letterSpacing: -1.4,
            fontStyle: "italic",
          }}
        >
          The tree
          <br />
          with rings for pages.
        </div>

        <div
          style={{
            marginTop: 28,
            color: "#C7C2B4",
            fontFamily: inter,
            fontSize: 19,
            lineHeight: 1.4,
            fontWeight: 400,
            maxWidth: 880,
            opacity: hookOpacity,
          }}
        >
          One Great Basin bristlecone —{" "}
          <span style={{ color: HEART, fontWeight: 600 }}>Methuselah</span>{" "}
          — has been laying down rings since 2831 BCE. By splicing overlapping
          ring patterns from living and long-dead wood, dendrochronologists
          keep a continuous{" "}
          <span style={{ color: WOOD, fontWeight: 600 }}>
            ~9,000-year
          </span>{" "}
          record that dates atmospheric carbon-14 to the exact calendar year.
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          bottom: 50,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          color: SKY,
          fontFamily: inter,
          fontSize: 11,
          letterSpacing: 3,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Schulman 1958 · Salzer et al. · IntCal · Pinus longaeva</span>
        <span>
          <span style={{ color: HEART }}>●</span> One ring = one year
        </span>
      </div>
    </AbsoluteFill>
  );
};
