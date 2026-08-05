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

// ── Palette (bristlecone coloration) ──────────────────────────────────
const INK = "#161311";
const BOARD = "#1D1917";
const BLEACH = "#E8E1D3";
const CREAM = "#D9C7A0";
const AMBER = "#B58447";
const BARK = "#4B3A28";
const GRID = "#231D19";
const GRID_MAJOR = "#2C2521";
const GRAY = "#7A716A";

// ── Ring geometry ────────────────────────────────────────────────────
// Stylized cross-section: N_RINGS visible bands representing the tree's
// 4,855 annual growth rings compressed. Widths vary via seeded noise to
// suggest wet/dry years — the real botanical property, not literal data.
const TREE_AGE = 4855;
const N_RINGS = 62;

// A cheap deterministic RNG so ring widths are stable across renders
const mulberry32 = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

type Ring = { i: number; r: number; w: number; tone: "wet" | "dry" | "mid" };
const buildRings = (): Ring[] => {
  const rng = mulberry32(20260805);
  const rings: Ring[] = [];
  let r = 6; // pith radius
  for (let i = 0; i < N_RINGS; i++) {
    const n = rng();
    // Occasionally simulate a drought decade — thin dark rings
    const drought = rng() < 0.09;
    const w = drought ? 2.0 + n * 1.4 : 3.4 + n * 5.2;
    r += w;
    const tone: Ring["tone"] = drought ? "dry" : n > 0.62 ? "wet" : "mid";
    rings.push({ i, r, w, tone });
  }
  return rings;
};
const RINGS = buildRings();
const OUTER_R = RINGS[RINGS.length - 1].r;

// Map a "tree-year" (1..4855) to the stylized ring index we should point at
const yearToRingIndex = (treeYear: number): number =>
  Math.max(0, Math.min(N_RINGS - 1, Math.round((treeYear / TREE_AGE) * N_RINGS) - 1));

type Callout = {
  key: string;
  year: string; // display label
  event: string;
  treeYear: number; // 1..4855
  angleDeg: number; // where the leader anchor sits on the ring
  labelX: number; // top-left of label block (px in svg coords)
  labelY: number;
};

// Ring 1 (innermost) = 2830 BCE; ring 4855 (outermost) = 2026 CE
const CALLOUTS: Callout[] = [
  {
    key: "pyramid",
    year: "2560 BCE",
    event: "Great Pyramid completed",
    treeYear: 270,
    angleDeg: 205,
    labelX: 90,
    labelY: 220,
  },
  {
    key: "buddha",
    year: "563 BCE",
    event: "The Buddha is born",
    treeYear: 2268,
    angleDeg: 178,
    labelX: 90,
    labelY: 400,
  },
  {
    key: "press",
    year: "1440 CE",
    event: "Gutenberg's printing press",
    treeYear: 4270,
    angleDeg: 156,
    labelX: 90,
    labelY: 580,
  },
  {
    key: "today",
    year: "2026 CE",
    event: "This ring, deposited this year",
    treeYear: TREE_AGE,
    angleDeg: 130,
    labelX: 90,
    labelY: 745,
  },
];

const ringColor = (t: Ring["tone"], appearing: number): string => {
  // Blend from AMBER (fresh sap) → resting tone as ring settles
  const base = t === "dry" ? BARK : t === "wet" ? BLEACH : CREAM;
  return appearing > 0.75 ? base : AMBER;
};

// ── Component ───────────────────────────────────────────────────────
export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Ring accretion timing
  const growStart = fps * 0.25;
  const growSpan = fps * 3.2; // ~3.2s to lay all rings
  const perRing = growSpan / N_RINGS;

  // Type animations
  const titleSpring = spring({
    frame: frame - fps * 0.55,
    fps,
    config: { damping: 200, mass: 0.9 },
  });
  const hookOpacity = interpolate(frame, [fps * 1.1, fps * 2.0], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Ring geometry in SVG coord space (1080 × 1350)
  const CX = 640;
  const CY = 470;

  // Ledger frame containing the cross-section
  const FRAME = { x: 60, y: 130, w: 960, h: 700 };

  // Precompute callout leader endpoints
  const calloutGeom = CALLOUTS.map((c) => {
    const idx = yearToRingIndex(c.treeYear);
    const r = RINGS[idx].r;
    const a = (c.angleDeg * Math.PI) / 180;
    const ax = CX + Math.cos(a) * r; // anchor on ring
    const ay = CY + Math.sin(a) * r;
    const elbowX = c.labelX + 210; // right edge of label block
    const elbowY = c.labelY + 14;
    return { c, idx, ax, ay, elbowX, elbowY, ringR: r };
  });

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
          color: GRAY,
          fontFamily: inter,
          fontSize: 13,
          letterSpacing: 4.5,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Everyday Motivation · No. 003</span>
        <span style={{ color: AMBER }}>2026 · 08 · 05</span>
      </div>

      {/* Main SVG stage */}
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
            width={48}
            height={48}
            patternUnits="userSpaceOnUse"
          >
            <path d={`M 48 0 L 0 0 0 48`} fill="none" stroke={GRID} strokeWidth={1} />
          </pattern>
          <pattern
            id="grid-major"
            x={FRAME.x}
            y={FRAME.y}
            width={192}
            height={192}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M 192 0 L 0 0 0 192`}
              fill="none"
              stroke={GRID_MAJOR}
              strokeWidth={1}
            />
          </pattern>

          <radialGradient id="board-vignette" cx="50%" cy="40%" r="70%">
            <stop offset="0%" stopColor="#221C18" stopOpacity={1} />
            <stop offset="100%" stopColor={BOARD} stopOpacity={1} />
          </radialGradient>

          <radialGradient id="pith-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={AMBER} stopOpacity={0.75} />
            <stop offset="100%" stopColor={AMBER} stopOpacity={0} />
          </radialGradient>

          <radialGradient id="bark-fade" cx="50%" cy="50%" r="55%">
            <stop offset="90%" stopColor={BARK} stopOpacity={0} />
            <stop offset="99%" stopColor={BARK} stopOpacity={0.55} />
            <stop offset="100%" stopColor={BARK} stopOpacity={0} />
          </radialGradient>
        </defs>

        {/* Ledger board */}
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

        {/* Inner thin border */}
        <rect
          x={FRAME.x + 0.5}
          y={FRAME.y + 0.5}
          width={FRAME.w - 1}
          height={FRAME.h - 1}
          fill="none"
          stroke="#332B25"
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
          <g key={i} stroke={AMBER} strokeWidth={1.5} fill="none">
            <line x1={cx} y1={cy} x2={cx + sx * 26} y2={cy} />
            <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 26} />
          </g>
        ))}

        {/* Specimen tag */}
        <g
          transform={`translate(${FRAME.x + 26}, ${FRAME.y + 30})`}
          fill={GRAY}
          fontFamily={inter}
          fontWeight={600}
          fontSize={11}
          letterSpacing={3}
        >
          <text textAnchor="start">SPECIMEN · METHUSELAH</text>
          <text y={18} letterSpacing={3} fontWeight={500} fill="#5C534D">
            PINUS LONGAEVA · WHITE MOUNTAINS · CA
          </text>
        </g>

        {/* Ring cross-section: rendered outer-to-inner so newer rings overlap older */}
        <g>
          {/* Outermost bark band — a clear woody boundary */}
          {(() => {
            const barkAppear = interpolate(
              frame,
              [growStart + growSpan - fps * 0.2, growStart + growSpan + fps * 0.4],
              [0, 1],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
            );
            return (
              <g opacity={barkAppear}>
                <circle
                  cx={CX}
                  cy={CY}
                  r={OUTER_R + 10}
                  fill="none"
                  stroke={BARK}
                  strokeWidth={16}
                  opacity={0.85}
                />
                <circle
                  cx={CX}
                  cy={CY}
                  r={OUTER_R + 18}
                  fill="none"
                  stroke="#2A211B"
                  strokeWidth={2}
                />
                <circle
                  cx={CX}
                  cy={CY}
                  r={OUTER_R + 2}
                  fill="none"
                  stroke={AMBER}
                  strokeWidth={0.6}
                  opacity={0.35}
                />
              </g>
            );
          })()}

          {/* Rings, drawn from outermost inward for correct overlap */}
          {[...RINGS]
            .slice()
            .reverse()
            .map((ring) => {
              const appearFrame = growStart + ring.i * perRing;
              const local = (frame - appearFrame) / (perRing * 6);
              const appearing = Math.max(0, Math.min(1, local));
              if (appearing <= 0) return null;
              const eased = 1 - Math.pow(1 - appearing, 2.5);
              const color = ringColor(ring.tone, eased);
              const strokeOpacity =
                ring.tone === "dry" ? 0.9 : ring.tone === "wet" ? 0.95 : 0.85;
              return (
                <circle
                  key={ring.i}
                  cx={CX}
                  cy={CY}
                  r={ring.r}
                  fill="none"
                  stroke={color}
                  strokeWidth={ring.w * (0.6 + 0.4 * eased)}
                  strokeOpacity={strokeOpacity * eased}
                />
              );
            })}

          {/* Bark vignette — soft outer shadow */}
          <circle
            cx={CX}
            cy={CY}
            r={OUTER_R + 10}
            fill="url(#bark-fade)"
            opacity={0.9}
          />

          {/* Pith glow, then a small cross marking the tree's centre */}
          <circle cx={CX} cy={CY} r={26} fill="url(#pith-glow)" />
          <g stroke={AMBER} strokeWidth={1.6}>
            <line x1={CX - 7} y1={CY} x2={CX + 7} y2={CY} />
            <line x1={CX} y1={CY - 7} x2={CX} y2={CY + 7} />
          </g>

          {/* Radial "crack" — bristlecones commonly have a resin canal split */}
          {(() => {
            const crackA = 42; // degrees
            const a = (crackA * Math.PI) / 180;
            const x2 = CX + Math.cos(a) * (OUTER_R + 4);
            const y2 = CY + Math.sin(a) * (OUTER_R + 4);
            const op = Math.min(1, Math.max(0, (frame - (growStart + growSpan * 0.6)) / (fps * 0.6)));
            return (
              <line
                x1={CX}
                y1={CY}
                x2={x2}
                y2={y2}
                stroke={BARK}
                strokeWidth={2.5}
                opacity={0.55 * op}
              />
            );
          })()}
        </g>

        {/* Highlighted rings for each callout — an amber halo + a slightly
            offset outer trace so the referenced ring reads as marked, not
            just re-drawn. Today (outermost) gets an extra bright band. */}
        {calloutGeom.map(({ c, idx, ringR }) => {
          const revealFrame = growStart + idx * perRing + fps * 0.02;
          const op = interpolate(
            frame,
            [revealFrame, revealFrame + fps * 0.4],
            [0, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
          );
          const isToday = c.key === "today";
          return (
            <g key={`hi-${c.key}`} opacity={op}>
              <circle
                cx={CX}
                cy={CY}
                r={ringR}
                fill="none"
                stroke={isToday ? BLEACH : AMBER}
                strokeWidth={isToday ? 3.6 : 2.4}
                strokeOpacity={isToday ? 0.95 : 0.9}
              />
              <circle
                cx={CX}
                cy={CY}
                r={ringR + (isToday ? 6 : 3.5)}
                fill="none"
                stroke={AMBER}
                strokeWidth={0.9}
                strokeOpacity={0.55}
              />
            </g>
          );
        })}

        {/* Callouts */}
        {calloutGeom.map(({ c, idx, ax, ay, elbowX, elbowY, ringR }) => {
          const revealFrame = growStart + idx * perRing + fps * 0.05;
          const op = interpolate(
            frame,
            [revealFrame + fps * 0.15, revealFrame + fps * 0.6],
            [0, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
          );
          // Nudge anchors that fall inside the pith glow so the tick is visible
          const outward = ringR < 30 ? 22 : 4;
          const a = (c.angleDeg * Math.PI) / 180;
          const ax2 = CX + Math.cos(a) * (ringR + outward);
          const ay2 = CY + Math.sin(a) * (ringR + outward);
          return (
            <g key={c.key} opacity={op}>
              {/* Small tick sitting on/beside the ring */}
              <line
                x1={ax}
                y1={ay}
                x2={ax2}
                y2={ay2}
                stroke={AMBER}
                strokeWidth={1.4}
              />
              <circle
                cx={ax2}
                cy={ay2}
                r={3.6}
                fill={INK}
                stroke={AMBER}
                strokeWidth={1.6}
              />
              {/* Two-segment leader: from tick → elbow (horizontal) → label */}
              <line
                x1={ax2}
                y1={ay2}
                x2={elbowX}
                y2={elbowY}
                stroke={AMBER}
                strokeWidth={1.2}
                strokeOpacity={0.9}
              />
              <line
                x1={elbowX}
                y1={elbowY}
                x2={c.labelX}
                y2={elbowY}
                stroke={AMBER}
                strokeWidth={1.2}
                strokeOpacity={0.9}
              />
              {/* Label block: year + event + ring index */}
              <text
                x={c.labelX}
                y={elbowY - 8}
                fill={BLEACH}
                fontFamily={inter}
                fontSize={16}
                fontWeight={600}
                letterSpacing={2.4}
              >
                {c.year}
              </text>
              <text
                x={c.labelX}
                y={elbowY + 18}
                fill={GRAY}
                fontFamily={inter}
                fontSize={13}
                fontWeight={400}
                letterSpacing={1.2}
              >
                {c.event}
              </text>
              <text
                x={c.labelX}
                y={elbowY + 38}
                fill="#54493F"
                fontFamily={inter}
                fontSize={10}
                fontWeight={500}
                letterSpacing={2.8}
              >
                RING {c.treeYear.toLocaleString()} / {TREE_AGE.toLocaleString()}
              </text>
            </g>
          );
        })}

        {/* Caption strip below the ledger */}
        <g
          transform={`translate(${FRAME.x}, ${FRAME.y + FRAME.h + 22})`}
          fill={GRAY}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
        >
          <text>FIG. 1 · STYLIZED CROSS-SECTION · 62 RINGS SHOWN OF 4,855</text>
          <text x={FRAME.w} textAnchor="end" fill={AMBER} opacity={0.9}>
            SCHULMAN 1958 · IntCal20 CALIBRATION
          </text>
        </g>
      </svg>

      {/* Type lockup — anchored bottom-left of card */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 895,
          opacity: titleSpring,
          transform: `translateY(${interpolate(titleSpring, [0, 1], [16, 0])}px)`,
        }}
      >
        <div
          style={{
            color: AMBER,
            fontFamily: inter,
            fontSize: 13,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 18,
            fontWeight: 600,
          }}
        >
          Role <span style={{ color: GRAY, margin: "0 4px" }}>/</span>
          <span style={{ color: BLEACH, letterSpacing: 5 }}>
            Time-Capsule Archivist
          </span>
        </div>

        <div
          style={{
            color: BLEACH,
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 82,
            lineHeight: 0.96,
            letterSpacing: -1.2,
            fontStyle: "italic",
          }}
        >
          The keeper of
          <br />
          every year.
        </div>

        <div
          style={{
            marginTop: 28,
            color: "#C8BFB4",
            fontFamily: inter,
            fontSize: 19,
            lineHeight: 1.42,
            fontWeight: 400,
            maxWidth: 900,
            opacity: hookOpacity,
          }}
        >
          A single Great Basin bristlecone in California's White Mountains has kept{" "}
          <span style={{ color: AMBER, fontWeight: 600 }}>
            4,855 unbroken annual rings
          </span>{" "}
          — each one a dated ledger of that year's rainfall and solar activity, now
          used to calibrate radiocarbon dating back to 8,000 BCE.
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
          color: GRAY,
          fontFamily: inter,
          fontSize: 11,
          letterSpacing: 3,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Schulman · Natl. Geogr. 113 (1958) · Reimer et al. · IntCal20 (2020)</span>
        <span>
          <span style={{ color: AMBER }}>●</span> Ring = Year
        </span>
      </div>
    </AbsoluteFill>
  );
};
