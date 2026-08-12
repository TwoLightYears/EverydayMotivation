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

// ── Palette — from Brachinus's real coloration ──────────────────────────
const INK = "#0A0B10";
const BOARD = "#101319";
const ELYTRA = "#151922";
const ELYTRA_HILITE = "#232939";
const PRONOTUM = "#E8552A";
const PRONOTUM_DEEP = "#B0391B";
const FLASH = "#F6C766";
const FLASH_HOT = "#FFE7A2";
const PARCH = "#EFE6D4";
const GRAY = "#8A8F99";
const GRID = "#181C25";
const GRID_MAJOR = "#212734";

// ── Layout constants (poster is 1080×1350) ──────────────────────────────
const FRAME = { x: 60, y: 128, w: 960, h: 720 };

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ── Timing ────────────────────────────────────────────────────────────
  const chassisSpring = spring({
    frame,
    fps,
    config: { damping: 200, mass: 1 },
  });
  const reservoirFill = interpolate(
    frame,
    [fps * 0.8, fps * 2.0],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) },
  );
  const chamberGlow = interpolate(
    frame,
    [fps * 1.6, fps * 2.3],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const labelIn = interpolate(
    frame,
    [fps * 1.2, fps * 2.2],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) },
  );
  const captionIn = interpolate(
    frame,
    [fps * 1.6, fps * 2.6],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const titleSpring = spring({
    frame: frame - fps * 0.6,
    fps,
    config: { damping: 200, mass: 0.9 },
  });
  const hookOpacity = interpolate(frame, [fps * 1.2, fps * 2.2], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Pulse train — visualise ~500 Hz as a rhythmic 6-puff loop ────────
  const PULSE_HZ = 3.0; // 3 puffs per second on screen
  const PUFFS = 6;
  const pulsePhase = ((frame / fps) * PULSE_HZ) % 1; // 0..1 emit
  const ignited = chamberGlow > 0.5;

  // ── Geometry: horizontal beetle inside FRAME ─────────────────────────
  // Beetle centreline sits roughly middle of the frame.
  const CY = FRAME.y + 380;
  const HEAD_X = FRAME.x + 116;
  const TURRET_X = FRAME.x + FRAME.w - 240; // leave room for the pulse column
  const BODY_LEN = TURRET_X - HEAD_X;

  // Sections along the body — proper beetle proportions
  const HEAD_END = HEAD_X + BODY_LEN * 0.11;
  const PRONOTUM_END = HEAD_X + BODY_LEN * 0.24;
  const ELYTRA_END = HEAD_X + BODY_LEN * 0.72;
  const ABDOMEN_END = TURRET_X;

  // ── Reveal mask: chassis draws head-to-tail ──────────────────────────
  const reveal = Math.min(1, Math.max(0, chassisSpring));
  const revealX = HEAD_X + reveal * (TURRET_X - HEAD_X + 60);

  return (
    <AbsoluteFill style={{ backgroundColor: INK, fontFamily: inter }}>
      <style>{fontCss}</style>

      {/* ── Top metadata band ───────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          top: 54,
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
        <span style={{ color: PRONOTUM }}>2026 · 08 · 12</span>
      </div>

      {/* ── Drafting frame + schematic ─────────────────────────────── */}
      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          <pattern id="grid" x={FRAME.x} y={FRAME.y} width={40} height={40} patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke={GRID} strokeWidth={1} />
          </pattern>
          <pattern id="grid-major" x={FRAME.x} y={FRAME.y} width={160} height={160} patternUnits="userSpaceOnUse">
            <path d="M 160 0 L 0 0 0 160" fill="none" stroke={GRID_MAJOR} strokeWidth={1} />
          </pattern>

          <radialGradient id="board-vignette" cx="50%" cy="40%" r="72%">
            <stop offset="0%" stopColor="#141821" stopOpacity={1} />
            <stop offset="100%" stopColor={BOARD} stopOpacity={1} />
          </radialGradient>

          <radialGradient id="flash" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={FLASH_HOT} stopOpacity={1} />
            <stop offset="45%" stopColor={FLASH} stopOpacity={0.95} />
            <stop offset="100%" stopColor={FLASH} stopOpacity={0} />
          </radialGradient>

          <radialGradient id="chamber-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={FLASH_HOT} stopOpacity={1} />
            <stop offset="100%" stopColor={PRONOTUM} stopOpacity={0} />
          </radialGradient>

          <linearGradient id="elytra-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={ELYTRA_HILITE} />
            <stop offset="60%" stopColor={ELYTRA} />
            <stop offset="100%" stopColor="#0C1017" />
          </linearGradient>

          <linearGradient id="pronotum-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#F27548" />
            <stop offset="60%" stopColor={PRONOTUM} />
            <stop offset="100%" stopColor={PRONOTUM_DEEP} />
          </linearGradient>

          <filter id="flash-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Clip that reveals the chassis progressively head-to-tail */}
          <clipPath id="reveal-clip">
            <rect x={FRAME.x - 20} y={FRAME.y - 20} width={revealX - (FRAME.x - 20)} height={FRAME.h + 40} />
          </clipPath>
        </defs>

        {/* Board */}
        <rect x={FRAME.x} y={FRAME.y} width={FRAME.w} height={FRAME.h} fill="url(#board-vignette)" />
        <rect x={FRAME.x} y={FRAME.y} width={FRAME.w} height={FRAME.h} fill="url(#grid)" />
        <rect x={FRAME.x} y={FRAME.y} width={FRAME.w} height={FRAME.h} fill="url(#grid-major)" />
        <rect
          x={FRAME.x + 0.5}
          y={FRAME.y + 0.5}
          width={FRAME.w - 1}
          height={FRAME.h - 1}
          fill="none"
          stroke="#2A303B"
          strokeWidth={1}
        />

        {/* Corner ticks */}
        {(
          [
            [FRAME.x, FRAME.y, 1, 1],
            [FRAME.x + FRAME.w, FRAME.y, -1, 1],
            [FRAME.x, FRAME.y + FRAME.h, 1, -1],
            [FRAME.x + FRAME.w, FRAME.y + FRAME.h, -1, -1],
          ] as const
        ).map(([cx, cy, sx, sy], i) => (
          <g key={i} stroke={PRONOTUM} strokeWidth={1.5} fill="none">
            <line x1={cx} y1={cy} x2={cx + sx * 26} y2={cy} />
            <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 26} />
          </g>
        ))}

        {/* Sheet label — top-left of frame */}
        <g transform={`translate(${FRAME.x + 22}, ${FRAME.y + 30})`}>
          <text
            fill={GRAY}
            fontFamily={inter}
            fontWeight={600}
            fontSize={11}
            letterSpacing={3.5}
          >
            SHEET 1 / 1 · DORSAL CUTAWAY · SCALE 12:1
          </text>
        </g>

        {/* Sheet label — top-right */}
        <g transform={`translate(${FRAME.x + FRAME.w - 22}, ${FRAME.y + 30})`}>
          <text
            fill={GRAY}
            fontFamily={inter}
            fontWeight={600}
            fontSize={11}
            letterSpacing={3.5}
            textAnchor="end"
          >
            BRACHINUS · CARABIDAE
          </text>
        </g>

        {/* Centreline construction line (thin, dashed) */}
        <line
          x1={HEAD_X - 20}
          y1={CY}
          x2={TURRET_X + 240}
          y2={CY}
          stroke="#2A303B"
          strokeWidth={1}
          strokeDasharray="6 6"
          opacity={0.55}
        />

        {/* ── Chassis: drawn once and clipped by progressive reveal ── */}
        <g clipPath="url(#reveal-clip)">
          {/* ── Legs (drawn under body so joints hide behind chassis) ── */}
          {/* Three per side, oriented outward with a real knee joint */}
          {[
            { x: HEAD_END + 6, coxaY: 34, midX: 22, midY: 82, footX: 14, footY: 128 },
            { x: PRONOTUM_END + 24, coxaY: 42, midX: 52, midY: 108, footX: 42, footY: 168 },
            { x: PRONOTUM_END + 96, coxaY: 44, midX: 68, midY: 118, footX: 60, footY: 188 },
          ].map((leg, i) =>
            [-1, 1].map((sign) => (
              <g
                key={`leg-${i}-${sign}`}
                stroke={PRONOTUM_DEEP}
                strokeWidth={2.4}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path
                  d={`M ${leg.x} ${CY + sign * leg.coxaY} L ${leg.x + leg.midX} ${CY + sign * leg.midY} L ${leg.x + leg.footX} ${CY + sign * leg.footY}`}
                />
                {/* Tarsus tip tick */}
                <line
                  x1={leg.x + leg.footX}
                  y1={CY + sign * leg.footY}
                  x2={leg.x + leg.footX - 6}
                  y2={CY + sign * (leg.footY + 6)}
                  stroke={PRONOTUM_DEEP}
                  strokeWidth={2.2}
                />
              </g>
            )),
          )}

          {/* Antennae — thick parchment strokes with a subtle bend */}
          {[0, 1].map((i) => {
            const sign = i === 0 ? -1 : 1;
            const y0 = CY + sign * 12;
            return (
              <path
                key={`ant-${i}`}
                d={`M ${HEAD_X + 4} ${y0} Q ${HEAD_X - 30} ${y0 + sign * 40} ${HEAD_X - 84} ${y0 + sign * 46}`}
                stroke={PARCH}
                strokeWidth={2.2}
                fill="none"
                strokeLinecap="round"
                opacity={0.92}
              />
            );
          })}

          {/* Head (rounded, slightly larger) */}
          <path
            d={`M ${HEAD_X + 8} ${CY - 40} Q ${HEAD_X - 32} ${CY} ${HEAD_X + 8} ${CY + 40} L ${HEAD_END + 6} ${CY + 40} L ${HEAD_END + 6} ${CY - 40} Z`}
            fill="url(#pronotum-grad)"
            stroke={PRONOTUM_DEEP}
            strokeWidth={1.4}
          />
          {/* Mandibles — jaw pincers */}
          <path
            d={`M ${HEAD_X - 16} ${CY - 8} Q ${HEAD_X - 30} ${CY - 12} ${HEAD_X - 34} ${CY - 20}`}
            stroke={PRONOTUM_DEEP}
            strokeWidth={2.4}
            strokeLinecap="round"
            fill="none"
          />
          <path
            d={`M ${HEAD_X - 16} ${CY + 8} Q ${HEAD_X - 30} ${CY + 12} ${HEAD_X - 34} ${CY + 20}`}
            stroke={PRONOTUM_DEEP}
            strokeWidth={2.4}
            strokeLinecap="round"
            fill="none"
          />
          {/* Compound eyes */}
          <ellipse cx={HEAD_X - 2} cy={CY - 24} rx={4.5} ry={5.5} fill={INK} />
          <ellipse cx={HEAD_X - 2} cy={CY + 24} rx={4.5} ry={5.5} fill={INK} />
          {/* Eye highlight */}
          <circle cx={HEAD_X - 3} cy={CY - 25} r={1.2} fill={PARCH} opacity={0.7} />
          <circle cx={HEAD_X - 3} cy={CY + 23} r={1.2} fill={PARCH} opacity={0.7} />

          {/* Pronotum — squarer shield, only slightly wider than head */}
          <path
            d={`M ${HEAD_END + 2} ${CY - 46} Q ${HEAD_END + 8} ${CY - 56} ${HEAD_END + 22} ${CY - 58} L ${PRONOTUM_END - 8} ${CY - 60} Q ${PRONOTUM_END + 4} ${CY - 54} ${PRONOTUM_END + 6} ${CY - 44} L ${PRONOTUM_END + 6} ${CY + 44} Q ${PRONOTUM_END + 4} ${CY + 54} ${PRONOTUM_END - 8} ${CY + 60} L ${HEAD_END + 22} ${CY + 58} Q ${HEAD_END + 8} ${CY + 56} ${HEAD_END + 2} ${CY + 46} Z`}
            fill="url(#pronotum-grad)"
            stroke={PRONOTUM_DEEP}
            strokeWidth={1.4}
          />
          {/* Pronotum central pit */}
          <ellipse
            cx={(HEAD_END + PRONOTUM_END) / 2 + 4}
            cy={CY}
            rx={5}
            ry={18}
            fill={PRONOTUM_DEEP}
            opacity={0.55}
          />

          {/* ── Elytra — two hard wings meeting at the midline ── */}
          {/* Top elytron */}
          <path
            d={`M ${PRONOTUM_END + 4} ${CY - 62} L ${ELYTRA_END - 40} ${CY - 68} Q ${ELYTRA_END + 6} ${CY - 50} ${ELYTRA_END + 2} ${CY - 4} L ${PRONOTUM_END + 8} ${CY - 4} Z`}
            fill="url(#elytra-grad)"
            stroke={ELYTRA_HILITE}
            strokeWidth={1.6}
          />
          {/* Bottom elytron */}
          <path
            d={`M ${PRONOTUM_END + 4} ${CY + 62} L ${ELYTRA_END - 40} ${CY + 68} Q ${ELYTRA_END + 6} ${CY + 50} ${ELYTRA_END + 2} ${CY + 4} L ${PRONOTUM_END + 8} ${CY + 4} Z`}
            fill="url(#elytra-grad)"
            stroke={ELYTRA_HILITE}
            strokeWidth={1.6}
          />
          {/* Dorsal midline suture */}
          <line
            x1={PRONOTUM_END + 8}
            y1={CY}
            x2={ELYTRA_END + 2}
            y2={CY}
            stroke="#0A0D14"
            strokeWidth={2}
          />
          <line
            x1={PRONOTUM_END + 8}
            y1={CY - 0.5}
            x2={ELYTRA_END + 2}
            y2={CY - 0.5}
            stroke={ELYTRA_HILITE}
            strokeWidth={0.6}
            opacity={0.6}
          />

          {/* Elytra longitudinal striations — 4 per elytron */}
          {[-52, -36, -22, -10, 10, 22, 36, 52].map((yOff) => (
            <path
              key={`stria-${yOff}`}
              d={`M ${PRONOTUM_END + 16} ${CY + yOff} Q ${(PRONOTUM_END + ELYTRA_END) / 2 + 20} ${CY + yOff * 1.02} ${ELYTRA_END - 22} ${CY + yOff * 0.75}`}
              fill="none"
              stroke="#2E3546"
              strokeWidth={0.9}
              opacity={0.75}
            />
          ))}
          {/* Highlight sheen along the top elytron */}
          <path
            d={`M ${PRONOTUM_END + 18} ${CY - 48} Q ${(PRONOTUM_END + ELYTRA_END) / 2 + 14} ${CY - 56} ${ELYTRA_END - 44} ${CY - 46}`}
            fill="none"
            stroke="#3A4358"
            strokeWidth={1.6}
            opacity={0.55}
          />

          {/* ── Abdomen cutaway (exposed tail beyond elytra) ── */}
          <path
            d={`M ${ELYTRA_END - 6} ${CY - 56} L ${ABDOMEN_END - 6} ${CY - 48} Q ${ABDOMEN_END + 6} ${CY - 24} ${ABDOMEN_END + 6} ${CY} Q ${ABDOMEN_END + 6} ${CY + 24} ${ABDOMEN_END - 6} ${CY + 48} L ${ELYTRA_END - 6} ${CY + 56}`}
            fill="#0F131A"
            stroke={PARCH}
            strokeWidth={1.3}
            strokeDasharray="5 3"
            opacity={0.9}
          />

          {/* Segment ticks along the abdomen */}
          {[0.25, 0.5, 0.75].map((k) => {
            const x = ELYTRA_END + (ABDOMEN_END - ELYTRA_END) * k;
            const h = 48 - k * 12;
            return (
              <line
                key={`seg-${k}`}
                x1={x}
                y1={CY - h}
                x2={x}
                y2={CY + h}
                stroke={PARCH}
                strokeWidth={0.8}
                strokeDasharray="2 3"
                opacity={0.35}
              />
            );
          })}

          {/* Reservoirs — hydroquinones (top) & H2O2 (bottom) */}
          {[
            { sign: -1, tint: "#B69A55" },
            { sign: 1, tint: "#5FA9C8" },
          ].map((r) => {
            const cx = ELYTRA_END + 40;
            const cy = CY + r.sign * 28;
            const w = 78;
            const h = 32;
            const fillH = h * reservoirFill;
            return (
              <g key={`res-${r.sign}`}>
                {/* Vessel outline */}
                <rect
                  x={cx - w / 2}
                  y={cy - h / 2}
                  width={w}
                  height={h}
                  rx={6}
                  fill="#0B0E14"
                  stroke={PARCH}
                  strokeWidth={1.3}
                />
                {/* Fill */}
                <rect
                  x={cx - w / 2 + 3}
                  y={cy + h / 2 - fillH + 1.5}
                  width={w - 6}
                  height={Math.max(0, fillH - 3)}
                  rx={4}
                  fill={r.tint}
                  opacity={0.9}
                />
                {/* Level marks */}
                {[0.33, 0.66].map((f) => (
                  <line
                    key={`mark-${r.sign}-${f}`}
                    x1={cx - w / 2}
                    y1={cy + h / 2 - h * f}
                    x2={cx - w / 2 + 4}
                    y2={cy + h / 2 - h * f}
                    stroke={PARCH}
                    strokeWidth={0.8}
                    opacity={0.6}
                  />
                ))}
                {/* Feed pipe → into chamber */}
                <path
                  d={`M ${cx + w / 2} ${cy} L ${cx + w / 2 + 22} ${cy} L ${cx + w / 2 + 34} ${CY + r.sign * 6}`}
                  stroke={PARCH}
                  strokeWidth={1.4}
                  fill="none"
                />
                {/* Valve tick */}
                <circle
                  cx={cx + w / 2 + 18}
                  cy={cy}
                  r={4.5}
                  fill={INK}
                  stroke={PARCH}
                  strokeWidth={1.2}
                />
              </g>
            );
          })}

          {/* Reaction chamber */}
          <g>
            <circle
              cx={ABDOMEN_END - 22}
              cy={CY}
              r={22}
              fill={INK}
              stroke={PARCH}
              strokeWidth={1.6}
            />
            {/* Catalyst lining — dashed inner ring */}
            <circle
              cx={ABDOMEN_END - 22}
              cy={CY}
              r={16}
              fill="none"
              stroke={PRONOTUM}
              strokeWidth={1.3}
              strokeDasharray="3 3"
              opacity={0.85}
            />
            {/* Ignition glow */}
            <circle
              cx={ABDOMEN_END - 22}
              cy={CY}
              r={30}
              fill="url(#chamber-glow)"
              opacity={chamberGlow}
            />
            <circle
              cx={ABDOMEN_END - 22}
              cy={CY}
              r={4}
              fill={FLASH_HOT}
              opacity={chamberGlow}
            />
          </g>

          {/* Turret nozzle */}
          <g>
            <path
              d={`M ${ABDOMEN_END - 2} ${CY - 9} L ${ABDOMEN_END + 24} ${CY - 5} L ${ABDOMEN_END + 24} ${CY + 5} L ${ABDOMEN_END - 2} ${CY + 9} Z`}
              fill={ELYTRA_HILITE}
              stroke={PARCH}
              strokeWidth={1.4}
            />
          </g>
        </g>

        {/* ── Pulse column: staged concentric puffs (independent of reveal) ── */}
        {ignited && (
          <g filter="url(#flash-glow)">
            {Array.from({ length: PUFFS }).map((_, i) => {
              // Each puff is offset in age (0..1) by 1/PUFFS from the current phase.
              const age = (pulsePhase + i / PUFFS) % 1;
              const cx = ABDOMEN_END + 32 + age * 200;
              const r = 10 + age * 44;
              const op = (1 - age) * 0.85;
              return (
                <circle
                  key={`puff-${i}`}
                  cx={cx}
                  cy={CY}
                  r={r}
                  fill="url(#flash)"
                  opacity={op}
                />
              );
            })}
            {/* Nozzle spark — punchy hot core at the very tip */}
            <circle
              cx={ABDOMEN_END + 26}
              cy={CY}
              r={7 + Math.sin(pulsePhase * Math.PI * 2) * 2}
              fill={FLASH_HOT}
              opacity={0.95}
            />
          </g>
        )}

        {/* ── Callouts / leader lines ─────────────────────────────── */}
        {/* Upper callout: HYDROQUINONES */}
        <g opacity={labelIn}>
          <line
            x1={ELYTRA_END + 34}
            y1={CY - 60}
            x2={ELYTRA_END + 34}
            y2={FRAME.y + 92}
            stroke={PARCH}
            strokeWidth={1.1}
          />
          <line
            x1={ELYTRA_END + 34}
            y1={FRAME.y + 92}
            x2={FRAME.x + FRAME.w - 40}
            y2={FRAME.y + 92}
            stroke={PARCH}
            strokeWidth={1.1}
          />
          <text
            x={FRAME.x + FRAME.w - 40}
            y={FRAME.y + 86}
            textAnchor="end"
            fill={PARCH}
            fontFamily={inter}
            fontSize={12}
            fontWeight={600}
            letterSpacing={3}
          >
            HYDROQUINONES
          </text>
          <text
            x={FRAME.x + FRAME.w - 40}
            y={FRAME.y + 110}
            textAnchor="end"
            fill={GRAY}
            fontFamily={inter}
            fontSize={11}
            letterSpacing={2}
          >
            C₆H₄(OH)₂ · fuel
          </text>
        </g>

        {/* Lower callout: H2O2 */}
        <g opacity={labelIn}>
          <line
            x1={ELYTRA_END + 34}
            y1={CY + 60}
            x2={ELYTRA_END + 34}
            y2={FRAME.y + FRAME.h - 92}
            stroke={PARCH}
            strokeWidth={1.1}
          />
          <line
            x1={ELYTRA_END + 34}
            y1={FRAME.y + FRAME.h - 92}
            x2={FRAME.x + FRAME.w - 40}
            y2={FRAME.y + FRAME.h - 92}
            stroke={PARCH}
            strokeWidth={1.1}
          />
          <text
            x={FRAME.x + FRAME.w - 40}
            y={FRAME.y + FRAME.h - 98}
            textAnchor="end"
            fill={PARCH}
            fontFamily={inter}
            fontSize={12}
            fontWeight={600}
            letterSpacing={3}
          >
            HYDROGEN PEROXIDE
          </text>
          <text
            x={FRAME.x + FRAME.w - 40}
            y={FRAME.y + FRAME.h - 76}
            textAnchor="end"
            fill={GRAY}
            fontFamily={inter}
            fontSize={11}
            letterSpacing={2}
          >
            H₂O₂ · oxidiser · ≈ 25% aq.
          </text>
        </g>

        {/* Chamber callout — top-left over pronotum */}
        <g opacity={labelIn}>
          <line
            x1={ABDOMEN_END - 24}
            y1={CY - 22}
            x2={ABDOMEN_END - 24}
            y2={FRAME.y + 132}
            stroke={PRONOTUM}
            strokeWidth={1.1}
          />
          <line
            x1={ABDOMEN_END - 24}
            y1={FRAME.y + 132}
            x2={FRAME.x + FRAME.w - 40}
            y2={FRAME.y + 132}
            stroke={PRONOTUM}
            strokeWidth={1.1}
          />
          <text
            x={FRAME.x + FRAME.w - 40}
            y={FRAME.y + 152}
            textAnchor="end"
            fill={PRONOTUM}
            fontFamily={inter}
            fontSize={12}
            fontWeight={600}
            letterSpacing={3}
          >
            REACTION CHAMBER
          </text>
          <text
            x={FRAME.x + FRAME.w - 40}
            y={FRAME.y + 170}
            textAnchor="end"
            fill={GRAY}
            fontFamily={inter}
            fontSize={11}
            letterSpacing={2}
          >
            catalase + peroxidase · ≈ 100 °C
          </text>
        </g>

        {/* Turret callout — right-side, aligned with pulse column */}
        <g opacity={labelIn}>
          <line
            x1={ABDOMEN_END + 12}
            y1={CY + 24}
            x2={ABDOMEN_END + 12}
            y2={FRAME.y + FRAME.h - 132}
            stroke={FLASH}
            strokeWidth={1.1}
          />
          <line
            x1={ABDOMEN_END + 12}
            y1={FRAME.y + FRAME.h - 132}
            x2={FRAME.x + FRAME.w - 40}
            y2={FRAME.y + FRAME.h - 132}
            stroke={FLASH}
            strokeWidth={1.1}
          />
          <text
            x={FRAME.x + FRAME.w - 40}
            y={FRAME.y + FRAME.h - 152}
            textAnchor="end"
            fill={FLASH}
            fontFamily={inter}
            fontSize={12}
            fontWeight={600}
            letterSpacing={3}
          >
            PULSE-JET TURRET
          </text>
          <text
            x={FRAME.x + FRAME.w - 40}
            y={FRAME.y + FRAME.h - 134}
            textAnchor="end"
            fill={GRAY}
            fontFamily={inter}
            fontSize={11}
            letterSpacing={2}
          >
            ≈ 500 pulses · s⁻¹ · 100 °C ejecta
          </text>
        </g>

        {/* Caption strip below the frame */}
        <g
          transform={`translate(${FRAME.x}, ${FRAME.y + FRAME.h + 24})`}
          fill={GRAY}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
          opacity={captionIn}
        >
          <text>FIG. 1 · DORSAL CUTAWAY · BRACHINUS DEFENSIVE APPARATUS</text>
          <text x={FRAME.w} textAnchor="end" fill={FLASH} opacity={0.9}>
            HIGH-SPEED THERMOGRAPHY · DEAN ET AL. 1990
          </text>
        </g>
      </svg>

      {/* ── Type lockup ────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 918,
          opacity: titleSpring,
          transform: `translateY(${interpolate(titleSpring, [0, 1], [16, 0])}px)`,
        }}
      >
        <div
          style={{
            color: PRONOTUM,
            fontFamily: inter,
            fontSize: 13,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 18,
            fontWeight: 600,
          }}
        >
          Role <span style={{ color: GRAY, margin: "0 4px" }}>/</span>
          <span style={{ color: "#EDEDEF", letterSpacing: 5 }}>Rocket Engineer</span>
        </div>

        <div
          style={{
            color: "#F4F4F6",
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 80,
            lineHeight: 0.96,
            letterSpacing: -1.4,
            fontStyle: "italic",
          }}
        >
          The beetle who beat
          <br />
          us to the pulse-jet.
        </div>

        <div
          style={{
            marginTop: 30,
            color: "#C8CAD0",
            fontFamily: inter,
            fontSize: 19,
            lineHeight: 1.42,
            fontWeight: 400,
            maxWidth: 880,
            opacity: hookOpacity,
          }}
        >
          A threatened{" "}
          <span style={{ color: PRONOTUM, fontWeight: 600 }}>
            Brachinus
          </span>{" "}
          mixes hydroquinones with 25% hydrogen peroxide over a catalase-peroxidase lining and fires the boiling spray from its abdominal turret at{" "}
          <span style={{ color: FLASH, fontWeight: 600 }}>~500 pulses per second</span>
          {" "}— a natural pulse-jet engine timed by high-speed thermography.
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          bottom: 46,
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
        <span>Dean, Aneshansley, Edgerton, Eisner · Science 248 (1990) 1219–1221</span>
        <span>
          <span style={{ color: FLASH }}>●</span> 500 Hz pulse train
        </span>
      </div>
    </AbsoluteFill>
  );
};
