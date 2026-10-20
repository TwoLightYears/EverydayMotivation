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

// Palette — from the concept's visual brief (horseshoe crab + hemolymph)
const DEEP = "#0A1420";          // ocean / page ground
const BOARD = "#121B2C";         // specimen board
const BOARD_HI = "#17213A";      // board vignette highlight
const CHITIN = "#6B4E2E";        // carapace amber (dorsal silhouette)
const CHITIN_HI = "#9A7645";     // highlight / outline
const HEMO = "#1B4B8F";          // oxygenated hemolymph (indigo blue)
const HEMO_HI = "#58A4D4";       // luminous cyan highlight
const IVORY = "#EFE5D1";         // pharmacopoeia parchment
const DIM = "#6E7585";           // dim labels
const DIM_LO = "#4F5668";
const GRID = "#182238";          // blueprint grid

// ── Specimen board layout (world coords 0..1080 × 0..1350) ─────────────
const FRAME = { x: 60, y: 118, w: 960, h: 790 };

// Horseshoe crab anatomical anchor points (board-local coords)
// Prosoma centered left-of-middle, telson pointing down.
const CRAB = {
  cx: 410,
  topY: 60,
  prosomaRX: 300,
  prosomaRY: 200,
  hingeY: 300,
  opisthoHalfW: 180,
  opisthoMidY: 440,
  opisthoBulge: 12,
  opisthoBaseY: 560,
  opisthoTailHalfW: 28,
  telsonY: 760,
  heartX: 410,
  heartY: 362,
};

// Vial geometry (board-local coords)
const VIAL = {
  cx: 820,
  top: 200,
  bottom: 640,
  halfW: 46,
};
const VIAL_H = VIAL.bottom - VIAL.top;

// Endotoxin graduation marks (top → bottom; label every 3rd tick)
type Tick = { frac: number; label?: string };
const TICKS: Tick[] = [
  { frac: 0.00, label: "1.0" },
  { frac: 0.10 },
  { frac: 0.20 },
  { frac: 0.30, label: "0.1" },
  { frac: 0.40 },
  { frac: 0.50 },
  { frac: 0.60, label: "0.01" },
  { frac: 0.70 },
  { frac: 0.80 },
  { frac: 0.90, label: "0.001" },
  { frac: 1.00 },
];

// ── Horseshoe crab silhouette, as a single unified outline ─────────────
// Prosoma dome → opisthosoma shoulders (prosoma overhangs slightly) →
// opisthosoma bulge → tapered base → telson spike → mirror up the left.
const crabSilhouettePath = (): string => {
  const {
    cx,
    prosomaRX,
    prosomaRY,
    hingeY,
    opisthoHalfW,
    opisthoMidY,
    opisthoBulge,
    opisthoBaseY,
    opisthoTailHalfW,
    telsonY,
  } = CRAB;
  const telsonBaseW = opisthoTailHalfW * 0.55;
  // The prosoma extends slightly past the opisthosoma shoulders (overhang),
  // producing the characteristic "wing" look of Limulus in dorsal view.
  const shoulderStep = 6;
  return [
    `M ${cx - prosomaRX} ${hingeY}`,
    `C ${cx - prosomaRX} ${hingeY - prosomaRY * 1.1}, ${cx + prosomaRX} ${hingeY - prosomaRY * 1.1}, ${cx + prosomaRX} ${hingeY}`,
    `L ${cx + opisthoHalfW + shoulderStep} ${hingeY + 4}`,
    `Q ${cx + opisthoHalfW + opisthoBulge} ${opisthoMidY}, ${cx + opisthoHalfW * 0.74} ${opisthoBaseY - 22}`,
    `L ${cx + opisthoTailHalfW} ${opisthoBaseY}`,
    `L ${cx + telsonBaseW} ${opisthoBaseY + 2}`,
    `L ${cx + 2.5} ${telsonY}`,
    `L ${cx - 2.5} ${telsonY}`,
    `L ${cx - telsonBaseW} ${opisthoBaseY + 2}`,
    `L ${cx - opisthoTailHalfW} ${opisthoBaseY}`,
    `L ${cx - opisthoHalfW * 0.74} ${opisthoBaseY - 22}`,
    `Q ${cx - opisthoHalfW - opisthoBulge} ${opisthoMidY}, ${cx - opisthoHalfW - shoulderStep} ${hingeY + 4}`,
    `Z`,
  ].join(" ");
};

// Lateral opisthosomal spines — 6 per side, triangular teeth pointing
// outward and slightly backward (characteristic serration of Limulus).
type Spine = { x: number; y: number; dx: number; dy: number; len: number };
const opisthoSpines = (): Spine[] => {
  const { cx, hingeY, opisthoHalfW, opisthoBulge, opisthoBaseY } = CRAB;
  const n = 6;
  const out: Spine[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const yLin = hingeY + 20 + (opisthoBaseY - hingeY - 40) * t;
    const bulge = opisthoBulge * (1 - (2 * t - 1) ** 2);
    const taperT = 1 - 0.28 * Math.pow(t, 1.2);
    const halfW = opisthoHalfW * taperT + bulge;
    const len = 22 - t * 10;
    out.push({ x: cx - halfW, y: yLin, dx: -1, dy: 0.35, len });
    out.push({ x: cx + halfW, y: yLin, dx: 1, dy: 0.35, len });
  }
  return out;
};

// Build a filled triangular spine shape from an anchor + direction.
const spinePath = (s: Spine): string => {
  const nx = s.dx; // outward unit (horizontal)
  const ny = s.dy; // backward tilt
  const tipX = s.x + nx * s.len;
  const tipY = s.y + ny * s.len;
  // Base width perpendicular to direction (tangent along edge ≈ vertical)
  const base = 10;
  return `M ${s.x} ${s.y - base / 2} L ${tipX} ${tipY} L ${s.x} ${s.y + base / 2} Z`;
};

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ── Timing ─────────────────────────────────────────────────────────────
  const silhouetteOp = spring({
    frame,
    fps,
    config: { damping: 200, mass: 0.7 },
  });

  const reticleOp = interpolate(frame, [fps * 0.6, fps * 1.1], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const pulseStart = fps * 1.2;
  const pulseEnd = fps * 2.0;
  const pulseT = interpolate(frame, [pulseStart, pulseEnd], [0, 1], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const pulseOp = interpolate(
    frame,
    [pulseStart, pulseStart + 4, pulseEnd - 6, pulseEnd],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Vial fill: 0 → ~0.72
  const fillTarget = 0.72;
  const fill = spring({
    frame: frame - fps * 1.6,
    fps,
    config: { damping: 60, mass: 1.4, stiffness: 60 },
  }) * fillTarget;

  const wobble = Math.sin(frame * 0.12) * 1.2;

  const titleSpring = spring({
    frame: frame - fps * 2.4,
    fps,
    config: { damping: 200, mass: 0.9 },
  });
  const hookOp = interpolate(frame, [fps * 2.9, fps * 3.8], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Leader line geometry (board-local) ────────────────────────────────
  const reticleEdgeX = CRAB.heartX + 190;
  const reticleEdgeY = CRAB.heartY;
  const bendX = VIAL.cx - VIAL.halfW - 44;
  const bendY = reticleEdgeY;
  const meniscusY = VIAL.bottom - VIAL_H * fill;
  const vialEntryX = VIAL.cx - VIAL.halfW;
  const vialEntryY = Math.max(VIAL.top + 50, meniscusY + 4);

  const segALen = bendX - reticleEdgeX;
  const segBLen = Math.hypot(0, vialEntryY - bendY);
  const segCLen = VIAL.halfW;
  const totalLen = segALen + segBLen + segCLen;
  const traveled = pulseT * totalLen;

  const pulsePos = (() => {
    if (traveled < segALen) {
      return { x: reticleEdgeX + traveled, y: bendY };
    }
    if (traveled < segALen + segBLen) {
      const dy = traveled - segALen;
      const dir = vialEntryY > bendY ? 1 : -1;
      return { x: bendX, y: bendY + dir * dy };
    }
    const dx = traveled - segALen - segBLen;
    return { x: bendX + dx, y: vialEntryY };
  })();

  const spines = opisthoSpines();
  const reticleRot = (frame * 0.4) % 360;

  return (
    <AbsoluteFill style={{ backgroundColor: DEEP, fontFamily: inter }}>
      <style>{fontCss}</style>

      {/* Top metadata band */}
      <div
        style={{
          position: "absolute",
          top: 52,
          left: 80,
          right: 80,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          color: DIM,
          fontFamily: inter,
          fontSize: 13,
          letterSpacing: 4.5,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Everyday Motivation · No. 003</span>
        <span style={{ color: HEMO_HI }}>2026 · 10 · 20</span>
      </div>

      {/* Specimen board + anatomical plate */}
      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          <pattern
            id="bp-grid"
            x={FRAME.x}
            y={FRAME.y}
            width={40}
            height={40}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M 40 0 L 0 0 0 40`}
              fill="none"
              stroke={GRID}
              strokeWidth={1}
            />
          </pattern>
          <pattern
            id="bp-grid-major"
            x={FRAME.x}
            y={FRAME.y}
            width={200}
            height={200}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M 200 0 L 0 0 0 200`}
              fill="none"
              stroke="#22304B"
              strokeWidth={1}
            />
          </pattern>

          <radialGradient id="board-vignette" cx="40%" cy="45%" r="80%">
            <stop offset="0%" stopColor={BOARD_HI} stopOpacity={1} />
            <stop offset="100%" stopColor={BOARD} stopOpacity={1} />
          </radialGradient>

          <linearGradient id="hemo-fluid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={HEMO_HI} />
            <stop offset="35%" stopColor={HEMO} />
            <stop offset="100%" stopColor="#0F2F5A" />
          </linearGradient>

          <radialGradient id="hemo-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={HEMO_HI} stopOpacity={0.6} />
            <stop offset="100%" stopColor={HEMO_HI} stopOpacity={0} />
          </radialGradient>

          <filter id="soft-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <clipPath id="vial-clip">
            <path
              d={`
                M ${VIAL.cx - VIAL.halfW + 2} ${VIAL.top + 10}
                L ${VIAL.cx - VIAL.halfW + 2} ${VIAL.bottom - 10}
                Q ${VIAL.cx - VIAL.halfW + 2} ${VIAL.bottom - 2} ${VIAL.cx - VIAL.halfW + 14} ${VIAL.bottom - 2}
                L ${VIAL.cx + VIAL.halfW - 14} ${VIAL.bottom - 2}
                Q ${VIAL.cx + VIAL.halfW - 2} ${VIAL.bottom - 2} ${VIAL.cx + VIAL.halfW - 2} ${VIAL.bottom - 10}
                L ${VIAL.cx + VIAL.halfW - 2} ${VIAL.top + 10}
                Z
              `}
            />
          </clipPath>
        </defs>

        {/* Specimen board */}
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
          fill="url(#bp-grid)"
        />
        <rect
          x={FRAME.x}
          y={FRAME.y}
          width={FRAME.w}
          height={FRAME.h}
          fill="url(#bp-grid-major)"
        />

        {/* Inner thin border */}
        <rect
          x={FRAME.x + 0.5}
          y={FRAME.y + 0.5}
          width={FRAME.w - 1}
          height={FRAME.h - 1}
          fill="none"
          stroke="#2C3A58"
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
          <g key={i} stroke={HEMO_HI} strokeWidth={1.6} fill="none">
            <line x1={cx} y1={cy} x2={cx + sx * 26} y2={cy} />
            <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 26} />
          </g>
        ))}

        {/* Plate header strip (inside the frame) */}
        <g
          transform={`translate(${FRAME.x + 24}, ${FRAME.y + 32})`}
          fill={DIM}
          fontFamily={inter}
          fontWeight={600}
          fontSize={11}
          letterSpacing={3.5}
        >
          <text>SPECIMEN · LIMULUS POLYPHEMUS · DORSAL VIEW</text>
        </g>
        <g
          transform={`translate(${FRAME.x + FRAME.w - 24}, ${FRAME.y + 32})`}
          fill={DIM}
          fontFamily={inter}
          fontWeight={600}
          fontSize={11}
          letterSpacing={3.5}
        >
          <text textAnchor="end">PLATE III · LAL ASSAY</text>
        </g>

        {/* All anatomical content: translate into FRAME */}
        <g transform={`translate(${FRAME.x}, ${FRAME.y})`}>
          {/* ── Horseshoe crab silhouette ──────────────────────────── */}
          <g opacity={silhouetteOp}>
            {/* Unified fill (dusty chitin) */}
            <path d={crabSilhouettePath()} fill={CHITIN} fillOpacity={0.45} />

            {/* Outer soft atmospheric glow */}
            <path
              d={crabSilhouettePath()}
              fill="none"
              stroke={CHITIN_HI}
              strokeOpacity={0.3}
              strokeWidth={5}
              strokeLinejoin="round"
              filter="url(#soft-glow)"
            />

            {/* Sharp outline */}
            <path
              d={crabSilhouettePath()}
              fill="none"
              stroke={CHITIN_HI}
              strokeWidth={2}
              strokeLinejoin="round"
            />

            {/* Hinge arc — decorative anatomical line between prosoma and opisthosoma */}
            <path
              d={`M ${CRAB.cx - CRAB.opisthoHalfW + 4} ${CRAB.hingeY + 4} Q ${CRAB.cx} ${CRAB.hingeY - 18} ${CRAB.cx + CRAB.opisthoHalfW - 4} ${CRAB.hingeY + 4}`}
              fill="none"
              stroke={CHITIN_HI}
              strokeOpacity={0.5}
              strokeWidth={1.1}
              strokeDasharray="5 4"
            />

            {/* Prosoma inner ridges (two gentle curves hinting at the eye tubercles) */}
            <path
              d={`M ${CRAB.cx - 70} ${CRAB.topY + 85} Q ${CRAB.cx - 55} ${CRAB.topY + 60} ${CRAB.cx - 30} ${CRAB.topY + 80}`}
              fill="none"
              stroke={CHITIN_HI}
              strokeOpacity={0.5}
              strokeWidth={1.1}
            />
            <path
              d={`M ${CRAB.cx + 30} ${CRAB.topY + 80} Q ${CRAB.cx + 55} ${CRAB.topY + 60} ${CRAB.cx + 70} ${CRAB.topY + 85}`}
              fill="none"
              stroke={CHITIN_HI}
              strokeOpacity={0.5}
              strokeWidth={1.1}
            />

            {/* Lateral eyes (positioned on the shoulders of the prosoma) */}
            <circle cx={CRAB.cx - 165} cy={CRAB.topY + 160} r={7} fill={DEEP} stroke={CHITIN_HI} strokeWidth={1.5} />
            <circle cx={CRAB.cx + 165} cy={CRAB.topY + 160} r={7} fill={DEEP} stroke={CHITIN_HI} strokeWidth={1.5} />
            {/* Median eyes */}
            <circle cx={CRAB.cx - 10} cy={CRAB.topY + 110} r={2.6} fill={CHITIN_HI} />
            <circle cx={CRAB.cx + 10} cy={CRAB.topY + 110} r={2.6} fill={CHITIN_HI} />

            {/* Cardiac ridge — central spine on opisthosoma */}
            <line
              x1={CRAB.cx}
              y1={CRAB.hingeY + 20}
              x2={CRAB.cx}
              y2={CRAB.opisthoBaseY - 20}
              stroke={CHITIN_HI}
              strokeOpacity={0.55}
              strokeWidth={1.2}
            />
            {/* Secondary ridges flanking the cardiac spine */}
            <line
              x1={CRAB.cx - 55}
              y1={CRAB.hingeY + 30}
              x2={CRAB.cx - 40}
              y2={CRAB.opisthoBaseY - 30}
              stroke={CHITIN_HI}
              strokeOpacity={0.3}
              strokeWidth={1}
            />
            <line
              x1={CRAB.cx + 55}
              y1={CRAB.hingeY + 30}
              x2={CRAB.cx + 40}
              y2={CRAB.opisthoBaseY - 30}
              stroke={CHITIN_HI}
              strokeOpacity={0.3}
              strokeWidth={1}
            />

            {/* Opisthosomal spines (triangular lateral teeth) */}
            {spines.map((s, i) => (
              <path
                key={`sp-${i}`}
                d={spinePath(s)}
                fill={CHITIN}
                fillOpacity={0.7}
                stroke={CHITIN_HI}
                strokeWidth={1.4}
                strokeLinejoin="round"
              />
            ))}
          </g>

          {/* ── Anatomical labels (left margin) ───────────────────── */}
          <g
            opacity={interpolate(frame, [fps * 0.4, fps * 0.9], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })}
            fill={DIM}
            fontFamily={inter}
            fontSize={11}
            fontWeight={500}
            letterSpacing={3}
          >
            {/* PROSOMA */}
            <line x1={CRAB.cx - CRAB.prosomaRX - 10} y1={CRAB.topY + 90} x2={64} y2={CRAB.topY + 90} stroke={DIM} strokeWidth={1} />
            <text x={64} y={CRAB.topY + 84} textAnchor="start">PROSOMA</text>
            <text x={64} y={CRAB.topY + 102} fontSize={9} fill={DIM_LO} letterSpacing={2}>HEAD SHIELD</text>

            {/* LATERAL EYE */}
            <line x1={CRAB.cx - 165 - 8} y1={CRAB.topY + 160} x2={64} y2={CRAB.topY + 212} stroke={DIM} strokeWidth={1} />
            <text x={64} y={CRAB.topY + 208} textAnchor="start">LATERAL EYE</text>
            <text x={64} y={CRAB.topY + 226} fontSize={9} fill={DIM_LO} letterSpacing={2}>OMMATIDIA · 1 K+</text>

            {/* OPISTHOSOMA */}
            <line x1={CRAB.cx - CRAB.opisthoHalfW - 20} y1={CRAB.opisthoMidY} x2={64} y2={CRAB.opisthoMidY + 40} stroke={DIM} strokeWidth={1} />
            <text x={64} y={CRAB.opisthoMidY + 36} textAnchor="start">OPISTHOSOMA</text>
            <text x={64} y={CRAB.opisthoMidY + 54} fontSize={9} fill={DIM_LO} letterSpacing={2}>ABDOMINAL PLATE</text>

            {/* TELSON */}
            <line x1={CRAB.cx - 6} y1={CRAB.telsonY - 50} x2={64} y2={CRAB.telsonY - 70} stroke={DIM} strokeWidth={1} />
            <text x={64} y={CRAB.telsonY - 76} textAnchor="start">TELSON</text>
            <text x={64} y={CRAB.telsonY - 58} fontSize={9} fill={DIM_LO} letterSpacing={2}>CAUDAL SPINE</text>
          </g>

          {/* ── Reticle over cardiac region (the LAL draw site) ────── */}
          <g
            opacity={reticleOp}
            transform={`translate(${CRAB.heartX}, ${CRAB.heartY})`}
          >
            {/* Soft blue glow */}
            <circle r={70} fill="url(#hemo-glow)" />
            {/* Outer ring */}
            <circle r={42} fill="none" stroke={HEMO_HI} strokeWidth={1.6} />
            {/* Spinning rotation reticle */}
            <g transform={`rotate(${reticleRot})`}>
              <circle r={28} fill="none" stroke={HEMO_HI} strokeOpacity={0.65} strokeWidth={1} strokeDasharray="2 6" />
            </g>
            {/* Cross-hairs */}
            <line x1={-58} y1={0} x2={-16} y2={0} stroke={HEMO_HI} strokeWidth={1.4} />
            <line x1={16} y1={0} x2={58} y2={0} stroke={HEMO_HI} strokeWidth={1.4} />
            <line x1={0} y1={-58} x2={0} y2={-16} stroke={HEMO_HI} strokeWidth={1.4} />
            <line x1={0} y1={16} x2={0} y2={58} stroke={HEMO_HI} strokeWidth={1.4} />
            {/* Centre dot */}
            <circle r={3.2} fill={HEMO_HI} />
            {/* Target label */}
            <text
              x={52}
              y={-32}
              fill={HEMO_HI}
              fontFamily={inter}
              fontSize={10}
              fontWeight={600}
              letterSpacing={3}
            >
              CARDIAC
            </text>
            <text
              x={52}
              y={-18}
              fill={HEMO_HI}
              fontFamily={inter}
              fontSize={10}
              fontWeight={600}
              letterSpacing={3}
            >
              SINUS
            </text>
          </g>

          {/* ── Leader line: reticle → vial ─────────────────────── */}
          <g
            opacity={interpolate(frame, [fps * 1.1, fps * 1.5], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })}
          >
            <path
              d={`M ${reticleEdgeX} ${reticleEdgeY} L ${bendX} ${bendY} L ${bendX} ${vialEntryY} L ${vialEntryX} ${vialEntryY}`}
              fill="none"
              stroke={HEMO_HI}
              strokeOpacity={0.78}
              strokeWidth={1.2}
              strokeDasharray="4 3"
            />
          </g>

          {/* Pulse along the leader */}
          {pulseT > 0 && pulseT < 1 && (
            <g opacity={pulseOp}>
              <circle cx={pulsePos.x} cy={pulsePos.y} r={11} fill={HEMO_HI} opacity={0.35} filter="url(#soft-glow)" />
              <circle cx={pulsePos.x} cy={pulsePos.y} r={4} fill={IVORY} />
            </g>
          )}

          {/* ── Vial (precision glass, graduated) ───────────────── */}
          <g>
            {/* Glass outline */}
            <path
              d={`
                M ${VIAL.cx - VIAL.halfW} ${VIAL.top + 10}
                Q ${VIAL.cx - VIAL.halfW} ${VIAL.top} ${VIAL.cx - VIAL.halfW + 10} ${VIAL.top}
                L ${VIAL.cx + VIAL.halfW - 10} ${VIAL.top}
                Q ${VIAL.cx + VIAL.halfW} ${VIAL.top} ${VIAL.cx + VIAL.halfW} ${VIAL.top + 10}
                L ${VIAL.cx + VIAL.halfW} ${VIAL.bottom - 14}
                Q ${VIAL.cx + VIAL.halfW} ${VIAL.bottom} ${VIAL.cx + VIAL.halfW - 14} ${VIAL.bottom}
                L ${VIAL.cx - VIAL.halfW + 14} ${VIAL.bottom}
                Q ${VIAL.cx - VIAL.halfW} ${VIAL.bottom} ${VIAL.cx - VIAL.halfW} ${VIAL.bottom - 14}
                Z
              `}
              fill="#0B1726"
              fillOpacity={0.65}
              stroke={IVORY}
              strokeOpacity={0.9}
              strokeWidth={1.8}
              strokeLinejoin="round"
            />

            {/* Fluid (clipped) */}
            <g clipPath="url(#vial-clip)">
              {/* Blue glow behind fluid */}
              <rect
                x={VIAL.cx - VIAL.halfW - 20}
                y={meniscusY}
                width={VIAL.halfW * 2 + 40}
                height={VIAL.bottom - meniscusY}
                fill={HEMO_HI}
                opacity={0.25}
                filter="url(#soft-glow)"
              />
              {/* Fluid body */}
              <rect
                x={VIAL.cx - VIAL.halfW}
                y={meniscusY}
                width={VIAL.halfW * 2}
                height={VIAL.bottom - meniscusY + 2}
                fill="url(#hemo-fluid)"
              />
              {/* Meniscus curve */}
              <path
                d={`M ${VIAL.cx - VIAL.halfW} ${meniscusY + wobble} Q ${VIAL.cx} ${meniscusY - 7 + wobble} ${VIAL.cx + VIAL.halfW} ${meniscusY + wobble}`}
                stroke={HEMO_HI}
                strokeWidth={2}
                fill="none"
                opacity={0.9}
              />
              {/* Highlight band on the left wall */}
              <rect
                x={VIAL.cx - VIAL.halfW + 4}
                y={meniscusY + 6}
                width={3}
                height={VIAL.bottom - meniscusY - 14}
                fill={IVORY}
                opacity={0.28}
                rx={1.5}
              />
            </g>

            {/* Graduation marks (ticks + labels) */}
            {TICKS.map((tk, i) => {
              const y = VIAL.top + VIAL_H * tk.frac;
              const major = Boolean(tk.label);
              const tickLen = major ? 14 : 7;
              return (
                <g key={`tick-${i}`}>
                  <line
                    x1={VIAL.cx - VIAL.halfW - tickLen}
                    y1={y}
                    x2={VIAL.cx - VIAL.halfW - 2}
                    y2={y}
                    stroke={IVORY}
                    strokeOpacity={major ? 0.9 : 0.5}
                    strokeWidth={major ? 1.5 : 1}
                  />
                  {major && (
                    <text
                      x={VIAL.cx - VIAL.halfW - 20}
                      y={y + 3.5}
                      textAnchor="end"
                      fill={IVORY}
                      fontFamily={inter}
                      fontSize={11}
                      fontWeight={500}
                      letterSpacing={1.5}
                    >
                      {tk.label}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Unit label */}
            <text
              x={VIAL.cx - VIAL.halfW - 20}
              y={VIAL.top - 14}
              textAnchor="end"
              fill={DIM}
              fontFamily={inter}
              fontSize={10}
              fontWeight={600}
              letterSpacing={3}
            >
              EU / mL
            </text>

            {/* Specimen tag at base of vial */}
            <g transform={`translate(${VIAL.cx + VIAL.halfW + 14}, ${VIAL.bottom - 14})`}>
              <text
                fill={HEMO_HI}
                fontFamily={inter}
                fontSize={10}
                fontWeight={600}
                letterSpacing={3}
              >
                LAL · R-100
              </text>
              <text
                y={16}
                fill={DIM}
                fontFamily={inter}
                fontSize={9}
                fontWeight={500}
                letterSpacing={2}
              >
                LOT 2026-10-20
              </text>
            </g>

            {/* Vial neck line (shoulder) */}
            <line
              x1={VIAL.cx - VIAL.halfW + 2}
              y1={VIAL.top + 38}
              x2={VIAL.cx + VIAL.halfW - 2}
              y2={VIAL.top + 38}
              stroke={IVORY}
              strokeOpacity={0.3}
              strokeWidth={1}
            />
          </g>

          {/* ── Caption strip (inside bottom of plate) ───────────── */}
          <g
            transform={`translate(0, ${FRAME.h - 32})`}
            fill={DIM}
            fontFamily={inter}
            fontSize={11}
            letterSpacing={3}
            fontWeight={500}
          >
            <text x={24}>FIG. 1 · HEMOLYMPH DRAW SITE · AMEBOCYTE LYSATE</text>
            <text
              x={FRAME.w - 24}
              textAnchor="end"
              fill={HEMO_HI}
              opacity={0.9}
            >
              DETECTS ENDOTOXIN ≥ 0.001 EU/mL
            </text>
          </g>
        </g>
      </svg>

      {/* ── Type lockup ────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 950,
          opacity: titleSpring,
          transform: `translateY(${interpolate(titleSpring, [0, 1], [16, 0])}px)`,
        }}
      >
        <div
          style={{
            color: HEMO_HI,
            fontFamily: inter,
            fontSize: 13,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 18,
            fontWeight: 600,
          }}
        >
          Role <span style={{ color: DIM, margin: "0 6px" }}>/</span>
          <span style={{ color: IVORY, letterSpacing: 5 }}>Pharmacist</span>
        </div>

        <div
          style={{
            color: IVORY,
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 72,
            lineHeight: 0.98,
            letterSpacing: -1.1,
            fontStyle: "italic",
          }}
        >
          The blue-blooded
          <br />
          batch inspector.
        </div>

        <div
          style={{
            marginTop: 22,
            color: "#C8CAD0",
            fontFamily: inter,
            fontSize: 17,
            lineHeight: 1.42,
            fontWeight: 400,
            maxWidth: 920,
            opacity: hookOp,
          }}
        >
          Its copper-based hemolymph is{" "}
          <span style={{ color: HEMO_HI, fontWeight: 600 }}>indigo blue</span>,
          and its amebocytes clot in the presence of{" "}
          <span style={{ color: HEMO_HI, fontWeight: 600 }}>
            one part per trillion
          </span>{" "}
          of bacterial endotoxin — a sensitivity so absolute that since 1977,
          every injectable drug, vaccine, and implant sold in the U.S. has
          been batch-released on a horseshoe-crab blood test.
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          bottom: 36,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          color: DIM,
          fontFamily: inter,
          fontSize: 11,
          letterSpacing: 3,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Bang 1956 · Levin & Bang 1964 · FDA LAL approval 1977</span>
        <span>
          <span style={{ color: HEMO_HI }}>●</span> Hemolymph · Cu-based
          hemocyanin
        </span>
      </div>
    </AbsoluteFill>
  );
};
