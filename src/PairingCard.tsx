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
const INK = "#0D1613";
const BOARD = "#111E1A";
const CREAM = "#CBAE75";
const CREAM_HI = "#F5E6B8";
const CRIMSON = "#C2451A";
const PAD = "#5F8A6D";
const GRID = "#172923";
const GRID_MAJOR = "#1F342C";
const DIM = "#6E7F74";

// Drafting frame inside the 1080×1350 page
const FRAME = { x: 60, y: 130, w: 960, h: 711 };

// Leaf plan sits in the left two-thirds; Crystal-Palace echo lives to the
// right so the two silhouettes rhyme at a glance.
const CX = FRAME.x + 320;
const CY = FRAME.y + 325;
const R_RIM = 218;
const R_HUB = 15;

// Primary rib count (radial beams from hub to rim)
const PRIMARIES = 24;
// Concentric cross-rib rings between hub and rim
const RINGS = [0.3, 0.52, 0.74, 0.92];

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Growth timeline
  const T_PRIMARY = fps * 2.0; // primary ribs 0 → 2.0 s
  const T_RINGS_START = fps * 1.4;
  const T_RINGS_END = fps * 2.8;
  const T_ANNOT = fps * 2.6;
  const T_SECTION = fps * 2.1;
  const T_PALACE = fps * 3.0;

  const primaryT = Math.min(1, frame / T_PRIMARY);
  const ringsT = Math.max(
    0,
    Math.min(1, (frame - T_RINGS_START) / (T_RINGS_END - T_RINGS_START)),
  );
  const annotT = Math.max(0, Math.min(1, (frame - T_ANNOT) / (fps * 0.8)));
  const sectionT = Math.max(0, Math.min(1, (frame - T_SECTION) / (fps * 0.9)));
  const palaceT = Math.max(0, Math.min(1, (frame - T_PALACE) / (fps * 0.9)));

  // breathing pulse once the lattice is in
  const breathe =
    0.5 +
    0.5 *
      Math.sin(((frame / fps) * Math.PI * 2) / 4.0 - Math.PI / 2) *
      (primaryT >= 1 ? 1 : 0);

  const titleSpring = spring({
    frame: frame - fps * 0.6,
    fps,
    config: { damping: 200, mass: 0.8 },
  });

  const hookOpacity = interpolate(frame, [fps * 1.4, fps * 2.3], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Precompute rib geometry (deterministic — no randomness)
  const primaries = Array.from({ length: PRIMARIES }, (_, i) => {
    const a = (i / PRIMARIES) * Math.PI * 2 - Math.PI / 2;
    const delay = i / PRIMARIES; // sweep clockwise
    return { i, a, delay };
  });

  const ringRadii = RINGS.map((f) => R_HUB + (R_RIM - R_HUB) * f);

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
          color: DIM,
          fontFamily: inter,
          fontSize: 13,
          letterSpacing: 4.5,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Everyday Motivation · No. 003</span>
        <span style={{ color: CREAM }}>2026 · 10 · 06</span>
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
            width={32}
            height={32}
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 32 0 L 0 0 0 32"
              fill="none"
              stroke={GRID}
              strokeWidth={1}
            />
          </pattern>
          <pattern
            id="grid-major"
            x={FRAME.x}
            y={FRAME.y}
            width={128}
            height={128}
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 128 0 L 0 0 0 128"
              fill="none"
              stroke={GRID_MAJOR}
              strokeWidth={1}
            />
          </pattern>

          <radialGradient id="board-vignette" cx="50%" cy="40%" r="70%">
            <stop offset="0%" stopColor="#13201C" stopOpacity={1} />
            <stop offset="100%" stopColor={BOARD} stopOpacity={1} />
          </radialGradient>

          <radialGradient id="pad-fill" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={PAD} stopOpacity={0.14} />
            <stop offset="70%" stopColor={PAD} stopOpacity={0.08} />
            <stop offset="100%" stopColor={PAD} stopOpacity={0.0} />
          </radialGradient>

          <radialGradient id="hub-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={CRIMSON} stopOpacity={0.55} />
            <stop offset="100%" stopColor={CRIMSON} stopOpacity={0} />
          </radialGradient>

          <filter id="rib-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
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
          stroke="#243932"
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
          <g key={i} stroke={CRIMSON} strokeWidth={1.5} fill="none">
            <line x1={cx} y1={cy} x2={cx + sx * 26} y2={cy} />
            <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 26} />
          </g>
        ))}

        {/* Plate heading inside the drafting frame — single line, left */}
        <g
          transform={`translate(${FRAME.x + 26}, ${FRAME.y + 34})`}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3.2}
          fontWeight={600}
        >
          <text fill={CREAM}>
            PL. III
            <tspan fill={DIM} fontWeight={500}>
              {"  ·  V. AMAZONICA  ·  PLAN & SECT. A–A"}
            </tspan>
          </text>
        </g>

        {/* ─── Pad fill (very subtle green disk underneath the ribs) ─── */}
        <circle
          cx={CX}
          cy={CY}
          r={R_RIM}
          fill="url(#pad-fill)"
          opacity={Math.min(1, primaryT * 1.4)}
        />

        {/* ─── Rim (upturned leaf edge) — double-line ──────────────── */}
        <circle
          cx={CX}
          cy={CY}
          r={R_RIM}
          fill="none"
          stroke={CREAM}
          strokeWidth={2}
          opacity={Math.min(1, primaryT * 1.4)}
          strokeDasharray={2 * Math.PI * R_RIM}
          strokeDashoffset={2 * Math.PI * R_RIM * (1 - Math.min(1, primaryT))}
          transform={`rotate(-90 ${CX} ${CY})`}
        />
        <circle
          cx={CX}
          cy={CY}
          r={R_RIM + 8}
          fill="none"
          stroke={CREAM}
          strokeWidth={1}
          opacity={0.55 * Math.min(1, primaryT * 1.4)}
          strokeDasharray="3 5"
        />

        {/* ─── Primary radial ribs ──────────────────────────────────── */}
        {primaries.map(({ i, a, delay }) => {
          const local = Math.max(0, (primaryT - delay * 0.75) / 0.25);
          const grow = Math.min(1, local);
          const eased = 1 - Math.pow(1 - grow, 3);
          const r2 = R_HUB + (R_RIM - R_HUB) * eased;
          const x1 = CX + Math.cos(a) * R_HUB;
          const y1 = CY + Math.sin(a) * R_HUB;
          const x2 = CX + Math.cos(a) * r2;
          const y2 = CY + Math.sin(a) * r2;
          const emphasised = i % 4 === 0;
          return (
            <g key={`rib-${i}`}>
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={CREAM}
                strokeWidth={emphasised ? 2.4 : 1.4}
                strokeLinecap="round"
                opacity={0.95}
                filter={emphasised ? "url(#rib-glow)" : undefined}
              />
            </g>
          );
        })}

        {/* ─── Transverse cross-ribs (concentric rings), drawn as cells ─── */}
        {ringRadii.map((r, idx) => {
          const delay = idx / RINGS.length;
          const local = Math.max(0, (ringsT - delay * 0.6) / 0.4);
          const grow = Math.min(1, local);
          const eased = 1 - Math.pow(1 - grow, 3);
          const perim = 2 * Math.PI * r;
          return (
            <circle
              key={`ring-${idx}`}
              cx={CX}
              cy={CY}
              r={r}
              fill="none"
              stroke={CREAM}
              strokeWidth={idx === RINGS.length - 1 ? 1.6 : 1}
              strokeOpacity={0.78}
              strokeDasharray={perim}
              strokeDashoffset={perim * (1 - eased)}
              transform={`rotate(${-90 + idx * 7} ${CX} ${CY})`}
            />
          );
        })}

        {/* ─── Secondary short arcs between neighbouring primaries, at the
             midpoint of each ring span. These subdivide each cell exactly
             as the real plant does. ─────────────────────────────────────── */}
        {ringsT > 0.35 &&
          ringRadii.slice(0, -1).map((r0, bandIdx) => {
            const r1 = ringRadii[bandIdx + 1];
            const rMid = (r0 + r1) / 2;
            const op = Math.min(1, (ringsT - 0.35) * 2.2) * 0.52;
            return (
              <g key={`sec-${bandIdx}`} opacity={op}>
                {Array.from({ length: PRIMARIES }, (_, k) => {
                  const a0 = (k / PRIMARIES) * Math.PI * 2 - Math.PI / 2;
                  const a1 = ((k + 1) / PRIMARIES) * Math.PI * 2 - Math.PI / 2;
                  const am = (a0 + a1) / 2;
                  const span = (a1 - a0) * 0.42;
                  const sx = CX + Math.cos(am - span) * rMid;
                  const sy = CY + Math.sin(am - span) * rMid;
                  const ex = CX + Math.cos(am + span) * rMid;
                  const ey = CY + Math.sin(am + span) * rMid;
                  return (
                    <path
                      key={k}
                      d={`M ${sx} ${sy} A ${rMid} ${rMid} 0 0 1 ${ex} ${ey}`}
                      fill="none"
                      stroke={CREAM_HI}
                      strokeWidth={0.7}
                    />
                  );
                })}
              </g>
            );
          })}

        {/* ─── Hub (petiole attachment point) ──────────────────────── */}
        <g opacity={Math.min(1, primaryT * 3)}>
          <circle cx={CX} cy={CY} r={R_HUB * 2.2} fill="url(#hub-glow)" />
          <circle
            cx={CX}
            cy={CY}
            r={R_HUB}
            fill={CRIMSON}
            stroke={CREAM_HI}
            strokeWidth={1.5}
          />
          <circle
            cx={CX}
            cy={CY}
            r={R_HUB * 0.55}
            fill={INK}
            stroke={CREAM}
            strokeWidth={0.8}
          />
        </g>

        {/* ─── Diameter dimension line ABOVE the plan ─────────────── */}
        <g opacity={annotT}>
          {(() => {
            const dy = CY - R_RIM - 36;
            return (
              <>
                <line
                  x1={CX - R_RIM - 36}
                  y1={dy}
                  x2={CX + R_RIM + 36}
                  y2={dy}
                  stroke={DIM}
                  strokeWidth={1}
                />
                <line
                  x1={CX - R_RIM}
                  y1={dy - 10}
                  x2={CX - R_RIM}
                  y2={dy + 10}
                  stroke={DIM}
                  strokeWidth={1}
                />
                <line
                  x1={CX + R_RIM}
                  y1={dy - 10}
                  x2={CX + R_RIM}
                  y2={dy + 10}
                  stroke={DIM}
                  strokeWidth={1}
                />
                <polygon
                  points={`${CX - R_RIM},${dy} ${CX - R_RIM + 8},${dy - 4} ${CX - R_RIM + 8},${dy + 4}`}
                  fill={DIM}
                />
                <polygon
                  points={`${CX + R_RIM},${dy} ${CX + R_RIM - 8},${dy - 4} ${CX + R_RIM - 8},${dy + 4}`}
                  fill={DIM}
                />
                <text
                  x={CX}
                  y={dy - 10}
                  textAnchor="middle"
                  fill={CREAM}
                  fontFamily={inter}
                  fontSize={12}
                  fontWeight={600}
                  letterSpacing={3}
                >
                  Ø 1.80 M
                </text>
              </>
            );
          })()}
        </g>

        {/* ─── Callout: PRIMARY RIB ────────────────────────────────── */}
        <g opacity={annotT}>
          {/* leader from a prominent primary rib */}
          <line
            x1={CX + Math.cos(-Math.PI / 2 + Math.PI / 6) * (R_RIM * 0.65)}
            y1={CY + Math.sin(-Math.PI / 2 + Math.PI / 6) * (R_RIM * 0.65)}
            x2={CX + R_RIM + 30}
            y2={CY - 110}
            stroke={CREAM}
            strokeWidth={0.9}
          />
          <line
            x1={CX + R_RIM + 30}
            y1={CY - 110}
            x2={CX + R_RIM + 110}
            y2={CY - 110}
            stroke={CREAM}
            strokeWidth={0.9}
          />
          <circle
            cx={CX + Math.cos(-Math.PI / 2 + Math.PI / 6) * (R_RIM * 0.65)}
            cy={CY + Math.sin(-Math.PI / 2 + Math.PI / 6) * (R_RIM * 0.65)}
            r={2.2}
            fill={CREAM_HI}
          />
          <text
            x={CX + R_RIM + 36}
            y={CY - 118}
            fill={CREAM}
            fontFamily={inter}
            fontSize={11}
            fontWeight={600}
            letterSpacing={2.8}
          >
            PRIMARY RIB
          </text>
          <text
            x={CX + R_RIM + 36}
            y={CY - 100}
            fill={DIM}
            fontFamily={inter}
            fontSize={10}
            fontWeight={500}
            letterSpacing={2}
          >
            air-filled girder
          </text>
        </g>

        {/* ─── Callout: CROSS-RIB ──────────────────────────────────── */}
        <g opacity={annotT}>
          <line
            x1={CX + Math.cos(Math.PI * 0.78) * (R_RIM * 0.62)}
            y1={CY + Math.sin(Math.PI * 0.78) * (R_RIM * 0.62)}
            x2={CX - R_RIM - 30}
            y2={CY + 100}
            stroke={CREAM}
            strokeWidth={0.9}
          />
          <line
            x1={CX - R_RIM - 30}
            y1={CY + 100}
            x2={CX - R_RIM - 110}
            y2={CY + 100}
            stroke={CREAM}
            strokeWidth={0.9}
          />
          <circle
            cx={CX + Math.cos(Math.PI * 0.78) * (R_RIM * 0.62)}
            cy={CY + Math.sin(Math.PI * 0.78) * (R_RIM * 0.62)}
            r={2.2}
            fill={CREAM_HI}
          />
          <text
            x={CX - R_RIM - 36}
            y={CY + 92}
            fill={CREAM}
            fontFamily={inter}
            fontSize={11}
            fontWeight={600}
            letterSpacing={2.8}
            textAnchor="end"
          >
            CROSS-RIB
          </text>
          <text
            x={CX - R_RIM - 36}
            y={CY + 110}
            fill={DIM}
            fontFamily={inter}
            fontSize={10}
            fontWeight={500}
            letterSpacing={2}
            textAnchor="end"
          >
            closes the cell
          </text>
        </g>

        {/* ─── Callout: HUB (petiole attachment). Leader runs straight down
             the plan's south meridian, then kinks right into the clear
             space below the rim where only the 1.80 M dim does NOT live. ── */}
        <g opacity={annotT}>
          <line
            x1={CX}
            y1={CY + R_HUB + 2}
            x2={CX}
            y2={CY + R_RIM + 24}
            stroke={CRIMSON}
            strokeWidth={1.1}
          />
          <line
            x1={CX}
            y1={CY + R_RIM + 24}
            x2={CX + 60}
            y2={CY + R_RIM + 24}
            stroke={CRIMSON}
            strokeWidth={1.1}
          />
          <text
            x={CX + 66}
            y={CY + R_RIM + 20}
            fill={CRIMSON}
            fontFamily={inter}
            fontSize={11}
            fontWeight={600}
            letterSpacing={2.6}
          >
            PETIOLE
          </text>
          <text
            x={CX + 66}
            y={CY + R_RIM + 34}
            fill={DIM}
            fontFamily={inter}
            fontSize={9}
            fontWeight={500}
            letterSpacing={1.8}
          >
            stem attachment
          </text>
        </g>

        {/* ─── Section line A–A across the plan ────────────────────── */}
        <g opacity={sectionT * 0.85}>
          <line
            x1={CX - R_RIM - 10}
            y1={CY}
            x2={CX + R_RIM + 10}
            y2={CY}
            stroke={CREAM_HI}
            strokeWidth={0.6}
            strokeDasharray="6 6"
          />
          <text
            x={CX - R_RIM - 22}
            y={CY + 4}
            fill={CREAM_HI}
            fontFamily={inter}
            fontSize={11}
            fontWeight={700}
            textAnchor="end"
            letterSpacing={2.6}
          >
            A
          </text>
          <text
            x={CX + R_RIM + 22}
            y={CY + 4}
            fill={CREAM_HI}
            fontFamily={inter}
            fontSize={11}
            fontWeight={700}
            letterSpacing={2.6}
          >
            A
          </text>
        </g>

        {/* ─── Cross-section strip (SECT A–A), bottom of drafting frame ─── */}
        <SectionAA sectionT={sectionT} breathe={breathe} />

        {/* ─── Crystal Palace echo, lower-right of drafting frame ──── */}
        <PalaceEcho palaceT={palaceT} />
      </svg>

      {/* ── Type lockup ───────────────────────────────────────────── */}
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
            color: CREAM,
            fontFamily: inter,
            fontSize: 13,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 18,
            fontWeight: 600,
          }}
        >
          Role <span style={{ color: DIM, margin: "0 4px" }}>/</span>
          <span style={{ color: "#EDEDEF", letterSpacing: 5 }}>Architect</span>
        </div>

        <div
          style={{
            color: "#F4F0E4",
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 80,
            lineHeight: 0.96,
            letterSpacing: -1.4,
            fontStyle: "italic",
          }}
        >
          The leaf that drew
          <br />
          the Crystal Palace.
        </div>

        <div
          style={{
            marginTop: 30,
            color: "#CDC9BE",
            fontFamily: inter,
            fontSize: 19,
            lineHeight: 1.4,
            fontWeight: 400,
            maxWidth: 880,
            opacity: hookOpacity,
          }}
        >
          A radial lattice of air-filled ribs under each 1.8 m pad lets{" "}
          <span style={{ color: CREAM, fontWeight: 600 }}>
            Victoria amazonica
          </span>{" "}
          float and carry ~45 kg of distributed load — the geometry Joseph
          Paxton named, in his 1850 lecture to the Royal Society of Arts, as
          the structural model for the Crystal Palace.
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
          color: DIM,
          fontFamily: inter,
          fontSize: 11,
          letterSpacing: 3,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Paxton · Lecture to the R.S.A. · 13 Nov 1850</span>
        <span>
          <span style={{ color: CRIMSON }}>●</span> Rib &nbsp;·&nbsp; cell
          &nbsp;·&nbsp; rim
        </span>
      </div>
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────────────────
// SECT A–A : a lateral slice through the leaf showing the air-filled ribs
// as a shallow pontoon / girder floating on the waterline.
// ─────────────────────────────────────────────────────────────────────────
const SectionAA: React.FC<{ sectionT: number; breathe: number }> = ({
  sectionT,
  breathe: _breathe,
}) => {
  // Section strip sits BELOW the plan, centred on the plan's horizontal axis.
  const span = R_RIM * 2;
  const left = CX - R_RIM;
  const right = CX + R_RIM;
  const yBase = CY + R_RIM + 76; // water line
  const domeRise = 22;
  const bodyBottom = yBase - 2;
  const dash = span + 200;
  const nRibs = 15;
  const op = sectionT;

  return (
    <g opacity={op}>
      {/* water line (dashed) */}
      <line
        x1={left - 36}
        y1={yBase}
        x2={right + 36}
        y2={yBase}
        stroke={CREAM_HI}
        strokeOpacity={0.4}
        strokeWidth={1}
        strokeDasharray="2 6"
      />
      {/* water hatching below */}
      {Array.from({ length: 26 }, (_, i) => {
        const x = left - 20 + i * ((span + 40) / 25);
        return (
          <line
            key={`w-${i}`}
            x1={x}
            y1={yBase + 8}
            x2={x - 10}
            y2={yBase + 18}
            stroke={CREAM}
            strokeOpacity={0.22}
            strokeWidth={0.8}
          />
        );
      })}
      {/* top skin — shallow dome */}
      <path
        d={`M ${left} ${bodyBottom - 10} Q ${CX} ${bodyBottom - domeRise - 10} ${right} ${bodyBottom - 10}`}
        fill="none"
        stroke={CREAM}
        strokeWidth={1.6}
        strokeDasharray={dash}
        strokeDashoffset={dash * (1 - sectionT)}
      />
      {/* upturned rim lips */}
      <path
        d={`M ${left} ${bodyBottom - 10} q -22 -4 -26 -26`}
        fill="none"
        stroke={CREAM}
        strokeWidth={1.6}
      />
      <path
        d={`M ${right} ${bodyBottom - 10} q 22 -4 26 -26`}
        fill="none"
        stroke={CREAM}
        strokeWidth={1.6}
      />
      {/* flat bottom skin resting on water */}
      <line
        x1={left}
        y1={bodyBottom}
        x2={right}
        y2={bodyBottom}
        stroke={CREAM}
        strokeWidth={1.6}
      />
      {/* vertical rib partitions inside the pontoon (echo of plan primaries) */}
      {Array.from({ length: nRibs }, (_, i) => {
        const f = (i + 1) / (nRibs + 1);
        const x = left + span * f;
        const topY =
          bodyBottom - 10 - domeRise * Math.sin(Math.PI * f);
        return (
          <line
            key={i}
            x1={x}
            y1={topY + 1}
            x2={x}
            y2={bodyBottom - 1}
            stroke={CREAM}
            strokeWidth={1}
            strokeOpacity={0.72}
          />
        );
      })}
      {/* a few crimson-tinted ribs to mark primaries */}
      {[3, 7, 11].map((i) => {
        const f = (i + 1) / (nRibs + 1);
        const x = left + span * f;
        const topY = bodyBottom - 10 - domeRise * Math.sin(Math.PI * f);
        return (
          <line
            key={`pri-${i}`}
            x1={x}
            y1={topY + 1}
            x2={x}
            y2={bodyBottom - 1}
            stroke={CRIMSON}
            strokeWidth={1.5}
            strokeOpacity={0.65}
          />
        );
      })}
      {/* trapped air glyphs — tiny circles in each cell */}
      {Array.from({ length: nRibs - 1 }, (_, i) => {
        const f = (i + 1.5) / (nRibs + 1);
        const x = left + span * f;
        const y = bodyBottom - domeRise * 0.4 - 3;
        return (
          <circle
            key={`b-${i}`}
            cx={x}
            cy={y}
            r={1.3}
            fill={CREAM_HI}
            opacity={0.75}
          />
        );
      })}

      {/* label */}
      <text
        x={left}
        y={yBase + 38}
        fill={CREAM}
        fontFamily={inter}
        fontSize={11}
        fontWeight={600}
        letterSpacing={3.2}
      >
        SECT. A–A · AIR-FILLED CANTILEVER
      </text>
      {/* "water" label at right */}
      <text
        x={right}
        y={yBase + 38}
        textAnchor="end"
        fill={DIM}
        fontFamily={inter}
        fontSize={10}
        fontWeight={500}
        letterSpacing={2.2}
      >
        waterline
      </text>

      {/* vertical dim ~8 cm on left */}
      <g stroke={DIM} strokeWidth={0.9} fill={DIM}>
        <line
          x1={left - 54}
          y1={bodyBottom - domeRise - 10}
          x2={left - 54}
          y2={bodyBottom}
        />
        <line
          x1={left - 58}
          y1={bodyBottom - domeRise - 10}
          x2={left - 50}
          y2={bodyBottom - domeRise - 10}
        />
        <line
          x1={left - 58}
          y1={bodyBottom}
          x2={left - 50}
          y2={bodyBottom}
        />
        <text
          x={left - 60}
          y={bodyBottom - domeRise / 2}
          fill={CREAM}
          fontFamily={inter}
          fontSize={10}
          fontWeight={600}
          letterSpacing={2.2}
          stroke="none"
          textAnchor="end"
        >
          8 CM
        </text>
      </g>
    </g>
  );
};

// ─────────────────────────────────────────────────────────────────────────
// A quietly-drawn Crystal Palace nave truss sitting to the right of the plan,
// so the viewer sees the geometric rhyme between the leaf's radial beams
// and Paxton's iron girder.
// ─────────────────────────────────────────────────────────────────────────
const PalaceEcho: React.FC<{ palaceT: number }> = ({ palaceT }) => {
  // Half-section elevation of a Crystal-Palace nave bay. We draw only the
  // right half of the arch so the straight hub-sided edge rhymes with the
  // leaf's radial beams on the left.
  const op = palaceT;
  if (op <= 0) return null;

  const cx = FRAME.x + 760; // springing of the arch (central column line)
  const cy = FRAME.y + 500; // floor line
  const H = 180; // column height (floor → springing)
  const RISE = 110; // vertical rise of the half-arch above springing
  const R = 140; // arch half-span (horizontal reach)

  // 9 rib radials from the springing — same count as the leaf's primary
  // ribs in a quarter sector would resolve to, so the geometric rhyme reads.
  const nTrusses = 9;

  // ellipse arch point at parameter f (0 at crown → 1 at springing)
  const arcPt = (f: number) => {
    // Draw the right half of a flattened semi-arch from crown (above cx) to
    // the column top (cx + R, cy - H). Use quarter-ellipse mapping.
    const theta = (f * Math.PI) / 2; // 0 → π/2
    const x = cx + Math.sin(theta) * R;
    const y = cy - H - Math.cos(theta) * RISE;
    return { x, y };
  };

  const crown = arcPt(0);
  const springing = arcPt(1);
  const floorRight = { x: cx + R, y: cy };

  // outer glazing arc as path
  const arcSteps = 24;
  const arcPts = Array.from({ length: arcSteps + 1 }, (_, i) =>
    arcPt(i / arcSteps),
  );
  const arcPath = `M ${arcPts[0].x} ${arcPts[0].y} ` +
    arcPts.slice(1).map((p) => `L ${p.x} ${p.y}`).join(" ");

  // inner glazing arc, offset inward (down + left)
  const innerArcPath =
    `M ${cx} ${crown.y + 8} ` +
    Array.from({ length: arcSteps + 1 }, (_, i) => {
      const f = i / arcSteps;
      const p = arcPt(f);
      const dx = Math.sin((f * Math.PI) / 2);
      const dy = Math.cos((f * Math.PI) / 2);
      return `L ${p.x - dx * 10} ${p.y + dy * 10}`;
    }).join(" ");

  return (
    <g opacity={op}>
      {/* heading sits above the arch crown so it does not sit on the
          crimson keystone node */}
      <text
        x={cx - 10}
        y={cy - H - RISE - 30}
        fill={CREAM}
        fontFamily={inter}
        fontSize={11}
        fontWeight={600}
        letterSpacing={3.2}
      >
        AFTER PAXTON · 1851
      </text>
      <text
        x={cx - 10}
        y={cy - H - RISE - 16}
        fill={DIM}
        fontFamily={inter}
        fontSize={10}
        fontWeight={500}
        letterSpacing={2.4}
      >
        crystal palace · half-bay elevation
      </text>

      {/* ground / floor line */}
      <line
        x1={cx - 20}
        y1={cy}
        x2={cx + R + 40}
        y2={cy}
        stroke={CREAM}
        strokeWidth={1.4}
      />
      {/* ground hatching below */}
      {Array.from({ length: 16 }, (_, i) => {
        const sx = cx - 20 + i * ((R + 60) / 15);
        return (
          <line
            key={`gh-${i}`}
            x1={sx}
            y1={cy + 3}
            x2={sx - 7}
            y2={cy + 11}
            stroke={CREAM}
            strokeOpacity={0.25}
            strokeWidth={0.7}
          />
        );
      })}

      {/* central column (the vertical mirror line that echoes the hub) */}
      <line
        x1={cx}
        y1={crown.y}
        x2={cx}
        y2={cy}
        stroke={CREAM}
        strokeWidth={1.8}
      />
      {/* outer column */}
      <line
        x1={floorRight.x}
        y1={springing.y}
        x2={floorRight.x}
        y2={cy}
        stroke={CREAM}
        strokeWidth={1.4}
      />

      {/* outer glazing arc */}
      <path
        d={arcPath}
        fill="none"
        stroke={CREAM}
        strokeWidth={1.6}
      />
      {/* inner glazing arc */}
      <path
        d={innerArcPath}
        fill="none"
        stroke={CREAM}
        strokeOpacity={0.5}
        strokeWidth={0.9}
      />
      {/* second inner line to suggest ridge-and-furrow depth */}
      <path
        d={arcPath}
        fill="none"
        stroke={CREAM_HI}
        strokeOpacity={0.3}
        strokeWidth={0.6}
        transform={`translate(-3 3)`}
      />

      {/* radial trusses from central column (springing+column top) out to
          each glazing bar on the arch — this is the direct rhyme with the
          leaf's primary ribs */}
      {Array.from({ length: nTrusses }, (_, i) => {
        const f = (i + 1) / (nTrusses + 1);
        const p = arcPt(f);
        return (
          <line
            key={`t-${i}`}
            x1={cx}
            y1={cy - H}
            x2={p.x}
            y2={p.y}
            stroke={CREAM}
            strokeOpacity={0.78}
            strokeWidth={1}
          />
        );
      })}

      {/* vertical glazing mullions down from each truss tip to the floor */}
      {Array.from({ length: nTrusses }, (_, i) => {
        const f = (i + 1) / (nTrusses + 1);
        const p = arcPt(f);
        return (
          <line
            key={`m-${i}`}
            x1={p.x}
            y1={p.y}
            x2={p.x}
            y2={cy}
            stroke={CREAM}
            strokeOpacity={0.35}
            strokeWidth={0.7}
          />
        );
      })}

      {/* horizontal glazing transom at mid-height */}
      <line
        x1={cx}
        y1={cy - H * 0.55}
        x2={floorRight.x}
        y2={cy - H * 0.55}
        stroke={CREAM}
        strokeOpacity={0.4}
        strokeWidth={0.7}
      />
      <line
        x1={cx}
        y1={cy - H * 0.25}
        x2={floorRight.x}
        y2={cy - H * 0.25}
        stroke={CREAM}
        strokeOpacity={0.4}
        strokeWidth={0.7}
      />

      {/* crown node — crimson, echoing the petiole */}
      <circle
        cx={cx}
        cy={crown.y}
        r={5}
        fill={CRIMSON}
        stroke={CREAM_HI}
        strokeWidth={1}
      />

      {/* height dim 23 M on the right */}
      <g stroke={DIM} strokeWidth={0.9} fill={DIM}>
        <line
          x1={floorRight.x + 28}
          y1={crown.y}
          x2={floorRight.x + 28}
          y2={cy}
        />
        <line
          x1={floorRight.x + 24}
          y1={crown.y}
          x2={floorRight.x + 32}
          y2={crown.y}
        />
        <line
          x1={floorRight.x + 24}
          y1={cy}
          x2={floorRight.x + 32}
          y2={cy}
        />
        <text
          x={floorRight.x + 36}
          y={(crown.y + cy) / 2 + 4}
          fill={CREAM}
          fontFamily={inter}
          fontSize={10}
          fontWeight={600}
          letterSpacing={2.2}
          stroke="none"
        >
          33 FT
        </text>
      </g>
    </g>
  );
};
