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

// Palette — from the concept's visual brief (Brachinus coloration + reaction)
const INK = "#0A0D14";
const BOARD = "#101520";
const CARAPACE = "#C56A1E";
const CARAPACE_DEEP = "#8B4614";
const AMBER = "#F5B547";
const AMBER_PALE = "#FFDE9A";
const QUINONE = "#E5321C";
const GRAY = "#8A8E96";
const GRID = "#151A24";
const GRID_MAJOR = "#1E2532";
const RULE = "#2A3244";

// Layout constants
const FRAME = { x: 60, y: 130, w: 960, h: 711 };
const MAP_W = 1080;
const MAP_H = 800;
const scale = FRAME.w / MAP_W;

// Beetle geometry (inner 1080x800 coord space) — top-down view, head-left
const B = {
  headCx: 320,
  headCy: 400,
  headR: 32,
  pronotumFrontX: 355,
  pronotumBackX: 402,
  pronotumFrontHalf: 24,
  pronotumBackHalf: 40,
  elytraFrontX: 418,
  elytraBackX: 758,
  elytraHalfH: 84,
  abdomenTipX: 800,
  turretBaseX: 776,
  turretTipX: 810,
};

// Reaction chamber cutaway (in beetle coord space)
const RXN = {
  reservoirCx: 620,
  reservoirCy: 400,
  reservoirRx: 46,
  reservoirRy: 26,
  valveX: 676,
  valveHalfW: 6,
  valveHalfH: 12,
  chamberCx: 722,
  chamberCy: 400,
  chamberRx: 28,
  chamberRy: 18,
  tubeStartX: 750,
  tubeEndX: 800,
};

// Six-legged geometry: origins per leg pair on the body midline (thorax/meso/meta)
type Leg = {
  ox: number; // origin x on midline
  side: 1 | -1; // 1 = down (+y), -1 = up (-y)
  a1: [number, number]; // femur end offset from origin
  a2: [number, number]; // tibia end offset from a1
  a3: [number, number]; // tarsus end offset from a2
};

const LEGS: Leg[] = [
  // Forelegs — from prothorax, angled forward-outward
  { ox: 392, side: -1, a1: [-24, -58], a2: [-62, -34], a3: [-56, -6] },
  { ox: 392, side: 1, a1: [-24, 58], a2: [-62, 34], a3: [-56, 6] },
  // Midlegs — from mesothorax, splayed outward
  { ox: 510, side: -1, a1: [0, -80], a2: [-46, -68], a3: [-38, -30] },
  { ox: 510, side: 1, a1: [0, 80], a2: [-46, 68], a3: [-38, 30] },
  // Hindlegs — from metathorax, angled backward-outward
  { ox: 640, side: -1, a1: [46, -76], a2: [62, -46], a3: [42, -12] },
  { ox: 640, side: 1, a1: [46, 76], a2: [62, 46], a3: [42, 12] },
];

const legPath = (leg: Leg): string => {
  const p0 = [leg.ox, 400];
  const q1 = [p0[0] + leg.a1[0], p0[1] + leg.a1[1]];
  const q2 = [q1[0] + leg.a2[0], q1[1] + leg.a2[1]];
  const q3 = [q2[0] + leg.a3[0], q2[1] + leg.a3[1]];
  return `M ${p0[0]} ${p0[1]} L ${q1[0]} ${q1[1]} L ${q2[0]} ${q2[1]} L ${q3[0]} ${q3[1]}`;
};

// Antenna path — beaded, curving forward
const antennaPath = (upper: boolean): string => {
  const y0 = upper ? 386 : 414;
  const y1 = upper ? 340 : 460;
  const y2 = upper ? 300 : 500;
  return `M 300 ${y0} Q 265 ${(y0 + y1) / 2 - (upper ? 8 : -8)} 240 ${y1} T 175 ${y2}`;
};

// Elytron half hull path (top or bottom)
const elytronPath = (top: boolean): string => {
  const y0 = 400;
  const yEdge = top ? y0 - B.elytraHalfH : y0 + B.elytraHalfH;
  const x0 = B.elytraFrontX;
  const x1 = B.elytraBackX;
  // Rounded lozenge: 4-anchor bezier envelope
  const cy = top ? yEdge - 6 : yEdge + 6;
  return `
    M ${x0} ${y0}
    C ${x0 + 6} ${cy}, ${x0 + 60} ${yEdge}, ${(x0 + x1) / 2} ${yEdge}
    C ${x1 - 60} ${yEdge}, ${x1 - 20} ${cy}, ${x1} ${y0 + (top ? -6 : 6)}
    L ${x0} ${y0} Z
  `;
};

// Pronotum path (trapezoid with rounded corners)
const pronotumPath = (): string => {
  const yTop1 = 400 - B.pronotumFrontHalf;
  const yBot1 = 400 + B.pronotumFrontHalf;
  const yTop2 = 400 - B.pronotumBackHalf;
  const yBot2 = 400 + B.pronotumBackHalf;
  const x0 = B.pronotumFrontX;
  const x1 = B.pronotumBackX;
  return `
    M ${x0} ${yTop1}
    Q ${x0 - 6} 400 ${x0} ${yBot1}
    L ${x1 - 4} ${yBot2}
    Q ${x1 + 4} 400 ${x1 - 4} ${yTop2}
    Z
  `;
};

// Pulse timing: 6 discrete pulses across 5 s (150 frames at 30 fps)
type Pulse = { start: number; peak: number; end: number };
const PULSES: Pulse[] = Array.from({ length: 6 }).map((_, i) => {
  const s = 30 + i * 18; // start frame
  return { start: s, peak: s + 4, end: s + 16 };
});

const pulseAmp = (frame: number, p: Pulse): number => {
  if (frame < p.start || frame > p.end) return 0;
  if (frame <= p.peak) {
    const t = (frame - p.start) / (p.peak - p.start);
    return 1 - Math.pow(1 - t, 3);
  }
  const t = (frame - p.peak) / (p.end - p.peak);
  return Math.pow(1 - t, 2);
};

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({
    frame: frame - fps * 0.35,
    fps,
    config: { damping: 200, mass: 0.8 },
  });

  const hookOpacity = interpolate(frame, [fps * 0.9, fps * 1.7], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Draw-in of the beetle over first 22 frames
  const bodyBuild = interpolate(frame, [0, 22], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  // Callouts appear after body
  const calloutBuild = interpolate(frame, [22, 40], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Aggregate pulse amplitude at this frame (sum then clamp for glow)
  const activePulses = PULSES.map((p) => pulseAmp(frame, p));
  const currentAmp = Math.max(...activePulses);

  // Valve indicator flashes in phase with pulse start
  const valveFlash = activePulses.reduce((max, a) => Math.max(max, a), 0);

  // Turret rotates a few degrees during firing, then resettles
  const turretRot = interpolate(currentAmp, [0, 1], [0, -6], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
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
        <span style={{ color: AMBER }}>2026 · 09 · 18</span>
      </div>

      {/* Drafting frame + diagram */}
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

          <radialGradient id="board-vignette" cx="55%" cy="42%" r="72%">
            <stop offset="0%" stopColor="#141924" stopOpacity={1} />
            <stop offset="100%" stopColor={BOARD} stopOpacity={1} />
          </radialGradient>

          <radialGradient id="carapace-grad" cx="42%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#E38A2D" stopOpacity={1} />
            <stop offset="55%" stopColor={CARAPACE} stopOpacity={1} />
            <stop offset="100%" stopColor={CARAPACE_DEEP} stopOpacity={1} />
          </radialGradient>

          <radialGradient id="plume-grad" cx="0%" cy="50%" r="100%">
            <stop offset="0%" stopColor={AMBER_PALE} stopOpacity={0.95} />
            <stop offset="35%" stopColor={AMBER} stopOpacity={0.75} />
            <stop offset="75%" stopColor={QUINONE} stopOpacity={0.35} />
            <stop offset="100%" stopColor={QUINONE} stopOpacity={0} />
          </radialGradient>

          <filter id="soft-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="6" />
          </filter>

          <clipPath id="frame-clip">
            <rect
              x={FRAME.x}
              y={FRAME.y}
              width={FRAME.w}
              height={FRAME.h}
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

        {/* Inner thin border */}
        <rect
          x={FRAME.x + 0.5}
          y={FRAME.y + 0.5}
          width={FRAME.w - 1}
          height={FRAME.h - 1}
          fill="none"
          stroke={RULE}
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

        {/* Plate label — upper left inside frame */}
        <g
          transform={`translate(${FRAME.x + 26}, ${FRAME.y + 34})`}
          fill={GRAY}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={600}
        >
          <text>PLATE III</text>
          <text y={16} fill={AMBER} letterSpacing={2.4}>
            BRACHINUS · DORSAL
          </text>
        </g>

        {/* Scale-bar / spec — upper right inside frame */}
        <g
          transform={`translate(${FRAME.x + FRAME.w - 26}, ${FRAME.y + 34})`}
          fill={GRAY}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
          textAnchor="end"
        >
          <text>1 : 1.6 · 10 MM</text>
          <g transform="translate(-80, 10)" stroke={GRAY} strokeWidth={1.2}>
            <line x1={0} y1={0} x2={80} y2={0} />
            <line x1={0} y1={-4} x2={0} y2={4} />
            <line x1={40} y1={-3} x2={40} y2={3} />
            <line x1={80} y1={-4} x2={80} y2={4} />
          </g>
        </g>

        {/* Diagram content — beetle coord space 1080×800 scaled into FRAME */}
        <g
          transform={`translate(${FRAME.x}, ${FRAME.y}) scale(${scale})`}
          clipPath="url(#frame-clip)"
        >
          {/* Section-axis ticks — subtle blueprint element along top and bottom */}
          <g stroke={RULE} strokeWidth={1}>
            {Array.from({ length: 11 }).map((_, i) => (
              <line
                key={`tx-${i}`}
                x1={100 + i * 90}
                y1={40}
                x2={100 + i * 90}
                y2={54}
              />
            ))}
            {Array.from({ length: 11 }).map((_, i) => (
              <line
                key={`bx-${i}`}
                x1={100 + i * 90}
                y1={760}
                x2={100 + i * 90}
                y2={746}
              />
            ))}
            {Array.from({ length: 9 }).map((_, i) => (
              <line
                key={`ly-${i}`}
                x1={40}
                y1={100 + i * 76}
                x2={54}
                y2={100 + i * 76}
              />
            ))}
            {Array.from({ length: 9 }).map((_, i) => (
              <line
                key={`ry-${i}`}
                x1={1040}
                y1={100 + i * 76}
                x2={1026}
                y2={100 + i * 76}
              />
            ))}
          </g>

          {/* Centerline — horizontal, dashed */}
          <line
            x1={80}
            y1={400}
            x2={1000}
            y2={400}
            stroke={RULE}
            strokeWidth={1}
            strokeDasharray="6 6"
          />

          {/* ── SPRAY PLUME ─────────────────────────────────────────── */}
          {/* Trailing haze anchored at turret tip */}
          <g opacity={Math.min(1, bodyBuild) * 0.8}>
            <ellipse
              cx={880}
              cy={400}
              rx={220 * (0.55 + currentAmp * 0.45)}
              ry={70 * (0.6 + currentAmp * 0.4)}
              fill="url(#plume-grad)"
              opacity={0.55 + currentAmp * 0.35}
              filter="url(#soft-glow)"
            />
          </g>

          {/* Discrete pulses — six concentric plume slices */}
          {PULSES.map((p, i) => {
            const amp = activePulses[i];
            if (amp <= 0) return null;
            // Each pulse travels outward from turret over its lifetime
            const life = (frame - p.start) / (p.end - p.start);
            const dx = 40 + life * 220;
            const width = 30 + life * 80;
            const height = 20 + life * 34;
            return (
              <g key={`pulse-${i}`} opacity={amp}>
                <ellipse
                  cx={B.turretTipX + dx}
                  cy={400}
                  rx={width}
                  ry={height}
                  fill={AMBER}
                  opacity={0.35 * amp}
                  filter="url(#soft-glow)"
                />
                <ellipse
                  cx={B.turretTipX + dx}
                  cy={400}
                  rx={width * 0.55}
                  ry={height * 0.55}
                  fill={AMBER_PALE}
                  opacity={0.7 * amp}
                />
                <ellipse
                  cx={B.turretTipX + dx - 6}
                  cy={400}
                  rx={width * 0.28}
                  ry={height * 0.35}
                  fill="#FFFFFF"
                  opacity={0.45 * amp}
                />
              </g>
            );
          })}

          {/* Muzzle flash cone directly at turret tip when firing */}
          {currentAmp > 0.05 && (
            <g opacity={currentAmp}>
              <path
                d={`M ${B.turretTipX} 400
                    L ${B.turretTipX + 26} 372
                    L ${B.turretTipX + 70} 386
                    L ${B.turretTipX + 82} 400
                    L ${B.turretTipX + 70} 414
                    L ${B.turretTipX + 26} 428 Z`}
                fill={AMBER_PALE}
                opacity={0.95}
                filter="url(#soft-glow)"
              />
              <path
                d={`M ${B.turretTipX} 400
                    L ${B.turretTipX + 22} 380
                    L ${B.turretTipX + 60} 400
                    L ${B.turretTipX + 22} 420 Z`}
                fill="#FFFFFF"
                opacity={0.9}
              />
            </g>
          )}

          {/* ── BEETLE ─────────────────────────────────────────────── */}
          <g opacity={bodyBuild}>
            {/* Legs — draw first so they sit under body */}
            {LEGS.map((leg, i) => (
              <g key={`leg-${i}`}>
                <path
                  d={legPath(leg)}
                  stroke={INK}
                  strokeWidth={11}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={0.9}
                />
                <path
                  d={legPath(leg)}
                  stroke={CARAPACE_DEEP}
                  strokeWidth={6}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d={legPath(leg)}
                  stroke={CARAPACE}
                  strokeWidth={2.4}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={0.85}
                />
              </g>
            ))}

            {/* Antennae */}
            {[true, false].map((upper) => (
              <g key={`ant-${upper}`}>
                <path
                  d={antennaPath(upper)}
                  fill="none"
                  stroke={INK}
                  strokeWidth={5}
                  strokeLinecap="round"
                />
                <path
                  d={antennaPath(upper)}
                  fill="none"
                  stroke={CARAPACE_DEEP}
                  strokeWidth={2.4}
                  strokeLinecap="round"
                />
                <circle
                  cx={175}
                  cy={upper ? 300 : 500}
                  r={6}
                  fill={CARAPACE}
                  stroke={INK}
                  strokeWidth={1.5}
                />
              </g>
            ))}

            {/* Mandibles */}
            <path
              d={`M 296 384 L 268 372 L 288 396 Z`}
              fill={CARAPACE_DEEP}
              stroke={INK}
              strokeWidth={1.5}
            />
            <path
              d={`M 296 416 L 268 428 L 288 404 Z`}
              fill={CARAPACE_DEEP}
              stroke={INK}
              strokeWidth={1.5}
            />

            {/* Head — capsule shape, slightly extended forward */}
            <path
              d={`M ${B.headCx - 30} ${B.headCy - 26}
                  Q ${B.headCx - 40} ${B.headCy} ${B.headCx - 30} ${B.headCy + 26}
                  L ${B.headCx + 26} ${B.headCy + 24}
                  Q ${B.headCx + 34} ${B.headCy} ${B.headCx + 26} ${B.headCy - 24} Z`}
              fill={CARAPACE_DEEP}
              stroke={INK}
              strokeWidth={2}
            />
            {/* Compound eyes — small, lateral, kidney-shaped */}
            <ellipse
              cx={B.headCx - 10}
              cy={B.headCy - 22}
              rx={5}
              ry={3}
              fill={INK}
              transform={`rotate(-18 ${B.headCx - 10} ${B.headCy - 22})`}
            />
            <ellipse
              cx={B.headCx - 10}
              cy={B.headCy + 22}
              rx={5}
              ry={3}
              fill={INK}
              transform={`rotate(18 ${B.headCx - 10} ${B.headCy + 22})`}
            />

            {/* Pronotum */}
            <path
              d={pronotumPath()}
              fill="url(#carapace-grad)"
              stroke={INK}
              strokeWidth={2}
            />
            {/* Pronotum midline groove */}
            <line
              x1={B.pronotumFrontX + 2}
              y1={400}
              x2={B.pronotumBackX - 4}
              y2={400}
              stroke={CARAPACE_DEEP}
              strokeWidth={1.5}
              opacity={0.7}
            />

            {/* Scutellum — triangle behind pronotum */}
            <path
              d={`M ${B.pronotumBackX - 4} 388 L ${B.pronotumBackX + 14} 400 L ${B.pronotumBackX - 4} 412 Z`}
              fill={CARAPACE_DEEP}
              stroke={INK}
              strokeWidth={1.4}
            />

            {/* Elytra — top half */}
            <path
              d={elytronPath(true)}
              fill="url(#carapace-grad)"
              stroke={INK}
              strokeWidth={2}
            />
            {/* Elytra — bottom half */}
            <path
              d={elytronPath(false)}
              fill="url(#carapace-grad)"
              stroke={INK}
              strokeWidth={2}
            />

            {/* Elytra longitudinal striations */}
            {Array.from({ length: 5 }).map((_, i) => {
              const off = 18 + i * 14;
              return (
                <g key={`str-${i}`} opacity={0.35}>
                  <path
                    d={`M ${B.elytraFrontX + 24} ${400 - off}
                        Q ${(B.elytraFrontX + B.elytraBackX) / 2} ${400 - off - 4}
                          ${B.elytraBackX - 18} ${400 - off * 0.55}`}
                    stroke={CARAPACE_DEEP}
                    strokeWidth={1.2}
                    fill="none"
                  />
                  <path
                    d={`M ${B.elytraFrontX + 24} ${400 + off}
                        Q ${(B.elytraFrontX + B.elytraBackX) / 2} ${400 + off + 4}
                          ${B.elytraBackX - 18} ${400 + off * 0.55}`}
                    stroke={CARAPACE_DEEP}
                    strokeWidth={1.2}
                    fill="none"
                  />
                </g>
              );
            })}

            {/* Elytral seam (midline) */}
            <line
              x1={B.elytraFrontX}
              y1={400}
              x2={B.elytraBackX}
              y2={400}
              stroke={INK}
              strokeWidth={2}
              opacity={0.85}
            />

            {/* Abdomen tip — tapered darker segment */}
            <path
              d={`M ${B.elytraBackX} 394
                  Q ${B.elytraBackX + 20} 400 ${B.elytraBackX} 406
                  L ${B.abdomenTipX - 12} 402
                  Q ${B.abdomenTipX} 400 ${B.abdomenTipX - 12} 398 Z`}
              fill={CARAPACE_DEEP}
              stroke={INK}
              strokeWidth={2}
            />

            {/* Turret — rotates during pulse */}
            <g
              transform={`rotate(${turretRot} ${B.abdomenTipX - 6} 400)`}
            >
              <rect
                x={B.turretBaseX}
                y={394}
                width={34}
                height={12}
                fill={INK}
                stroke={AMBER}
                strokeWidth={1.4}
              />
              <rect
                x={B.turretBaseX + 26}
                y={396}
                width={12}
                height={8}
                fill={AMBER}
                opacity={0.5 + valveFlash * 0.5}
              />
            </g>
          </g>

          {/* ── CUTAWAY: reaction chamber schematic (overlay) ───────── */}
          <g opacity={calloutBuild}>
            {/* Dashed cut-window on elytra revealing the chambers */}
            <rect
              x={568}
              y={372}
              width={200}
              height={56}
              fill="none"
              stroke={AMBER}
              strokeWidth={1.4}
              strokeDasharray="5 4"
              opacity={0.9}
              rx={2}
            />
            {/* Chamber ink base */}
            <rect
              x={571}
              y={375}
              width={194}
              height={50}
              fill={INK}
              opacity={0.78}
              rx={2}
            />

            {/* Reservoir */}
            <ellipse
              cx={RXN.reservoirCx}
              cy={RXN.reservoirCy}
              rx={RXN.reservoirRx}
              ry={RXN.reservoirRy}
              fill={AMBER}
              opacity={0.16}
              stroke={AMBER}
              strokeWidth={1.5}
            />
            {/* Reservoir fluid dots */}
            {Array.from({ length: 9 }).map((_, i) => {
              const a = (i / 9) * Math.PI * 2;
              const rr = 14 + (i % 3) * 6;
              const cx = RXN.reservoirCx + Math.cos(a) * rr;
              const cy = RXN.reservoirCy + Math.sin(a) * rr * 0.55;
              return (
                <circle
                  key={`res-${i}`}
                  cx={cx}
                  cy={cy}
                  r={1.6}
                  fill={AMBER_PALE}
                  opacity={0.85}
                />
              );
            })}
            <text
              x={RXN.reservoirCx}
              y={RXN.reservoirCy + 4}
              textAnchor="middle"
              fill={AMBER_PALE}
              fontFamily={inter}
              fontSize={11}
              fontWeight={600}
              letterSpacing={2}
            >
              C₆H₄(OH)₂
            </text>

            {/* Valve */}
            <rect
              x={RXN.valveX - RXN.valveHalfW}
              y={400 - RXN.valveHalfH}
              width={RXN.valveHalfW * 2}
              height={RXN.valveHalfH * 2}
              fill={QUINONE}
              opacity={0.35 + valveFlash * 0.65}
              stroke={QUINONE}
              strokeWidth={1.4}
            />
            {/* Valve piston mark */}
            <line
              x1={RXN.valveX - 2}
              y1={400 - RXN.valveHalfH - 6}
              x2={RXN.valveX - 2}
              y2={400 + RXN.valveHalfH + 6}
              stroke={QUINONE}
              strokeWidth={1.2}
            />

            {/* Reaction chamber */}
            <ellipse
              cx={RXN.chamberCx}
              cy={RXN.chamberCy}
              rx={RXN.chamberRx}
              ry={RXN.chamberRy}
              fill={QUINONE}
              opacity={0.12 + valveFlash * 0.35}
              stroke={QUINONE}
              strokeWidth={1.5}
            />
            {/* Enzyme lining marks */}
            {Array.from({ length: 12 }).map((_, i) => {
              const a = (i / 12) * Math.PI * 2;
              const ex = RXN.chamberCx + Math.cos(a) * (RXN.chamberRx - 1);
              const ey = RXN.chamberCy + Math.sin(a) * (RXN.chamberRy - 1);
              return (
                <line
                  key={`enz-${i}`}
                  x1={ex}
                  y1={ey}
                  x2={ex + Math.cos(a) * 4}
                  y2={ey + Math.sin(a) * 4}
                  stroke={QUINONE}
                  strokeWidth={1}
                  opacity={0.85}
                />
              );
            })}
            <text
              x={RXN.chamberCx}
              y={RXN.chamberCy + 4}
              textAnchor="middle"
              fill={AMBER_PALE}
              fontFamily={inter}
              fontSize={10}
              fontWeight={600}
              letterSpacing={1.6}
            >
              100°C
            </text>

            {/* Outlet tube to turret */}
            <line
              x1={RXN.tubeStartX}
              y1={400}
              x2={RXN.tubeEndX}
              y2={400}
              stroke={AMBER}
              strokeWidth={2.2}
              opacity={0.9}
            />
          </g>

          {/* ── CALLOUTS ─────────────────────────────────────────── */}
          <g
            opacity={calloutBuild}
            fill={GRAY}
            fontFamily={inter}
            fontSize={13}
            fontWeight={600}
            letterSpacing={2.6}
          >
            {/* Reservoir callout (up-left) */}
            <g stroke={AMBER} strokeWidth={1.2} fill="none">
              <line
                x1={RXN.reservoirCx - 20}
                y1={RXN.reservoirCy - RXN.reservoirRy}
                x2={RXN.reservoirCx - 60}
                y2={RXN.reservoirCy - 110}
              />
              <line
                x1={RXN.reservoirCx - 60}
                y1={RXN.reservoirCy - 110}
                x2={RXN.reservoirCx - 200}
                y2={RXN.reservoirCy - 110}
              />
              <circle
                cx={RXN.reservoirCx - 20}
                cy={RXN.reservoirCy - RXN.reservoirRy}
                r={2.5}
                fill={AMBER}
              />
            </g>
            <text
              x={RXN.reservoirCx - 200}
              y={RXN.reservoirCy - 115}
              fill={AMBER}
              fontSize={12}
            >
              1 · RESERVOIR
            </text>
            <text
              x={RXN.reservoirCx - 200}
              y={RXN.reservoirCy - 98}
              fill={GRAY}
              fontSize={11}
              fontWeight={500}
              letterSpacing={1.8}
            >
              HYDROQUINONES + H₂O₂
            </text>

            {/* Valve callout (down) */}
            <g stroke={QUINONE} strokeWidth={1.2} fill="none">
              <line
                x1={RXN.valveX}
                y1={400 + RXN.valveHalfH}
                x2={RXN.valveX}
                y2={520}
              />
              <line
                x1={RXN.valveX}
                y1={520}
                x2={RXN.valveX - 60}
                y2={520}
              />
              <circle
                cx={RXN.valveX}
                cy={400 + RXN.valveHalfH}
                r={2.5}
                fill={QUINONE}
              />
            </g>
            <text
              x={RXN.valveX - 60}
              y={538}
              fill={QUINONE}
              fontSize={12}
              textAnchor="start"
            >
              2 · INLET VALVE
            </text>
            <text
              x={RXN.valveX - 60}
              y={555}
              fill={GRAY}
              fontSize={11}
              fontWeight={500}
              letterSpacing={1.8}
            >
              MUSCULAR, ~500 Hz
            </text>

            {/* Reaction chamber callout (up-right) */}
            <g stroke={AMBER} strokeWidth={1.2} fill="none">
              <line
                x1={RXN.chamberCx}
                y1={RXN.chamberCy - RXN.chamberRy}
                x2={RXN.chamberCx + 40}
                y2={RXN.chamberCy - 110}
              />
              <line
                x1={RXN.chamberCx + 40}
                y1={RXN.chamberCy - 110}
                x2={RXN.chamberCx + 220}
                y2={RXN.chamberCy - 110}
              />
              <circle
                cx={RXN.chamberCx}
                cy={RXN.chamberCy - RXN.chamberRy}
                r={2.5}
                fill={AMBER}
              />
            </g>
            <text
              x={RXN.chamberCx + 220}
              y={RXN.chamberCy - 115}
              fill={AMBER}
              fontSize={12}
              textAnchor="end"
            >
              3 · REACTION CHAMBER
            </text>
            <text
              x={RXN.chamberCx + 220}
              y={RXN.chamberCy - 98}
              fill={GRAY}
              fontSize={11}
              fontWeight={500}
              letterSpacing={1.8}
              textAnchor="end"
            >
              CATALASE · PEROXIDASE
            </text>

            {/* Turret callout (down-right) */}
            <g stroke={AMBER} strokeWidth={1.2} fill="none">
              <line
                x1={B.turretTipX - 6}
                y1={410}
                x2={B.turretTipX + 40}
                y2={520}
              />
              <line
                x1={B.turretTipX + 40}
                y1={520}
                x2={B.turretTipX + 180}
                y2={520}
              />
              <circle
                cx={B.turretTipX - 6}
                cy={410}
                r={2.5}
                fill={AMBER}
              />
            </g>
            <text
              x={B.turretTipX + 180}
              y={538}
              fill={AMBER}
              fontSize={12}
              textAnchor="end"
            >
              4 · ROTATING TURRET
            </text>
            <text
              x={B.turretTipX + 180}
              y={555}
              fill={GRAY}
              fontSize={11}
              fontWeight={500}
              letterSpacing={1.8}
              textAnchor="end"
            >
              BENZOQUINONE · 100 °C
            </text>

            {/* Pulse gauge — top-right corner */}
            <g transform="translate(870, 130)">
              <rect
                x={-6}
                y={-42}
                width={170}
                height={90}
                fill={INK}
                opacity={0.55}
                stroke={RULE}
                strokeWidth={1}
                rx={2}
              />
              <text
                x={0}
                y={-22}
                fill={GRAY}
                fontSize={10}
                fontWeight={600}
                letterSpacing={2.4}
              >
                PULSE RATE
              </text>
              <text
                x={0}
                y={16}
                fill={AMBER}
                fontFamily={playfair}
                fontSize={40}
                fontWeight={500}
              >
                500
              </text>
              <text
                x={82}
                y={16}
                fill={GRAY}
                fontSize={12}
                fontWeight={600}
                letterSpacing={2.4}
              >
                Hz
              </text>
              {/* Waveform */}
              <g stroke={AMBER} strokeWidth={1.4} fill="none">
                <path
                  d={`M 0 40
                      L 8 40 L 8 30 L 16 30 L 16 40
                      L 32 40 L 32 30 L 40 30 L 40 40
                      L 56 40 L 56 30 L 64 30 L 64 40
                      L 80 40 L 80 30 L 88 30 L 88 40
                      L 104 40 L 104 30 L 112 30 L 112 40
                      L 128 40 L 128 30 L 136 30 L 136 40
                      L 148 40`}
                />
              </g>
              {/* Sweep marker in phase with pulses */}
              <line
                x1={((frame % 60) / 60) * 148}
                y1={22}
                x2={((frame % 60) / 60) * 148}
                y2={46}
                stroke={QUINONE}
                strokeWidth={2}
                opacity={0.9}
              />
            </g>
          </g>
        </g>

        {/* Caption strip just below the drafting frame */}
        <g
          transform={`translate(${FRAME.x}, ${FRAME.y + FRAME.h + 22})`}
          fill={GRAY}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
        >
          <text>FIG. III · BRACHINUS PULSE-COMBUSTION SCHEMA</text>
          <text
            x={FRAME.w}
            textAnchor="end"
            fill={AMBER}
            opacity={0.85}
          >
            ~500 SHOTS · SECOND⁻¹
          </text>
        </g>
      </svg>

      {/* ── Type lockup ────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 920,
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
          <span style={{ color: "#EDEDEF", letterSpacing: 5 }}>
            Chemical Engineer
          </span>
        </div>

        <div
          style={{
            color: "#F4F4F6",
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 96,
            lineHeight: 0.96,
            letterSpacing: -1.6,
            fontStyle: "italic",
          }}
        >
          Five hundred shots
          <br />
          a second.
        </div>

        <div
          style={{
            marginTop: 28,
            color: "#C8CAD0",
            fontFamily: inter,
            fontSize: 18,
            lineHeight: 1.45,
            fontWeight: 400,
            maxWidth: 860,
            opacity: hookOpacity,
          }}
        >
          A muscular valve fires 25% hydrogen peroxide and hydroquinones into a{" "}
          <span style={{ color: AMBER, fontWeight: 600 }}>
            catalase-lined combustion chamber
          </span>
          . <em>Brachinus</em> discharges 100 °C benzoquinone in discrete
          pulses at ~500 Hz — a pulse-combustion reactor mounted in an insect
          abdomen.
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
        <span>Arndt et al. · Science 348 (2015)</span>
        <span>
          <span style={{ color: AMBER }}>●</span> 100 °C benzoquinone jet
        </span>
      </div>

    </AbsoluteFill>
  );
};
