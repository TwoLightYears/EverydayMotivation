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
@font-face { font-family: 'Inter'; font-style: normal; font-weight: 400; font-display: block;
  src: url(${staticFile("fonts/inter-latin-400-normal.woff2")}) format('woff2'); }
@font-face { font-family: 'Inter'; font-style: normal; font-weight: 500; font-display: block;
  src: url(${staticFile("fonts/inter-latin-500-normal.woff2")}) format('woff2'); }
@font-face { font-family: 'Inter'; font-style: normal; font-weight: 600; font-display: block;
  src: url(${staticFile("fonts/inter-latin-600-normal.woff2")}) format('woff2'); }
@font-face { font-family: 'Playfair Display'; font-style: normal; font-weight: 500; font-display: block;
  src: url(${staticFile("fonts/playfair-display-latin-500-normal.woff2")}) format('woff2'); }
@font-face { font-family: 'Playfair Display'; font-style: italic; font-weight: 500; font-display: block;
  src: url(${staticFile("fonts/playfair-display-latin-500-italic.woff2")}) format('woff2'); }
`;

// Palette — drawn from the concept's visual brief (trypan-blue stained arbuscules
// in pale root cortex, with amber carbon and glacier-blue phosphate tokens).
const INK = "#120B06";             // deep humus
const SOIL = "#1C130A";            // soft panel
const CORTEX = "#E8D7B1";          // root cortex cream
const CORTEX_DIM = "#9A8963";      // dim cortex outline
const ARB = "#2E5F8E";             // arbuscule trypan blue
const ARB_HI = "#5B91C2";          // arbuscule highlight
const CARBON = "#E09344";          // carbon-token amber
const CARBON_HI = "#FFC98A";       // carbon glow
const P = "#89BBD2";               // phosphate glacier blue
const P_HI = "#C4E2EE";            // phosphate glow
const GRAY = "#8A8277";            // warm neutral text
const WARN = "#B14A3B";            // sanction red
const PAPER = "#F6ECD3";           // pale paper on the rate card

// ──────────────────────────────────────────────────────────────────────
// Arbuscule generation — a seeded recursive dendrite that reads as a
// microscopy specimen rather than a math fractal. One trunk entering the
// root cell from the top, branching 2–3 ways with modest jitter.
// ──────────────────────────────────────────────────────────────────────

type Seg = {
  id: string;
  parent: string | null;
  depth: number;        // 4 = trunk, 0 = tip
  x1: number; y1: number;
  x2: number; y2: number;
  cx: number; cy: number;
  len: number;
  delay: number;        // 0..1, when this segment begins drawing
};

const segments: Seg[] = [];
let segCounter = 0;

const hashSeed = (s: string): number => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = (h ^ s.charCodeAt(i)) * 16777619;
  return ((h >>> 0) % 10000) / 10000;
};

const jitter = (seed: string): number => hashSeed(seed) - 0.5;

const grow = (
  x1: number,
  y1: number,
  angle: number,
  length: number,
  depth: number,
  parent: string | null,
  delay: number,
): void => {
  const id = `s${segCounter++}`;
  const x2 = x1 + Math.cos(angle) * length;
  const y2 = y1 + Math.sin(angle) * length;
  const nx = -Math.sin(angle);
  const ny = Math.cos(angle);
  const bend = jitter(id + "b") * 0.14 * length;
  const cx = (x1 + x2) / 2 + nx * bend;
  const cy = (y1 + y2) / 2 + ny * bend;
  segments.push({ id, parent, depth, x1, y1, x2, y2, cx, cy, len: length, delay });

  if (depth === 0) return;

  const branches = depth >= 3 ? 3 : depth >= 2 ? 2 + (hashSeed(id + "n") > 0.5 ? 1 : 0) : 2;
  const spread = depth >= 3 ? 0.95 : depth >= 2 ? 0.75 : 0.55;
  for (let i = 0; i < branches; i++) {
    const offset = (i - (branches - 1) / 2) * (spread / Math.max(1, branches - 1));
    const j = jitter(id + "j" + i) * 0.3;
    const a = angle + offset + j;
    const l = length * (0.66 + hashSeed(id + "l" + i) * 0.14);
    const childDelay = delay + 0.09 + i * 0.012;
    grow(x2, y2, a, l, depth - 1, id, childDelay);
  }
};

// Trunk enters the cell from the upper-left, descending into the cortex.
// Local coords are in a 960×711 frame (same frame as the Slime Mold plate).
const TRUNK_X = 230;
const TRUNK_Y = 95;
grow(TRUNK_X, TRUNK_Y, Math.PI / 2, 120, 4, null, 0);

// Pre-compute a curved path and tapered width per segment.
const segPath = (s: Seg): string => `M ${s.x1} ${s.y1} Q ${s.cx} ${s.cy} ${s.x2} ${s.y2}`;
const segWidth = (s: Seg): number =>
  ({ 4: 10, 3: 7, 2: 5, 1: 3.2, 0: 2.2 } as Record<number, number>)[s.depth] ?? 2;

// Pre-compute an interpolator along the quadratic Bézier at parameter t∈[0,1].
const bezAt = (s: Seg, t: number): { x: number; y: number } => {
  const u = 1 - t;
  return {
    x: u * u * s.x1 + 2 * u * t * s.cx + t * t * s.x2,
    y: u * u * s.y1 + 2 * u * t * s.cy + t * t * s.y2,
  };
};

// Approximate curve length (sample 6 points on the Bézier).
const segArcLen = (s: Seg): number => {
  let L = 0;
  let prev = bezAt(s, 0);
  for (let i = 1; i <= 6; i++) {
    const p = bezAt(s, i / 6);
    L += Math.hypot(p.x - prev.x, p.y - prev.y);
    prev = p;
  }
  return L;
};

// Pick the segments that carry packets (skip the thinnest tips so the motion
// is readable but still obviously many‑stranded).
const packetSegs = segments.filter((s) => s.depth >= 1);

// A cell-wall curve — a snug rounded blob around the arbuscule only.
const CELL_PATH =
  "M 55,175 C 55,105 155,55 245,65 C 358,78 430,165 430,280 " +
  "C 430,435 350,612 230,635 C 115,655 30,520 26,370 C 23,258 55,218 55,175 Z";

// ──────────────────────────────────────────────────────────────────────
// Composition
// ──────────────────────────────────────────────────────────────────────

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const growSpan = fps * 2.4;
  const growT = Math.max(0, frame) / growSpan;

  const titleSpring = spring({
    frame: frame - fps * 0.4,
    fps,
    config: { damping: 200, mass: 0.8 },
  });

  const hookOpacity = interpolate(frame, [fps * 1.1, fps * 2.0], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const boardReveal = (row: number): number =>
    spring({
      frame: frame - fps * (1.3 + row * 0.18),
      fps,
      config: { damping: 180, mass: 0.7 },
    });

  // Packet loop — carbon flows inward (toward trunk), phosphate flows outward.
  const packetPeriod = fps * 3.0;
  const packetLoop = (frame % packetPeriod) / packetPeriod;

  const FRAME = { x: 60, y: 130, w: 960, h: 711 };

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
        <span style={{ color: CARBON }}>2026 · 11 · 01</span>
      </div>

      {/* Drafting frame + specimen plate */}
      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          <radialGradient id="panel-vignette" cx="38%" cy="42%" r="80%">
            <stop offset="0%" stopColor="#231810" stopOpacity={1} />
            <stop offset="100%" stopColor={SOIL} stopOpacity={1} />
          </radialGradient>

          <radialGradient id="cell-fill" cx="42%" cy="40%" r="65%">
            <stop offset="0%" stopColor={CORTEX} stopOpacity={0.95} />
            <stop offset="78%" stopColor={CORTEX} stopOpacity={0.74} />
            <stop offset="100%" stopColor={CORTEX} stopOpacity={0.3} />
          </radialGradient>

          <filter id="arb-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="token-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <pattern id="soil-grain" x="0" y="0" width="18" height="18" patternUnits="userSpaceOnUse">
            <circle cx="4" cy="6" r="0.6" fill="#2A1E13" opacity="0.6" />
            <circle cx="12" cy="13" r="0.4" fill="#30241A" opacity="0.55" />
          </pattern>
        </defs>

        {/* Panel */}
        <rect
          x={FRAME.x}
          y={FRAME.y}
          width={FRAME.w}
          height={FRAME.h}
          fill="url(#panel-vignette)"
        />
        <rect
          x={FRAME.x}
          y={FRAME.y}
          width={FRAME.w}
          height={FRAME.h}
          fill="url(#soil-grain)"
          opacity={0.8}
        />
        <rect
          x={FRAME.x + 0.5}
          y={FRAME.y + 0.5}
          width={FRAME.w - 1}
          height={FRAME.h - 1}
          fill="none"
          stroke="#2E2317"
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
          <g key={i} stroke={CARBON} strokeWidth={1.4} fill="none">
            <line x1={cx} y1={cy} x2={cx + sx * 26} y2={cy} />
            <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 26} />
          </g>
        ))}

        {/* Specimen label — microscopy top-right (upper-right of plate) */}
        <g
          transform={`translate(${FRAME.x + FRAME.w - 26}, ${FRAME.y + 32})`}
          fill={GRAY}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3.5}
          fontWeight={600}
          textAnchor="end"
        >
          <text>SPECIMEN · 00/003 · TRYPAN BLUE · × 400</text>
        </g>

        {/* Scale bar bottom-right of plate */}
        <g
          transform={`translate(${FRAME.x + FRAME.w - 170}, ${FRAME.y + FRAME.h - 30})`}
          stroke={GRAY}
          fill={GRAY}
          fontFamily={inter}
          fontSize={10}
          letterSpacing={3}
          fontWeight={500}
        >
          <line x1={0} y1={0} x2={100} y2={0} strokeWidth={1.2} />
          <line x1={0} y1={-5} x2={0} y2={5} strokeWidth={1.2} />
          <line x1={50} y1={-3} x2={50} y2={3} strokeWidth={1.2} />
          <line x1={100} y1={-5} x2={100} y2={5} strokeWidth={1.2} />
          <text x={110} y={4} stroke="none">
            50 µM
          </text>
        </g>

        {/* ── Specimen plate contents, local coords = 960×711 ── */}
        <g transform={`translate(${FRAME.x}, ${FRAME.y})`}>
          {/* Root-cell outline (dashed cortex boundary) */}
          <g opacity={interpolate(frame, [0, fps * 0.4], [0, 1], { extrapolateRight: "clamp" })}>
            <path d={CELL_PATH} fill="url(#cell-fill)" />
            <path
              d={CELL_PATH}
              fill="none"
              stroke={CORTEX_DIM}
              strokeWidth={1.6}
              strokeDasharray="7 5"
              opacity={0.9}
            />
          </g>

          {/* Hypha approach — a short bold stalk descending from the plate top
              into the cell wall, labeled to the left. */}
          <g opacity={interpolate(frame, [fps * 0.1, fps * 0.5], [0, 1], { extrapolateRight: "clamp" })}>
            <path
              d={`M ${TRUNK_X},18 L ${TRUNK_X},${TRUNK_Y}`}
              stroke={ARB}
              strokeWidth={11}
              strokeLinecap="round"
              opacity={0.78}
            />
            {/* Leader line from label to the stalk */}
            <path
              d={`M 130,52 L ${TRUNK_X - 8},52`}
              stroke={GRAY}
              strokeWidth={1}
              opacity={0.55}
            />
            <text
              x={30}
              y={56}
              fontFamily={inter}
              fontSize={10}
              fontWeight={600}
              letterSpacing={3.0}
              fill={GRAY}
            >
              EXTRA-RADICAL HYPHA
            </text>
          </g>

          {/* Arbuscule — glow pass */}
          <g filter="url(#arb-glow)">
            {segments.map((s) => {
              const localT = (growT - s.delay) / 0.12;
              const grow01 = Math.max(0, Math.min(1, localT));
              const eased = 1 - Math.pow(1 - grow01, 3);
              const len = segArcLen(s);
              const w = segWidth(s);
              return (
                <path
                  key={`g-${s.id}`}
                  d={segPath(s)}
                  stroke={ARB}
                  strokeWidth={w + 4}
                  strokeOpacity={0.14 * eased}
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={len}
                  strokeDashoffset={len * (1 - eased)}
                />
              );
            })}
          </g>

          {/* Arbuscule — core strokes */}
          {segments.map((s) => {
            const localT = (growT - s.delay) / 0.12;
            const grow01 = Math.max(0, Math.min(1, localT));
            const eased = 1 - Math.pow(1 - grow01, 3);
            const len = segArcLen(s);
            const w = segWidth(s);
            return (
              <g key={`c-${s.id}`}>
                <path
                  d={segPath(s)}
                  stroke={ARB}
                  strokeWidth={w}
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={len}
                  strokeDashoffset={len * (1 - eased)}
                />
                <path
                  d={segPath(s)}
                  stroke={ARB_HI}
                  strokeWidth={Math.max(1, w - 2.5)}
                  strokeOpacity={0.55}
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={len}
                  strokeDashoffset={len * (1 - eased)}
                />
              </g>
            );
          })}

          {/* Tip beads at the ends of depth-0 segments */}
          {segments
            .filter((s) => s.depth === 0)
            .map((s) => {
              const op = Math.min(1, Math.max(0, growT - s.delay - 0.1) * 4);
              return (
                <circle
                  key={`t-${s.id}`}
                  cx={s.x2}
                  cy={s.y2}
                  r={2.3}
                  fill={ARB_HI}
                  opacity={op}
                />
              );
            })}

          {/* Packets — carbon flowing inward (toward trunk / parent) */}
          {packetSegs.map((s, i) => {
            if (growT < s.delay + 0.12) return null;
            const phase = (packetLoop + hashSeed(s.id + "c")) % 1;
            // Inward: t=1 (tip side) → t=0 (parent side)
            const p = bezAt(s, 1 - phase);
            const op = 0.4 + 0.6 * Math.sin(phase * Math.PI);
            return (
              <g key={`cp-${i}`} filter="url(#token-glow)" opacity={op}>
                <circle cx={p.x} cy={p.y} r={3.5} fill={CARBON} />
                <circle cx={p.x} cy={p.y} r={1.6} fill={CARBON_HI} />
              </g>
            );
          })}

          {/* Packets — phosphate flowing outward (toward tips) */}
          {packetSegs.map((s, i) => {
            if (growT < s.delay + 0.12) return null;
            const phase = (packetLoop + hashSeed(s.id + "p") + 0.5) % 1;
            const p = bezAt(s, phase);
            const op = 0.4 + 0.6 * Math.sin(phase * Math.PI);
            return (
              <g key={`pp-${i}`} filter="url(#token-glow)" opacity={op}>
                <circle cx={p.x} cy={p.y} r={3.5} fill={P} />
                <circle cx={p.x} cy={p.y} r={1.6} fill={P_HI} />
              </g>
            );
          })}

          {/* ── Rate board (right side) ───────────────────────────────── */}
          <g transform={`translate(610, 140)`}>
            {/* Card */}
            <rect
              x={0}
              y={0}
              width={310}
              height={400}
              fill={PAPER}
              rx={2}
              opacity={interpolate(frame, [fps * 1.0, fps * 1.3], [0, 1], {
                extrapolateRight: "clamp",
              })}
            />
            <rect
              x={0}
              y={0}
              width={310}
              height={400}
              fill="none"
              stroke={CORTEX_DIM}
              strokeWidth={1}
              rx={2}
              opacity={interpolate(frame, [fps * 1.0, fps * 1.3], [0, 1], {
                extrapolateRight: "clamp",
              })}
            />
            {/* Card header strip */}
            <rect
              x={0}
              y={0}
              width={310}
              height={42}
              fill={ARB}
              rx={2}
              opacity={interpolate(frame, [fps * 1.1, fps * 1.4], [0, 1], {
                extrapolateRight: "clamp",
              })}
            />
            <text
              x={18}
              y={27}
              fill={PAPER}
              fontFamily={inter}
              fontSize={12}
              letterSpacing={3.4}
              fontWeight={600}
              opacity={interpolate(frame, [fps * 1.15, fps * 1.45], [0, 1], {
                extrapolateRight: "clamp",
              })}
            >
              EXCHANGE RATE BOARD
            </text>

            {/* Column headers */}
            <g
              transform="translate(0, 62)"
              fontFamily={inter}
              fontSize={9}
              letterSpacing={2.4}
              fontWeight={600}
              fill={CORTEX_DIM}
              opacity={interpolate(frame, [fps * 1.2, fps * 1.5], [0, 1], {
                extrapolateRight: "clamp",
              })}
            >
              <text x={18}>ISOLATE</text>
              <text x={292} textAnchor="end">
                STATUS
              </text>
            </g>

            {/* Rows */}
            {[
              {
                label: "A · G. intraradices",
                rate: "0.92",
                status: "FAVORED",
                color: ARB,
                bg: "#F0E2C0",
              },
              {
                label: "B · G. aggregatum",
                rate: "0.61",
                status: "NEUTRAL",
                color: GRAY,
                bg: "#EDE2BE",
              },
              {
                label: "C · G. custos (mut.)",
                rate: "0.18",
                status: "SANCTIONED",
                color: WARN,
                bg: "#F2D5CC",
              },
            ].map((r, i) => {
              const rev = boardReveal(i);
              const y = 85 + i * 76;
              return (
                <g key={r.status} transform={`translate(0, ${y})`} opacity={rev}>
                  <rect x={12} y={0} width={286} height={62} fill={r.bg} rx={2} />

                  {/* Row 1: isolate + status chip */}
                  <text
                    x={22}
                    y={19}
                    fontFamily={inter}
                    fontSize={11}
                    letterSpacing={0.6}
                    fontWeight={600}
                    fill={INK}
                  >
                    {r.label}
                  </text>
                  <rect
                    x={210}
                    y={6}
                    width={82}
                    height={18}
                    rx={2}
                    fill={r.color}
                    opacity={0.95}
                  />
                  <text
                    x={251}
                    y={19}
                    textAnchor="middle"
                    fontFamily={inter}
                    fontSize={8.5}
                    letterSpacing={2.3}
                    fontWeight={700}
                    fill={PAPER}
                  >
                    {r.status}
                  </text>

                  {/* Row 2: rate quotation + meter */}
                  <text
                    x={22}
                    y={48}
                    fontFamily={playfair}
                    fontStyle="italic"
                    fontSize={22}
                    fill={INK}
                  >
                    1 C → {r.rate} P
                  </text>
                  <rect x={160} y={41} width={132} height={6} fill="#DECCA2" rx={1} />
                  <rect
                    x={160}
                    y={41}
                    width={132 * parseFloat(r.rate)}
                    height={6}
                    fill={r.color}
                    rx={1}
                  />
                </g>
              );
            })}
          </g>

          {/* Flow key — sits under the rate board on the right */}
          <g
            transform={`translate(610, 568)`}
            fontFamily={inter}
            fontSize={11}
            letterSpacing={2.4}
            fontWeight={600}
            fill={GRAY}
            opacity={interpolate(frame, [fps * 1.4, fps * 1.8], [0, 1], {
              extrapolateRight: "clamp",
            })}
          >
            <g>
              <circle cx={6} cy={-4} r={5.5} fill={CARBON} />
              <text x={20} y={0} fill={CORTEX}>
                CARBON
              </text>
              <text x={95} y={0} fill={GRAY} fontWeight={500}>
                PLANT → FUNGUS
              </text>
            </g>
            <g transform="translate(0, 22)">
              <circle cx={6} cy={-4} r={5.5} fill={P} />
              <text x={20} y={0} fill={CORTEX}>
                PHOSPHATE
              </text>
              <text x={110} y={0} fill={GRAY} fontWeight={500}>
                FUNGUS → PLANT
              </text>
            </g>
          </g>

          {/* Caption strip at the bottom-left of the plate */}
          <g
            transform={`translate(28, 668)`}
            fontFamily={inter}
            fontSize={10}
            letterSpacing={3}
            fontWeight={500}
            fill={GRAY}
            opacity={0.85}
          >
            <text>
              FIG. 1 · ARBUSCULE WITHIN A ROOT CORTEX CELL · SPLIT-ROOT ASSAY
            </text>
          </g>
        </g>
      </svg>

      {/* ── Type lockup ──────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 905,
          opacity: titleSpring,
          transform: `translateY(${interpolate(titleSpring, [0, 1], [16, 0])}px)`,
        }}
      >
        <div
          style={{
            color: CARBON,
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
            Commodities Trader
          </span>
        </div>

        <div
          style={{
            color: "#F4F4F6",
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 80,
            lineHeight: 0.98,
            letterSpacing: -1.3,
            fontStyle: "italic",
          }}
        >
          The underground
          <br />
          commodities trader.
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
          Offered three fungal isolates in a split-root assay,{" "}
          <span style={{ color: ARB_HI, fontWeight: 600 }}>
            arbuscular mycorrhizal fungi
          </span>{" "}
          directed roughly 3× more carbon to the partner delivering the
          most phosphate — and the fungi, in turn, pumped more P back to
          roots that paid better and withheld supply from the cheat.
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
        <span>Kiers et al. · Science 333 (2011) 880–882</span>
        <span>
          <span style={{ color: CARBON }}>●</span> Carbon{"   "}
          <span style={{ color: P }}>●</span> Phosphate
        </span>
      </div>
    </AbsoluteFill>
  );
};
