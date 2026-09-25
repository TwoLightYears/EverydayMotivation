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

// ── Palette (drawn from the concept's visual brief) ───────────────────────
const ABYSS = "#07101C";
const STEEL = "#122236";
const CORAL = "#E85E3D";
const CORAL_DEEP = "#B23E24";
const CORAL_DARK = "#7A2914";
const EMBER = "#F5A24C";
const PLASMA = "#FFEBB0";
const GRAY = "#8FA6BF";
const GRID = "#0F1B2C";
const GRID_MAJOR = "#182A40";

// ── Illustration geometry (viewBox 1080 × 780) ────────────────────────────
// A pistol shrimp in profile, facing right; the outsized snapper claw
// hinges out of the carapace. STRIKE is where the plunger meets the socket
// and where the cavitation plasma blooms.
const BODY = { x: 300, y: 440 };            // body center (shifted right so tail fan clears the plate edge)
const HINGE = { x: 490, y: 458 };           // claw pivot
const CLAW_TIP = { x: 795, y: 472 };        // far end of the closed claw
const STRIKE = { x: 748, y: 482 };          // plunger↔socket contact point
const SOCKET = { x: 762, y: 486 };          // socket notch center

// Propus (fixed lower jaw): a chunky curved paddle sitting BELOW the
// meeting line, with a scooped socket recess near the tip.
// Top edge runs along y ≈ 476..484.
const propusPath =
  `M 478 480
   C 464 496 470 522 500 526
   L 640 534
   C 712 534 762 522 790 508
   L 802 486
   Q 796 480 786 480
   L 782 482
   Q 776 500 762 500
   Q 748 500 748 484
   L 784 476
   C 776 470 756 474 728 476
   L 620 480
   C 550 480 500 480 484 480
   C 480 480 479 480 478 480 Z`;

// Ridge highlights on the propus
const propusRidge =
  `M 500 500 C 600 504 700 500 786 494
   M 508 514 C 610 520 700 516 792 506`;

// Dactyl (movable upper jaw): a slimmer paddle sitting ABOVE the
// meeting line, hinged around HINGE. Bottom edge at y ≈ 448..452
// leaves a clean gape band between it and the propus at y=476.
// Includes a plunger tooth peg extending down from its right end.
const dactylPath =
  `M 478 448
   C 464 430 470 402 500 396
   L 640 388
   C 712 388 762 400 790 416
   L 800 434
   Q 796 442 786 444
   L 754 448
   L 754 466
   Q 746 470 738 466
   L 738 448
   L 728 448
   C 660 448 540 448 500 448
   C 484 448 480 448 478 448 Z`;

// Dactyl ridge highlights
const dactylRidge =
  `M 500 418 C 600 414 700 418 786 428
   M 510 402 C 610 398 700 402 786 412`;

// Visual seam / darker gape band between the two halves when closed.
const gapePath =
  `M 480 464
   L 730 464`;

// A subtle water-jet chevron path radiating away from STRIKE toward
// the rear of the animal (leftward) — will be masked-in during the snap.
const jetPath =
  `M ${STRIKE.x - 4} ${STRIKE.y - 2}
   L ${STRIKE.x - 90} ${STRIKE.y - 18}
   L ${STRIKE.x - 200} ${STRIKE.y - 40}`;

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ── Motion beats (30 fps × 5 s = 150 frames) ───────────────────────────
  const drawBack = spring({
    frame: frame - 15,
    fps,
    from: 0,
    to: 1,
    config: { damping: 22, mass: 1.2, stiffness: 55 },
  });
  const release = spring({
    frame: frame - 75,
    fps,
    from: 0,
    to: 1,
    config: { damping: 10, mass: 0.35, stiffness: 220 },
  });
  const cockedAngle = -34; // degrees
  const angle =
    frame < 75 ? cockedAngle * drawBack : cockedAngle * (1 - release);

  // Plasma bubble ignition + decay
  const ignition = interpolate(frame, [83, 89], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const decay = interpolate(frame, [92, 140], [1, 0], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const bubbleIntensity = ignition * decay;

  // Shockwave rings — three staggered, faster expansion so multiple
  // rings are visible in the still frame.
  const ring = (delay: number) => {
    const t = interpolate(frame, [85 + delay, 118 + delay], [0, 1], {
      easing: Easing.out(Easing.cubic),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    return t;
  };

  // Title / hook entrances
  const titleSpring = spring({
    frame: frame - 8,
    fps,
    config: { damping: 200, mass: 0.9 },
  });
  const hookOpacity = interpolate(frame, [20, 45], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Page layout (1080 × 1350 portrait) ────────────────────────────────
  const FRAME = { x: 60, y: 130, w: 960, h: 720 };
  const ILL_W = 1080;
  const ILL_H = 780;
  const scale = FRAME.w / ILL_W;
  void ILL_H;

  return (
    <AbsoluteFill style={{ backgroundColor: ABYSS, fontFamily: inter }}>
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
        <span style={{ color: EMBER }}>2026 · 09 · 25</span>
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

          <radialGradient id="board-vignette" cx="55%" cy="55%" r="70%">
            <stop offset="0%" stopColor="#0D1A2C" stopOpacity={1} />
            <stop offset="100%" stopColor={STEEL} stopOpacity={1} />
          </radialGradient>

          <linearGradient id="claw-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CORAL} />
            <stop offset="55%" stopColor={CORAL} />
            <stop offset="100%" stopColor={CORAL_DEEP} />
          </linearGradient>

          <linearGradient id="dactyl-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#EF6B4A" />
            <stop offset="60%" stopColor={CORAL} />
            <stop offset="100%" stopColor={CORAL_DEEP} />
          </linearGradient>

          <linearGradient id="body-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CORAL_DEEP} />
            <stop offset="60%" stopColor={CORAL_DEEP} />
            <stop offset="100%" stopColor={CORAL_DARK} />
          </linearGradient>

          <radialGradient id="plasma" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity={1} />
            <stop offset="30%" stopColor={PLASMA} stopOpacity={1} />
            <stop offset="70%" stopColor={EMBER} stopOpacity={0.7} />
            <stop offset="100%" stopColor={EMBER} stopOpacity={0} />
          </radialGradient>

          <radialGradient id="plasma-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={PLASMA} stopOpacity={0.9} />
            <stop offset="40%" stopColor={EMBER} stopOpacity={0.35} />
            <stop offset="100%" stopColor={EMBER} stopOpacity={0} />
          </radialGradient>

          <filter id="soft-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="hard-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="20" />
          </filter>
        </defs>

        {/* Workshop plate */}
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

        {/* Inner border */}
        <rect
          x={FRAME.x + 0.5}
          y={FRAME.y + 0.5}
          width={FRAME.w - 1}
          height={FRAME.h - 1}
          fill="none"
          stroke="#20334C"
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
          <g key={i} stroke={EMBER} strokeWidth={1.5} fill="none">
            <line x1={cx} y1={cy} x2={cx + sx * 26} y2={cy} />
            <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 26} />
          </g>
        ))}

        {/* Plate label */}
        <g
          transform={`translate(${FRAME.x + 24}, ${FRAME.y + 30})`}
          fill={GRAY}
          fontFamily={inter}
          fontWeight={600}
          fontSize={11}
          letterSpacing={3}
        >
          <text textAnchor="start">PLATE III · SNAPPER CLAW · A. HETEROCHAELIS</text>
        </g>

        {/* µs scale bar — bottom-LEFT of plate so it doesn't crowd the 218 dB label */}
        <g
          transform={`translate(${FRAME.x + 24}, ${FRAME.y + FRAME.h - 28})`}
          stroke={GRAY}
          fill={GRAY}
          fontFamily={inter}
          fontSize={10}
          letterSpacing={3}
          fontWeight={500}
        >
          <line x1={0} y1={0} x2={120} y2={0} strokeWidth={1.2} />
          <line x1={0} y1={-5} x2={0} y2={5} strokeWidth={1.2} />
          <line x1={60} y1={-3} x2={60} y2={3} strokeWidth={1.2} />
          <line x1={120} y1={-5} x2={120} y2={5} strokeWidth={1.2} />
          <text x={130} y={4} stroke="none">
            300 µs
          </text>
        </g>

        {/* Illustration group: 1080×780 mapped into FRAME */}
        <g transform={`translate(${FRAME.x}, ${FRAME.y}) scale(${scale})`}>
          {/* Faint upward micro-currents (post-implosion) */}
          <g stroke={GRAY} strokeWidth={1} opacity={0.16} fill="none">
            <path d="M 720 460 C 740 380 700 310 720 240" />
            <path d="M 760 460 C 780 400 750 340 770 280" />
            <path d="M 680 460 C 660 380 680 320 670 260" />
          </g>

          {/* ── SHRIMP BODY (profile, facing right) ─────────────────── */}
          <g>
            {/* Tail curl: 4 segmented plates, tighter spacing so the fan sits inside the plate */}
            {[0, 1, 2, 3].map((i) => {
              const cx = BODY.x - 46 - i * 30;
              const cy = BODY.y + 18 + i * 8;
              return (
                <path
                  key={`seg-${i}`}
                  d={`M ${cx} ${cy - 24}
                      C ${cx - 22} ${cy - 28} ${cx - 22} ${cy + 26} ${cx} ${cy + 28}
                      C ${cx + 18} ${cy + 26} ${cx + 18} ${cy - 26} ${cx} ${cy - 24} Z`}
                  fill="url(#body-fill)"
                  stroke={CORAL_DARK}
                  strokeWidth={1}
                />
              );
            })}
            {/* Tail fan */}
            <g transform={`translate(${BODY.x - 180}, ${BODY.y + 60}) rotate(-22)`}>
              <path
                d="M 0 0 L -46 -18 L -40 4 L -52 18 L -34 18 L -28 32 L 0 20 Z"
                fill={CORAL_DEEP}
                stroke={CORAL_DARK}
                strokeWidth={1}
              />
              <g stroke={CORAL_DARK} strokeWidth={1} fill="none" opacity={0.55}>
                <line x1={-6} y1={2} x2={-40} y2={-12} />
                <line x1={-6} y1={10} x2={-44} y2={10} />
                <line x1={-6} y1={16} x2={-32} y2={28} />
              </g>
            </g>

            {/* Carapace (head + thorax) */}
            <path
              d={`M ${BODY.x - 20} ${BODY.y - 40}
                  C ${BODY.x - 60} ${BODY.y - 30} ${BODY.x - 80} ${BODY.y + 20} ${BODY.x - 40} ${BODY.y + 44}
                  C ${BODY.x + 20} ${BODY.y + 58} ${BODY.x + 90} ${BODY.y + 46} ${BODY.x + 130} ${BODY.y + 20}
                  C ${BODY.x + 150} ${BODY.y} ${BODY.x + 140} ${BODY.y - 34} ${BODY.x + 100} ${BODY.y - 44}
                  C ${BODY.x + 60} ${BODY.y - 52} ${BODY.x + 10} ${BODY.y - 50} ${BODY.x - 20} ${BODY.y - 40} Z`}
              fill="url(#body-fill)"
              stroke={CORAL_DARK}
              strokeWidth={1}
            />
            {/* Carapace ridge */}
            <path
              d={`M ${BODY.x - 30} ${BODY.y - 20}
                  C ${BODY.x + 10} ${BODY.y - 30} ${BODY.x + 80} ${BODY.y - 24} ${BODY.x + 120} ${BODY.y - 6}`}
              stroke={EMBER}
              strokeWidth={1.4}
              fill="none"
              opacity={0.55}
            />
            {/* Eye */}
            <g>
              <circle cx={BODY.x + 118} cy={BODY.y - 24} r={11} fill={CORAL_DARK} />
              <circle cx={BODY.x + 118} cy={BODY.y - 24} r={7} fill="#0B1420" />
              <circle cx={BODY.x + 116} cy={BODY.y - 27} r={2.4} fill={PLASMA} opacity={0.9} />
            </g>
            {/* Antennae (two, swept back) */}
            <g stroke={CORAL_DEEP} strokeWidth={1.4} fill="none" opacity={0.85}>
              <path
                d={`M ${BODY.x + 120} ${BODY.y - 34}
                    C ${BODY.x + 60} ${BODY.y - 90} ${BODY.x - 40} ${BODY.y - 120} ${BODY.x - 160} ${BODY.y - 110}`}
              />
              <path
                d={`M ${BODY.x + 128} ${BODY.y - 20}
                    C ${BODY.x + 80} ${BODY.y - 62} ${BODY.x - 20} ${BODY.y - 76} ${BODY.x - 150} ${BODY.y - 70}`}
              />
            </g>
            {/* Under-legs (thin walking legs) */}
            <g stroke={CORAL_DARK} strokeWidth={2} fill="none" opacity={0.7}>
              <path d={`M ${BODY.x - 20} ${BODY.y + 40} L ${BODY.x - 40} ${BODY.y + 96}`} />
              <path d={`M ${BODY.x + 10} ${BODY.y + 46} L ${BODY.x + 4} ${BODY.y + 108}`} />
              <path d={`M ${BODY.x + 44} ${BODY.y + 46} L ${BODY.x + 50} ${BODY.y + 106}`} />
              <path d={`M ${BODY.x + 80} ${BODY.y + 42} L ${BODY.x + 96} ${BODY.y + 100}`} />
            </g>
            {/* Rostrum (little forehead spike) */}
            <path
              d={`M ${BODY.x + 130} ${BODY.y - 28}
                  L ${BODY.x + 160} ${BODY.y - 36}
                  L ${BODY.x + 130} ${BODY.y - 20} Z`}
              fill={CORAL_DEEP}
              stroke={CORAL_DARK}
              strokeWidth={1}
            />
          </g>

          {/* Merus (upper arm segment) connecting body to hinge */}
          <g>
            <path
              d={`M ${BODY.x + 100} ${BODY.y + 4}
                  L ${HINGE.x - 40} ${HINGE.y - 22}
                  L ${HINGE.x + 4} ${HINGE.y - 4}
                  L ${HINGE.x} ${HINGE.y + 22}
                  L ${BODY.x + 100} ${BODY.y + 44} Z`}
              fill={CORAL_DEEP}
              stroke={CORAL_DARK}
              strokeWidth={1.2}
            />
            <line
              x1={BODY.x + 110}
              y1={BODY.y + 24}
              x2={HINGE.x - 20}
              y2={HINGE.y - 6}
              stroke={EMBER}
              strokeWidth={1}
              opacity={0.55}
            />
          </g>

          {/* ── SNAPPER CLAW ───────────────────────────────────────── */}
          {/* Propus (fixed) */}
          <g>
            <path d={propusPath} fill="url(#claw-fill)" stroke={CORAL_DARK} strokeWidth={1.5} />
            <path
              d={propusRidge}
              stroke={EMBER}
              strokeWidth={1.6}
              fill="none"
              opacity={0.7}
            />
            {/* Chitin plate seams on the lower jaw */}
            <g stroke={CORAL_DARK} strokeWidth={1.1} fill="none" opacity={0.55}>
              <path d="M 540 480 L 540 530" />
              <path d="M 610 480 L 610 534" />
              <path d="M 680 480 L 680 534" />
              <path d="M 740 484 L 740 530" />
            </g>
            {/* Socket rim (dark hollow at the strike) */}
            <path
              d={`M ${SOCKET.x - 20} ${SOCKET.y - 4}
                  Q ${SOCKET.x} ${SOCKET.y - 20}
                  ${SOCKET.x + 20} ${SOCKET.y - 4}
                  Q ${SOCKET.x} ${SOCKET.y + 14}
                  ${SOCKET.x - 20} ${SOCKET.y - 4} Z`}
              fill={CORAL_DARK}
              opacity={0.95}
            />
          </g>

          {/* Dactyl (movable) — rotates around HINGE */}
          <g transform={`rotate(${angle} ${HINGE.x} ${HINGE.y})`}>
            <path d={dactylPath} fill="url(#dactyl-fill)" stroke={CORAL_DARK} strokeWidth={1.5} />
            <path
              d={dactylRidge}
              stroke={EMBER}
              strokeWidth={1.6}
              fill="none"
              opacity={0.85}
            />
            {/* Bright top-edge highlight to separate dactyl from propus */}
            <path
              d="M 486 400 C 600 392 700 402 790 424"
              stroke={PLASMA}
              strokeWidth={1}
              fill="none"
              opacity={0.35}
            />
            <g stroke={CORAL_DARK} strokeWidth={1.1} fill="none" opacity={0.55}>
              <path d="M 540 396 L 540 448" />
              <path d="M 610 392 L 610 448" />
              <path d="M 680 396 L 680 448" />
              <path d="M 740 408 L 740 448" />
            </g>
            {/* Plunger tooth: bright ember stud protruding from the tip */}
            <g>
              <rect
                x={734}
                y={448}
                width={12}
                height={18}
                rx={2}
                fill={EMBER}
                stroke={CORAL_DARK}
                strokeWidth={1.2}
              />
              <circle cx={740} cy={454} r={2.5} fill={PLASMA} opacity={0.9} />
            </g>
          </g>

          {/* Gape band (dark seam between the two halves) — only visible near closed */}
          <g
            opacity={interpolate(-angle, [0, 12, 34], [0.95, 0.35, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })}
          >
            <rect x={478} y={450} width={252} height={14} fill={ABYSS} opacity={0.55} />
            <path
              d={gapePath}
              stroke={CORAL_DARK}
              strokeWidth={2}
              fill="none"
            />
          </g>

          {/* Hinge rivet — a prominent metal stud */}
          <g>
            <circle cx={HINGE.x - 6} cy={HINGE.y - 8} r={18} fill={CORAL_DARK} />
            <circle cx={HINGE.x - 6} cy={HINGE.y - 8} r={11} fill={EMBER} stroke={CORAL_DARK} strokeWidth={1.2} />
            <circle cx={HINGE.x - 10} cy={HINGE.y - 12} r={3.5} fill={PLASMA} opacity={0.85} />
          </g>

          {/* Tension arc while cocked */}
          {angle < -4 && (
            <g
              opacity={interpolate(-angle, [4, 32], [0.15, 0.85])}
              stroke={EMBER}
              strokeWidth={1.5}
              fill="none"
              strokeDasharray="4 6"
            >
              <path
                d={`M ${HINGE.x + 80} ${HINGE.y - 8}
                    A 90 90 0 0 1 ${
                      HINGE.x + 80 * Math.cos((angle * Math.PI) / 180) +
                      8 * Math.sin((angle * Math.PI) / 180)
                    } ${
                      HINGE.y +
                      80 * Math.sin((angle * Math.PI) / 180) -
                      8 * Math.cos((angle * Math.PI) / 180)
                    }`}
              />
            </g>
          )}

          {/* ── CAVITATION EVENT ────────────────────────────────────── */}
          {/* Water-jet trail (during & just after snap) */}
          <g
            opacity={interpolate(frame, [78, 88, 110], [0, 0.85, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })}
          >
            <path
              d={jetPath}
              stroke={PLASMA}
              strokeWidth={2.5}
              strokeLinecap="round"
              fill="none"
              strokeDasharray="2 8"
              opacity={0.75}
            />
          </g>

          {/* Shockwave rings */}
          {[0, 8, 18].map((delay, i) => {
            const t = ring(delay);
            if (t <= 0) return null;
            const r = 46 + t * (i === 0 ? 340 : i === 1 ? 270 : 200);
            const op = interpolate(t, [0, 0.15, 1], [0, 0.7, 0]);
            return (
              <circle
                key={i}
                cx={STRIKE.x}
                cy={STRIKE.y}
                r={r}
                fill="none"
                stroke={PLASMA}
                strokeWidth={i === 0 ? 3.5 : 2}
                opacity={op}
              />
            );
          })}

          {/* Bloom / halo */}
          {bubbleIntensity > 0 && (
            <circle
              cx={STRIKE.x}
              cy={STRIKE.y}
              r={210 * bubbleIntensity}
              fill="url(#plasma-glow)"
              opacity={0.95 * bubbleIntensity}
              filter="url(#hard-glow)"
            />
          )}

          {/* Plasma bubble core */}
          {bubbleIntensity > 0 && (
            <>
              <circle
                cx={STRIKE.x}
                cy={STRIKE.y}
                r={72 * bubbleIntensity + 10}
                fill="url(#plasma)"
                filter="url(#soft-glow)"
              />
              <circle
                cx={STRIKE.x - 4}
                cy={STRIKE.y - 6}
                r={26 * bubbleIntensity + 4}
                fill="#FFFFFF"
                opacity={bubbleIntensity}
              />
            </>
          )}

          {/* ── ANNOTATIONS ─────────────────────────────────────────── */}
          {/* 5 000 K — up and to the RIGHT of the bubble, ending inside frame */}
          <g
            opacity={interpolate(frame, [88, 102], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })}
            fontFamily={inter}
          >
            <line
              x1={STRIKE.x + 55}
              y1={STRIKE.y - 55}
              x2={STRIKE.x + 150}
              y2={STRIKE.y - 150}
              stroke={PLASMA}
              strokeWidth={1.6}
            />
            <line
              x1={STRIKE.x + 150}
              y1={STRIKE.y - 150}
              x2={STRIKE.x + 210}
              y2={STRIKE.y - 150}
              stroke={PLASMA}
              strokeWidth={1.6}
            />
            <text
              x={STRIKE.x + 8}
              y={STRIKE.y - 160}
              fontSize={22}
              letterSpacing={4}
              fontWeight={600}
              fill={PLASMA}
            >
              ≈ 5 000 K
            </text>
            <text
              x={STRIKE.x + 8}
              y={STRIKE.y - 138}
              fontSize={11}
              letterSpacing={2.6}
              fontWeight={500}
              fill={GRAY}
            >
              CAVITATION PLASMA · μs LIFETIME
            </text>
          </g>

          {/* 218 dB — leader down-right from the outer ring, well INSIDE the plate */}
          <g
            opacity={interpolate(frame, [92, 108], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })}
            fontFamily={inter}
          >
            <line
              x1={STRIKE.x + 155}
              y1={STRIKE.y + 155}
              x2={STRIKE.x + 195}
              y2={STRIKE.y + 200}
              stroke={GRAY}
              strokeWidth={1.4}
            />
            <line
              x1={STRIKE.x + 195}
              y1={STRIKE.y + 200}
              x2={STRIKE.x + 225}
              y2={STRIKE.y + 200}
              stroke={GRAY}
              strokeWidth={1.4}
            />
            <text
              x={STRIKE.x + 130}
              y={STRIKE.y + 224}
              fontSize={22}
              letterSpacing={4}
              fontWeight={600}
              fill={EMBER}
            >
              218 dB
            </text>
            <text
              x={STRIKE.x + 130}
              y={STRIKE.y + 246}
              fontSize={11}
              letterSpacing={2.6}
              fontWeight={500}
              fill={GRAY}
            >
              SHOCKWAVE · STUNS PREY
            </text>
          </g>

          {/* 25 m/s — sits BELOW the claw body, well clear of the coral silhouette */}
          <g
            opacity={interpolate(frame, [78, 96, 140], [0, 0.9, 0.9], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })}
            fontFamily={inter}
          >
            <line
              x1={STRIKE.x - 200}
              y1={STRIKE.y + 105}
              x2={STRIKE.x - 60}
              y2={STRIKE.y + 40}
              stroke={PLASMA}
              strokeWidth={1.2}
              strokeDasharray="3 5"
              opacity={0.7}
            />
            <text
              x={STRIKE.x - 280}
              y={STRIKE.y + 122}
              fontSize={16}
              letterSpacing={3.2}
              fontWeight={600}
              fill={PLASMA}
            >
              25 m/s
            </text>
            <text
              x={STRIKE.x - 280}
              y={STRIKE.y + 140}
              fontSize={11}
              letterSpacing={2.4}
              fontWeight={500}
              fill={GRAY}
            >
              WATER JET
            </text>
          </g>
        </g>

        {/* Caption strip just below the plate */}
        <g
          transform={`translate(${FRAME.x}, ${FRAME.y + FRAME.h + 22})`}
          fill={GRAY}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
        >
          <text>FIG. 1 · SNAP-INDUCED CAVITATION EVENT — MICROSECOND SCALE</text>
          <text x={FRAME.w} textAnchor="end" fill={EMBER} opacity={0.9}>
            SHRIMPOLUMINESCENCE
          </text>
        </g>
      </svg>

      {/* ── Type lockup ─────────────────────────────────────────────── */}
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
            color: EMBER,
            fontFamily: inter,
            fontSize: 13,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 18,
            fontWeight: 600,
          }}
        >
          Role <span style={{ color: GRAY, margin: "0 4px" }}>/</span>
          <span style={{ color: "#EDEDEF", letterSpacing: 5 }}>Blacksmith</span>
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
          The shrimp that
          <br />
          forges suns.
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
          When{" "}
          <span style={{ color: EMBER, fontWeight: 600 }}>
            Alpheus heterochaelis
          </span>{" "}
          snaps its cocked claw, the water jet forms a cavitation bubble whose
          collapse briefly reaches{" "}
          <span style={{ color: PLASMA, fontWeight: 600 }}>~5 000 K</span> —
          hot as the sun's surface — releasing a flash of light and a 218 dB
          shockwave.
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
        <span>Versluis et al. · Science 289 (2000) 2114–2117</span>
        <span>
          <span style={{ color: PLASMA }}>●</span> Cavitation plasma
        </span>
      </div>
    </AbsoluteFill>
  );
};
