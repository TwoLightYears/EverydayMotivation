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

// Palette — taken from the concept's visual brief (Brachinus bombardier beetle)
const INK = "#0B0C10";
const BOARD = "#101218";
const ORANGE = "#E85A2B";
const EMBER = "#F4A869";
const STEEL = "#2E4A66";
const CHAMBER = "#A8A196";
const RULE = "#1F2530";
const RULE_MAJOR = "#2A313E";

// ── Pulsed-spray helper ───────────────────────────────────────────────
// Returns the 0..1 intensity of pulse i given frame.
const pulseEnvelope = (frame: number, startFrame: number, periodF: number) => {
  const local = frame - startFrame;
  if (local < 0) return 0;
  const phase = (local % periodF) / periodF;
  // Fast attack, exponential decay — reads as a "pop".
  if (phase < 0.08) return phase / 0.08;
  return Math.max(0, Math.exp(-(phase - 0.08) * 7));
};

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ── Phases ───────────────────────────────────────────────────────────
  // 0.0s  hero appears
  // 0.3s  schematic strokes
  // 0.8s  reservoirs fill (spring)
  // 1.6s  reaction chamber primes (spring)
  // 2.0s  pulse train begins (5 pulses ~ every 10 frames at 30fps)
  // 3.5s  title springs in
  // 4.0s  hook fades in

  const strokeDraw = spring({
    frame: frame - fps * 0.3,
    fps,
    config: { damping: 180, mass: 0.7 },
  });

  const reservoirFillL = spring({
    frame: frame - fps * 0.8,
    fps,
    config: { damping: 170, mass: 0.9 },
  });
  const reservoirFillR = spring({
    frame: frame - fps * 0.95,
    fps,
    config: { damping: 170, mass: 0.9 },
  });

  const chamberPrime = spring({
    frame: frame - fps * 1.6,
    fps,
    config: { damping: 150, mass: 0.8 },
  });

  // Pulse train: dense staccato pulses (visually abstracted from 500Hz)
  const pulseStart = fps * 1.8;
  const periodF = 4; // one pulse every 4 frames at 30fps
  const pulseCount = 14;
  const pulseLifeF = 48;
  const totalPulseSpan = periodF * pulseCount;
  const trainActive = frame >= pulseStart && frame < pulseStart + totalPulseSpan + pulseLifeF;
  const trainIntensity = trainActive
    ? pulseEnvelope(frame, pulseStart, periodF)
    : 0;

  // Heat shimmer phase (continuous after the first pulse)
  const shimmerPhase = ((frame - pulseStart) / fps) * Math.PI * 2;
  const shimmerActive = frame > pulseStart;

  const titleSpring = spring({
    frame: frame - fps * 2.3,
    fps,
    config: { damping: 200, mass: 0.8 },
  });

  const hookOpacity = interpolate(
    frame,
    [fps * 2.8, fps * 3.7],
    [0, 1],
    {
      easing: Easing.out(Easing.cubic),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }
  );

  // Pulse count-up readout (UI telemetry on right)
  let shotsFired = 0;
  for (let i = 0; i < pulseCount; i++) {
    if (frame >= pulseStart + i * periodF) shotsFired = i + 1;
  }

  // ── Page layout (1080 × 1350 portrait) ──────────────────────────────
  const FRAME = { x: 60, y: 140, w: 960, h: 760 };
  const CENTER_X = FRAME.x + FRAME.w / 2;

  // Beetle silhouette anchor (profile, facing right)
  // Reaction chamber & abdomen along a near-horizontal axis.
  const AXIS_Y = FRAME.y + 500;
  const HEAD_X = FRAME.x + 185;
  const TAIL_X = FRAME.x + 775; // nozzle tip
  const CHAMBER_X = TAIL_X - 115;
  // Reservoirs floating in the plate above the beetle, patent-diagram style.
  const RES_L = { x: FRAME.x + 260, y: FRAME.y + 220 };
  const RES_R = { x: FRAME.x + 440, y: FRAME.y + 220 };

  // Build spray pulses: each pulse spawns at pulseStart + i*periodF and travels right.
  const pulses: { i: number; age: number; alpha: number; dist: number; t: number }[] = [];
  for (let i = 0; i < pulseCount; i++) {
    const birth = pulseStart + i * periodF;
    const age = frame - birth;
    if (age >= 0 && age < pulseLifeF) {
      const t = age / pulseLifeF;
      const alpha = Math.max(0, Math.pow(1 - t, 1.4));
      // Ease-out travel: fast off the nozzle, decelerating
      const travel = 1 - Math.pow(1 - t, 2.2);
      const dist = travel * 200;
      pulses.push({ i, age, alpha, dist, t });
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
          color: CHAMBER,
          fontFamily: inter,
          fontSize: 13,
          letterSpacing: 4.5,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Everyday Motivation · No. 003</span>
        <span style={{ color: ORANGE }}>2026 · 11 · 23</span>
      </div>

      {/* Schematic board */}
      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          {/* Grid */}
          <pattern
            id="grid"
            x={FRAME.x}
            y={FRAME.y}
            width={40}
            height={40}
            patternUnits="userSpaceOnUse"
          >
            <path d={`M 40 0 L 0 0 0 40`} fill="none" stroke={RULE} strokeWidth={1} />
          </pattern>
          <pattern
            id="grid-major"
            x={FRAME.x}
            y={FRAME.y}
            width={160}
            height={160}
            patternUnits="userSpaceOnUse"
          >
            <path d={`M 160 0 L 0 0 0 160`} fill="none" stroke={RULE_MAJOR} strokeWidth={1} />
          </pattern>

          {/* Board vignette */}
          <radialGradient id="board-vignette" cx="50%" cy="45%" r="70%">
            <stop offset="0%" stopColor="#141821" stopOpacity={1} />
            <stop offset="100%" stopColor={BOARD} stopOpacity={1} />
          </radialGradient>

          {/* Spray pulse glow */}
          <radialGradient id="pulse-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={EMBER} stopOpacity={0.9} />
            <stop offset="60%" stopColor={ORANGE} stopOpacity={0.4} />
            <stop offset="100%" stopColor={ORANGE} stopOpacity={0} />
          </radialGradient>

          <radialGradient id="chamber-heat" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={EMBER} stopOpacity={0.85} />
            <stop offset="100%" stopColor={ORANGE} stopOpacity={0} />
          </radialGradient>

          <filter id="pulse-blur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" />
          </filter>

          <filter id="chamber-blur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="8" />
          </filter>
        </defs>

        {/* Board + grid */}
        <rect x={FRAME.x} y={FRAME.y} width={FRAME.w} height={FRAME.h} fill="url(#board-vignette)" />
        <rect x={FRAME.x} y={FRAME.y} width={FRAME.w} height={FRAME.h} fill="url(#grid)" />
        <rect x={FRAME.x} y={FRAME.y} width={FRAME.w} height={FRAME.h} fill="url(#grid-major)" />
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
          <g key={i} stroke={ORANGE} strokeWidth={1.5} fill="none">
            <line x1={cx} y1={cy} x2={cx + sx * 26} y2={cy} />
            <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 26} />
          </g>
        ))}

        {/* Plate ID — upper-left (patent-drawing feel) */}
        <g
          transform={`translate(${FRAME.x + 26}, ${FRAME.y + 34})`}
          fill={CHAMBER}
          fontFamily={inter}
          fontWeight={500}
          fontSize={11}
          letterSpacing={3}
        >
          <text>PLATE III · DEFENSIVE GLAND, SECT. A–A′</text>
        </g>

        {/* Scale bar — lower-right of board */}
        <g
          transform={`translate(${FRAME.x + FRAME.w - 160}, ${FRAME.y + FRAME.h - 28})`}
          stroke={CHAMBER}
          fill={CHAMBER}
          fontFamily={inter}
          fontSize={10}
          letterSpacing={3}
          fontWeight={500}
        >
          <line x1={0} y1={0} x2={100} y2={0} strokeWidth={1.2} />
          <line x1={0} y1={-5} x2={0} y2={5} strokeWidth={1.2} />
          <line x1={50} y1={-3} x2={50} y2={3} strokeWidth={1.2} />
          <line x1={100} y1={-5} x2={100} y2={5} strokeWidth={1.2} />
          <text x={110} y={4} stroke="none">2 MM</text>
        </g>

        {/* Pulse-rate telemetry — upper-right */}
        <g
          transform={`translate(${FRAME.x + FRAME.w - 260}, ${FRAME.y + 34})`}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
        >
          <text fill={CHAMBER}>PULSE</text>
          <text x={62} fill={ORANGE} fontWeight={600}>
            ≈ 500 Hz
          </text>
          <text y={18} fill={CHAMBER}>TEMP</text>
          <text x={62} y={18} fill={ORANGE} fontWeight={600}>
            100 °C
          </text>
        </g>

        {/* ─── BEETLE SILHOUETTE (profile, facing right) ─── */}
        {/* Drawn as a single cohesive form. Head left, elytra dome up, legs down. */}
        {(() => {
          // Body geometry
          const BODY_TOP = AXIS_Y - 90;
          const BODY_BOT = AXIS_Y + 10;
          const HEAD_CX = HEAD_X;
          const HEAD_CY = AXIS_Y - 30;
          const PRONOTUM_X0 = HEAD_X + 24;
          const PRONOTUM_X1 = HEAD_X + 120;
          return (
            <g>
              {/* Shadow under the beetle (ground plane, subtle) */}
              <ellipse
                cx={(HEAD_X + TAIL_X) / 2 + 40}
                cy={AXIS_Y + 28}
                rx={320}
                ry={10}
                fill="#000000"
                opacity={0.35}
              />

              {/* Legs — three pairs, all planted on the A–A′ ground line */}
              {(() => {
                const groundY = AXIS_Y + 72; // ground line sits at AXIS_Y + 80; plant feet just above
                return [
                  { base: PRONOTUM_X1 - 4, forward: -18 },
                  { base: PRONOTUM_X1 + 130, forward: 46 },
                  { base: TAIL_X - 150, forward: 90 },
                ].map((L, i) => {
                  const bx = L.base;
                  const by = AXIS_Y + 4;
                  const footX = bx + L.forward;
                  const footY = groundY;
                  // Knee bend outward
                  const midX = (bx + footX) / 2 + (i === 0 ? -14 : 10);
                  const midY = (by + footY) / 2 + 4;
                  return (
                    <g key={`leg-${i}`}>
                      <path
                        d={`M ${bx} ${by} L ${midX} ${midY} L ${footX} ${footY}`}
                        stroke={ORANGE}
                        strokeWidth={3.8}
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <circle cx={midX} cy={midY} r={2.6} fill={EMBER} />
                      <circle cx={footX} cy={footY} r={2.2} fill={EMBER} />
                    </g>
                  );
                });
              })()}

              {/* Elytra (wing covers) — upper body as a solid dome */}
              <path
                d={`
                  M ${PRONOTUM_X1} ${BODY_BOT - 4}
                  L ${PRONOTUM_X1} ${AXIS_Y - 55}
                  C ${PRONOTUM_X1 + 20} ${BODY_TOP - 8}, ${PRONOTUM_X1 + 180} ${BODY_TOP - 18}, ${PRONOTUM_X1 + 340} ${BODY_TOP - 10}
                  C ${PRONOTUM_X1 + 460} ${BODY_TOP}, ${TAIL_X - 40} ${AXIS_Y - 48}, ${TAIL_X - 18} ${AXIS_Y - 14}
                  L ${TAIL_X - 18} ${BODY_BOT - 4}
                  Z
                `}
                fill={STEEL}
              />
              {/* Elytra specular highlight */}
              <path
                d={`
                  M ${PRONOTUM_X1 + 40} ${BODY_TOP + 8}
                  C ${PRONOTUM_X1 + 180} ${BODY_TOP - 6}, ${PRONOTUM_X1 + 340} ${BODY_TOP + 4}, ${TAIL_X - 80} ${AXIS_Y - 38}
                `}
                fill="none"
                stroke="#4A6D90"
                strokeWidth={1.8}
                opacity={0.9}
              />
              <path
                d={`
                  M ${PRONOTUM_X1 + 60} ${BODY_TOP + 20}
                  C ${PRONOTUM_X1 + 200} ${BODY_TOP + 8}, ${PRONOTUM_X1 + 340} ${BODY_TOP + 16}, ${TAIL_X - 100} ${AXIS_Y - 30}
                `}
                fill="none"
                stroke="#5A82A8"
                strokeWidth={1}
                opacity={0.7}
              />
              {/* Elytra seam (center dorsal line, visible on top) */}
              <path
                d={`
                  M ${PRONOTUM_X1 + 20} ${BODY_TOP + 2}
                  Q ${(PRONOTUM_X1 + TAIL_X) / 2 + 20} ${BODY_TOP - 14}, ${TAIL_X - 40} ${AXIS_Y - 40}
                `}
                fill="none"
                stroke="#121B27"
                strokeWidth={1.4}
                opacity={0.95}
              />
              {/* Elytra texture dots (faint punctation) */}
              {Array.from({ length: 36 }).map((_, i) => {
                const col = i % 9;
                const row = Math.floor(i / 9);
                const cx = PRONOTUM_X1 + 40 + col * 55 + (row % 2) * 24;
                const cy = BODY_TOP + 18 + row * 18;
                return (
                  <circle
                    key={`punc-${i}`}
                    cx={cx}
                    cy={cy}
                    r={0.9}
                    fill="#1B2A3D"
                    opacity={0.8}
                  />
                );
              })}

              {/* Pronotum (orange shoulder plate) */}
              <path
                d={`
                  M ${PRONOTUM_X0} ${AXIS_Y - 22}
                  C ${PRONOTUM_X0 + 8} ${AXIS_Y - 60}, ${PRONOTUM_X0 + 40} ${AXIS_Y - 72}, ${PRONOTUM_X1} ${AXIS_Y - 60}
                  L ${PRONOTUM_X1} ${BODY_BOT - 4}
                  L ${PRONOTUM_X0 + 4} ${BODY_BOT - 8}
                  Z
                `}
                fill={ORANGE}
              />
              <path
                d={`
                  M ${PRONOTUM_X0 + 4} ${AXIS_Y - 30}
                  C ${PRONOTUM_X0 + 14} ${AXIS_Y - 58}, ${PRONOTUM_X0 + 46} ${AXIS_Y - 68}, ${PRONOTUM_X1 - 4} ${AXIS_Y - 56}
                `}
                fill="none"
                stroke={EMBER}
                strokeWidth={1.4}
                opacity={0.9}
              />

              {/* Head */}
              <ellipse cx={HEAD_CX} cy={HEAD_CY} rx={28} ry={22} fill={ORANGE} />
              <ellipse cx={HEAD_CX + 4} cy={HEAD_CY - 4} rx={22} ry={16} fill={EMBER} opacity={0.35} />
              <circle cx={HEAD_CX - 12} cy={HEAD_CY - 6} r={3.6} fill={INK} />
              {/* Mandibles */}
              <path
                d={`M ${HEAD_CX - 24} ${HEAD_CY + 4} L ${HEAD_CX - 42} ${HEAD_CY + 12} M ${HEAD_CX - 22} ${HEAD_CY + 10} L ${HEAD_CX - 38} ${HEAD_CY + 18}`}
                stroke={INK}
                strokeWidth={1.5}
                fill="none"
                strokeLinecap="round"
              />
              {/* Antennae */}
              <path
                d={`
                  M ${HEAD_CX - 20} ${HEAD_CY - 16}
                  Q ${HEAD_CX - 70} ${HEAD_CY - 70}, ${HEAD_CX - 130} ${HEAD_CY - 50}
                `}
                fill="none"
                stroke={ORANGE}
                strokeWidth={1.6}
                opacity={0.9}
                strokeLinecap="round"
              />
              <path
                d={`
                  M ${HEAD_CX - 16} ${HEAD_CY - 20}
                  Q ${HEAD_CX - 60} ${HEAD_CY - 90}, ${HEAD_CX - 128} ${HEAD_CY - 86}
                `}
                fill="none"
                stroke={ORANGE}
                strokeWidth={1.6}
                opacity={0.9}
                strokeLinecap="round"
              />
              {/* Antennae segment ticks */}
              {[0.2, 0.4, 0.6, 0.8].map((t) => {
                const x = HEAD_CX - 20 + (-110) * t;
                const y = HEAD_CY - 16 + (-40) * Math.sin(Math.PI * t);
                return (
                  <circle key={`ant-${t}`} cx={x} cy={y} r={1.5} fill={EMBER} />
                );
              })}

              {/* Abdomen tip / nozzle (schematic) */}
              <path
                d={`
                  M ${TAIL_X - 50} ${AXIS_Y - 22}
                  L ${TAIL_X - 14} ${AXIS_Y - 16}
                  L ${TAIL_X + 8} ${AXIS_Y}
                  L ${TAIL_X - 14} ${AXIS_Y + 16}
                  L ${TAIL_X - 50} ${AXIS_Y + 10}
                  Z
                `}
                fill="#1A2838"
                stroke={CHAMBER}
                strokeWidth={1.2}
              />
            </g>
          );
        })()}

        {/* ─── SCHEMATIC OVERLAY: reservoirs floating above + feed lines ─── */}
        <g>
          {/* Reservoir helper */}
          {(() => {
            const renderReservoir = (
              x: number,
              y: number,
              label: string,
              formula: string,
              fillProg: number,
              rxW: number,
              rxH: number
            ) => {
              const outlineLen = 2 * (rxW + rxH);
              const innerW = rxW - 6;
              const innerH = rxH - 6;
              return (
                <g transform={`translate(${x},${y})`} key={label}>
                  {/* Vessel outline */}
                  <rect
                    x={-rxW / 2}
                    y={-rxH / 2}
                    width={rxW}
                    height={rxH}
                    rx={5}
                    fill={INK}
                    stroke={CHAMBER}
                    strokeWidth={1.6}
                    strokeDasharray={outlineLen}
                    strokeDashoffset={outlineLen * (1 - strokeDraw)}
                  />
                  {/* Fill level (fluid rises from bottom) */}
                  <rect
                    x={-innerW / 2}
                    y={-innerH / 2 + innerH * (1 - fillProg)}
                    width={innerW}
                    height={innerH * fillProg}
                    rx={2}
                    fill={STEEL}
                    opacity={0.78}
                  />
                  {/* Meniscus */}
                  {fillProg > 0.02 && (
                    <line
                      x1={-innerW / 2}
                      y1={-innerH / 2 + innerH * (1 - fillProg)}
                      x2={innerW / 2}
                      y2={-innerH / 2 + innerH * (1 - fillProg)}
                      stroke={EMBER}
                      strokeWidth={1}
                      opacity={0.75}
                    />
                  )}
                  {/* Cap at top */}
                  <line
                    x1={-10}
                    y1={-rxH / 2}
                    x2={10}
                    y2={-rxH / 2}
                    stroke={ORANGE}
                    strokeWidth={2}
                    opacity={strokeDraw}
                  />
                  {/* Label above */}
                  <text
                    y={-rxH / 2 - 36}
                    textAnchor="middle"
                    fontFamily={inter}
                    fontSize={10}
                    letterSpacing={3}
                    fontWeight={500}
                    fill={CHAMBER}
                  >
                    {label}
                  </text>
                  {/* Formula below */}
                  <text
                    y={-rxH / 2 - 18}
                    textAnchor="middle"
                    fontFamily={inter}
                    fontSize={13}
                    letterSpacing={2}
                    fontWeight={600}
                    fill={EMBER}
                  >
                    {formula}
                  </text>
                </g>
              );
            };

            return (
              <>
                {renderReservoir(RES_L.x, RES_L.y, "RESERVOIR A", "HYDROQUINONES", reservoirFillL, 86, 110)}
                {renderReservoir(RES_R.x, RES_R.y, "RESERVOIR B", "H₂O₂", reservoirFillR, 86, 110)}
              </>
            );
          })()}

          {/* Feed lines diving from each reservoir down to the elytra top */}
          {(() => {
            const entryL = { x: CHAMBER_X - 24, y: AXIS_Y - 68 };
            const entryR = { x: CHAMBER_X + 24, y: AXIS_Y - 68 };
            const feedPath = (fromX: number, fromY: number, toX: number, toY: number) => {
              const midY = (fromY + toY) / 2 - 10;
              return `M ${fromX} ${fromY} C ${fromX} ${midY}, ${toX} ${midY}, ${toX} ${toY}`;
            };
            const feedLen = 420;
            return (
              <>
                {/* Left feed */}
                <path
                  d={feedPath(RES_L.x, RES_L.y + 55, entryL.x, entryL.y)}
                  fill="none"
                  stroke={CHAMBER}
                  strokeWidth={1.6}
                  strokeDasharray={feedLen}
                  strokeDashoffset={feedLen * (1 - strokeDraw)}
                />
                {/* Right feed */}
                <path
                  d={feedPath(RES_R.x, RES_R.y + 55, entryR.x, entryR.y)}
                  fill="none"
                  stroke={CHAMBER}
                  strokeWidth={1.6}
                  strokeDasharray={feedLen}
                  strokeDashoffset={feedLen * (1 - strokeDraw)}
                />
                {/* Flow droplets travelling down the feeds during pulse train */}
                {trainActive && [0, 0.33, 0.66].map((off, i) => {
                  const t = ((frame / fps * 0.6) + off) % 1;
                  const lerp = (a: number, b: number) => a + (b - a) * t;
                  const fy1 = lerp(RES_L.y + 55, entryL.y);
                  const fy2 = lerp(RES_R.y + 55, entryR.y);
                  const fx1 = lerp(RES_L.x, entryL.x);
                  const fx2 = lerp(RES_R.x, entryR.x);
                  const taper = Math.sin(Math.PI * t);
                  return (
                    <g key={`drops-${i}`} opacity={taper}>
                      <circle cx={fx1} cy={fy1} r={2.4} fill={EMBER} />
                      <circle cx={fx2} cy={fy2} r={2.4} fill={EMBER} />
                    </g>
                  );
                })}
                {/* Entry valve glyphs on the elytra */}
                <circle
                  cx={entryL.x}
                  cy={entryL.y + 2}
                  r={4.5}
                  fill={INK}
                  stroke={ORANGE}
                  strokeWidth={1.3}
                  opacity={strokeDraw}
                />
                <circle
                  cx={entryR.x}
                  cy={entryR.y + 2}
                  r={4.5}
                  fill={INK}
                  stroke={ORANGE}
                  strokeWidth={1.3}
                  opacity={strokeDraw}
                />
              </>
            );
          })()}

          {/* Reaction chamber — a cutaway window inside the elytra */}
          <g transform={`translate(${CHAMBER_X},${AXIS_Y - 48})`}>
            {/* Heat glow behind chamber */}
            {chamberPrime > 0.05 && (
              <ellipse
                cx={0}
                cy={0}
                rx={58 + trainIntensity * 18}
                ry={30 + trainIntensity * 6}
                fill="url(#chamber-heat)"
                opacity={0.35 * chamberPrime + 0.4 * trainIntensity}
                filter="url(#chamber-blur)"
              />
            )}
            {/* Cutaway background (darker than elytra) */}
            <rect
              x={-50}
              y={-22}
              width={100}
              height={44}
              rx={8}
              fill="#0C1119"
            />
            {/* Chamber outline with corner ticks (patent-cutaway feel) */}
            <rect
              x={-50}
              y={-22}
              width={100}
              height={44}
              rx={8}
              fill="none"
              stroke={CHAMBER}
              strokeWidth={1.6}
              strokeDasharray={320}
              strokeDashoffset={320 * (1 - strokeDraw)}
            />
            {/* Inner thin accent (ember line = catalyst lining) */}
            <rect
              x={-46}
              y={-18}
              width={92}
              height={36}
              rx={5}
              fill="none"
              stroke={ORANGE}
              strokeWidth={1}
              opacity={0.45 * strokeDraw}
            />
            {/* Catalyst "crystals" inside */}
            {chamberPrime > 0.1 && (
              <g opacity={chamberPrime}>
                {[
                  [-30, -6], [-10, 4], [8, -8], [26, 6], [-20, 10], [14, 10], [-38, 2], [32, -4],
                ].map(([x, y], i) => (
                  <circle
                    key={i}
                    cx={x}
                    cy={y}
                    r={1.8}
                    fill={ORANGE}
                    opacity={0.8 + 0.2 * Math.sin((frame / 6) + i)}
                  />
                ))}
              </g>
            )}
            {/* Shimmer inside chamber during pulse train */}
            {shimmerActive && (
              <path
                d={`M -44 ${Math.sin(shimmerPhase) * 2} Q 0 ${Math.sin(shimmerPhase + 1) * 4 - 2}, 44 ${Math.sin(shimmerPhase + 2) * 2}`}
                stroke={EMBER}
                strokeWidth={1}
                fill="none"
                opacity={0.6}
              />
            )}
            {/* Label with leader line pointing to the chamber */}
            <line
              x1={50}
              y1={-10}
              x2={120}
              y2={-56}
              stroke={CHAMBER}
              strokeWidth={1}
              opacity={strokeDraw * 0.7}
            />
            <text
              x={125}
              y={-58}
              fontFamily={inter}
              fontSize={10}
              letterSpacing={2.8}
              fontWeight={600}
              fill={CHAMBER}
              opacity={strokeDraw * 0.9}
            >
              REACTION
            </text>
            <text
              x={125}
              y={-44}
              fontFamily={inter}
              fontSize={10}
              letterSpacing={2.8}
              fontWeight={600}
              fill={CHAMBER}
              opacity={strokeDraw * 0.9}
            >
              CHAMBER
            </text>
            {/* Catalyst caption below */}
            <line
              x1={-30}
              y1={22}
              x2={-80}
              y2={56}
              stroke={CHAMBER}
              strokeWidth={1}
              opacity={strokeDraw * 0.7}
            />
            <text
              x={-85}
              y={60}
              textAnchor="end"
              fontFamily={inter}
              fontSize={10}
              letterSpacing={2.4}
              fontWeight={500}
              fill={EMBER}
              opacity={strokeDraw * 0.95}
            >
              CATALASE
            </text>
            <text
              x={-85}
              y={74}
              textAnchor="end"
              fontFamily={inter}
              fontSize={10}
              letterSpacing={2.4}
              fontWeight={500}
              fill={EMBER}
              opacity={strokeDraw * 0.95}
            >
              + PEROXIDASE
            </text>
          </g>

          {/* Short pipe from chamber to nozzle (inside the abdomen tip) */}
          <path
            d={`M ${CHAMBER_X + 50} ${AXIS_Y - 48} Q ${CHAMBER_X + 110} ${AXIS_Y - 40}, ${TAIL_X - 55} ${AXIS_Y}`}
            stroke={CHAMBER}
            strokeWidth={1.6}
            fill="none"
            strokeDasharray={160}
            strokeDashoffset={160 * (1 - strokeDraw)}
            opacity={0.7}
          />

          {/* Nozzle marker */}
          <circle
            cx={TAIL_X + 6}
            cy={AXIS_Y}
            r={5}
            fill={ORANGE}
            stroke={EMBER}
            strokeWidth={1.2}
            opacity={strokeDraw}
          />

          {/* Pulsed spray bursts — each pulse stretches into an ellipse as it travels */}
          {pulses.map((p) => {
            const x = TAIL_X + 12 + p.dist;
            const y = AXIS_Y;
            const r = 10 + p.dist * 0.12;
            const stretch = 1 + p.t * 1.6;
            return (
              <g key={`pulse-${p.i}`} opacity={p.alpha}>
                {/* Soft outer glow */}
                <ellipse
                  cx={x - r * 0.3}
                  cy={y}
                  rx={(r + 8) * stretch}
                  ry={r + 4}
                  fill="url(#pulse-glow)"
                  filter="url(#pulse-blur)"
                  opacity={0.9}
                />
                {/* Core ember */}
                <ellipse
                  cx={x - r * 0.3}
                  cy={y}
                  rx={r * stretch * 0.9}
                  ry={r * 0.55}
                  fill={EMBER}
                  opacity={0.95 * p.alpha}
                />
                {/* Hot white centre (fades fastest) */}
                <ellipse
                  cx={x - r * 0.4}
                  cy={y}
                  rx={r * 0.5 * (1 - p.t * 0.6)}
                  ry={r * 0.28 * (1 - p.t * 0.6)}
                  fill="#FFFFFF"
                  opacity={0.85 * Math.max(0, 1 - p.t * 1.8)}
                />
              </g>
            );
          })}

          {/* Direction/aim arrow (patent-style) */}
          <g opacity={strokeDraw * 0.6}>
            <line
              x1={TAIL_X + 90}
              y1={AXIS_Y - 42}
              x2={TAIL_X + 160}
              y2={AXIS_Y - 42}
              stroke={CHAMBER}
              strokeWidth={1}
            />
            <polygon
              points={`${TAIL_X + 160},${AXIS_Y - 42} ${TAIL_X + 150},${AXIS_Y - 46} ${TAIL_X + 150},${AXIS_Y - 38}`}
              fill={CHAMBER}
            />
            <text
              x={TAIL_X + 90}
              y={AXIS_Y - 50}
              fontFamily={inter}
              fontSize={10}
              letterSpacing={2.5}
              fontWeight={500}
              fill={CHAMBER}
            >
              AIM · 270°
            </text>
          </g>

          {/* Section-line annotation (patent feel) running under the beetle */}
          <g opacity={0.4}>
            <line x1={FRAME.x + 30} y1={AXIS_Y + 80} x2={FRAME.x + FRAME.w - 30} y2={AXIS_Y + 80}
              stroke={CHAMBER} strokeWidth={0.8} strokeDasharray="4 6" />
            <text x={FRAME.x + 30} y={AXIS_Y + 96} fontFamily={inter} fontSize={10}
              letterSpacing={3} fontWeight={500} fill={CHAMBER}>
              A
            </text>
            <text x={FRAME.x + FRAME.w - 40} y={AXIS_Y + 96} fontFamily={inter} fontSize={10}
              letterSpacing={3} fontWeight={500} fill={CHAMBER}>
              A′
            </text>
          </g>

          {/* Firing indicator */}
          <g transform={`translate(${TAIL_X + 15}, ${AXIS_Y + 60})`}>
            <text
              fontFamily={inter}
              fontSize={10}
              letterSpacing={2.5}
              fontWeight={500}
              fill={CHAMBER}
            >
              {shotsFired > 0 ? "FIRING" : "ARMED"}
            </text>
            {shotsFired > 0 && (
              <circle
                cx={62}
                cy={-4}
                r={3.2}
                fill={ORANGE}
                opacity={0.6 + 0.4 * Math.sin(frame * 0.6)}
              />
            )}
          </g>
        </g>

        {/* Caption strip just below the board */}
        <g
          transform={`translate(${FRAME.x}, ${FRAME.y + FRAME.h + 22})`}
          fill={CHAMBER}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
        >
          <text>FIG. 1 · PULSED-SPRAY DEFENCE MECHANISM, BRACHINUS SP.</text>
          <text x={FRAME.w} textAnchor="end" fill={ORANGE} opacity={0.85}>
            ANESHANSLEY &amp; EISNER · PNAS 1999
          </text>
        </g>
      </svg>

      {/* ── Type lockup ────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 965,
          opacity: titleSpring,
          transform: `translateY(${interpolate(titleSpring, [0, 1], [16, 0])}px)`,
        }}
      >
        <div
          style={{
            color: ORANGE,
            fontFamily: inter,
            fontSize: 13,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 18,
            fontWeight: 600,
          }}
        >
          Role <span style={{ color: CHAMBER, margin: "0 4px" }}>/</span>
          <span style={{ color: "#EDEDEF", letterSpacing: 5 }}>Combustion Engineer</span>
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
          The pulse-jet
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
          The{" "}
          <span style={{ color: ORANGE, fontWeight: 600 }}>bombardier beetle</span>{" "}
          mixes hydroquinones and H₂O₂ in a catalyst-lined chamber, firing a{" "}
          <span style={{ color: EMBER, fontWeight: 600 }}>100&nbsp;°C spray at ~500 Hz</span>{" "}
          — an oscillating micro-combustor studied as a pulse-jet analog.
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
          color: CHAMBER,
          fontFamily: inter,
          fontSize: 11,
          letterSpacing: 3,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Aneshansley · Eisner · Widom · PNAS 96 (1999) 9705–9709</span>
        <span>
          <span style={{ color: ORANGE }}>●</span> Catalyst reaction
        </span>
      </div>
    </AbsoluteFill>
  );
};
