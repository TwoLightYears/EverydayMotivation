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
const PAPER = "#08192B";
const PAPER_MID = "#12304F";
const IVORY = "#F5EBD8";
const PEARL = "#E9D9A2";
const RUST = "#B54B2C";
const GRID = "#0E2340";
const GRID_MAJOR = "#153556";
const MUTED = "#6A85A0";

// ── Nautilus geometry (drawn in local coord space, translated inside the frame) ──
const CX = 555;
const CY = 500;
const A = 320; // outer radius at aperture
const B = 0.185; // growth rate (~ 3.2× per full turn)
const TURNS = 2.35;
const THETA_MAX = Math.PI / 5.5; // aperture below-right
const THETA_MIN = THETA_MAX - TURNS * 2 * Math.PI;
const CHAMBER_STEP = Math.PI / 9; // 20° per chamber → ~42 chambers, we'll show top ~28

const radiusAt = (theta: number): number =>
  A * Math.exp(B * (theta - THETA_MAX));

const spiralPoint = (theta: number, radiusScale = 1) => {
  const r = radiusAt(theta) * radiusScale;
  return {
    x: CX + r * Math.cos(theta),
    y: CY + r * Math.sin(theta),
    r,
  };
};

// Inner wall = the outer wall of the previous whorl, i.e. r(θ - 2π) = r(θ) / e^(2πB)
const INNER_RATIO = Math.exp(-2 * Math.PI * B); // ~0.312 for B=0.185

const chamberAngles = (): number[] => {
  const out: number[] = [];
  for (let theta = THETA_MAX; theta >= THETA_MIN; theta -= CHAMBER_STEP) {
    out.push(theta);
  }
  return out;
};

const SEPTA = chamberAngles();

// Sample a spiral arc between two angles at radiusScale (1 = outer, INNER_RATIO = inner)
const spiralArcPath = (
  thetaA: number,
  thetaB: number,
  radiusScale: number,
  steps = 14,
): string => {
  const parts: string[] = [];
  const start = spiralPoint(thetaA, radiusScale);
  parts.push(`M ${start.x.toFixed(2)} ${start.y.toFixed(2)}`);
  for (let i = 1; i <= steps; i++) {
    const t = thetaA + ((thetaB - thetaA) * i) / steps;
    const p = spiralPoint(t, radiusScale);
    parts.push(`L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`);
  }
  return parts.join(" ");
};

// Full spiral polyline (used for outer wall reveal)
const fullSpiralPath = (
  radiusScale: number,
  thetaStart: number,
  thetaEnd: number,
  stepsPerRad = 40,
): string => {
  const total = Math.abs(thetaEnd - thetaStart);
  const steps = Math.max(60, Math.round(total * stepsPerRad));
  const parts: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = thetaStart + ((thetaEnd - thetaStart) * i) / steps;
    const p = spiralPoint(t, radiusScale);
    parts.push(`${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`);
  }
  return parts.join(" ");
};

// A single chamber shape (closed polygon on the coil plane)
const chamberPath = (thetaOuter: number, thetaInner: number): string => {
  const outer = spiralArcPath(thetaOuter, thetaInner, 1, 12);
  // From outer end, drop radially to the inner spiral (a "septum" edge)
  const innerEnd = spiralPoint(thetaInner, INNER_RATIO);
  const innerBack = spiralArcPath(thetaInner, thetaOuter, INNER_RATIO, 12)
    .replace(/^M [^ ]+ [^ ]+/, "L " + innerEnd.x.toFixed(2) + " " + innerEnd.y.toFixed(2));
  return `${outer} ${innerBack} Z`;
};

// The living aperture end-cap (front of the shell)
const aperturePath = (): string => {
  const outer = spiralPoint(THETA_MAX, 1);
  const inner = spiralPoint(THETA_MAX, INNER_RATIO);
  return `M ${outer.x.toFixed(2)} ${outer.y.toFixed(
    2,
  )} L ${inner.x.toFixed(2)} ${inner.y.toFixed(2)}`;
};

// Siphuncle — a fine tube running through the septa, near the ventral (outer-of-coil) side.
// Sample midway along each septum, biased outward (near outer wall).
const siphunclePath = (): string => {
  const bias = 0.86; // 1 = outer wall, INNER_RATIO = inner wall
  const parts: string[] = [];
  // Trace from INNER (protoconch) OUTWARD to the aperture so the reveal
  // marches in step with the chambers, which also build inner → outer.
  const thetaStart = THETA_MIN + 0.05;
  const thetaEnd = THETA_MAX;
  const total = Math.abs(thetaEnd - thetaStart);
  const N = Math.max(80, Math.round(total * 30));
  for (let i = 0; i <= N; i++) {
    const t = thetaStart + ((thetaEnd - thetaStart) * i) / N;
    const p = spiralPoint(t, bias);
    parts.push(`${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`);
  }
  return parts.join(" ");
};

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Layout — drafting frame
  const FRAME = { x: 60, y: 120, w: 960, h: 780 };

  // ── Animation timings ─────────────────────────────────────────────
  const buildSpan = fps * 3.4; // seconds to grow the spiral
  // "Build outward": innermost chamber appears first, outermost last
  // We iterate SEPTA from innermost to outermost by walking i from last chamber down to 0.
  const totalChambers = SEPTA.length - 1;

  const titleSpring = spring({
    frame: frame - fps * 0.5,
    fps,
    config: { damping: 200, mass: 0.9 },
  });
  const hookOpacity = interpolate(frame, [fps * 1.4, fps * 2.4], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Depth marker eases from 0 m → 400 m over the same span, then holds
  const depthT = interpolate(frame, [0, buildSpan], [0, 1], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const depthM = Math.round(depthT * 400);
  const pressureAtm = 1 + Math.round(depthT * 40);

  // Chamber reveal — inner → outer.
  // `alive` = number of fully-built chambers (counted from innermost).
  // `freshI` = index (in SEPTA/chamber space, 0 = outermost) of the chamber currently filling.
  // Alive chambers occupy i ∈ [totalChambers - alive, totalChambers - 1].
  // The fresh chamber sits directly outside them at i = totalChambers - alive - 1.
  const revealState = () => {
    const t = Math.max(0, Math.min(1, frame / buildSpan));
    const scaled = t * totalChambers;
    const alive = Math.min(totalChambers, Math.floor(scaled));
    const freshFrac = Math.max(0, Math.min(1, scaled - alive));
    const freshI = totalChambers - alive - 1;
    return { alive, freshI, freshFrac };
  };
  const { alive, freshI, freshFrac } = revealState();
  const showFresh = freshI >= 0 && freshFrac > 0;
  // Outer boundary index — the SEPTA index that forms the current outermost visible edge.
  const outerEdgeIdx = showFresh ? freshI : totalChambers - alive;

  return (
    <AbsoluteFill style={{ backgroundColor: PAPER, fontFamily: inter }}>
      <style>{fontCss}</style>

      {/* ── Metadata band ─────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          top: 56,
          left: 80,
          right: 80,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          color: MUTED,
          fontFamily: inter,
          fontSize: 13,
          letterSpacing: 4.5,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Everyday Motivation · No. 003</span>
        <span style={{ color: PEARL }}>2026 · 07 · 27</span>
      </div>

      {/* ── SVG canvas ─────────────────────────────────────────────── */}
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
              stroke={GRID}
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
              stroke={GRID_MAJOR}
              strokeWidth={1}
            />
          </pattern>

          <radialGradient id="board-vignette" cx="55%" cy="45%" r="75%">
            <stop offset="0%" stopColor="#0C2036" stopOpacity={1} />
            <stop offset="100%" stopColor={PAPER} stopOpacity={1} />
          </radialGradient>

          <radialGradient id="chamber-fill" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor={PEARL} stopOpacity={0.16} />
            <stop offset="100%" stopColor={PEARL} stopOpacity={0.04} />
          </radialGradient>

          <radialGradient id="chamber-fresh" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor={PEARL} stopOpacity={0.55} />
            <stop offset="100%" stopColor={PEARL} stopOpacity={0.12} />
          </radialGradient>

          <filter id="ivory-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Drafting board bg */}
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
          stroke={PAPER_MID}
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
          <g key={i} stroke={PEARL} strokeWidth={1.5} fill="none">
            <line x1={cx} y1={cy} x2={cx + sx * 26} y2={cy} />
            <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 26} />
          </g>
        ))}

        {/* ── Depth / pressure scale (left column) ───────────────── */}
        <g transform={`translate(${FRAME.x + 30}, ${FRAME.y + 40})`}>
          <text
            fill={MUTED}
            fontFamily={inter}
            fontSize={10}
            letterSpacing={2.6}
            fontWeight={600}
          >
            DEPTH
          </text>
          <text
            x={90}
            fill={MUTED}
            fontFamily={inter}
            fontSize={10}
            letterSpacing={2.6}
            fontWeight={600}
          >
            PRESS.
          </text>
          {[0, 100, 200, 300, 400].map((d, i) => {
            const y = 34 + (i * 700) / 4;
            const atm = 1 + d / 10;
            return (
              <g key={d} transform={`translate(0, ${y})`}>
                <line
                  x1={-4}
                  y1={0}
                  x2={140}
                  y2={0}
                  stroke={PAPER_MID}
                  strokeWidth={1}
                />
                <text
                  fill={PEARL}
                  fontFamily={inter}
                  fontSize={12}
                  fontWeight={500}
                  y={-6}
                >
                  {d} m
                </text>
                <text
                  x={90}
                  fill={PEARL}
                  fontFamily={inter}
                  fontSize={12}
                  fontWeight={500}
                  y={-6}
                >
                  {atm} atm
                </text>
              </g>
            );
          })}
          {/* Moving depth marker — rust rule + arrowhead, riding across the scale */}
          <g transform={`translate(-6, ${34 + depthT * 700})`}>
            <line
              x1={0}
              y1={0}
              x2={150}
              y2={0}
              stroke={RUST}
              strokeWidth={1.2}
              opacity={0.9}
            />
            <polygon points="0,0 -11,-6 -11,6" fill={RUST} />
          </g>
        </g>

        {/* ── Chambers (built inner → outer) ─────────────────────── */}
        <g>
          {/* Faint outer envelope guide (whole shell), drawn very lightly at start */}
          <path
            d={fullSpiralPath(1, THETA_MAX, THETA_MIN)}
            stroke={PAPER_MID}
            strokeWidth={0.8}
            fill="none"
            opacity={0.35}
          />
          <path
            d={fullSpiralPath(INNER_RATIO, THETA_MAX, THETA_MIN)}
            stroke={PAPER_MID}
            strokeWidth={0.6}
            fill="none"
            opacity={0.22}
          />

          {/* Chamber fills — inner → outer */}
          {SEPTA.slice(0, -1).map((thetaOuter, i) => {
            const thetaInner = SEPTA[i + 1];
            const isAlive = i >= totalChambers - alive;
            const isFresh = showFresh && i === freshI;
            if (!isAlive && !isFresh) return null;
            const path = chamberPath(thetaOuter, thetaInner);
            const freshGlow = isFresh ? 1 - freshFrac : 0;
            return (
              <path
                key={`ch-${i}`}
                d={path}
                fill={isFresh ? "url(#chamber-fresh)" : "url(#chamber-fill)"}
                opacity={isFresh ? 0.35 + 0.65 * freshGlow : 1}
              />
            );
          })}

          {/* Septa lines — bound alive + fresh chambers; skip protoconch tip */}
          {SEPTA.map((theta, j) => {
            if (j < outerEdgeIdx) return null;
            if (j > totalChambers - 2) return null;
            const outer = spiralPoint(theta, 1);
            const inner = spiralPoint(theta, INNER_RATIO);
            const isFreshEdge = showFresh && j === freshI;
            return (
              <line
                key={`sept-${j}`}
                x1={outer.x}
                y1={outer.y}
                x2={inner.x}
                y2={inner.y}
                stroke={IVORY}
                strokeWidth={isFreshEdge ? 1.8 : 1.3}
                opacity={isFreshEdge ? 1 : 0.95}
              />
            );
          })}

          {/* Outer & inner walls — reveal from THETA_MIN out to the current outer edge */}
          {(() => {
            const outermostVisible = SEPTA[outerEdgeIdx] ?? THETA_MAX;
            return (
              <>
                <path
                  d={fullSpiralPath(1, THETA_MIN, outermostVisible)}
                  stroke={IVORY}
                  strokeWidth={2.4}
                  fill="none"
                  filter="url(#ivory-glow)"
                />
                <path
                  d={fullSpiralPath(INNER_RATIO, THETA_MIN, outermostVisible)}
                  stroke={IVORY}
                  strokeWidth={1.6}
                  fill="none"
                  opacity={0.85}
                />
              </>
            );
          })()}

          {/* Aperture (mouth of shell) — appears once the outermost chamber has landed */}
          {alive >= totalChambers && (
            <path
              d={aperturePath()}
              stroke={IVORY}
              strokeWidth={2.4}
              fill="none"
              opacity={0.9}
            />
          )}

          {/* Siphuncle — fine rust conduit, revealed step-for-step with the chambers */}
          {(() => {
            const revealFrac = Math.min(1, Math.max(0, frame / buildSpan));
            return (
              <path
                d={siphunclePath()}
                stroke={RUST}
                strokeWidth={1.4}
                fill="none"
                pathLength={100}
                strokeDasharray={100}
                strokeDashoffset={100 * (1 - revealFrac)}
                opacity={0.95}
              />
            );
          })()}

          {/* Siphuncle callout — rust leader line + label */}
          {(() => {
            const showAt = fps * 2.8;
            const opa = interpolate(frame, [showAt, showAt + fps * 0.8], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            // anchor near a mid-outer chamber siphuncle position
            const midTheta = THETA_MAX - Math.PI * 0.8;
            const anchor = spiralPoint(midTheta, 0.86);
            const knee = { x: anchor.x + 130, y: anchor.y - 90 };
            const end = { x: knee.x + 170, y: knee.y };
            return (
              <g opacity={opa}>
                <circle cx={anchor.x} cy={anchor.y} r={4.5} fill={RUST} />
                <circle
                  cx={anchor.x}
                  cy={anchor.y}
                  r={10}
                  fill="none"
                  stroke={RUST}
                  strokeWidth={1}
                  opacity={0.55}
                />
                <line
                  x1={anchor.x}
                  y1={anchor.y}
                  x2={knee.x}
                  y2={knee.y}
                  stroke={RUST}
                  strokeWidth={1.1}
                />
                <line
                  x1={knee.x}
                  y1={knee.y}
                  x2={end.x}
                  y2={end.y}
                  stroke={RUST}
                  strokeWidth={1.1}
                />
                <text
                  x={knee.x + 6}
                  y={knee.y - 10}
                  fill={RUST}
                  fontFamily={inter}
                  fontSize={12}
                  fontWeight={600}
                  letterSpacing={2.6}
                >
                  SIPHUNCLE
                </text>
                <text
                  x={knee.x + 6}
                  y={knee.y + 14}
                  fill={PEARL}
                  fontFamily={inter}
                  fontSize={10}
                  fontWeight={500}
                  letterSpacing={2.4}
                  opacity={0.85}
                >
                  OSMOTIC BALLAST
                </text>
              </g>
            );
          })()}

          {/* Pressure inequality callout — arrows illustrating ambient atm vs 1 atm inside.
              Five arrows arcing along the upper-left flank + a big stacked label off-shell. */}
          {(() => {
            const showAt = fps * 3.2;
            const opa = interpolate(frame, [showAt, showAt + fps * 0.9], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            // Anchors along the outermost whorl, upper-left quadrant of the shell.
            // theta values MUST fall inside the drawn range [THETA_MIN, THETA_MAX];
            // offsets from THETA_MAX in radians place them along the outer wall.
            const anchors = [
              { theta: THETA_MAX - Math.PI * 0.68 },
              { theta: THETA_MAX - Math.PI * 0.86 },
              { theta: THETA_MAX - Math.PI * 1.04 },
              { theta: THETA_MAX - Math.PI * 1.22 },
              { theta: THETA_MAX - Math.PI * 1.40 },
            ];
            // Label anchored to the empty upper-left region, well clear of the shell
            const labelX = 260;
            const labelY = 245;
            return (
              <g opacity={opa}>
                {anchors.map((a, i) => {
                  const outer = spiralPoint(a.theta, 1);
                  const dx = Math.cos(a.theta);
                  const dy = Math.sin(a.theta);
                  // Move the tail OUT from the outer wall by 70 px along +dx,+dy
                  const start = {
                    x: outer.x + dx * 78,
                    y: outer.y + dy * 78,
                  };
                  const stemEnd = {
                    x: outer.x + dx * 20,
                    y: outer.y + dy * 20,
                  };
                  const tip = {
                    x: outer.x + dx * 8,
                    y: outer.y + dy * 8,
                  };
                  // arrow head: triangle at stemEnd pointing toward tip
                  const nx = -dy;
                  const ny = dx;
                  const baseL = {
                    x: stemEnd.x + nx * 5,
                    y: stemEnd.y + ny * 5,
                  };
                  const baseR = {
                    x: stemEnd.x - nx * 5,
                    y: stemEnd.y - ny * 5,
                  };
                  return (
                    <g key={i} stroke={PEARL} strokeWidth={1.4} fill={PEARL}>
                      <line x1={start.x} y1={start.y} x2={stemEnd.x} y2={stemEnd.y} />
                      <polygon
                        points={`${tip.x},${tip.y} ${baseL.x},${baseL.y} ${baseR.x},${baseR.y}`}
                      />
                    </g>
                  );
                })}
                <text
                  x={labelX}
                  y={labelY}
                  fill={MUTED}
                  fontFamily={inter}
                  fontSize={12}
                  fontWeight={600}
                  letterSpacing={3.2}
                  textAnchor="middle"
                >
                  AMBIENT SEA
                </text>
                <text
                  x={labelX}
                  y={labelY + 42}
                  fill={PEARL}
                  fontFamily={inter}
                  fontSize={44}
                  fontWeight={600}
                  letterSpacing={0}
                  textAnchor="middle"
                >
                  {pressureAtm}
                  <tspan fontSize={16} dx={4} letterSpacing={2}>
                    atm
                  </tspan>
                </text>
                <line
                  x1={labelX - 60}
                  y1={labelY + 58}
                  x2={labelX + 60}
                  y2={labelY + 58}
                  stroke={MUTED}
                  strokeWidth={0.8}
                  opacity={0.6}
                />
                <text
                  x={labelX}
                  y={labelY + 78}
                  fill={MUTED}
                  fontFamily={inter}
                  fontSize={10}
                  fontWeight={500}
                  letterSpacing={2.4}
                  textAnchor="middle"
                >
                  AT {depthM} m DEPTH
                </text>
              </g>
            );
          })()}

          {/* Interior ~1 atm callout — anchored inside the outermost chamber's inner-lower flank,
              with a leader out into the empty lower-right quadrant. */}
          {(() => {
            const showAt = fps * 3.8;
            const opa = interpolate(frame, [showAt, showAt + fps * 0.7], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            const anchorTheta = THETA_MAX - CHAMBER_STEP * 1.3;
            const anchor = spiralPoint(anchorTheta, 0.55);
            const knee = { x: anchor.x + 90, y: anchor.y + 70 };
            const end = { x: knee.x + 160, y: knee.y };
            return (
              <g opacity={opa}>
                <circle cx={anchor.x} cy={anchor.y} r={3.5} fill={IVORY} />
                <line
                  x1={anchor.x}
                  y1={anchor.y}
                  x2={knee.x}
                  y2={knee.y}
                  stroke={IVORY}
                  strokeWidth={1}
                  opacity={0.9}
                />
                <line
                  x1={knee.x}
                  y1={knee.y}
                  x2={end.x}
                  y2={end.y}
                  stroke={IVORY}
                  strokeWidth={1}
                  opacity={0.9}
                />
                <text
                  x={knee.x + 6}
                  y={knee.y - 8}
                  fill={MUTED}
                  fontFamily={inter}
                  fontSize={9}
                  fontWeight={600}
                  letterSpacing={2.4}
                >
                  SEALED CHAMBER
                </text>
                <text
                  x={knee.x + 6}
                  y={knee.y + 16}
                  fill={IVORY}
                  fontFamily={inter}
                  fontSize={22}
                  fontWeight={600}
                  letterSpacing={1}
                >
                  ≈ 1<tspan fontSize={11} dx={2} letterSpacing={2}>atm</tspan>
                </text>
              </g>
            );
          })()}
        </g>

        {/* Caption strip */}
        <g
          transform={`translate(${FRAME.x}, ${FRAME.y + FRAME.h + 22})`}
          fill={MUTED}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
        >
          <text>FIG. 1 · CHAMBERED PRESSURE VESSEL · NAUTILUS POMPILIUS</text>
          <text x={FRAME.w} textAnchor="end" fill={PEARL} opacity={0.85}>
            LOG-SPIRAL · ~3× / TURN
          </text>
        </g>
      </svg>

      {/* ── Type lockup ────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 960,
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
            color: PEARL,
            fontFamily: inter,
            fontSize: 12,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 12,
            fontWeight: 600,
          }}
        >
          Role <span style={{ color: MUTED, margin: "0 4px" }}>/</span>
          <span style={{ color: IVORY, letterSpacing: 5 }}>
            Naval Architect
          </span>
        </div>

        <div
          style={{
            color: IVORY,
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 76,
            lineHeight: 0.98,
            letterSpacing: -1.1,
            fontStyle: "italic",
          }}
        >
          Built for the
          <br />
          abyss.
        </div>

        <div
          style={{
            marginTop: 22,
            color: "#D8D4C6",
            fontFamily: inter,
            fontSize: 17,
            lineHeight: 1.42,
            fontWeight: 400,
            maxWidth: 900,
            opacity: hookOpacity,
          }}
        >
          The chambered nautilus grows its shell as a strict logarithmic spiral
          of gas-filled compartments linked by a living tube — the{" "}
          <span style={{ color: RUST, fontWeight: 600 }}>siphuncle</span> — that
          osmotically pumps liquid out so gas can diffuse in, holding each
          sealed chamber at roughly{" "}
          <span style={{ color: IVORY, fontWeight: 600 }}>1&nbsp;atm</span> even
          while the animal hovers at 400&nbsp;m, where the surrounding sea
          presses in at more than 40&nbsp;atm.
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          bottom: 30,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          color: MUTED,
          fontFamily: inter,
          fontSize: 11,
          letterSpacing: 3,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Denton &amp; Gilpin-Brown · J. Mar. Biol. Assoc. UK (1966)</span>
        <span>
          <span style={{ color: RUST }}>●</span> Siphuncle · Osmotic ballast
        </span>
      </div>

      {/* keep the linter happy about durationInFrames usage */}
      <div style={{ position: "absolute", opacity: 0 }}>{durationInFrames}</div>
    </AbsoluteFill>
  );
};
