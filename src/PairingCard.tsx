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

// ── Palette (from concept brief) ────────────────────────────────────────
const INK = "#0A0908";
const PARCHMENT = "#F1E4C2";
const PARCHMENT_DEEP = "#E5D3A2";
const HOT = "#E64B2C";
const AMBER = "#F5B841";
const ELYTRON = "#8C5B3F";
const ELYTRON_DARK = "#4A2B18";
const STEEL = "#5F6773";
const INK_LINE = "#20160E";
const INK_SOFT = "#5A4126";

// ── Layout ──────────────────────────────────────────────────────────────
const CANVAS_W = 1080;
const CANVAS_H = 1350;
const FRAME = { x: 60, y: 130, w: 960, h: 711 };

// Beetle sits centered horizontally in the frame; the nozzle at (540, 560).
// Body is proportioned ~2.4 : 1 length : width, closer to real Brachinus.
const BEETLE_CX = 540;
const NOZZLE_Y = 560;
const PLUME_END_Y = 820;

// ── Small helpers ───────────────────────────────────────────────────────
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const easeOutCubic = (t: number) => 1 - Math.pow(1 - clamp01(t), 3);

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ── Entry sequence timing ─────────────────────────────────────────────
  const beetleFade = spring({
    frame,
    fps,
    config: { damping: 200, mass: 0.9 },
    durationInFrames: 22,
  });
  const cutawayFade = interpolate(frame, [fps * 0.6, fps * 1.2], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const reservoirCharge = interpolate(frame, [fps * 0.9, fps * 1.6], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const combustionCharge = interpolate(frame, [fps * 1.3, fps * 1.9], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const ignitionFlash = Math.max(
    0,
    Math.sin(
      Math.max(
        0,
        interpolate(frame, [fps * 1.7, fps * 2.1], [0, Math.PI], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }),
      ),
    ),
  );
  const plumeIntro = interpolate(frame, [fps * 1.9, fps * 2.5], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const labelsFade = interpolate(frame, [fps * 1.5, fps * 2.2], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const titleSpring = spring({
    frame: frame - fps * 0.4,
    fps,
    config: { damping: 200, mass: 0.8 },
  });
  const hookOpacity = interpolate(frame, [fps * 1.0, fps * 1.9], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Pulse-jet plume rings (rapid, staggered) ──────────────────────────
  // Each pulse is emitted at t = i * PULSE_INTERVAL frames and lives for LIFE frames.
  // Visualised rate ≈ 10 pulses/sec (real animal: ~500 Hz; caption states the true value).
  const PULSE_INTERVAL = 3;
  const LIFE = 26;
  const activePulses: Array<{ life: number; index: number }> = [];
  if (plumeIntro > 0) {
    const start = Math.max(0, frame - fps * 1.9);
    const first = Math.max(0, Math.floor((start - LIFE) / PULSE_INTERVAL));
    const last = Math.floor(start / PULSE_INTERVAL);
    for (let i = first; i <= last; i++) {
      const emitFrame = i * PULSE_INTERVAL;
      const age = start - emitFrame;
      if (age >= 0 && age <= LIFE) {
        activePulses.push({ life: age / LIFE, index: i });
      }
    }
  }

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
          color: STEEL,
          fontFamily: inter,
          fontSize: 13,
          letterSpacing: 4.5,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Everyday Motivation · No. 003</span>
        <span style={{ color: HOT }}>2026 · 07 · 26</span>
      </div>

      {/* Main SVG canvas */}
      <svg
        width={CANVAS_W}
        height={CANVAS_H}
        viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          {/* Parchment vignette */}
          <radialGradient id="paper" cx="45%" cy="35%" r="80%">
            <stop offset="0%" stopColor={PARCHMENT} stopOpacity={1} />
            <stop offset="70%" stopColor={PARCHMENT} stopOpacity={1} />
            <stop offset="100%" stopColor={PARCHMENT_DEEP} stopOpacity={1} />
          </radialGradient>

          {/* Faint drafting rule */}
          <pattern
            id="rule"
            x={FRAME.x}
            y={FRAME.y}
            width={48}
            height={48}
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 48 0 L 0 0 0 48"
              fill="none"
              stroke={PARCHMENT_DEEP}
              strokeOpacity={0.55}
              strokeWidth={0.8}
            />
          </pattern>

          {/* Reservoir amber glow */}
          <radialGradient id="reservoir-fill" cx="50%" cy="45%" r="60%">
            <stop offset="0%" stopColor="#FFE1A2" stopOpacity={0.95} />
            <stop offset="60%" stopColor={AMBER} stopOpacity={0.85} />
            <stop offset="100%" stopColor="#B67A18" stopOpacity={0.65} />
          </radialGradient>

          {/* Combustion chamber hot fill */}
          <radialGradient id="chamber-fill" cx="50%" cy="45%" r="60%">
            <stop offset="0%" stopColor="#FFEBB8" stopOpacity={1} />
            <stop offset="50%" stopColor={AMBER} stopOpacity={1} />
            <stop offset="100%" stopColor={HOT} stopOpacity={1} />
          </radialGradient>

          {/* Plume core */}
          <radialGradient id="plume-core" cx="50%" cy="0%" r="90%">
            <stop offset="0%" stopColor="#FFF3D8" stopOpacity={0.95} />
            <stop offset="18%" stopColor="#FFDC7A" stopOpacity={0.85} />
            <stop offset="45%" stopColor={HOT} stopOpacity={0.55} />
            <stop offset="100%" stopColor={HOT} stopOpacity={0} />
          </radialGradient>

          {/* Plume envelope shading */}
          <linearGradient id="plume-envelope" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={HOT} stopOpacity={0.85} />
            <stop offset="45%" stopColor={HOT} stopOpacity={0.42} />
            <stop offset="100%" stopColor={AMBER} stopOpacity={0.02} />
          </linearGradient>

          <filter id="soft-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter
            id="ignition-glow"
            x="-40%"
            y="-40%"
            width="180%"
            height="180%"
          >
            <feGaussianBlur stdDeviation="10" />
          </filter>
        </defs>

        {/* Parchment */}
        <rect
          x={FRAME.x}
          y={FRAME.y}
          width={FRAME.w}
          height={FRAME.h}
          fill="url(#paper)"
        />
        <rect
          x={FRAME.x}
          y={FRAME.y}
          width={FRAME.w}
          height={FRAME.h}
          fill="url(#rule)"
        />

        {/* Inner drafting border */}
        <rect
          x={FRAME.x + 14}
          y={FRAME.y + 14}
          width={FRAME.w - 28}
          height={FRAME.h - 28}
          fill="none"
          stroke={INK_SOFT}
          strokeOpacity={0.35}
          strokeWidth={1}
        />

        {/* Corner tick marks */}
        {(
          [
            [FRAME.x, FRAME.y, 1, 1],
            [FRAME.x + FRAME.w, FRAME.y, -1, 1],
            [FRAME.x, FRAME.y + FRAME.h, 1, -1],
            [FRAME.x + FRAME.w, FRAME.y + FRAME.h, -1, -1],
          ] as const
        ).map(([cx, cy, sx, sy], i) => (
          <g key={i} stroke={HOT} strokeWidth={1.5} fill="none">
            <line x1={cx} y1={cy} x2={cx + sx * 26} y2={cy} />
            <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 26} />
          </g>
        ))}

        {/* Patent-sheet heading strip */}
        <g
          transform={`translate(${FRAME.x + 34}, ${FRAME.y + 38})`}
          fill={INK_SOFT}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={600}
        >
          <text>FIG. 1 · BOMBARDIER BEETLE — DEFENSIVE REACTOR</text>
        </g>
        <g
          transform={`translate(${FRAME.x + FRAME.w - 34}, ${FRAME.y + 38})`}
          fill={INK_SOFT}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={600}
          textAnchor="end"
        >
          <text>SHEET 003 / 365</text>
        </g>

        {/* Reference axis running down the centreline */}
        <line
          x1={BEETLE_CX}
          y1={FRAME.y + 68}
          x2={BEETLE_CX}
          y2={FRAME.y + FRAME.h - 38}
          stroke={INK_SOFT}
          strokeOpacity={0.18}
          strokeWidth={1}
          strokeDasharray="2 6"
        />

        {/* ── BEETLE (dorsal view, elongated Brachinus proportions) ── */}
        {(() => {
          const HEAD_TOP = 200;
          const HEAD_BOT = 240;
          const PRONO_TOP = HEAD_BOT - 2;
          const PRONO_BOT = 296;
          const ELY_TOP = PRONO_BOT - 4;
          const ELY_BOT = 548;
          const ELY_MAX = 62; // half-width at max girth
          const HEAD_HALF = 22;
          const PRONO_HALF_TOP = 30;
          const PRONO_HALF_BOT = 58;

          // Elytra path — widens near top, tapers gently to a point at ELY_BOT
          const leftEly = `M ${BEETLE_CX} ${ELY_TOP}
            L ${BEETLE_CX - PRONO_HALF_BOT + 6} ${ELY_TOP + 6}
            Q ${BEETLE_CX - ELY_MAX - 4} ${ELY_TOP + 44} ${BEETLE_CX - ELY_MAX} ${ELY_TOP + 100}
            Q ${BEETLE_CX - ELY_MAX + 4} ${ELY_TOP + 180} ${BEETLE_CX - ELY_MAX + 20} ${ELY_TOP + 220}
            Q ${BEETLE_CX - 18} ${ELY_BOT - 4} ${BEETLE_CX} ${ELY_BOT} Z`;
          const rightEly = `M ${BEETLE_CX} ${ELY_TOP}
            L ${BEETLE_CX + PRONO_HALF_BOT - 6} ${ELY_TOP + 6}
            Q ${BEETLE_CX + ELY_MAX + 4} ${ELY_TOP + 44} ${BEETLE_CX + ELY_MAX} ${ELY_TOP + 100}
            Q ${BEETLE_CX + ELY_MAX - 4} ${ELY_TOP + 180} ${BEETLE_CX + ELY_MAX - 20} ${ELY_TOP + 220}
            Q ${BEETLE_CX + 18} ${ELY_BOT - 4} ${BEETLE_CX} ${ELY_BOT} Z`;
          const rimPath = `M ${BEETLE_CX} ${ELY_TOP}
            L ${BEETLE_CX - PRONO_HALF_BOT + 6} ${ELY_TOP + 6}
            Q ${BEETLE_CX - ELY_MAX - 4} ${ELY_TOP + 44} ${BEETLE_CX - ELY_MAX} ${ELY_TOP + 100}
            Q ${BEETLE_CX - ELY_MAX + 4} ${ELY_TOP + 180} ${BEETLE_CX - ELY_MAX + 20} ${ELY_TOP + 220}
            Q ${BEETLE_CX - 18} ${ELY_BOT - 4} ${BEETLE_CX} ${ELY_BOT}
            Q ${BEETLE_CX + 18} ${ELY_BOT - 4} ${BEETLE_CX + ELY_MAX - 20} ${ELY_TOP + 220}
            Q ${BEETLE_CX + ELY_MAX - 4} ${ELY_TOP + 180} ${BEETLE_CX + ELY_MAX} ${ELY_TOP + 100}
            Q ${BEETLE_CX + ELY_MAX + 4} ${ELY_TOP + 44} ${BEETLE_CX + PRONO_HALF_BOT - 6} ${ELY_TOP + 6} Z`;

          return (
            <g opacity={beetleFade}>
              {/* Antennae — curve outward, staying comfortably below header */}
              <path
                d={`M ${BEETLE_CX - HEAD_HALF + 4} ${HEAD_TOP + 2} Q ${BEETLE_CX - 52} ${HEAD_TOP - 14} ${BEETLE_CX - 96} ${HEAD_TOP - 26}`}
                stroke={INK_LINE}
                strokeWidth={2}
                fill="none"
                strokeLinecap="round"
              />
              <path
                d={`M ${BEETLE_CX + HEAD_HALF - 4} ${HEAD_TOP + 2} Q ${BEETLE_CX + 52} ${HEAD_TOP - 14} ${BEETLE_CX + 96} ${HEAD_TOP - 26}`}
                stroke={INK_LINE}
                strokeWidth={2}
                fill="none"
                strokeLinecap="round"
              />
              <circle
                cx={BEETLE_CX - 96}
                cy={HEAD_TOP - 26}
                r={2.4}
                fill={INK_LINE}
              />
              <circle
                cx={BEETLE_CX + 96}
                cy={HEAD_TOP - 26}
                r={2.4}
                fill={INK_LINE}
              />

              {/* Head */}
              <path
                d={`M ${BEETLE_CX - HEAD_HALF} ${HEAD_TOP + 8}
                    Q ${BEETLE_CX - HEAD_HALF - 2} ${HEAD_TOP - 10} ${BEETLE_CX} ${HEAD_TOP - 14}
                    Q ${BEETLE_CX + HEAD_HALF + 2} ${HEAD_TOP - 10} ${BEETLE_CX + HEAD_HALF} ${HEAD_TOP + 8}
                    Q ${BEETLE_CX + HEAD_HALF - 2} ${HEAD_BOT - 4} ${BEETLE_CX} ${HEAD_BOT}
                    Q ${BEETLE_CX - HEAD_HALF + 2} ${HEAD_BOT - 4} ${BEETLE_CX - HEAD_HALF} ${HEAD_TOP + 8} Z`}
                fill={INK_LINE}
              />
              {/* Mandibles */}
              <path
                d={`M ${BEETLE_CX - 10} ${HEAD_TOP - 12} L ${BEETLE_CX - 14} ${HEAD_TOP - 22} L ${BEETLE_CX - 4} ${HEAD_TOP - 14} Z`}
                fill={INK_LINE}
              />
              <path
                d={`M ${BEETLE_CX + 10} ${HEAD_TOP - 12} L ${BEETLE_CX + 14} ${HEAD_TOP - 22} L ${BEETLE_CX + 4} ${HEAD_TOP - 14} Z`}
                fill={INK_LINE}
              />
              {/* Eyes */}
              <circle
                cx={BEETLE_CX - 13}
                cy={HEAD_TOP + 4}
                r={2.4}
                fill={PARCHMENT}
              />
              <circle
                cx={BEETLE_CX + 13}
                cy={HEAD_TOP + 4}
                r={2.4}
                fill={PARCHMENT}
              />

              {/* Pronotum — heart-shape, widens rearward */}
              <path
                d={`M ${BEETLE_CX - PRONO_HALF_TOP} ${PRONO_TOP + 2}
                    Q ${BEETLE_CX - PRONO_HALF_TOP - 2} ${PRONO_TOP - 4} ${BEETLE_CX} ${PRONO_TOP - 4}
                    Q ${BEETLE_CX + PRONO_HALF_TOP + 2} ${PRONO_TOP - 4} ${BEETLE_CX + PRONO_HALF_TOP} ${PRONO_TOP + 2}
                    Q ${BEETLE_CX + PRONO_HALF_BOT + 6} ${PRONO_BOT - 18} ${BEETLE_CX + PRONO_HALF_BOT} ${PRONO_BOT}
                    Q ${BEETLE_CX} ${PRONO_BOT + 6} ${BEETLE_CX - PRONO_HALF_BOT} ${PRONO_BOT}
                    Q ${BEETLE_CX - PRONO_HALF_BOT - 6} ${PRONO_BOT - 18} ${BEETLE_CX - PRONO_HALF_TOP} ${PRONO_TOP + 2} Z`}
                fill={INK_LINE}
              />
              <line
                x1={BEETLE_CX}
                y1={PRONO_TOP}
                x2={BEETLE_CX}
                y2={PRONO_BOT}
                stroke={ELYTRON_DARK}
                strokeOpacity={0.55}
                strokeWidth={1}
              />

              {/* Elytra */}
              <path d={leftEly} fill={ELYTRON} />
              <path d={rightEly} fill={ELYTRON} />

              {/* Elytron edge — sharp brown rim */}
              <path
                d={rimPath}
                fill="none"
                stroke={ELYTRON_DARK}
                strokeWidth={2}
              />

              {/* Longitudinal ridges — parallel striae typical of Carabidae */}
              {[-1, 1].map((s) =>
                [10, 22, 34, 46].map((off, i) => (
                  <path
                    key={`ridge-${s}-${i}`}
                    d={`M ${BEETLE_CX + s * (off + 4)} ${ELY_TOP + 20}
                        Q ${BEETLE_CX + s * (off + 6)} ${ELY_TOP + 130} ${BEETLE_CX + s * (off * 0.35)} ${ELY_BOT - 18}`}
                    stroke={ELYTRON_DARK}
                    strokeOpacity={0.55}
                    strokeWidth={0.9}
                    fill="none"
                  />
                )),
              )}

              {/* Central seam */}
              <line
                x1={BEETLE_CX}
                y1={ELY_TOP}
                x2={BEETLE_CX}
                y2={ELY_BOT}
                stroke={ELYTRON_DARK}
                strokeWidth={1.5}
              />

              {/* Abdomen tip — swivel turret + nozzle */}
              <path
                d={`M ${BEETLE_CX - 14} ${ELY_BOT - 4}
                    Q ${BEETLE_CX - 16} ${NOZZLE_Y - 2} ${BEETLE_CX - 8} ${NOZZLE_Y + 2}
                    L ${BEETLE_CX + 8} ${NOZZLE_Y + 2}
                    Q ${BEETLE_CX + 16} ${NOZZLE_Y - 2} ${BEETLE_CX + 14} ${ELY_BOT - 4} Z`}
                fill={INK_LINE}
              />
              {/* Nozzle rim (metal collar) */}
              <rect
                x={BEETLE_CX - 8}
                y={NOZZLE_Y + 2}
                width={16}
                height={5}
                rx={1.5}
                fill={ELYTRON_DARK}
              />

              {/* Legs (6, drawn LAST so they sit on top of body) */}
              <g
                stroke={INK_LINE}
                strokeWidth={2.4}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {/* Prothoracic */}
                <path
                  d={`M ${BEETLE_CX - 26} ${PRONO_TOP + 12} L ${BEETLE_CX - 78} ${PRONO_TOP - 6} L ${BEETLE_CX - 110} ${PRONO_TOP - 26}`}
                />
                <path
                  d={`M ${BEETLE_CX + 26} ${PRONO_TOP + 12} L ${BEETLE_CX + 78} ${PRONO_TOP - 6} L ${BEETLE_CX + 110} ${PRONO_TOP - 26}`}
                />
                {/* Mesothoracic */}
                <path
                  d={`M ${BEETLE_CX - 30} ${PRONO_BOT - 4} L ${BEETLE_CX - 92} ${PRONO_BOT + 12} L ${BEETLE_CX - 128} ${PRONO_BOT + 36}`}
                />
                <path
                  d={`M ${BEETLE_CX + 30} ${PRONO_BOT - 4} L ${BEETLE_CX + 92} ${PRONO_BOT + 12} L ${BEETLE_CX + 128} ${PRONO_BOT + 36}`}
                />
                {/* Metathoracic — long rear legs */}
                <path
                  d={`M ${BEETLE_CX - ELY_MAX + 8} ${ELY_TOP + 60} L ${BEETLE_CX - 116} ${ELY_TOP + 96} L ${BEETLE_CX - 152} ${ELY_TOP + 138}`}
                />
                <path
                  d={`M ${BEETLE_CX + ELY_MAX - 8} ${ELY_TOP + 60} L ${BEETLE_CX + 116} ${ELY_TOP + 96} L ${BEETLE_CX + 152} ${ELY_TOP + 138}`}
                />
                {/* Tarsal tips — small "feet" markers */}
                {(
                  [
                    [-110, PRONO_TOP - 26],
                    [110, PRONO_TOP - 26],
                    [-128, PRONO_BOT + 36],
                    [128, PRONO_BOT + 36],
                    [-152, ELY_TOP + 138],
                    [152, ELY_TOP + 138],
                  ] as const
                ).map(([dx, y], i) => (
                  <circle
                    key={`tarsus-${i}`}
                    cx={BEETLE_CX + dx}
                    cy={y}
                    r={2.6}
                    fill={INK_LINE}
                  />
                ))}
              </g>
            </g>
          );
        })()}

        {/* ── CUTAWAY OVERLAY (chambers visible through elytra) ─── */}
        {(() => {
          const RES_CY = 380;
          const RES_RX = 44;
          const RES_RY = 62;
          const VALVE_Y1 = RES_CY + RES_RY - 2;
          const VALVE_Y2 = 484;
          const CHAM_X = BEETLE_CX - 32;
          const CHAM_Y = 484;
          const CHAM_W = 64;
          const CHAM_H = 48;

          return (
            <g opacity={cutawayFade}>
              {/* Reservoir (upper chamber) — amber */}
              <ellipse
                cx={BEETLE_CX}
                cy={RES_CY}
                rx={RES_RX}
                ry={RES_RY}
                fill="url(#reservoir-fill)"
                opacity={reservoirCharge * 0.9}
              />
              <ellipse
                cx={BEETLE_CX}
                cy={RES_CY}
                rx={RES_RX}
                ry={RES_RY}
                fill="none"
                stroke={HOT}
                strokeWidth={1.4}
                strokeDasharray="4 3"
              />
              {/* Reservoir contents indicated as small bubbles / droplets */}
              {[
                [-20, -32, 3.4],
                [8, -22, 2.4],
                [-8, -8, 2.6],
                [22, -4, 2.2],
                [-24, 12, 3],
                [10, 18, 2.4],
                [-4, 32, 2.2],
                [22, 34, 2],
              ].map(([dx, dy, r], i) => (
                <circle
                  key={`b-${i}`}
                  cx={BEETLE_CX + dx}
                  cy={RES_CY + dy}
                  r={r}
                  fill="#FFE7B6"
                  opacity={0.75 * reservoirCharge}
                />
              ))}

              {/* Feed valve between chambers */}
              <line
                x1={BEETLE_CX}
                y1={VALVE_Y1}
                x2={BEETLE_CX}
                y2={VALVE_Y2}
                stroke={HOT}
                strokeWidth={1.4}
                strokeDasharray="2 2"
                opacity={reservoirCharge}
              />
              <path
                d={`M ${BEETLE_CX - 7} ${VALVE_Y1 + 3} L ${BEETLE_CX + 7} ${VALVE_Y1 + 3} L ${BEETLE_CX} ${VALVE_Y1 + 13} Z`}
                fill={HOT}
                opacity={reservoirCharge}
              />

              {/* Combustion chamber — near the tip, glowing hot */}
              <rect
                x={CHAM_X}
                y={CHAM_Y}
                width={CHAM_W}
                height={CHAM_H}
                rx={9}
                fill="url(#chamber-fill)"
                opacity={combustionCharge}
              />
              <rect
                x={CHAM_X}
                y={CHAM_Y}
                width={CHAM_W}
                height={CHAM_H}
                rx={9}
                fill="none"
                stroke={INK_LINE}
                strokeWidth={1.4}
                strokeDasharray="3 2"
              />
              {/* Thick-walled hint — double stroke */}
              <rect
                x={CHAM_X - 3}
                y={CHAM_Y - 3}
                width={CHAM_W + 6}
                height={CHAM_H + 6}
                rx={11}
                fill="none"
                stroke={INK_LINE}
                strokeOpacity={0.35}
                strokeWidth={1}
                strokeDasharray="1.5 3"
              />
              {/* Ignition flash */}
              {ignitionFlash > 0.02 && (
                <rect
                  x={CHAM_X}
                  y={CHAM_Y}
                  width={CHAM_W}
                  height={CHAM_H}
                  rx={9}
                  fill="#FFF6D8"
                  opacity={ignitionFlash * 0.9}
                  filter="url(#ignition-glow)"
                />
              )}
            </g>
          );
        })()}

        {/* ── PLUME (downward pulse-jet) ───────────────────────── */}
        {(() => {
          const PLUME_TOP = NOZZLE_Y + 8;
          const PLUME_SPAN = PLUME_END_Y - PLUME_TOP;
          const HALF_WIDTH = 148;
          return (
            <g opacity={plumeIntro}>
              {/* Soft outer envelope cone */}
              <path
                d={`M ${BEETLE_CX - 6} ${PLUME_TOP}
                    L ${BEETLE_CX - HALF_WIDTH} ${PLUME_END_Y}
                    L ${BEETLE_CX + HALF_WIDTH} ${PLUME_END_Y}
                    L ${BEETLE_CX + 6} ${PLUME_TOP} Z`}
                fill="url(#plume-envelope)"
              />

              {/* Central jet — a bright vertical spear that dissipates */}
              <path
                d={`M ${BEETLE_CX - 3} ${PLUME_TOP}
                    L ${BEETLE_CX - 34} ${PLUME_END_Y}
                    L ${BEETLE_CX + 34} ${PLUME_END_Y}
                    L ${BEETLE_CX + 3} ${PLUME_TOP} Z`}
                fill="url(#plume-core)"
                filter="url(#soft-glow)"
              />

              {/* Pulse rings — expanding half-ellipses travelling down */}
              {activePulses.map(({ life, index }) => {
                const t = life;
                const cy = PLUME_TOP + t * PLUME_SPAN;
                const spread = t;
                const rx = 6 + spread * (HALF_WIDTH - 4);
                const ry = 2.5 + spread * 16;
                const opacity = (1 - t) * 0.9;
                const stroke = index % 3 === 0 ? "#FFEDBE" : HOT;
                return (
                  <ellipse
                    key={`pulse-${index}`}
                    cx={BEETLE_CX}
                    cy={cy}
                    rx={rx}
                    ry={ry}
                    fill="none"
                    stroke={stroke}
                    strokeWidth={2.2 * (1 - t) + 0.7}
                    opacity={opacity}
                  />
                );
              })}

              {/* Ejected droplets scattered along the plume edges */}
              {activePulses.slice(-14).map(({ life, index }) => {
                const t = life;
                const cy = PLUME_TOP + t * PLUME_SPAN;
                const rx = 8 + t * (HALF_WIDTH - 4);
                const side = index % 2 === 0 ? -1 : 1;
                const jitter = ((index * 37) % 22) - 11;
                return (
                  <circle
                    key={`drop-${index}`}
                    cx={BEETLE_CX + side * (rx * 0.78) + jitter * 0.4}
                    cy={cy + (index % 5) - 2}
                    r={2 + (1 - t) * 3}
                    fill={index % 3 === 0 ? "#FFEDBE" : HOT}
                    opacity={(1 - t) * 0.9}
                  />
                );
              })}

              {/* Nozzle glow — hottest point */}
              <ellipse
                cx={BEETLE_CX}
                cy={PLUME_TOP + 2}
                rx={12}
                ry={5}
                fill="#FFF8DC"
              />
            </g>
          );
        })()}

        {/* ── LABELS / LEADER LINES ────────────────────────────── */}
        <g
          opacity={labelsFade}
          fontFamily={inter}
          fontSize={10.5}
          fontWeight={600}
          letterSpacing={2.4}
          fill={INK_LINE}
        >
          {/* PRONOTUM (left) */}
          <g>
            <line
              x1={FRAME.x + 60}
              y1={272}
              x2={BEETLE_CX - 50}
              y2={272}
              stroke={INK_SOFT}
              strokeWidth={1}
            />
            <circle
              cx={BEETLE_CX - 50}
              cy={272}
              r={2}
              fill={INK_SOFT}
            />
            <text x={FRAME.x + 60} y={266} textAnchor="start">
              PRONOTUM
            </text>
          </g>

          {/* ELYTRA (right, upper) */}
          <g>
            <line
              x1={FRAME.x + FRAME.w - 60}
              y1={320}
              x2={BEETLE_CX + 58}
              y2={320}
              stroke={INK_SOFT}
              strokeWidth={1}
            />
            <circle cx={BEETLE_CX + 58} cy={320} r={2} fill={INK_SOFT} />
            <text
              x={FRAME.x + FRAME.w - 60}
              y={314}
              textAnchor="end"
            >
              ELYTRON (CUTAWAY)
            </text>
          </g>

          {/* RESERVOIR — left mid */}
          <g>
            <line
              x1={FRAME.x + 60}
              y1={392}
              x2={BEETLE_CX - 48}
              y2={382}
              stroke={HOT}
              strokeWidth={1.2}
            />
            <circle
              cx={BEETLE_CX - 48}
              cy={382}
              r={2.6}
              fill={HOT}
            />
            <text
              x={FRAME.x + 60}
              y={374}
              fill={HOT}
              textAnchor="start"
              fontWeight={700}
            >
              RESERVOIR
            </text>
            <text
              x={FRAME.x + 60}
              y={390}
              fill={INK_SOFT}
              textAnchor="start"
              fontWeight={500}
              fontSize={10}
              letterSpacing={1.6}
            >
              HYDROQUINONE + H₂O₂
            </text>
          </g>

          {/* COMBUSTION CHAMBER — right, at chamber level */}
          <g>
            <line
              x1={FRAME.x + FRAME.w - 60}
              y1={500}
              x2={BEETLE_CX + 34}
              y2={508}
              stroke={HOT}
              strokeWidth={1.2}
            />
            <circle
              cx={BEETLE_CX + 34}
              cy={508}
              r={2.6}
              fill={HOT}
            />
            <text
              x={FRAME.x + FRAME.w - 60}
              y={484}
              fill={HOT}
              textAnchor="end"
              fontWeight={700}
            >
              COMBUSTION CHAMBER
            </text>
            <text
              x={FRAME.x + FRAME.w - 60}
              y={500}
              fill={INK_SOFT}
              textAnchor="end"
              fontWeight={500}
              fontSize={10}
              letterSpacing={1.6}
            >
              CATALASE + PEROXIDASE
            </text>
          </g>

          {/* SWIVEL NOZZLE — left, at nozzle level */}
          <g>
            <line
              x1={FRAME.x + 60}
              y1={NOZZLE_Y + 6}
              x2={BEETLE_CX - 14}
              y2={NOZZLE_Y + 6}
              stroke={INK_SOFT}
              strokeWidth={1}
            />
            <circle
              cx={BEETLE_CX - 14}
              cy={NOZZLE_Y + 6}
              r={2}
              fill={INK_SOFT}
            />
            <text x={FRAME.x + 60} y={NOZZLE_Y + 1} textAnchor="start">
              SWIVEL NOZZLE
            </text>
          </g>

          {/* PLUME TEMPERATURE — right, into the plume */}
          <g>
            <line
              x1={FRAME.x + FRAME.w - 60}
              y1={654}
              x2={BEETLE_CX + 84}
              y2={664}
              stroke={HOT}
              strokeWidth={1.2}
            />
            <circle
              cx={BEETLE_CX + 84}
              cy={664}
              r={2.6}
              fill={HOT}
            />
            <text
              x={FRAME.x + FRAME.w - 60}
              y={638}
              fill={HOT}
              textAnchor="end"
              fontWeight={700}
              fontSize={13}
              letterSpacing={3}
            >
              T ≈ 100 °C
            </text>
            <text
              x={FRAME.x + FRAME.w - 60}
              y={654}
              fill={INK_SOFT}
              textAnchor="end"
              fontWeight={500}
              fontSize={10}
              letterSpacing={1.6}
            >
              BENZOQUINONE SPRAY
            </text>
          </g>

          {/* PULSE RATE — left, lower plume */}
          <g>
            <line
              x1={FRAME.x + 60}
              y1={758}
              x2={BEETLE_CX - 74}
              y2={758}
              stroke={HOT}
              strokeWidth={1.2}
            />
            <circle
              cx={BEETLE_CX - 74}
              cy={758}
              r={2.6}
              fill={HOT}
            />
            <text
              x={FRAME.x + 60}
              y={742}
              fill={HOT}
              textAnchor="start"
              fontWeight={700}
              fontSize={13}
              letterSpacing={3}
            >
              ~500 Hz
            </text>
            <text
              x={FRAME.x + 60}
              y={758}
              fill={INK_SOFT}
              textAnchor="start"
              fontWeight={500}
              fontSize={10}
              letterSpacing={1.6}
            >
              PULSE-JET DISCHARGE
            </text>
          </g>
        </g>

        {/* Caption strip just below the parchment */}
        <g
          transform={`translate(${FRAME.x}, ${FRAME.y + FRAME.h + 22})`}
          fill={STEEL}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
        >
          <text>FIG. 1 · TWO-CHAMBER REACTOR OF BRACHINUS SPP.</text>
          <text
            x={FRAME.w}
            textAnchor="end"
            fill={HOT}
            opacity={0.9}
          >
            BOILING EJECT · ~500 PULSES / SECOND
          </text>
        </g>
      </svg>

      {/* ── Type lockup ────────────────────────────────────────── */}
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
            color: HOT,
            fontFamily: inter,
            fontSize: 13,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 18,
            fontWeight: 600,
          }}
        >
          Role <span style={{ color: STEEL, margin: "0 4px" }}>/</span>
          <span style={{ color: "#EDEDEF", letterSpacing: 5 }}>
            Chemical Engineer
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
          The pulsejet
          <br />
          chemist.
        </div>

        <div
          style={{
            marginTop: 30,
            color: "#C8CAD0",
            fontFamily: inter,
            fontSize: 19,
            lineHeight: 1.4,
            fontWeight: 400,
            maxWidth: 880,
            opacity: hookOpacity,
          }}
        >
          The bombardier beetle (
          <span style={{ color: HOT, fontWeight: 600 }}>Brachinus</span>) dumps
          hydroquinone and hydrogen peroxide from a reservoir into a
          chitin-walled combustion chamber, where catalase and peroxidase fire
          a boiling ~100 °C benzoquinone spray in pulses at roughly 500 Hz.
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
          color: STEEL,
          fontFamily: inter,
          fontSize: 11,
          letterSpacing: 3,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Dean, Aneshansley, Edgerton &amp; Eisner · Science 248 (1990) 1219–1221</span>
        <span>
          <span style={{ color: HOT }}>●</span> Two-chamber pulse-jet
        </span>
      </div>
    </AbsoluteFill>
  );
};
