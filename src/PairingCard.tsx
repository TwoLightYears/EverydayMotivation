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

// ─── Palette ───
const INK = "#0B141A";
const SILT = "#1A2B33";
const SILT_DEEP = "#0F1D23";
const SILT_FLOOR = "#132026";
const PELAGE = "#3B2A1F";
const PELAGE_HI = "#5A4230";
const PELAGE_DARK = "#1F130C";
const BILL = "#C78A52";
const BILL_SHADOW = "#8A5A33";
const BILL_HI = "#E0A86E";
const SPARK = "#5EE2FF";
const SPARK_SOFT = "#B3F0FF";
const CREAM = "#F3E7D1";
const CREAM_DIM = "#B9AC97";
const CREAM_DIM2 = "#7E7467";
const RULE = "#2A3A42";
const RULE_FAINT = "#1A2A31";

// ─── Page/stage layout ───
const PAGE_W = 1080;
const PAGE_H = 1350;
// The illustration region now goes almost full-page from top (y≈120) down to
// y≈1050, giving ~930 of vertical space. All illustration coordinates below
// are in the local stage system (1080 wide × 930 tall).
const STAGE_X = 0;
const STAGE_Y = 120;
const STAGE_W = 1080;
const STAGE_H = 930;

// Substrate line position in stage coords
const SUBSTRATE_Y = 600;
// Bill tip = anchor of the probe fan
const BILL_TIP = { x: 505, y: 560 };

type Prey = {
  id: string;
  x: number;
  y: number;
  uv: string;
  delay: number;
  kind: "shrimp" | "larva";
};

// Prey, placed on substrate (y 650..720)
const PREY: Prey[] = [
  { id: "p1", x: 110, y: 670, uv: "47 μV", delay: 0.0, kind: "shrimp" },
  { id: "p2", x: 260, y: 720, uv: "118 μV", delay: 0.09, kind: "larva" },
  { id: "p3", x: 400, y: 744, uv: "22 μV", delay: 0.17, kind: "shrimp" },
  { id: "p4", x: 740, y: 744, uv: "62 μV", delay: 0.24, kind: "larva" },
  { id: "p5", x: 940, y: 686, uv: "33 μV", delay: 0.3, kind: "shrimp" },
];

const hashSeed = (s: string): number => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h = (h ^ s.charCodeAt(i)) * 16777619;
  }
  return ((h >>> 0) % 1000) / 1000;
};

const probePath = (prey: Prey): string => {
  const dx = prey.x - BILL_TIP.x;
  const dy = prey.y - BILL_TIP.y;
  const len = Math.hypot(dx, dy);
  const nx = -dy / len;
  const ny = dx / len;
  const seed = hashSeed(prey.id);
  const bend = (seed - 0.5) * 0.28 * len;
  const mx = (BILL_TIP.x + prey.x) / 2 + nx * bend;
  const my = (BILL_TIP.y + prey.y) / 2 + ny * bend - 10;
  return `M ${BILL_TIP.x} ${BILL_TIP.y} Q ${mx} ${my} ${prey.x} ${prey.y}`;
};
const approxArcLen = (prey: Prey): number =>
  Math.hypot(prey.x - BILL_TIP.x, prey.y - BILL_TIP.y) * 1.18;

// ─── Platypus illustration ───
// Bill tip (525, 560). Faces LEFT (bill reaches to lower-left corner).
// Body sits BEHIND the head to the upper-right, tail trailing to the right.
// Compact composition — platypus occupies roughly x 500..830, y 420..600.
const BODY_PATH = `
  M 560 448
  C 605 436, 660 436, 710 450
  C 758 464, 798 486, 820 512
  C 836 530, 842 548, 836 562
  C 826 578, 802 586, 772 586
  C 744 586, 724 580, 710 568
  C 704 582, 686 592, 660 596
  C 630 600, 596 596, 570 586
  C 548 578, 532 568, 522 556
  Z
`;

// Tail — paddle swooshes from body to the right, overlapping the right flank.
const TAIL_PATH = `
  M 798 544
  C 850 540, 900 548, 940 562
  C 968 572, 982 584, 976 594
  C 964 606, 920 608, 874 602
  C 840 598, 814 588, 800 574
  Z
`;

// Head — rounded curve that merges with body on the right and tapers into bill
const HEAD_PATH = `
  M 522 556
  C 500 548, 488 536, 490 522
  C 495 500, 528 486, 568 486
  C 580 486, 592 490, 600 498
  C 598 516, 578 538, 550 554
  Z
`;

// Bill — ducklike, projects from head down-left to BILL_TIP.
const BILL_PATH = `
  M 528 528
  C 500 528, 468 540, 450 556
  C 442 568, 448 580, 468 586
  C 496 594, 528 592, 548 582
  C 560 574, 560 560, 552 548
  C 546 540, 538 532, 528 528
  Z
`;

// Bill shelf highlight at base
const BILL_SHELF = `
  M 544 528
  C 568 528, 580 536, 580 548
  C 576 544, 566 540, 552 540
  C 540 540, 534 532, 544 528
  Z
`;

// Hind leg + webbed foot (right side under body)
const HIND_LEG = `
  M 760 586
  L 772 616 L 782 606 L 790 620 L 802 606 L 812 620 L 822 606
  Q 826 614 822 622 L 758 622 Q 752 612 760 586 Z
`;

// Front leg + webbed foot (left-center under body)
const FRONT_LEG = `
  M 598 592
  L 606 616 L 616 606 L 624 620 L 634 606 L 644 620 L 652 606
  Q 656 614 652 622 L 596 622 Q 592 612 598 592 Z
`;

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const titleSpring = spring({
    frame: frame - fps * 0.35,
    fps,
    config: { damping: 180, mass: 0.9 },
  });
  const roleSpring = spring({
    frame: frame - fps * 0.5,
    fps,
    config: { damping: 180, mass: 0.9 },
  });
  const hookOpacity = interpolate(frame, [fps * 1.1, fps * 1.9], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const platypusEntrance = spring({
    frame: frame - fps * 0.05,
    fps,
    config: { damping: 200, mass: 1.1 },
  });

  const probeOf = (p: Prey) => {
    const start = 0.35 + p.delay;
    const dur = 0.95;
    const u = Math.max(0, Math.min(1, (t - start) / dur));
    return Easing.out(Easing.cubic)(u);
  };
  const hitOf = (p: Prey) => {
    const start = 0.35 + p.delay + 0.9;
    const dur = 0.4;
    const u = Math.max(0, Math.min(1, (t - start) / dur));
    return u;
  };
  const sparkOf = (p: Prey) => {
    const start = 0.35 + p.delay + 0.9;
    const u = Math.max(0, Math.min(1, (t - start) / 0.22));
    return Math.sin(u * Math.PI);
  };
  const pulseCycle = Math.max(0, (t - 3.0) / 2.0);
  const pulseU = pulseCycle > 1 ? pulseCycle - 1 : pulseCycle;

  return (
    <AbsoluteFill style={{ backgroundColor: INK, fontFamily: inter }}>
      <style>{fontCss}</style>

      {/* ─── Top metadata band ─── */}
      <div
        style={{
          position: "absolute",
          top: 50,
          left: 80,
          right: 80,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          color: CREAM_DIM2,
          fontFamily: inter,
          fontSize: 13,
          letterSpacing: 4.5,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Everyday Motivation · No. 003</span>
        <span style={{ color: SPARK }}>2026 · 10 · 14</span>
      </div>

      <svg
        width={PAGE_W}
        height={PAGE_H}
        viewBox={`0 0 ${PAGE_W} ${PAGE_H}`}
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          <linearGradient id="water" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1D303A" />
            <stop offset="50%" stopColor={SILT} />
            <stop offset="100%" stopColor={SILT_DEEP} />
          </linearGradient>
          <linearGradient id="substrate" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#223640" />
            <stop offset="40%" stopColor={SILT_FLOOR} />
            <stop offset="100%" stopColor="#0A1317" />
          </linearGradient>
          <linearGradient id="pelage" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={PELAGE_HI} />
            <stop offset="55%" stopColor={PELAGE} />
            <stop offset="100%" stopColor={PELAGE_DARK} />
          </linearGradient>
          <linearGradient id="bill-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={BILL_HI} />
            <stop offset="60%" stopColor={BILL} />
            <stop offset="100%" stopColor={BILL_SHADOW} />
          </linearGradient>
          <linearGradient id="tail-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={PELAGE} />
            <stop offset="100%" stopColor={PELAGE_DARK} />
          </linearGradient>

          {/* Downward light rays through water */}
          <linearGradient id="rays" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CREAM} stopOpacity={0.18} />
            <stop offset="100%" stopColor={CREAM} stopOpacity={0} />
          </linearGradient>

          <pattern
            id="grid-fine"
            x={0}
            y={0}
            width={30}
            height={30}
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 30 0 L 0 0 0 30"
              fill="none"
              stroke={RULE_FAINT}
              strokeWidth={0.6}
            />
          </pattern>
          <pattern
            id="grid-major"
            x={0}
            y={0}
            width={120}
            height={120}
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 120 0 L 0 0 0 120"
              fill="none"
              stroke={RULE}
              strokeWidth={0.9}
            />
          </pattern>

          <radialGradient id="spark-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={SPARK} stopOpacity={0.9} />
            <stop offset="60%" stopColor={SPARK} stopOpacity={0.25} />
            <stop offset="100%" stopColor={SPARK} stopOpacity={0} />
          </radialGradient>
          <radialGradient id="bill-emit" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={SPARK} stopOpacity={0.4} />
            <stop offset="100%" stopColor={SPARK} stopOpacity={0} />
          </radialGradient>

          <filter id="trace-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.0" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Page background */}
        <rect x={0} y={0} width={PAGE_W} height={PAGE_H} fill={INK} />

        {/* Illustration stage */}
        <rect
          x={STAGE_X}
          y={STAGE_Y}
          width={STAGE_W}
          height={STAGE_H}
          fill="url(#water)"
        />
        {/* Blueprint grid */}
        <g>
          <rect
            x={STAGE_X}
            y={STAGE_Y}
            width={STAGE_W}
            height={STAGE_H}
            fill="url(#grid-fine)"
            opacity={0.55}
          />
          <rect
            x={STAGE_X}
            y={STAGE_Y}
            width={STAGE_W}
            height={STAGE_H}
            fill="url(#grid-major)"
            opacity={0.85}
          />
        </g>

        {/* ─────── Illustration group ─────── */}
        <g transform={`translate(${STAGE_X} ${STAGE_Y})`}>
          {/* Downward light rays from surface */}
          <g opacity={0.5}>
            <polygon
              points="100,0 220,0 180,600 140,600"
              fill="url(#rays)"
            />
            <polygon
              points="340,0 440,0 400,600 372,600"
              fill="url(#rays)"
            />
            <polygon
              points="700,0 780,0 750,600 720,600"
              fill="url(#rays)"
            />
            <polygon
              points="880,0 960,0 920,600 896,600"
              fill="url(#rays)"
            />
          </g>

          {/* Waterline marker (top of stage) */}
          <line
            x1={60}
            y1={48}
            x2={1020}
            y2={48}
            stroke={CREAM_DIM2}
            strokeDasharray="2 10"
            strokeWidth={1}
            opacity={0.5}
          />
          <text
            x={1020}
            y={38}
            fill={CREAM_DIM2}
            fontFamily={inter}
            fontSize={12}
            letterSpacing={3.5}
            textAnchor="end"
          >
            WATERLINE · 0.0 M
          </text>
          <text
            x={60}
            y={38}
            fill={CREAM_DIM2}
            fontFamily={inter}
            fontSize={12}
            letterSpacing={3.5}
          >
            PL. 003 · O. ANATINUS
          </text>

          {/* Depth tick ladder on far left */}
          <g stroke={CREAM_DIM2} opacity={0.5}>
            {[0, 1, 2, 3, 4, 5].map((i) => {
              const yy = 100 + i * 90;
              return (
                <g key={"d" + i}>
                  <line x1={38} y1={yy} x2={54} y2={yy} strokeWidth={1} />
                  <text
                    x={32}
                    y={yy + 4}
                    fill={CREAM_DIM2}
                    fontFamily={inter}
                    fontSize={10}
                    letterSpacing={2}
                    textAnchor="end"
                  >
                    {`-${(0.4 + i * 0.2).toFixed(1)}`}
                  </text>
                </g>
              );
            })}
          </g>

          {/* Substrate band — the river floor */}
          <rect
            x={0}
            y={SUBSTRATE_Y}
            width={STAGE_W}
            height={STAGE_H - SUBSTRATE_Y}
            fill="url(#substrate)"
          />
          <line
            x1={0}
            y1={SUBSTRATE_Y}
            x2={STAGE_W}
            y2={SUBSTRATE_Y}
            stroke={CREAM_DIM2}
            strokeWidth={0.8}
            opacity={0.3}
          />
          {/* Silt scatter */}
          <g fill={CREAM_DIM2} opacity={0.35}>
            {Array.from({ length: 110 }).map((_, i) => {
              const seed = hashSeed("silt" + i);
              const sx = (seed * 1080 + i * 11.37) % 1080;
              const sy = SUBSTRATE_Y + 6 + ((seed * 251 + i * 7) % 300);
              const sr = 0.6 + seed * 1.3;
              return <circle key={i} cx={sx} cy={sy} r={sr} />;
            })}
          </g>

          {/* ── Platypus (behind glow, bill at BILL_TIP) ── */}
          <g
            opacity={platypusEntrance}
            transform={`translate(0 ${(1 - platypusEntrance) * 14})`}
          >
            {/* Soft body shadow */}
            <ellipse cx={680} cy={610} rx={200} ry={14} fill="#000" opacity={0.4} />
            {/* Tail — behind body */}
            <path d={TAIL_PATH} fill="url(#tail-grad)" />
            {/* Tail scute suggestion */}
            <path
              d="M 822 554 Q 870 556 928 568"
              stroke={PELAGE_DARK}
              strokeWidth={1.2}
              fill="none"
              opacity={0.6}
            />
            <path
              d="M 822 574 Q 880 578 940 586"
              stroke={PELAGE_DARK}
              strokeWidth={1}
              fill="none"
              opacity={0.45}
            />
            <path
              d="M 822 590 Q 880 594 938 598"
              stroke={PELAGE_DARK}
              strokeWidth={0.8}
              fill="none"
              opacity={0.35}
            />
            {/* Hind leg under body */}
            <path d={HIND_LEG} fill={PELAGE_DARK} />
            {/* Front leg under body (closer to viewer) — matched tone, not orange */}
            <path d={FRONT_LEG} fill={PELAGE_DARK} opacity={0.95} />
            {/* Body */}
            <path d={BODY_PATH} fill="url(#pelage)" />
            {/* Head on top of body */}
            <path d={HEAD_PATH} fill="url(#pelage)" />
            {/* Back highlight */}
            <path
              d="M 572 456 Q 680 448 790 468"
              stroke={PELAGE_HI}
              strokeWidth={1.6}
              fill="none"
              opacity={0.65}
            />
            <path
              d="M 580 472 Q 690 470 800 488"
              stroke={PELAGE_HI}
              strokeWidth={1}
              fill="none"
              opacity={0.4}
            />
            {/* Belly line */}
            <path
              d="M 580 580 Q 680 594 790 580"
              stroke={PELAGE_DARK}
              strokeWidth={1}
              fill="none"
              opacity={0.6}
            />
            {/* Fur stroke suggestions */}
            <g stroke={PELAGE_DARK} strokeWidth={0.8} fill="none" opacity={0.5}>
              <path d="M 610 522 Q 660 528 720 536" />
              <path d="M 630 544 Q 690 550 760 560" />
              <path d="M 650 562 Q 710 570 780 572" />
            </g>
            {/* Eye slit — closed */}
            <g>
              <path
                d="M 540 510 Q 552 506 564 510"
                stroke={CREAM}
                strokeWidth={1.6}
                fill="none"
                opacity={0.95}
              />
              <path
                d="M 540 506 Q 552 508 564 506"
                stroke={CREAM_DIM}
                strokeWidth={0.8}
                fill="none"
                opacity={0.5}
              />
              <line
                x1={540}
                y1={510}
                x2={534}
                y2={514}
                stroke={CREAM}
                strokeWidth={1}
                opacity={0.6}
              />
              <line
                x1={564}
                y1={510}
                x2={568}
                y2={514}
                stroke={CREAM}
                strokeWidth={1}
                opacity={0.6}
              />
            </g>
            {/* Bill shelf (behind bill proper) */}
            <path d={BILL_SHELF} fill={BILL_SHADOW} opacity={0.7} />
            {/* Bill */}
            <path d={BILL_PATH} fill="url(#bill-grad)" />
            {/* Bill upper ridge highlight */}
            <path
              d="M 468 548 Q 500 544 540 548"
              stroke={BILL_HI}
              strokeWidth={1.3}
              fill="none"
              opacity={0.8}
            />
            {/* Nostril */}
            <circle cx={492} cy={556} r={2.4} fill={PELAGE_DARK} />
            {/* Bill pore stipple — the 40,000 receptors */}
            <g fill={PELAGE_DARK} opacity={0.6}>
              {Array.from({ length: 7 }).map((_, row) =>
                Array.from({ length: 12 }).map((_, col) => {
                  const px = 462 + col * 9;
                  const py = 550 + row * 5;
                  const cx = 500;
                  const cy = 566;
                  const nx = (px - cx) / 50;
                  const ny = (py - cy) / 18;
                  if (nx * nx + ny * ny > 1) return null;
                  return <circle key={`${row}-${col}`} cx={px} cy={py} r={0.95} />;
                })
              )}
            </g>
            {/* Bill underside shadow */}
            <path
              d="M 460 582 Q 500 592 548 584"
              stroke={PELAGE_DARK}
              strokeWidth={1}
              fill="none"
              opacity={0.65}
            />
          </g>

          {/* ── Bill emission halo ── */}
          {(() => {
            const emitStart = 0.3;
            const emitU = Math.max(0, Math.min(1, (t - emitStart) / 0.8));
            if (emitU <= 0) return null;
            const r = 54 + emitU * 55;
            return (
              <circle
                cx={BILL_TIP.x}
                cy={BILL_TIP.y}
                r={r}
                fill="url(#bill-emit)"
                opacity={0.9 * emitU}
              />
            );
          })()}

          {/* ── Probe traces ── */}
          {PREY.map((p) => {
            const u = probeOf(p);
            if (u <= 0) return null;
            const L = approxArcLen(p);
            const draw = L * u;
            const d = probePath(p);
            return (
              <g key={"probe-" + p.id} filter="url(#trace-glow)">
                <path
                  d={d}
                  stroke={SPARK}
                  strokeWidth={1.4}
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${draw} ${L}`}
                  opacity={0.95}
                />
                <path
                  d={d}
                  stroke={SPARK}
                  strokeWidth={4}
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${draw} ${L}`}
                  opacity={0.14}
                />
              </g>
            );
          })}

          {/* Pulse on strongest trace */}
          {(() => {
            const strong = PREY.find((p) => p.id === "p2")!;
            if (t < 2.9) return null;
            const d = probePath(strong);
            const L = approxArcLen(strong);
            const dashPos = pulseU * L;
            return (
              <g filter="url(#trace-glow)">
                <path
                  d={d}
                  stroke={SPARK_SOFT}
                  strokeWidth={2.2}
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`14 ${L}`}
                  strokeDashoffset={-dashPos}
                  opacity={0.9}
                />
              </g>
            );
          })()}

          {/* Reticles over prey hits */}
          {PREY.map((p) => {
            const hitU = hitOf(p);
            if (hitU <= 0) return null;
            return (
              <g key={"ret-" + p.id} opacity={hitU}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={22}
                  fill="none"
                  stroke={SPARK}
                  strokeWidth={1}
                  opacity={0.55}
                />
                <line x1={p.x - 28} y1={p.y} x2={p.x - 10} y2={p.y} stroke={SPARK} strokeWidth={1} />
                <line x1={p.x + 10} y1={p.y} x2={p.x + 28} y2={p.y} stroke={SPARK} strokeWidth={1} />
                <line x1={p.x} y1={p.y - 28} x2={p.x} y2={p.y - 10} stroke={SPARK} strokeWidth={1} />
                <line x1={p.x} y1={p.y + 10} x2={p.x} y2={p.y + 28} stroke={SPARK} strokeWidth={1} />
              </g>
            );
          })}

          {/* Prey */}
          {PREY.map((p) => {
            const hitU = hitOf(p);
            const appear = Math.max(0, Math.min(1, hitU + 0.4));
            if (p.kind === "shrimp") {
              return (
                <g
                  key={"prey-" + p.id}
                  transform={`translate(${p.x} ${p.y})`}
                  opacity={0.4 + appear * 0.6}
                >
                  <path
                    d="M -16 0 Q -10 -11, 3 -9 Q 14 -4, 16 4 Q 11 11, 0 9 Q -11 7, -16 0 Z"
                    fill={CREAM_DIM}
                  />
                  <path
                    d="M -16 0 Q -24 -4, -27 -11"
                    stroke={CREAM_DIM}
                    strokeWidth={1}
                    fill="none"
                    opacity={0.8}
                  />
                  <path
                    d="M -16 0 Q -24 2, -29 -2"
                    stroke={CREAM_DIM}
                    strokeWidth={1}
                    fill="none"
                    opacity={0.8}
                  />
                  <line x1={-6} y1={6} x2={-8} y2={11} stroke={CREAM_DIM} strokeWidth={0.8} opacity={0.7} />
                  <line x1={2} y1={7} x2={2} y2={12} stroke={CREAM_DIM} strokeWidth={0.8} opacity={0.7} />
                  <line x1={9} y1={6} x2={12} y2={11} stroke={CREAM_DIM} strokeWidth={0.8} opacity={0.7} />
                </g>
              );
            } else {
              return (
                <g
                  key={"prey-" + p.id}
                  transform={`translate(${p.x} ${p.y})`}
                  opacity={0.4 + appear * 0.6}
                >
                  <path
                    d="M -16 2 Q -8 -11, 6 -9 Q 17 -4, 15 4 Q 9 11, -2 9 Q -13 9, -16 2 Z"
                    fill={CREAM_DIM}
                  />
                  <line x1={-11} y1={-2} x2={-11} y2={5} stroke={INK} strokeWidth={0.9} />
                  <line x1={-5} y1={-7} x2={-5} y2={7} stroke={INK} strokeWidth={0.9} />
                  <line x1={2} y1={-7} x2={2} y2={7} stroke={INK} strokeWidth={0.9} />
                  <line x1={9} y1={-4} x2={9} y2={7} stroke={INK} strokeWidth={0.9} />
                </g>
              );
            }
          })}

          {/* μV labels — lead line + figure */}
          {PREY.map((p) => {
            const hitU = hitOf(p);
            if (hitU <= 0.1) return null;
            const left = p.x < BILL_TIP.x;
            const dx = left ? -48 : 48;
            const anchor = left ? "end" : "start";
            return (
              <g key={"lbl-" + p.id} opacity={hitU}>
                <line
                  x1={p.x + (left ? -22 : 22)}
                  y1={p.y + 22}
                  x2={p.x + dx}
                  y2={p.y + 44}
                  stroke={SPARK}
                  strokeWidth={1}
                  opacity={0.85}
                />
                <text
                  x={p.x + dx}
                  y={p.y + 58}
                  fill={SPARK_SOFT}
                  fontFamily={inter}
                  fontSize={16}
                  fontWeight={600}
                  letterSpacing={2}
                  textAnchor={anchor}
                >
                  {p.uv}
                </text>
              </g>
            );
          })}

          {/* Hit sparks */}
          {PREY.map((p) => {
            const s = sparkOf(p);
            if (s <= 0) return null;
            return (
              <g key={"spk-" + p.id} opacity={s}>
                <circle cx={p.x} cy={p.y} r={26 + s * 10} fill="url(#spark-glow)" />
                <circle cx={p.x} cy={p.y} r={3.2} fill={SPARK_SOFT} />
              </g>
            );
          })}

          {/* Figure caption at bottom of stage, right side (clear of μV labels) */}
          <g opacity={hookOpacity * 0.9}>
            <text
              x={1020}
              y={898}
              fill={CREAM_DIM2}
              fontFamily={inter}
              fontSize={12}
              letterSpacing={3.5}
              textAnchor="end"
            >
              FIG. 03 · ELECTRORECEPTION FIELD · n ≈ 40,000 PORES
            </text>
          </g>
        </g>

        {/* ─────────── Divider rule ─────────── */}
        <line x1={80} y1={1080} x2={1000} y2={1080} stroke={RULE} strokeWidth={1} />
        <line x1={80} y1={1080} x2={120} y2={1080} stroke={SPARK} strokeWidth={2} />

        {/* ─────────── Role tag ─────────── */}
        <g
          opacity={roleSpring}
          transform={`translate(80 ${1118 + (1 - roleSpring) * 8})`}
        >
          <text
            x={0}
            y={0}
            fill={SPARK}
            fontFamily={inter}
            fontSize={16}
            fontWeight={600}
            letterSpacing={7}
            textTransform="uppercase"
          >
            Role · Electrician
          </text>
        </g>

        {/* ─────────── Title + binomial ─────────── */}
        <g
          opacity={titleSpring}
          transform={`translate(80 ${1150 + (1 - titleSpring) * 14})`}
        >
          <text
            x={0}
            y={70}
            fill={CREAM}
            fontFamily={playfair}
            fontStyle="italic"
            fontSize={78}
            fontWeight={500}
          >
            Platypus
          </text>
          <text
            x={360}
            y={70}
            fill={CREAM_DIM2}
            fontFamily={inter}
            fontSize={15}
            fontWeight={500}
            letterSpacing={3}
          >
            Ornithorhynchus anatinus
          </text>
        </g>

        {/* ─────────── Hook ─────────── */}
        <g opacity={hookOpacity} transform="translate(80 1270)">
          <text
            x={0}
            y={0}
            fill={CREAM_DIM}
            fontFamily={inter}
            fontSize={19}
            fontWeight={400}
            letterSpacing={0.3}
          >
            <tspan x={0} dy={0}>
              Hunts eyes-closed. ~40,000 bill electroreceptors read the
            </tspan>
            <tspan x={0} dy={28}>
              sub-millivolt muscle twitch of a shrimp buried in silt.
            </tspan>
          </text>
        </g>

        {/* Corner marks */}
        {[
          [40, 40],
          [1040, 40],
          [40, 1310],
          [1040, 1310],
        ].map(([cx, cy], i) => (
          <g key={"corner-" + i} stroke={CREAM_DIM2} strokeWidth={1} opacity={0.4}>
            <line x1={cx - 8} y1={cy} x2={cx + 8} y2={cy} />
            <line x1={cx} y1={cy - 8} x2={cx} y2={cy + 8} />
          </g>
        ))}
      </svg>
    </AbsoluteFill>
  );
};
