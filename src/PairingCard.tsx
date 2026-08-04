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
const INK = "#0B1410";
const INK_LIFT = "#12201A";
const LEAF = "#1E4D34";
const LEAF_DEEP = "#0E2A1D";
const LEAF_EDGE = "#2C6B48";
const LIME = "#8CB84A";
const LIME_SOFT = "#B7D77A";
const CRIMSON = "#B4213A";
const CRIMSON_DEEP = "#6B0F22";
const CRIMSON_HOT = "#D74562";
const CREAM = "#F1E8D2";
const MUTED = "#758A7E";
const MUTED_2 = "#3D4E43";

// ── Layout constants ──────────────────────────────────────────────────────
const FRAME = { x: 60, y: 128, w: 960, h: 720 };
const HINGE_X = 540;
const HINGE_Y = 448;

// Right-lobe outline (as if trap is fully open, absolute coordinates)
const RIGHT_LOBE_D =
  "M 545 258 " +
  "C 620 252, 780 320, 800 448 " +
  "C 780 578, 620 642, 545 638 Z";

const LEFT_LOBE_D =
  "M 535 258 " +
  "C 460 252, 300 320, 280 448 " +
  "C 300 578, 460 642, 535 638 Z";

// Closed-pod silhouette (an ovoid seal); appears after closure.
const CLOSED_POD_D =
  "M 540 258 " +
  "C 595 258, 638 340, 638 448 " +
  "C 638 556, 595 638, 540 638 " +
  "C 485 638, 442 556, 442 448 " +
  "C 442 340, 485 258, 540 258 Z";

// Cilia along the outer arc of the right lobe: [tip x, tip y, base x, base y]
type Cilium = { tx: number; ty: number; bx: number; by: number };
const CILIA_R_RAW: Array<[number, number, number, number]> = [
  [790, 254, 745, 268],
  [833, 298, 780, 306],
  [860, 356, 796, 358],
  [872, 410, 800, 402],
  [878, 448, 802, 448],
  [872, 486, 800, 494],
  [860, 540, 796, 538],
  [833, 598, 780, 590],
  [790, 642, 745, 628],
];
const CILIA_R: Cilium[] = CILIA_R_RAW.map(([tx, ty, bx, by]) => ({
  tx,
  ty,
  bx,
  by,
}));
const CILIA_L: Cilium[] = CILIA_R_RAW.map(([tx, ty, bx, by]) => ({
  tx: 1080 - tx,
  ty,
  bx: 1080 - bx,
  by,
}));

// Trigger hairs — each: {base, tip} coords (draw stalk + head). Interior of each lobe.
type Hair = { bx: number; by: number; tx: number; ty: number };
const HAIRS_R: Hair[] = [
  { bx: 640, by: 360, tx: 656, ty: 316 }, // upper (touch #1)
  { bx: 690, by: 448, tx: 720, ty: 448 }, // middle
  { bx: 640, by: 536, tx: 656, ty: 580 }, // lower
];
const HAIRS_L: Hair[] = [
  { bx: 440, by: 360, tx: 424, ty: 316 }, // upper (touch #2)
  { bx: 390, by: 448, tx: 360, ty: 448 }, // middle
  { bx: 440, by: 536, tx: 424, ty: 580 }, // lower
];

const TOUCH1 = HAIRS_R[0]; // right upper hair
const TOUCH2 = HAIRS_L[0]; // left upper hair (mirror)

// ── Timeline gauge (biological seconds) ───────────────────────────────────
const GAUGE = { x: 100, y: 764, w: 880, h: 34 };
const T_MAX_S = 20; // biological window is ~20 seconds
const t1s = 3.0; // "biological" time of touch 1 on the gauge
const t2s = 6.0; // "biological" time of touch 2 on the gauge

// Utility: smooth pulse envelope (grow + fade) over `dur` seconds.
const pulseEnvelope = (frame: number, fps: number, atFrame: number, dur = 1.6) => {
  const dt = (frame - atFrame) / fps;
  if (dt < 0 || dt > dur) return { grow: 0, opacity: 0 };
  const p = dt / dur;
  const grow = 1 - Math.pow(1 - p, 3); // ease-out cubic
  const opacity = Math.max(0, 1 - p);
  return { grow, opacity };
};

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Animation beats (in frames)
  const F_TOUCH1 = Math.round(fps * 1.0);
  const F_TOUCH2 = Math.round(fps * 3.2);
  const F_CLOSE = Math.round(fps * 5.0);

  // Pulse envelopes
  const pulse1 = pulseEnvelope(frame, fps, F_TOUCH1, 2.2);
  const pulse2 = pulseEnvelope(frame, fps, F_TOUCH2, 2.2);

  // Trap open→closed spring (0 = open, 1 = closed)
  const closeSpring = spring({
    frame: frame - F_CLOSE,
    fps,
    config: { damping: 11, stiffness: 220, mass: 0.55 },
  });
  const closed = Math.max(0, Math.min(1, closeSpring));
  const openness = 1 - closed;

  // Lobe compression: horizontal scale about the hinge
  const lobeSx = interpolate(closed, [0, 1], [1, 0.18]);
  const openMx = interpolate(closed, [0, 1], [1, 0]); // 1=open, 0=closed
  const seamGap = 6 * openMx; // small visible seam when open

  const sec = frame / fps;

  // Type springs
  const roleTagSpring = spring({
    frame: frame - fps * 0.15,
    fps,
    config: { damping: 200, mass: 0.6 },
  });
  const titleSpring = spring({
    frame: frame - fps * 0.35,
    fps,
    config: { damping: 200, mass: 0.7 },
  });
  const hookOpacity = interpolate(frame, [fps * 0.85, fps * 1.55], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: INK, fontFamily: inter }}>
      <style>{fontCss}</style>

      {/* Top masthead */}
      <div
        style={{
          position: "absolute",
          top: 54,
          left: 80,
          right: 80,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          color: MUTED,
          fontFamily: inter,
          fontSize: 12,
          letterSpacing: 4.8,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Everyday Motivation · No. 003</span>
        <span style={{ color: LIME }}>2026 · 08 · 04</span>
      </div>

      {/* Sheet + illustration */}
      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          {/* Interior gradient of the trap */}
          <radialGradient id="interiorR" cx="30%" cy="45%" r="90%">
            <stop offset="0%" stopColor={CRIMSON_HOT} stopOpacity={1} />
            <stop offset="55%" stopColor={CRIMSON} stopOpacity={1} />
            <stop offset="100%" stopColor={CRIMSON_DEEP} stopOpacity={1} />
          </radialGradient>
          <radialGradient id="interiorL" cx="70%" cy="45%" r="90%">
            <stop offset="0%" stopColor={CRIMSON_HOT} stopOpacity={1} />
            <stop offset="55%" stopColor={CRIMSON} stopOpacity={1} />
            <stop offset="100%" stopColor={CRIMSON_DEEP} stopOpacity={1} />
          </radialGradient>

          {/* Sheet vignette */}
          <radialGradient id="sheet-vignette" cx="50%" cy="42%" r="72%">
            <stop offset="0%" stopColor={INK_LIFT} stopOpacity={1} />
            <stop offset="100%" stopColor={INK} stopOpacity={1} />
          </radialGradient>

          {/* Subtle glow filter */}
          <filter id="soft-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="strong-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="6" />
          </filter>

          {/* Grid pattern for the sheet */}
          <pattern
            id="dot-grid"
            x={FRAME.x}
            y={FRAME.y}
            width={40}
            height={40}
            patternUnits="userSpaceOnUse"
          >
            <circle cx={20} cy={20} r={0.9} fill={MUTED_2} />
          </pattern>
        </defs>

        {/* Sheet background */}
        <rect
          x={FRAME.x}
          y={FRAME.y}
          width={FRAME.w}
          height={FRAME.h}
          fill="url(#sheet-vignette)"
        />
        <rect
          x={FRAME.x}
          y={FRAME.y}
          width={FRAME.w}
          height={FRAME.h}
          fill="url(#dot-grid)"
          opacity={0.5}
        />

        {/* Thin sheet border */}
        <rect
          x={FRAME.x + 0.5}
          y={FRAME.y + 0.5}
          width={FRAME.w - 1}
          height={FRAME.h - 1}
          fill="none"
          stroke="#213028"
          strokeWidth={1}
        />

        {/* Corner registration marks */}
        {(
          [
            [FRAME.x, FRAME.y, 1, 1],
            [FRAME.x + FRAME.w, FRAME.y, -1, 1],
            [FRAME.x, FRAME.y + FRAME.h, 1, -1],
            [FRAME.x + FRAME.w, FRAME.y + FRAME.h, -1, -1],
          ] as const
        ).map(([cx, cy, sx, sy], i) => (
          <g key={`corner-${i}`} stroke={LIME} strokeWidth={1.4} fill="none">
            <line x1={cx} y1={cy} x2={cx + sx * 28} y2={cy} />
            <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 28} />
          </g>
        ))}

        {/* Species tag — top-left of the sheet */}
        <g
          transform={`translate(${FRAME.x + 26}, ${FRAME.y + 34})`}
          fill={MUTED}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={600}
        >
          <text>
            <tspan fill={LIME}>SPEC.</tspan>
            <tspan dx={12} fill={CREAM}>
              Dionaea muscipula
            </tspan>
          </text>
          <text y={22} fontSize={10} letterSpacing={2.6} fontWeight={500}>
            SNAP-TRAP LEAF · APEX VIEW
          </text>
        </g>

        {/* Figure label — bottom-left inside sheet */}
        <g
          transform={`translate(${FRAME.x + 26}, ${FRAME.y + FRAME.h - 30})`}
          fill={MUTED}
          fontFamily={inter}
          fontSize={10.5}
          letterSpacing={2.8}
          fontWeight={600}
        >
          <text>FIG. 1 · TWO-FACTOR TRIP MECHANISM</text>
        </g>

        {/* ── Timeline gauge — 20-second decay window ─────────────────── */}
        <g>
          {/* Label above the bar */}
          <text
            x={GAUGE.x}
            y={GAUGE.y - 20}
            fill={MUTED}
            fontFamily={inter}
            fontSize={11}
            letterSpacing={3.6}
            fontWeight={600}
          >
            <tspan fill={LIME}>Δt WINDOW</tspan>
            <tspan dx={12} fill={MUTED}>
              20 SEC · TWO TOUCHES REQUIRED
            </tspan>
          </text>
          {/* Legend on right side of gauge label row */}
          <text
            x={GAUGE.x + GAUGE.w}
            y={GAUGE.y - 20}
            textAnchor="end"
            fill={MUTED}
            fontFamily={inter}
            fontSize={10.5}
            letterSpacing={2.6}
            fontWeight={600}
          >
            <tspan fill={LIME}>01 REGISTER</tspan>
            <tspan dx={14} fill={MUTED}>
              →
            </tspan>
            <tspan dx={14} fill={CRIMSON_HOT}>
              02 FIRE
            </tspan>
          </text>

          {/* Base bar */}
          <rect
            x={GAUGE.x}
            y={GAUGE.y + 16}
            width={GAUGE.w}
            height={2}
            fill={MUTED_2}
          />

          {/* Tick marks 0 / 5 / 10 / 15 / 20 */}
          {[0, 5, 10, 15, 20].map((s) => {
            const tx = GAUGE.x + (s / T_MAX_S) * GAUGE.w;
            return (
              <g key={`tick-${s}`}>
                <line
                  x1={tx}
                  y1={GAUGE.y + 12}
                  x2={tx}
                  y2={GAUGE.y + 22}
                  stroke={MUTED}
                  strokeWidth={1}
                />
                <text
                  x={tx}
                  y={GAUGE.y + 34}
                  textAnchor="middle"
                  fill={MUTED}
                  fontFamily={inter}
                  fontSize={9.5}
                  letterSpacing={2}
                  fontWeight={500}
                >
                  {s}s
                </text>
              </g>
            );
          })}

          {/* Highlighted region between the two touches */}
          {(() => {
            const x1 = GAUGE.x + (t1s / T_MAX_S) * GAUGE.w;
            const x2 = GAUGE.x + (t2s / T_MAX_S) * GAUGE.w;
            const revealed = pulse1.opacity > 0 || pulse1.grow > 0.4 || sec > 1.0;
            const secondRevealed = sec > 3.2;
            const w = secondRevealed
              ? x2 - x1
              : revealed
                ? Math.min(x2 - x1, Math.max(0, ((sec - 1.0) / (3.2 - 1.0)) * (x2 - x1)))
                : 0;
            return (
              <rect
                x={x1}
                y={GAUGE.y + 14}
                width={w}
                height={6}
                fill={CRIMSON}
                opacity={0.85}
              />
            );
          })()}

          {/* Touch 1 marker on gauge */}
          {sec > 1.0 && (() => {
            const tx = GAUGE.x + (t1s / T_MAX_S) * GAUGE.w;
            return (
              <g>
                <circle cx={tx} cy={GAUGE.y + 17} r={7} fill={INK} stroke={LIME} strokeWidth={2} />
                <circle cx={tx} cy={GAUGE.y + 17} r={3} fill={LIME} />
                <text
                  x={tx}
                  y={GAUGE.y - 4}
                  textAnchor="middle"
                  fill={LIME}
                  fontFamily={inter}
                  fontSize={10}
                  letterSpacing={2.8}
                  fontWeight={700}
                >
                  01
                </text>
              </g>
            );
          })()}

          {/* Touch 2 marker on gauge */}
          {sec > 3.2 && (() => {
            const tx = GAUGE.x + (t2s / T_MAX_S) * GAUGE.w;
            return (
              <g>
                <circle
                  cx={tx}
                  cy={GAUGE.y + 17}
                  r={7}
                  fill={INK}
                  stroke={CRIMSON_HOT}
                  strokeWidth={2}
                />
                <circle cx={tx} cy={GAUGE.y + 17} r={3} fill={CRIMSON_HOT} />
                <text
                  x={tx}
                  y={GAUGE.y - 4}
                  textAnchor="middle"
                  fill={CRIMSON_HOT}
                  fontFamily={inter}
                  fontSize={10}
                  letterSpacing={2.8}
                  fontWeight={700}
                >
                  02
                </text>
              </g>
            );
          })()}
        </g>

        {/* ── Right-side stat block ────────────────────────────────── */}
        <g transform={`translate(870, 200)`}>
          <text
            fill={LIME}
            fontFamily={inter}
            fontSize={10.5}
            letterSpacing={3.4}
            fontWeight={700}
          >
            PROTOCOL
          </text>
          <text
            y={38}
            fill={CREAM}
            fontFamily={playfair}
            fontStyle="italic"
            fontSize={44}
            fontWeight={500}
            letterSpacing={-0.5}
          >
            02
          </text>
          <text
            y={64}
            fill={MUTED}
            fontFamily={inter}
            fontSize={10}
            letterSpacing={2.4}
            fontWeight={600}
          >
            ACTION POTENTIALS
          </text>
          <line x1={0} y1={82} x2={100} y2={82} stroke={MUTED_2} strokeWidth={1} />
          <text
            y={104}
            fill={CREAM}
            fontFamily={playfair}
            fontStyle="italic"
            fontSize={26}
            fontWeight={500}
            letterSpacing={-0.4}
          >
            ≤ 20 s
          </text>
          <text
            y={126}
            fill={MUTED}
            fontFamily={inter}
            fontSize={10}
            letterSpacing={2.4}
            fontWeight={600}
          >
            DECAY WINDOW
          </text>
          <line x1={0} y1={144} x2={100} y2={144} stroke={MUTED_2} strokeWidth={1} />
          <text
            y={166}
            fill={CREAM}
            fontFamily={playfair}
            fontStyle="italic"
            fontSize={26}
            fontWeight={500}
            letterSpacing={-0.4}
          >
            ≈ 100 ms
          </text>
          <text
            y={188}
            fill={MUTED}
            fontFamily={inter}
            fontSize={10}
            letterSpacing={2.4}
            fontWeight={600}
          >
            SNAP CLOSURE
          </text>
        </g>

        {/* ── The trap ────────────────────────────────────────────────── */}
        {/* Cast shadow beneath the trap */}
        <ellipse
          cx={HINGE_X}
          cy={670}
          rx={230 * (0.6 + 0.4 * openness)}
          ry={12}
          fill="#000"
          opacity={0.55}
          filter="url(#strong-glow)"
        />

        {/* CLOSED pod state (only visible after closure) */}
        <g opacity={1 - openness}>
          <path d={CLOSED_POD_D} fill={LEAF} stroke={LEAF_EDGE} strokeWidth={2} />
          {/* Central seam */}
          <line
            x1={442}
            y1={448}
            x2={638}
            y2={448}
            stroke={LEAF_DEEP}
            strokeWidth={2.5}
          />
          {/* Interlaced cilia along the seam */}
          {Array.from({ length: 11 }).map((_, i) => {
            const t = i / 10;
            const cx = 452 + t * 176;
            const up = i % 2 === 0;
            return (
              <line
                key={`cilium-seam-${i}`}
                x1={cx}
                y1={448}
                x2={cx}
                y2={448 + (up ? -18 : 18)}
                stroke={CREAM}
                strokeWidth={2}
                strokeLinecap="round"
              />
            );
          })}
          {/* Small caption */}
          <text
            x={HINGE_X}
            y={720}
            textAnchor="middle"
            fill={LIME}
            fontFamily={inter}
            fontSize={11}
            letterSpacing={4}
            fontWeight={700}
          >
            AUTH · PASS · ≈100 ms
          </text>
        </g>

        {/* OPEN trap state */}
        <g opacity={openness}>
          {/* RIGHT lobe */}
          <g
            transform={`translate(${HINGE_X + seamGap} 0) scale(${lobeSx} 1) translate(${-HINGE_X} 0)`}
          >
            {/* Cilia (behind the lobe body so tips peek out) */}
            {CILIA_R.map((c, i) => (
              <line
                key={`ciR-${i}`}
                x1={c.bx}
                y1={c.by}
                x2={c.tx}
                y2={c.ty}
                stroke={CREAM}
                strokeWidth={2.2}
                strokeLinecap="round"
              />
            ))}
            {/* Interior fill */}
            <path d={RIGHT_LOBE_D} fill="url(#interiorR)" />
            {/* Radiating veins (subtle organic texture) */}
            <g stroke={CRIMSON_DEEP} strokeWidth={1.1} fill="none" opacity={0.75}>
              <path d="M 545 300 Q 640 320 760 385" />
              <path d="M 545 360 Q 640 380 780 430" />
              <path d="M 545 420 Q 660 435 785 448" />
              <path d="M 545 478 Q 660 465 785 468" />
              <path d="M 545 540 Q 640 520 780 470" />
              <path d="M 545 596 Q 640 578 760 515" />
            </g>
            {/* Green rim */}
            <path
              d={RIGHT_LOBE_D}
              fill="none"
              stroke={LEAF_EDGE}
              strokeWidth={4}
            />
            {/* Interior lime highlight along the outer inner edge */}
            <path
              d="M 620 275 C 700 300, 762 355, 780 448 C 762 540, 700 596, 620 620"
              fill="none"
              stroke={CRIMSON_HOT}
              strokeWidth={1.5}
              opacity={0.6}
            />
            {/* Trigger hairs */}
            {HAIRS_R.map((h, i) => (
              <g key={`hairR-${i}`}>
                <line
                  x1={h.bx}
                  y1={h.by}
                  x2={h.tx}
                  y2={h.ty}
                  stroke={LIME}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                />
                <circle cx={h.tx} cy={h.ty} r={4} fill={LIME_SOFT} stroke={LIME} strokeWidth={1} />
                <circle cx={h.bx} cy={h.by} r={2.4} fill={CREAM} opacity={0.85} />
              </g>
            ))}
          </g>

          {/* LEFT lobe */}
          <g
            transform={`translate(${HINGE_X - seamGap} 0) scale(${lobeSx} 1) translate(${-HINGE_X} 0)`}
          >
            {/* Cilia */}
            {CILIA_L.map((c, i) => (
              <line
                key={`ciL-${i}`}
                x1={c.bx}
                y1={c.by}
                x2={c.tx}
                y2={c.ty}
                stroke={CREAM}
                strokeWidth={2.2}
                strokeLinecap="round"
              />
            ))}
            {/* Interior fill */}
            <path d={LEFT_LOBE_D} fill="url(#interiorL)" />
            {/* Radiating veins (mirror) */}
            <g stroke={CRIMSON_DEEP} strokeWidth={1.1} fill="none" opacity={0.75}>
              <path d="M 535 300 Q 440 320 320 385" />
              <path d="M 535 360 Q 440 380 300 430" />
              <path d="M 535 420 Q 420 435 295 448" />
              <path d="M 535 478 Q 420 465 295 468" />
              <path d="M 535 540 Q 440 520 300 470" />
              <path d="M 535 596 Q 440 578 320 515" />
            </g>
            {/* Green rim */}
            <path
              d={LEFT_LOBE_D}
              fill="none"
              stroke={LEAF_EDGE}
              strokeWidth={4}
            />
            {/* Interior highlight */}
            <path
              d="M 460 275 C 380 300, 318 355, 300 448 C 318 540, 380 596, 460 620"
              fill="none"
              stroke={CRIMSON_HOT}
              strokeWidth={1.5}
              opacity={0.6}
            />
            {/* Trigger hairs */}
            {HAIRS_L.map((h, i) => (
              <g key={`hairL-${i}`}>
                <line
                  x1={h.bx}
                  y1={h.by}
                  x2={h.tx}
                  y2={h.ty}
                  stroke={LIME}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                />
                <circle cx={h.tx} cy={h.ty} r={4} fill={LIME_SOFT} stroke={LIME} strokeWidth={1} />
                <circle cx={h.bx} cy={h.by} r={2.4} fill={CREAM} opacity={0.85} />
              </g>
            ))}
          </g>

          {/* Hinge line (midrib) */}
          <line
            x1={HINGE_X}
            y1={260}
            x2={HINGE_X}
            y2={636}
            stroke={LEAF_DEEP}
            strokeWidth={2 * openness + 0.5}
            opacity={0.9}
          />

          {/* ── Persistent "registered" halo on touch 1 hair ─────── */}
          {sec > 1.0 && (
            <g opacity={Math.min(1, (sec - 1.0) * 3)}>
              <circle
                cx={TOUCH1.tx}
                cy={TOUCH1.ty}
                r={9}
                fill="none"
                stroke={LIME}
                strokeWidth={1.5}
                opacity={0.85}
              />
              <circle
                cx={TOUCH1.tx}
                cy={TOUCH1.ty}
                r={4.5}
                fill={LIME}
              />
            </g>
          )}

          {/* ── Persistent "registered" halo on touch 2 hair ─────── */}
          {sec > 3.2 && (
            <g opacity={Math.min(1, (sec - 3.2) * 3)}>
              <circle
                cx={TOUCH2.tx}
                cy={TOUCH2.ty}
                r={9}
                fill="none"
                stroke={CRIMSON_HOT}
                strokeWidth={1.5}
                opacity={0.9}
              />
              <circle
                cx={TOUCH2.tx}
                cy={TOUCH2.ty}
                r={4.5}
                fill={CRIMSON_HOT}
              />
            </g>
          )}

          {/* ── Pulse ring on touch 1 (right upper hair) ───────────── */}
          {pulse1.opacity > 0 && (
            <g>
              <circle
                cx={TOUCH1.tx}
                cy={TOUCH1.ty}
                r={12 + pulse1.grow * 88}
                fill="none"
                stroke={LIME}
                strokeWidth={2.5}
                opacity={pulse1.opacity * 0.9}
              />
              <circle
                cx={TOUCH1.tx}
                cy={TOUCH1.ty}
                r={6 + pulse1.grow * 40}
                fill="none"
                stroke={LIME_SOFT}
                strokeWidth={1.5}
                opacity={pulse1.opacity * 0.55}
              />
            </g>
          )}

          {/* ── Pulse ring on touch 2 (left upper hair) ────────────── */}
          {pulse2.opacity > 0 && (
            <g>
              <circle
                cx={TOUCH2.tx}
                cy={TOUCH2.ty}
                r={12 + pulse2.grow * 100}
                fill="none"
                stroke={CRIMSON_HOT}
                strokeWidth={3}
                opacity={pulse2.opacity * 0.95}
              />
              <circle
                cx={TOUCH2.tx}
                cy={TOUCH2.ty}
                r={6 + pulse2.grow * 50}
                fill="none"
                stroke={CRIMSON_HOT}
                strokeWidth={1.5}
                opacity={pulse2.opacity * 0.55}
              />
              <circle
                cx={TOUCH2.tx}
                cy={TOUCH2.ty}
                r={30 + pulse2.grow * 10}
                fill={CRIMSON_HOT}
                opacity={pulse2.opacity * 0.12}
              />
            </g>
          )}

          {/* ── Compact number badges next to each pulse ─────────── */}
          {sec > 1.05 && (
            <g opacity={Math.min(1, (sec - 1.0) * 2)}>
              <circle
                cx={TOUCH1.tx + 22}
                cy={TOUCH1.ty - 18}
                r={13}
                fill={INK}
                stroke={LIME}
                strokeWidth={1.5}
              />
              <text
                x={TOUCH1.tx + 22}
                y={TOUCH1.ty - 14}
                textAnchor="middle"
                fill={LIME}
                fontFamily={inter}
                fontSize={12}
                letterSpacing={1.5}
                fontWeight={700}
              >
                01
              </text>
            </g>
          )}
          {sec > 3.25 && (
            <g opacity={Math.min(1, (sec - 3.2) * 2)}>
              <circle
                cx={TOUCH2.tx - 22}
                cy={TOUCH2.ty - 18}
                r={13}
                fill={INK}
                stroke={CRIMSON_HOT}
                strokeWidth={1.5}
              />
              <text
                x={TOUCH2.tx - 22}
                y={TOUCH2.ty - 14}
                textAnchor="middle"
                fill={CRIMSON_HOT}
                fontFamily={inter}
                fontSize={12}
                letterSpacing={1.5}
                fontWeight={700}
              >
                02
              </text>
            </g>
          )}
        </g>
      </svg>

      {/* ── Type lockup ─────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 900,
          opacity: roleTagSpring,
        }}
      >
        <div
          style={{
            color: LIME,
            fontFamily: inter,
            fontSize: 12.5,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 22,
            fontWeight: 700,
          }}
        >
          Role <span style={{ color: MUTED, margin: "0 6px" }}>/</span>
          <span style={{ color: "#EFEFEE", letterSpacing: 5 }}>
            Two-Factor Bouncer
          </span>
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 950,
          opacity: titleSpring,
          transform: `translateY(${interpolate(titleSpring, [0, 1], [14, 0])}px)`,
        }}
      >
        <div
          style={{
            color: "#F4F4F0",
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 84,
            lineHeight: 0.96,
            letterSpacing: -1.4,
            fontStyle: "italic",
          }}
        >
          The two-touch
          <br />
          door policy.
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 1152,
          color: "#CAD3CB",
          fontFamily: inter,
          fontSize: 19,
          lineHeight: 1.42,
          fontWeight: 400,
          maxWidth: 900,
          opacity: hookOpacity,
        }}
      >
        The trap won't close on the first touch. A second bump of a{" "}
        <span style={{ color: LIME, fontWeight: 600 }}>trigger hair</span> must
        arrive within about{" "}
        <span style={{ color: CRIMSON_HOT, fontWeight: 600 }}>20 seconds</span>{" "}
        — long enough for the Ca²⁺ pulse from the first to still be decaying —
        and only then does the leaf snap shut in ~100 ms.
      </div>

      {/* Footer */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          bottom: 40,
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
        <span>Böhm et al. · Current Biology 26 (2016) 286–295</span>
        <span>
          <span style={{ color: LIME }}>●</span> Trigger hair
          <span style={{ margin: "0 10px", color: MUTED_2 }}>·</span>
          <span style={{ color: CRIMSON_HOT }}>●</span> Ca²⁺ threshold
        </span>
      </div>
    </AbsoluteFill>
  );
};
