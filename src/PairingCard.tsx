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

// Palette (concept brief)
const SKY = "#0F1522";
const BOARD = "#141A28";
const PAPPUS = "#F6F2E6";
const PAPPUS_MID = "#D8CFBB";
const ACHENE = "#C9A066";
const GOLD = "#E8C972";
const SLATE = "#5B6B7E";
const GRID = "#1C2436";
const GRID_MAJOR = "#273048";

// ── Stage frame on the 1080 × 1350 page ──────────────────────────────────
const FRAME = { x: 60, y: 130, w: 960, h: 741 };

// Seed geometry (page coords)
const HUB = { x: 540, y: 700 }; // base of pappus / top of achene
const ACHENE_TIP = { x: 540, y: 828 };
const PAPPUS_RADIUS_INNER = 24;
const PAPPUS_RADIUS_OUTER = 184;
const PAPPUS_TOP_Y = 540; // visual top of the pappus

// Separated vortex ring (SVR) — torus-in-profile above the pappus
const SVR = { cx: 540, cy: 470, rx: 190, ry: 56 };

// Bristle fan — drawn as ~60 straight filaments; the hook annotates the real ~100
const BRISTLE_COUNT = 64;
// Fan angles measured from vertical (pointing straight up = 0 rad), covering
// nearly a full hemisphere plus a touch below.
const BRISTLE_ANGLE_SPAN = (Math.PI * 2) * 0.52; // ~187°

type Bristle = {
  theta: number; // angle from vertical
  len: number;
  side: 1 | -1;
  jitter: number;
};

const bristles: Bristle[] = Array.from({ length: BRISTLE_COUNT }, (_, i) => {
  const t = i / (BRISTLE_COUNT - 1);
  // Map 0..1 to -span/2..+span/2
  const theta = (t - 0.5) * BRISTLE_ANGLE_SPAN;
  // Length modulates slightly so the pappus has a soft outer edge
  const edge = Math.cos(theta * 0.9);
  const base = PAPPUS_RADIUS_OUTER;
  // deterministic pseudo-jitter so the fan isn't geometrically perfect
  const seed = Math.sin(i * 12.9898) * 43758.5453;
  const jitter = (seed - Math.floor(seed)) - 0.5;
  const len = base * (0.86 + 0.14 * edge) + jitter * 14;
  return {
    theta,
    len,
    side: theta >= 0 ? 1 : -1,
    jitter,
  };
});

// ── Streamlines ──────────────────────────────────────────────────────────
// Each streamline is a cubic that enters from the bottom of the stage,
// deflects outward around the pappus, and (for the inner ones) curls into
// the SVR torus. Rendered as dashed paths whose offset is animated to flow.
type Stream = {
  startX: number;
  turnX: number;
  topX: number;
  topY: number;
  dashLen: number;
};

const STREAMS: Stream[] = [
  // Deep left — passes well outside the pappus, deflects outward
  { startX: 125, turnX: 95, topX: 150, topY: 230, dashLen: 4 },
  { startX: 230, turnX: 195, topX: 240, topY: 280, dashLen: 4 },
  // Inner-left — curls up and into the left side of the SVR
  { startX: 350, turnX: 335, topX: SVR.cx - SVR.rx + 14, topY: SVR.cy + 2, dashLen: 4 },
  { startX: 455, turnX: 440, topX: SVR.cx - 72, topY: SVR.cy - SVR.ry + 8, dashLen: 4 },
  // Center — threads through the pappus into the top of the SVR
  { startX: 540, turnX: 540, topX: 540, topY: SVR.cy - SVR.ry - 10, dashLen: 4 },
  // Inner-right
  { startX: 625, turnX: 640, topX: SVR.cx + 72, topY: SVR.cy - SVR.ry + 8, dashLen: 4 },
  { startX: 730, turnX: 745, topX: SVR.cx + SVR.rx - 14, topY: SVR.cy + 2, dashLen: 4 },
  // Deep right
  { startX: 850, turnX: 885, topX: 840, topY: 280, dashLen: 4 },
  { startX: 955, turnX: 985, topX: 930, topY: 230, dashLen: 4 },
];

const streamPath = (s: Stream): string => {
  // Bottom of the stage frame
  const y0 = FRAME.y + FRAME.h - 10;
  // Control points for a smooth S that leans around the pappus,
  // then curves toward the SVR termination point.
  const c1y = HUB.y + 10; // lower control
  const c2y = PAPPUS_TOP_Y - 10; // upper control (near the top of the pappus)
  return (
    `M ${s.startX} ${y0} ` +
    `C ${s.turnX} ${c1y}, ${s.turnX} ${c2y}, ${s.topX} ${s.topY}`
  );
};

// Approximate path length used to drive dashoffset flow.
const streamLen = (s: Stream): number => {
  const y0 = FRAME.y + FRAME.h - 10;
  // rough chord sum
  const d1 = Math.hypot(s.turnX - s.startX, HUB.y + 10 - y0);
  const d2 = Math.hypot(0, PAPPUS_TOP_Y - 10 - (HUB.y + 10));
  const d3 = Math.hypot(s.topX - s.turnX, s.topY - (PAPPUS_TOP_Y - 10));
  return d1 + d2 + d3;
};

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ── Timing ──────────────────────────────────────────────────────────
  const seedSpring = spring({
    frame: frame - fps * 0.1,
    fps,
    config: { damping: 200, mass: 1.2 },
  });

  // Bristles unfurl after the seed arrives
  const bristleReveal = interpolate(
    frame,
    [fps * 0.4, fps * 1.6],
    [0, 1],
    { easing: Easing.out(Easing.cubic), extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Streamlines come in after the pappus is visible
  const streamReveal = interpolate(
    frame,
    [fps * 1.4, fps * 2.4],
    [0, 1],
    { easing: Easing.out(Easing.cubic), extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // SVR traces itself in after streamlines
  const svrReveal = interpolate(
    frame,
    [fps * 2.2, fps * 3.4],
    [0, 1],
    { easing: Easing.out(Easing.cubic), extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // SVR "breath" — a gentle radial pulse (~5s loop)
  const breathPhase = ((frame % (fps * 5)) / (fps * 5)) * Math.PI * 2;
  const breath = 1 + Math.sin(breathPhase) * 0.012;

  // Continuous dash offset to make streamlines flow upward
  const flowPhase = (frame / (fps * 2.2)) % 1; // 0..1

  // Type animations
  const roleTag = spring({
    frame: frame - fps * 1.4,
    fps,
    config: { damping: 220, mass: 0.8 },
  });
  const titleSpring = spring({
    frame: frame - fps * 1.7,
    fps,
    config: { damping: 220, mass: 0.9 },
  });
  const hookOpacity = interpolate(
    frame,
    [fps * 2.3, fps * 3.3],
    [0, 1],
    { easing: Easing.out(Easing.cubic), extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Seed vertical drift-in (lands at y=0 offset)
  const seedDriftY = interpolate(seedSpring, [0, 1], [-30, 0]);
  const seedOpacity = seedSpring;

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <AbsoluteFill style={{ backgroundColor: SKY, fontFamily: inter }}>
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
          color: SLATE,
          fontFamily: inter,
          fontSize: 13,
          letterSpacing: 4.5,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Everyday Motivation · No. 003</span>
        <span style={{ color: GOLD }}>2026 · 10 · 31</span>
      </div>

      {/* Drafting board + diagram */}
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
            <path d={`M 192 0 L 0 0 0 192`} fill="none" stroke={GRID_MAJOR} strokeWidth={1} />
          </pattern>

          <radialGradient id="board-vignette" cx="50%" cy="40%" r="80%">
            <stop offset="0%" stopColor="#1A2135" stopOpacity={1} />
            <stop offset="100%" stopColor={BOARD} stopOpacity={1} />
          </radialGradient>

          <radialGradient id="achene-grad" cx="50%" cy="35%" r="70%">
            <stop offset="0%" stopColor="#E6C286" stopOpacity={1} />
            <stop offset="60%" stopColor={ACHENE} stopOpacity={1} />
            <stop offset="100%" stopColor="#7E5F31" stopOpacity={1} />
          </radialGradient>

          <radialGradient id="hub-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={PAPPUS} stopOpacity={0.9} />
            <stop offset="60%" stopColor={PAPPUS_MID} stopOpacity={0.35} />
            <stop offset="100%" stopColor={PAPPUS_MID} stopOpacity={0} />
          </radialGradient>

          <filter id="soft-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3.4" />
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
        <rect x={FRAME.x} y={FRAME.y} width={FRAME.w} height={FRAME.h} fill="url(#grid)" />
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
          stroke="#2E3650"
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
          <g key={i} stroke={GOLD} strokeWidth={1.5} fill="none">
            <line x1={cx} y1={cy} x2={cx + sx * 26} y2={cy} />
            <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 26} />
          </g>
        ))}

        {/* Up-arrow (wind direction) at the bottom of the stage */}
        <g
          transform={`translate(${FRAME.x + 28}, ${FRAME.y + FRAME.h - 28})`}
          fill={SLATE}
          fontFamily={inter}
          fontWeight={600}
          fontSize={11}
          letterSpacing={3}
        >
          <text x={16} y={6} stroke="none" fill={SLATE}>
            WIND
          </text>
          <line x1={6} y1={-16} x2={6} y2={-2} stroke={SLATE} strokeWidth={1.2} />
          <polygon points="2,-10 6,-18 10,-10" fill={GOLD} />
        </g>

        {/* Scale strip: Reynolds number legend */}
        <g
          transform={`translate(${FRAME.x + FRAME.w - 220}, ${FRAME.y + FRAME.h - 28})`}
          stroke={SLATE}
          fill={SLATE}
          fontFamily={inter}
          fontSize={10}
          letterSpacing={3}
          fontWeight={500}
        >
          <line x1={0} y1={0} x2={120} y2={0} strokeWidth={1.2} />
          <line x1={0} y1={-5} x2={0} y2={5} strokeWidth={1.2} />
          <line x1={60} y1={-3} x2={60} y2={3} strokeWidth={1.2} />
          <line x1={120} y1={-5} x2={120} y2={5} strokeWidth={1.2} />
          <text x={130} y={4} stroke="none" fill={SLATE}>
            Re ≈ 10
          </text>
        </g>

        {/* ── Streamlines ────────────────────────────────────────── */}
        <g opacity={streamReveal}>
          {/* First pass: a soft continuous base line, dim */}
          {STREAMS.map((s, i) => (
            <path
              key={`sl-base-${i}`}
              d={streamPath(s)}
              stroke={SLATE}
              strokeOpacity={0.22}
              strokeWidth={1}
              fill="none"
              strokeLinecap="round"
            />
          ))}
          {/* Second pass: short dashed overlay that flows upward */}
          {STREAMS.map((s, i) => {
            const dash = s.dashLen;
            const offset = -flowPhase * (dash + 6);
            return (
              <path
                key={`sl-${i}`}
                d={streamPath(s)}
                stroke={PAPPUS_MID}
                strokeOpacity={0.55}
                strokeWidth={1.1}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${dash} 6`}
                strokeDashoffset={offset}
              />
            );
          })}
          {/* Tiny arrowheads at the top */}
          {STREAMS.map((s, i) => {
            const dx = s.topX - s.turnX;
            const dy = s.topY - (PAPPUS_TOP_Y - 10);
            const ang = Math.atan2(dy, dx);
            return (
              <polygon
                key={`sl-h-${i}`}
                points={`-6,-3 0,0 -6,3`}
                transform={`translate(${s.topX}, ${s.topY}) rotate(${(ang * 180) / Math.PI})`}
                fill={PAPPUS_MID}
                opacity={0.75}
              />
            );
          })}
        </g>

        {/* ── Separated Vortex Ring (SVR) ────────────────────────── */}
        <g
          transform={`translate(${SVR.cx} ${SVR.cy}) scale(${breath}) translate(${-SVR.cx} ${-SVR.cy})`}
          opacity={svrReveal}
        >
          {/* Outer soft glow */}
          <ellipse
            cx={SVR.cx}
            cy={SVR.cy}
            rx={SVR.rx + 10}
            ry={SVR.ry + 10}
            fill="none"
            stroke={PAPPUS}
            strokeOpacity={0.09}
            strokeWidth={14}
            filter="url(#soft-glow)"
          />
          {/* Outer torus edge */}
          <ellipse
            cx={SVR.cx}
            cy={SVR.cy}
            rx={SVR.rx}
            ry={SVR.ry}
            fill="none"
            stroke={PAPPUS}
            strokeOpacity={0.55}
            strokeWidth={1.4}
          />
          {/* Inner torus edge */}
          <ellipse
            cx={SVR.cx}
            cy={SVR.cy}
            rx={SVR.rx - 60}
            ry={SVR.ry - 22}
            fill="none"
            stroke={PAPPUS_MID}
            strokeOpacity={0.55}
            strokeWidth={1.1}
          />
          {/* Flow arrows around the torus profile */}
          {Array.from({ length: 10 }).map((_, i) => {
            const a = (i / 10) * Math.PI * 2 + flowPhase * Math.PI * 2;
            const r1x = SVR.rx - 30;
            const r1y = SVR.ry - 11;
            const px = SVR.cx + Math.cos(a) * r1x;
            const py = SVR.cy + Math.sin(a) * r1y;
            // tangent direction
            const tx = -Math.sin(a) * r1x;
            const ty = Math.cos(a) * r1y;
            const ang = Math.atan2(ty, tx);
            return (
              <polygon
                key={`vp-${i}`}
                points={`-5,-2 0,0 -5,2`}
                transform={`translate(${px}, ${py}) rotate(${(ang * 180) / Math.PI})`}
                fill={PAPPUS}
                opacity={0.75}
              />
            );
          })}
          {/* SVR label */}
          <text
            x={SVR.cx + SVR.rx + 16}
            y={SVR.cy - SVR.ry - 6}
            fill={PAPPUS}
            fontFamily={inter}
            fontSize={11}
            fontWeight={600}
            letterSpacing={3.6}
          >
            SVR
          </text>
          <text
            x={SVR.cx + SVR.rx + 16}
            y={SVR.cy - SVR.ry + 12}
            fill={SLATE}
            fontFamily={inter}
            fontSize={10}
            fontWeight={500}
            letterSpacing={2.4}
          >
            SEPARATED VORTEX RING
          </text>
        </g>

        {/* ── Seed assembly (bristles + achene) ────────────────── */}
        <g
          opacity={seedOpacity}
          transform={`translate(0, ${seedDriftY})`}
        >
          {/* Hub glow behind bristles — subtle */}
          <circle cx={HUB.x} cy={HUB.y} r={46} fill="url(#hub-glow)" opacity={0.55} />

          {/* Bristles */}
          {bristles.map((b, i) => {
            const unfurl = Math.max(0, Math.min(1, bristleReveal * 1.1 - i * 0.004));
            const eased = 1 - Math.pow(1 - unfurl, 3);
            const grown = b.len * eased;
            const ex = HUB.x + Math.sin(b.theta) * grown;
            const ey = HUB.y - Math.cos(b.theta) * grown;
            // Inner base — slightly offset from the hub so bristles look rooted
            const bx = HUB.x + Math.sin(b.theta) * PAPPUS_RADIUS_INNER;
            const by = HUB.y - Math.cos(b.theta) * PAPPUS_RADIUS_INNER;

            // Edge bristles slightly dimmer; central bristles brightest
            const centrality = 1 - Math.abs(b.theta) / (BRISTLE_ANGLE_SPAN / 2);
            const stroke = centrality > 0.55 ? PAPPUS : PAPPUS_MID;
            const opacity = 0.6 + 0.35 * centrality;

            return (
              <g key={`br-${i}`}>
                <line
                  x1={bx}
                  y1={by}
                  x2={ex}
                  y2={ey}
                  stroke={stroke}
                  strokeOpacity={opacity}
                  strokeWidth={0.9}
                  strokeLinecap="round"
                />
                {/* Tip barbule (tiny plume) */}
                {eased > 0.9 && (
                  <circle
                    cx={ex}
                    cy={ey}
                    r={1.2}
                    fill={stroke}
                    opacity={opacity * 0.9}
                  />
                )}
              </g>
            );
          })}

          {/* Highlighted bristle (callout target) — brighter and thicker */}
          {(() => {
            const b = bristles[Math.floor(BRISTLE_COUNT * 0.78)];
            const unfurl = Math.min(1, Math.max(0, bristleReveal * 1.1));
            const eased = 1 - Math.pow(1 - unfurl, 3);
            const grown = b.len * eased;
            const ex = HUB.x + Math.sin(b.theta) * grown;
            const ey = HUB.y - Math.cos(b.theta) * grown;
            const bx = HUB.x + Math.sin(b.theta) * PAPPUS_RADIUS_INNER;
            const by = HUB.y - Math.cos(b.theta) * PAPPUS_RADIUS_INNER;
            return (
              <line
                x1={bx}
                y1={by}
                x2={ex}
                y2={ey}
                stroke={GOLD}
                strokeOpacity={0.95}
                strokeWidth={1.4}
                strokeLinecap="round"
              />
            );
          })()}

          {/* Beak (slender stem between achene and pappus hub) */}
          <line
            x1={HUB.x}
            y1={HUB.y + 2}
            x2={HUB.x}
            y2={HUB.y + 46}
            stroke={ACHENE}
            strokeWidth={1.8}
            opacity={seedOpacity}
          />

          {/* Achene (seed body) — a slender ribbed spindle */}
          <g opacity={seedOpacity}>
            <path
              d={`
                M ${HUB.x} ${HUB.y + 46}
                C ${HUB.x - 14} ${HUB.y + 64}, ${HUB.x - 14} ${ACHENE_TIP.y - 26}, ${HUB.x} ${ACHENE_TIP.y}
                C ${HUB.x + 14} ${ACHENE_TIP.y - 26}, ${HUB.x + 14} ${HUB.y + 64}, ${HUB.x} ${HUB.y + 46}
                Z
              `}
              fill="url(#achene-grad)"
              stroke="#5B4423"
              strokeWidth={0.8}
            />
            {/* Fine ribs on achene */}
            {[-7, -3.5, 0, 3.5, 7].map((dx, i) => (
              <line
                key={`rib-${i}`}
                x1={HUB.x + dx * 0.65}
                y1={HUB.y + 56}
                x2={HUB.x + dx * 0.3}
                y2={ACHENE_TIP.y - 8}
                stroke="#5B4423"
                strokeOpacity={0.4}
                strokeWidth={0.6}
              />
            ))}
            {/* Tiny barbed tip */}
            <polygon
              points={`${HUB.x - 3},${ACHENE_TIP.y - 2} ${HUB.x + 3},${ACHENE_TIP.y - 2} ${HUB.x},${ACHENE_TIP.y + 8}`}
              fill="#5B4423"
            />
          </g>
        </g>

        {/* ── Callouts ─────────────────────────────────────────────── */}
        {/* Left callout: POROSITY 0.916 */}
        <g opacity={interpolate(frame, [fps * 2.6, fps * 3.6], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })}>
          <line
            x1={160}
            y1={610}
            x2={360}
            y2={660}
            stroke={PAPPUS_MID}
            strokeOpacity={0.6}
            strokeWidth={1}
          />
          <circle cx={360} cy={660} r={3} fill={PAPPUS} />
          <text
            x={160}
            y={596}
            fill={SLATE}
            fontFamily={inter}
            fontSize={11}
            fontWeight={500}
            letterSpacing={3}
          >
            POROSITY
          </text>
          <text
            x={160}
            y={624}
            fill={PAPPUS}
            fontFamily={inter}
            fontSize={28}
            fontWeight={600}
            letterSpacing={0.5}
          >
            0.916
          </text>
        </g>

        {/* Right callout: ~100 BRISTLES */}
        <g opacity={interpolate(frame, [fps * 2.8, fps * 3.8], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })}>
          {(() => {
            const b = bristles[Math.floor(BRISTLE_COUNT * 0.78)];
            const grown = b.len;
            const ex = HUB.x + Math.sin(b.theta) * grown;
            const ey = HUB.y - Math.cos(b.theta) * grown;
            return (
              <>
                <line
                  x1={ex}
                  y1={ey}
                  x2={920}
                  y2={ey - 50}
                  stroke={GOLD}
                  strokeOpacity={0.7}
                  strokeWidth={1}
                />
                <line
                  x1={920}
                  y1={ey - 50}
                  x2={990}
                  y2={ey - 50}
                  stroke={GOLD}
                  strokeOpacity={0.7}
                  strokeWidth={1}
                />
                <circle cx={ex} cy={ey} r={3} fill={GOLD} />
                <text
                  x={990}
                  y={ey - 72}
                  textAnchor="end"
                  fill={SLATE}
                  fontFamily={inter}
                  fontSize={11}
                  fontWeight={500}
                  letterSpacing={3}
                >
                  BRISTLES
                </text>
                <text
                  x={990}
                  y={ey - 44}
                  textAnchor="end"
                  fill={PAPPUS}
                  fontFamily={inter}
                  fontSize={28}
                  fontWeight={600}
                  letterSpacing={0.5}
                >
                  ~100
                </text>
              </>
            );
          })()}
        </g>

        {/* Upper-left callout: 4× DRAG OF SOLID DISC — points to the top of the SVR */}
        <g opacity={interpolate(frame, [fps * 3.0, fps * 4.0], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })}>
          <line
            x1={SVR.cx - 60}
            y1={SVR.cy - SVR.ry - 2}
            x2={200}
            y2={SVR.cy - SVR.ry - 70}
            stroke={GOLD}
            strokeOpacity={0.6}
            strokeWidth={1}
          />
          <line
            x1={200}
            y1={SVR.cy - SVR.ry - 70}
            x2={120}
            y2={SVR.cy - SVR.ry - 70}
            stroke={GOLD}
            strokeOpacity={0.6}
            strokeWidth={1}
          />
          <circle cx={SVR.cx - 60} cy={SVR.cy - SVR.ry - 2} r={3} fill={GOLD} />
          <text
            x={120}
            y={SVR.cy - SVR.ry - 86}
            fill={SLATE}
            fontFamily={inter}
            fontSize={11}
            fontWeight={500}
            letterSpacing={3}
          >
            DRAG VS SOLID DISC
          </text>
          <text
            x={120}
            y={SVR.cy - SVR.ry - 58}
            fill={GOLD}
            fontFamily={inter}
            fontSize={28}
            fontWeight={600}
            letterSpacing={0.5}
          >
            4×
          </text>
        </g>

        {/* Caption strip below the drafting frame */}
        <g
          transform={`translate(${FRAME.x}, ${FRAME.y + FRAME.h + 22})`}
          fill={SLATE}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
        >
          <text>FIG. 1 · PAPPUS WAKE OBSERVED IN A VERTICAL WIND TUNNEL</text>
          <text x={FRAME.w} textAnchor="end" fill={GOLD} opacity={0.9}>
            TAXON · TARAXACUM OFFICINALE
          </text>
        </g>
      </svg>

      {/* ── Type lockup ────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 915,
          opacity: titleSpring,
          transform: `translateY(${interpolate(titleSpring, [0, 1], [16, 0])}px)`,
        }}
      >
        <div
          style={{
            color: GOLD,
            fontFamily: inter,
            fontSize: 13,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 18,
            fontWeight: 600,
            opacity: roleTag,
          }}
        >
          Role <span style={{ color: SLATE, margin: "0 4px" }}>/</span>
          <span style={{ color: "#F2EEE2", letterSpacing: 5 }}>Aerospace Engineer</span>
        </div>

        <div
          style={{
            color: "#F4F0E4",
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 86,
            lineHeight: 0.96,
            letterSpacing: -1.4,
            fontStyle: "italic",
          }}
        >
          The parachute
          <br />
          that leaks.
        </div>

        <div
          style={{
            marginTop: 30,
            color: "#C7CBD4",
            fontFamily: inter,
            fontSize: 19,
            lineHeight: 1.42,
            fontWeight: 400,
            maxWidth: 880,
            opacity: hookOpacity,
          }}
        >
          A dandelion seed drifts for kilometres because its pappus — roughly{" "}
          <span style={{ color: PAPPUS, fontWeight: 600 }}>100 bristles</span>{" "}
          with a porosity of{" "}
          <span style={{ color: PAPPUS, fontWeight: 600 }}>0.916</span> — lets most
          of the air pass through and, in doing so, pins a stable{" "}
          <span style={{ color: GOLD, fontWeight: 600 }}>separated vortex ring</span>{" "}
          above the seed that gives it four times the drag of a solid disc.
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
          color: SLATE,
          fontFamily: inter,
          fontSize: 11,
          letterSpacing: 3,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Cummins et al. · Nature 562 (2018) 414–418</span>
        <span>
          <span style={{ color: GOLD }}>●</span> Pappus = Aerodynamic lab
        </span>
      </div>
    </AbsoluteFill>
  );
};
