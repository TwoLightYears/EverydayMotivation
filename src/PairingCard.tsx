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

// Palette — from the concept's visual brief (basalt / Antrim coloration)
const INK = "#0F1218";
const BOARD = "#151920";
const BASALT_LO = "#1D2029";
const BASALT_MID = "#282D38";
const BASALT_HI = "#353B48";
const STONE_RIM = "#6C7684";
const RUST = "#B15A2A";
const RUST_HI = "#D5843E";
const LICHEN = "#C6BE9C";
const GRAY = "#7B8291";
const GRID = "#1B2029";
const GRID_MAJOR = "#242A34";

// Map coord space (mapped into the drafting frame)
const MAP_W = 1080;
const MAP_H = 800;

// Hex geometry (flat-top hexagons)
const HEX_R = 66; // center-to-vertex
const H_STEP = HEX_R * 1.5;
const V_STEP = HEX_R * Math.sqrt(3);
const JITTER = 11;

// Deterministic hash keyed on integer-quantised vertex position
const hashV = (x: number, y: number): number => {
  const kx = Math.round(x * 4);
  const ky = Math.round(y * 4);
  let h = 2166136261;
  h = ((h ^ kx) * 16777619) >>> 0;
  h = ((h ^ ky) * 16777619) >>> 0;
  return (h % 100000) / 100000;
};

const idealVertex = (col: number, row: number, i: number) => {
  const cx = col * H_STEP;
  const cy = row * V_STEP + (col & 1 ? V_STEP / 2 : 0);
  const a = (Math.PI / 3) * i;
  return { x: cx + HEX_R * Math.cos(a), y: cy + HEX_R * Math.sin(a) };
};

const jitteredVertex = (col: number, row: number, i: number) => {
  const v = idealVertex(col, row, i);
  const r1 = hashV(v.x, v.y);
  const r2 = hashV(v.y + 91.3, v.x - 47.1);
  return {
    x: v.x + (r1 - 0.5) * JITTER,
    y: v.y + (r2 - 0.5) * JITTER,
  };
};

type Cell = {
  col: number;
  row: number;
  center: { x: number; y: number };
  verts: { x: number; y: number }[];
  path: string;
  dist: number;
  hue: number;
  tone: -1 | 0 | 1;
};

const SEED = { x: 380, y: 260 };
const SPECIMEN_COL = 6;
const SPECIMEN_ROW = 4;
const PLUMB_COL = 2;
const PLUMB_ROW = 5;

const buildCells = (): Cell[] => {
  const cells: Cell[] = [];
  const maxCol = Math.ceil(MAP_W / H_STEP) + 1;
  const maxRow = Math.ceil(MAP_H / V_STEP) + 1;
  for (let col = -1; col <= maxCol; col++) {
    for (let row = -1; row <= maxRow; row++) {
      const cx = col * H_STEP;
      const cy = row * V_STEP + (col & 1 ? V_STEP / 2 : 0);
      if (cx < -HEX_R * 0.8 || cx > MAP_W + HEX_R * 0.8) continue;
      if (cy < -HEX_R * 0.8 || cy > MAP_H + HEX_R * 0.8) continue;
      const verts: { x: number; y: number }[] = [];
      for (let i = 0; i < 6; i++) verts.push(jitteredVertex(col, row, i));
      const path =
        "M " +
        verts
          .map((v) => `${v.x.toFixed(2)} ${v.y.toFixed(2)}`)
          .join(" L ") +
        " Z";
      const dist = Math.hypot(cx - SEED.x, cy - SEED.y);
      const hue = hashV(col * 91.3 + 7, row * 47.1 - 3);
      const tone: -1 | 0 | 1 = hue < 0.28 ? -1 : hue > 0.78 ? 1 : 0;
      cells.push({ col, row, center: { x: cx, y: cy }, verts, path, dist, hue, tone });
    }
  }
  return cells.sort((a, b) => a.dist - b.dist);
};

const CELLS = buildCells();
const MAX_DIST = CELLS.reduce((m, c) => Math.max(m, c.dist), 0);
const SPECIMEN = CELLS.find(
  (c) => c.col === SPECIMEN_COL && c.row === SPECIMEN_ROW,
);
const PLUMB_CELL = CELLS.find(
  (c) => c.col === PLUMB_COL && c.row === PLUMB_ROW,
);

const toneFill = (t: -1 | 0 | 1): string =>
  t === -1 ? BASALT_LO : t === 1 ? BASALT_HI : BASALT_MID;

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Radial cascade of hex tops from the seed
  const growSpan = fps * 3.0;
  const revealFor = (dist: number): number => {
    const arrival = (dist / MAX_DIST) * growSpan;
    const local = frame - arrival;
    const fadeFrames = fps * 0.55;
    return Math.max(0, Math.min(1, local / fadeFrames));
  };

  // Type + hook fades
  const titleSpring = spring({
    frame: frame - fps * 0.4,
    fps,
    config: { damping: 200, mass: 0.8 },
  });
  const hookOpacity = interpolate(frame, [fps * 1.1, fps * 2.1], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const calloutOpacity = interpolate(frame, [fps * 2.6, fps * 3.4], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Plumb line descends and settles
  const plumbDrop = interpolate(frame, [fps * 1.5, fps * 2.7], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const preSettle = frame > fps * 2.7 ? (frame - fps * 2.7) / fps : 0;
  const settleSwing =
    Math.exp(-preSettle * 1.4) * Math.sin(preSettle * 7.5) * 4;
  const plumbSwing =
    plumbDrop < 1
      ? Math.sin(frame / (fps * 0.6)) * (1 - plumbDrop) * 5
      : settleSwing;

  // Drafting frame layout inside the 1080x1350 page
  const FRAME = { x: 60, y: 130, w: 960, h: 711 };
  const scale = FRAME.w / MAP_W;

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
        <span style={{ color: RUST_HI }}>2026 · 08 · 18</span>
      </div>

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
            width={48 * scale}
            height={48 * scale}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M ${48 * scale} 0 L 0 0 0 ${48 * scale}`}
              fill="none"
              stroke={GRID}
              strokeWidth={1}
            />
          </pattern>
          <pattern
            id="grid-major"
            x={FRAME.x}
            y={FRAME.y}
            width={192 * scale}
            height={192 * scale}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M ${192 * scale} 0 L 0 0 0 ${192 * scale}`}
              fill="none"
              stroke={GRID_MAJOR}
              strokeWidth={1}
            />
          </pattern>
          <radialGradient id="board-vignette" cx="50%" cy="42%" r="72%">
            <stop offset="0%" stopColor="#181C24" stopOpacity={1} />
            <stop offset="100%" stopColor={BOARD} stopOpacity={1} />
          </radialGradient>
          <radialGradient id="rust-bloom" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor={RUST} stopOpacity={0.55} />
            <stop offset="100%" stopColor={RUST} stopOpacity={0} />
          </radialGradient>
          <radialGradient id="seed-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={LICHEN} stopOpacity={0.28} />
            <stop offset="100%" stopColor={LICHEN} stopOpacity={0} />
          </radialGradient>
          <clipPath id="mapClip">
            <rect x={0} y={0} width={MAP_W} height={MAP_H} />
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
        <rect
          x={FRAME.x + 0.5}
          y={FRAME.y + 0.5}
          width={FRAME.w - 1}
          height={FRAME.h - 1}
          fill="none"
          stroke="#2B313C"
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
          <g key={i} stroke={RUST} strokeWidth={1.5} fill="none">
            <line x1={cx} y1={cy} x2={cx + sx * 26} y2={cy} />
            <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 26} />
          </g>
        ))}

        {/* Hex map */}
        <g transform={`translate(${FRAME.x}, ${FRAME.y}) scale(${scale})`}>
          <g clipPath="url(#mapClip)">
            {/* Seed glow — where the fracture network began */}
            <circle
              cx={SEED.x}
              cy={SEED.y}
              r={220}
              fill="url(#seed-glow)"
              opacity={Math.max(0, 1 - frame / (fps * 3.2))}
            />

            {/* Rim highlight beneath cells */}
            {CELLS.map((c) => {
              const rev = revealFor(c.dist);
              if (rev <= 0) return null;
              return (
                <path
                  key={`r-${c.col}-${c.row}`}
                  d={c.path}
                  fill="none"
                  stroke={STONE_RIM}
                  strokeOpacity={0.42 * rev}
                  strokeWidth={2.6}
                  strokeLinejoin="round"
                />
              );
            })}

            {/* Column tops */}
            {CELLS.map((c) => {
              const rev = revealFor(c.dist);
              if (rev <= 0) return null;
              return (
                <path
                  key={`c-${c.col}-${c.row}`}
                  d={c.path}
                  fill={toneFill(c.tone)}
                  stroke={BASALT_LO}
                  strokeWidth={1.4}
                  strokeLinejoin="round"
                  opacity={rev}
                />
              );
            })}

            {/* Iron-oxide staining — subtle patches inside a few cells */}
            {CELLS.filter((c) => c.hue < 0.06).map((c) => {
              const rev = revealFor(c.dist);
              if (rev <= 0) return null;
              const jitterX = (c.hue - 0.03) * 300;
              const jitterY = (hashV(c.col * 13.1, c.row * 29.7) - 0.5) * 20;
              return (
                <ellipse
                  key={`ru-${c.col}-${c.row}`}
                  cx={c.center.x + jitterX}
                  cy={c.center.y + jitterY}
                  rx={HEX_R * 0.7}
                  ry={HEX_R * 0.55}
                  fill={RUST}
                  opacity={0.22 * rev}
                  transform={`rotate(${c.hue * 90} ${c.center.x} ${c.center.y})`}
                />
              );
            })}

            {/* Specimen callouts */}
            {SPECIMEN && (
              <g opacity={calloutOpacity}>
                <path
                  d={SPECIMEN.path}
                  fill="none"
                  stroke={RUST_HI}
                  strokeWidth={2.6}
                  strokeLinejoin="round"
                />
                {/* 120° arcs at three alternating triple-junctions */}
                {SPECIMEN.verts.map((v, i) => {
                  if (i % 2 !== 0) return null;
                  const prev = SPECIMEN.verts[(i + 5) % 6];
                  const next = SPECIMEN.verts[(i + 1) % 6];
                  const a1 = Math.atan2(prev.y - v.y, prev.x - v.x);
                  const a2 = Math.atan2(next.y - v.y, next.x - v.x);
                  const rr = 30;
                  const x1 = v.x + rr * Math.cos(a1);
                  const y1 = v.y + rr * Math.sin(a1);
                  const x2 = v.x + rr * Math.cos(a2);
                  const y2 = v.y + rr * Math.sin(a2);
                  // Midpoint of the angle for the small label placement
                  const midA = Math.atan2(
                    Math.sin(a1) + Math.sin(a2),
                    Math.cos(a1) + Math.cos(a2),
                  );
                  const lx = v.x + (rr + 14) * Math.cos(midA);
                  const ly = v.y + (rr + 14) * Math.sin(midA);
                  return (
                    <g key={`ang-${i}`}>
                      <path
                        d={`M ${x1} ${y1} A ${rr} ${rr} 0 0 1 ${x2} ${y2}`}
                        fill="none"
                        stroke={LICHEN}
                        strokeWidth={1.6}
                      />
                      <text
                        x={lx}
                        y={ly + 4}
                        textAnchor="middle"
                        fill={LICHEN}
                        fontFamily={inter}
                        fontSize={11}
                        fontWeight={500}
                        letterSpacing={1.6}
                      >
                        120°
                      </text>
                    </g>
                  );
                })}
                {/* Center dot */}
                <circle
                  cx={SPECIMEN.center.x}
                  cy={SPECIMEN.center.y}
                  r={3}
                  fill={RUST_HI}
                />
                {/* Leader */}
                <line
                  x1={SPECIMEN.center.x + HEX_R * 0.85}
                  y1={SPECIMEN.center.y - HEX_R * 0.35}
                  x2={SPECIMEN.center.x + HEX_R * 2.35}
                  y2={SPECIMEN.center.y - HEX_R * 1.8}
                  stroke={RUST_HI}
                  strokeWidth={1.2}
                />
                <line
                  x1={SPECIMEN.center.x + HEX_R * 2.35}
                  y1={SPECIMEN.center.y - HEX_R * 1.8}
                  x2={SPECIMEN.center.x + HEX_R * 4.6}
                  y2={SPECIMEN.center.y - HEX_R * 1.8}
                  stroke={RUST_HI}
                  strokeWidth={1.2}
                />
                <text
                  x={SPECIMEN.center.x + HEX_R * 2.42}
                  y={SPECIMEN.center.y - HEX_R * 1.8 - 12}
                  fill={RUST_HI}
                  fontFamily={inter}
                  fontSize={16}
                  fontWeight={600}
                  letterSpacing={3}
                >
                  SPECIMEN N = 6
                </text>
                <text
                  x={SPECIMEN.center.x + HEX_R * 2.42}
                  y={SPECIMEN.center.y - HEX_R * 1.8 + 22}
                  fill={LICHEN}
                  fontFamily={inter}
                  fontSize={13}
                  fontWeight={500}
                  letterSpacing={2.4}
                >
                  STRAIN-ENERGY MIN
                </text>
              </g>
            )}
          </g>
        </g>

        {/* Plate index — rendered above the hex map so nothing occludes it */}
        <rect
          x={FRAME.x + 10}
          y={FRAME.y + 18}
          width={332}
          height={26}
          fill={INK}
          fillOpacity={0.72}
        />
        <g
          transform={`translate(${FRAME.x + 22}, ${FRAME.y + 36})`}
          fill={LICHEN}
          fontFamily={inter}
          fontWeight={600}
          fontSize={11}
          letterSpacing={3}
        >
          <text>PL. III · JOINT SET · TOP-DOWN</text>
        </g>
        <rect
          x={FRAME.x + FRAME.w - 110}
          y={FRAME.y + 18}
          width={100}
          height={26}
          fill={INK}
          fillOpacity={0.72}
        />
        <g
          transform={`translate(${FRAME.x + FRAME.w - 22}, ${FRAME.y + 36})`}
          fill={LICHEN}
          fontFamily={inter}
          fontWeight={600}
          fontSize={11}
          letterSpacing={3}
          textAnchor="end"
        >
          <text>SCALE 1 : 8</text>
        </g>

        {/* Plumb line hanging into the drafting frame (outer coord space) */}
        {(() => {
          const cell = PLUMB_CELL;
          const plumbX = cell
            ? FRAME.x + cell.center.x * scale
            : FRAME.x + 240;
          const topY = FRAME.y + 22;
          const targetY = cell
            ? FRAME.y + cell.center.y * scale - 42
            : FRAME.y + 300;
          const bobY = topY + (targetY - topY) * Math.min(1, plumbDrop);
          const bobX = plumbX + plumbSwing;
          const opacity = Math.min(1, plumbDrop * 1.6);
          return (
            <g opacity={opacity}>
              {/* Anchor peg */}
              <circle
                cx={plumbX}
                cy={topY}
                r={3}
                fill={LICHEN}
              />
              {/* Cord */}
              <line
                x1={plumbX}
                y1={topY}
                x2={bobX}
                y2={bobY - 24}
                stroke={LICHEN}
                strokeWidth={1.1}
                strokeOpacity={0.9}
              />
              {/* Bob body — brass teardrop */}
              <g transform={`translate(${bobX}, ${bobY})`}>
                {/* Top cap where cord attaches */}
                <rect
                  x={-6}
                  y={-30}
                  width={12}
                  height={5}
                  fill={LICHEN}
                  stroke={INK}
                  strokeWidth={0.8}
                />
                {/* Bulbous body */}
                <path
                  d={`M -11 -25
                      Q -13 -12 -10 -2
                      Q -6 12 0 28
                      Q 6 12 10 -2
                      Q 13 -12 11 -25 Z`}
                  fill={RUST}
                  stroke={INK}
                  strokeWidth={1}
                />
                {/* Highlight */}
                <path
                  d={`M -6 -20 Q -8 -8 -6 4 Q -4 14 -2 22`}
                  fill="none"
                  stroke={RUST_HI}
                  strokeWidth={1.6}
                  strokeOpacity={0.9}
                  strokeLinecap="round"
                />
                {/* Shadow side */}
                <path
                  d={`M 6 -20 Q 8 -8 6 4 Q 4 14 2 22`}
                  fill="none"
                  stroke="#5A2D18"
                  strokeWidth={1.2}
                  strokeOpacity={0.7}
                  strokeLinecap="round"
                />
              </g>
              {/* Tag hanging beside the bob */}
              <line
                x1={bobX + 12}
                y1={bobY + 4}
                x2={bobX + 38}
                y2={bobY + 4}
                stroke={LICHEN}
                strokeWidth={1}
                strokeOpacity={0.75}
              />
              <text
                x={bobX + 44}
                y={bobY + 8}
                fill={LICHEN}
                fontFamily={inter}
                fontSize={11}
                letterSpacing={3}
                fontWeight={600}
              >
                PLUMB · 06
              </text>
            </g>
          );
        })()}

        {/* Caption strip below drafting frame */}
        <g
          transform={`translate(${FRAME.x}, ${FRAME.y + FRAME.h + 22})`}
          fill={GRAY}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
        >
          <text>FIG. 1 · JOINT-SET TESSELLATION · COLUMNAR BASALT · ANTRIM</text>
          <text
            x={FRAME.w}
            textAnchor="end"
            fill={RUST_HI}
            opacity={0.9}
          >
            N ≈ 40,000 · SIDES 5 | 6 | 7
          </text>
        </g>
      </svg>

      {/* Type lockup */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 905,
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
            color: RUST_HI,
            fontFamily: inter,
            fontSize: 13,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 18,
            fontWeight: 600,
          }}
        >
          Role <span style={{ color: GRAY, margin: "0 4px" }}>/</span>
          <span style={{ color: "#EDEDEF", letterSpacing: 5 }}>
            Master Tile Setter
          </span>
        </div>

        <div
          style={{
            color: "#F4F4F6",
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 84,
            lineHeight: 0.96,
            letterSpacing: -1.4,
            fontStyle: "italic",
          }}
        >
          The stone floor that
          <br />
          laid itself.
        </div>

        <div
          style={{
            marginTop: 28,
            color: "#C8CAD0",
            fontFamily: inter,
            fontSize: 19,
            lineHeight: 1.42,
            fontWeight: 400,
            maxWidth: 900,
            opacity: hookOpacity,
          }}
        >
          As a thick basalt flow cools, fractures propagate along paths that
          minimise elastic strain energy per unit new crack area — the
          network converges on{" "}
          <span style={{ color: RUST_HI, fontWeight: 600 }}>
            120° triple-junctions
          </span>
          , the tightest planar packing. Roughly{" "}
          <span style={{ color: RUST_HI, fontWeight: 600 }}>40,000</span>{" "}
          five- to seven-sided prisms at the Giant&rsquo;s Causeway are the
          result — a stone floor laid by physics.
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
        <span>Goehring, Mahadevan &amp; Morris · PNAS 106 (2009) 387–392</span>
        <span>
          <span style={{ color: RUST_HI }}>●</span> Giant&rsquo;s Causeway, Antrim
        </span>
      </div>
    </AbsoluteFill>
  );
};
