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

// ── Palette (from concept brief) ─────────────────────────────────────────
const INK = "#0B0D12";
const SHEET = "#12161F";
const ORANGE = "#D14A28";
const AMBER = "#F4A93A";
const STEEL = "#3B5A78";
const CHALK = "#D8DFEA";
const GRAY = "#7C8393";
const GRID = "#1A2130";
const GRID_MAJOR = "#232C3C";

// Frame layout constants
const FRAME = { x: 60, y: 130, w: 960, h: 780 };

// Beetle profile geometry (in the 1080-wide canvas)
// Head at right? No — head at LEFT so plume ejects to the RIGHT.
const HEAD_CX = 250;
const HEAD_CY = 500;
const HEAD_R = 32;

const NOZZLE_X = 830;
const NOZZLE_Y = 520;

// Interior reactor coordinates
const RESERVOIR = { x: 360, y: 475, w: 168, h: 100 };
const VALVE_X = 552;
const REACTOR = { x: 578, y: 465, w: 150, h: 120 };

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // ── Timings (seconds) ──────────────────────────────────────────────
  const drawSpan = fps * 1.4; // beetle draws in
  const flowStart = fps * 0.9; // reactant flow begins
  const flowSpan = fps * 1.1;
  const flashStart = fps * 1.7; // reaction flash
  const fireStart = fps * 1.9; // plume begins pulsing

  const drawT = Math.max(0, Math.min(1, frame / drawSpan));
  const drawEased = 1 - Math.pow(1 - drawT, 3);

  const flowT = Math.max(
    0,
    Math.min(1, (frame - flowStart) / flowSpan),
  );

  const flashT = Math.max(
    0,
    Math.min(1, (frame - flashStart) / (fps * 0.5)),
  );
  const flashDecay = Math.max(
    0,
    1 - (frame - (flashStart + fps * 0.3)) / (fps * 1.2),
  );
  const flashIntensity = Math.min(flashT, Math.max(0, flashDecay));

  // Plume pulses — the 500-Hz jet, visually compressed to something readable
  const fireT = Math.max(0, frame - fireStart);
  const pulsePeriod = 6; // frames per arc (5 arcs/second on screen)
  const NUM_PULSES = 7;

  const titleSpring = spring({
    frame: frame - fps * 0.7,
    fps,
    config: { damping: 200, mass: 0.8 },
  });
  const titleTrans = interpolate(titleSpring, [0, 1], [12, 0]);

  const hookOpacity = interpolate(
    frame,
    [fps * 1.2, fps * 2.1],
    [0, 1],
    {
      easing: Easing.out(Easing.cubic),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  const calloutOp = interpolate(
    frame,
    [fps * 0.8, fps * 1.5],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

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
        <span style={{ color: ORANGE }}>2026 · 07 · 11</span>
      </div>

      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          {/* Blueprint grid */}
          <pattern
            id="grid"
            x={FRAME.x}
            y={FRAME.y}
            width={30}
            height={30}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M 30 0 L 0 0 0 30`}
              fill="none"
              stroke={GRID}
              strokeWidth={1}
            />
          </pattern>
          <pattern
            id="grid-major"
            x={FRAME.x}
            y={FRAME.y}
            width={120}
            height={120}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M 120 0 L 0 0 0 120`}
              fill="none"
              stroke={GRID_MAJOR}
              strokeWidth={1}
            />
          </pattern>

          <radialGradient id="sheet-vignette" cx="45%" cy="52%" r="70%">
            <stop offset="0%" stopColor="#171C27" stopOpacity={1} />
            <stop offset="100%" stopColor={SHEET} stopOpacity={1} />
          </radialGradient>

          <radialGradient id="chamber-flash" cx="50%" cy="50%" r="55%">
            <stop offset="0%" stopColor={AMBER} stopOpacity={1} />
            <stop offset="60%" stopColor={ORANGE} stopOpacity={0.55} />
            <stop offset="100%" stopColor={ORANGE} stopOpacity={0} />
          </radialGradient>

          <linearGradient id="pronotum" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#E85A34" />
            <stop offset="100%" stopColor="#A73A1F" />
          </linearGradient>

          <linearGradient id="elytra" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22344B" />
            <stop offset="55%" stopColor="#161F2E" />
            <stop offset="100%" stopColor="#0D131C" />
          </linearGradient>

          <filter
            id="soft-glow"
            x="-30%"
            y="-30%"
            width="160%"
            height="160%"
          >
            <feGaussianBlur stdDeviation="6" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <clipPath id="sheet-clip">
            <rect
              x={FRAME.x}
              y={FRAME.y}
              width={FRAME.w}
              height={FRAME.h}
            />
          </clipPath>
        </defs>

        {/* Blueprint sheet */}
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
          fill="url(#grid)"
        />
        <rect
          x={FRAME.x}
          y={FRAME.y}
          width={FRAME.w}
          height={FRAME.h}
          fill="url(#grid-major)"
        />

        {/* Sheet border */}
        <rect
          x={FRAME.x + 0.5}
          y={FRAME.y + 0.5}
          width={FRAME.w - 1}
          height={FRAME.h - 1}
          fill="none"
          stroke="#2A3346"
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
          <g key={i} stroke={ORANGE} strokeWidth={1.5} fill="none">
            <line x1={cx} y1={cy} x2={cx + sx * 24} y2={cy} />
            <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 24} />
          </g>
        ))}

        {/* Sheet title strip */}
        <g
          transform={`translate(${FRAME.x + 24}, ${FRAME.y + 32})`}
          fill={GRAY}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
        >
          <text>PLATE III · APPARATUS — DEFENSIVE PULSE JET</text>
        </g>
        <g
          transform={`translate(${FRAME.x + FRAME.w - 24}, ${
            FRAME.y + 32
          })`}
          fill={GRAY}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
          textAnchor="end"
        >
          <text>
            <tspan fill={ORANGE}>◆</tspan> BRACHINUS SP. · SCALE 12:1
          </text>
        </g>

        <g clipPath="url(#sheet-clip)" opacity={drawEased}>
          {/* ── Callouts (drawn under beetle so beetle sits on top) ──── */}
          <g
            opacity={calloutOp}
            fontFamily={inter}
            fontSize={11}
            letterSpacing={2.4}
            fontWeight={600}
            fill={CHALK}
          >
            {/* 01  Reservoir → top-left */}
            <g stroke={CHALK} strokeWidth={1}>
              <line x1={430} y1={488} x2={355} y2={330} />
              <line x1={355} y1={330} x2={95} y2={330} />
            </g>
            <circle cx={355} cy={330} r={2.5} fill={CHALK} stroke="none" />
            <text x={95} y={322} fill={CHALK}>
              01
            </text>
            <text x={95} y={342} fill={GRAY}>
              RESERVOIR
            </text>
            <text
              x={95}
              y={358}
              fill={GRAY}
              fontWeight={500}
              letterSpacing={1.6}
              fontSize={10}
            >
              25% H₂O₂ + HYDROQUINONES
            </text>

            {/* 02  Muscular valve → bottom-left */}
            <g stroke={CHALK} strokeWidth={1}>
              <line x1={552} y1={582} x2={552} y2={680} />
              <line x1={552} y1={680} x2={95} y2={680} />
            </g>
            <circle cx={552} cy={680} r={2.5} fill={CHALK} stroke="none" />
            <text x={95} y={672} fill={CHALK}>
              02
            </text>
            <text x={95} y={692} fill={GRAY}>
              MUSCULAR VALVE
            </text>

            {/* 03  Reactor → top-right */}
            <g stroke={CHALK} strokeWidth={1}>
              <line x1={655} y1={468} x2={730} y2={330} />
              <line x1={730} y1={330} x2={985} y2={330} />
            </g>
            <circle cx={730} cy={330} r={2.5} fill={CHALK} stroke="none" />
            <text x={985} y={322} textAnchor="end" fill={CHALK}>
              03
            </text>
            <text x={985} y={342} textAnchor="end" fill={GRAY}>
              REACTION CHAMBER
            </text>
            <text
              x={985}
              y={358}
              textAnchor="end"
              fill={GRAY}
              fontWeight={500}
              letterSpacing={1.6}
              fontSize={10}
            >
              CATALASE · PEROXIDASE
            </text>

            {/* 04  Nozzle & plume → bottom-right (combined; hook payoff) */}
            <g stroke={AMBER} strokeWidth={1}>
              <line x1={826} y1={545} x2={870} y2={720} />
              <line x1={870} y1={720} x2={985} y2={720} />
            </g>
            <circle cx={870} cy={720} r={2.5} fill={AMBER} stroke="none" />
            <text x={985} y={712} textAnchor="end" fill={AMBER}>
              04
            </text>
            <text x={985} y={732} textAnchor="end" fill={AMBER} opacity={0.9}>
              NOZZLE · 500 Hz · 100 °C
            </text>
          </g>

          {/* ── Beetle profile (facing LEFT) ───────────────────────── */}
          {/* Legs — 3 visible in profile, drawn behind body */}
          <g
            stroke={STEEL}
            strokeWidth={2.4}
            strokeLinecap="round"
            fill="none"
          >
            {/* Foreleg */}
            <path d="M 330 585 L 315 640 L 285 665" />
            {/* Midleg */}
            <path d="M 500 610 L 495 675 L 465 700" />
            {/* Hindleg */}
            <path d="M 700 605 L 730 685 L 705 715" />
            {/* Second-set legs (further, dimmer, slightly offset) */}
            <g stroke={STEEL} opacity={0.5}>
              <path d="M 355 595 L 345 655 L 320 685" />
              <path d="M 525 615 L 525 690 L 500 715" />
              <path d="M 725 610 L 755 700 L 735 730" />
            </g>
          </g>

          {/* Antennae */}
          <g
            stroke={STEEL}
            strokeWidth={2}
            strokeLinecap="round"
            fill="none"
          >
            <path d="M 232 478 Q 190 425 155 380" />
            <path d="M 245 476 Q 215 420 205 370" />
          </g>

          {/* Head */}
          <circle
            cx={HEAD_CX}
            cy={HEAD_CY}
            r={HEAD_R}
            fill="url(#pronotum)"
          />
          {/* Mandibles */}
          <path
            d={`M ${HEAD_CX - 24} ${HEAD_CY - 8} L ${HEAD_CX - 44} ${
              HEAD_CY - 14
            } L ${HEAD_CX - 28} ${HEAD_CY - 2} Z`}
            fill="#7A2916"
          />
          <path
            d={`M ${HEAD_CX - 24} ${HEAD_CY + 8} L ${HEAD_CX - 44} ${
              HEAD_CY + 14
            } L ${HEAD_CX - 28} ${HEAD_CY + 2} Z`}
            fill="#7A2916"
          />
          {/* Eye */}
          <circle
            cx={HEAD_CX - 8}
            cy={HEAD_CY - 5}
            r={4.5}
            fill={INK}
          />

          {/* Pronotum */}
          <path
            d={`M 275 478
                Q 290 462 320 458
                L 340 456
                Q 345 465 345 475
                L 345 555
                Q 345 570 335 578
                L 300 575
                Q 285 570 275 552
                Z`}
            fill="url(#pronotum)"
            stroke="#7A2916"
            strokeWidth={1}
          />

          {/* Elytra outer shape (extended to fully enclose the nozzle) */}
          <path
            d={`M 335 458
                Q 480 426 700 456
                Q 790 470 830 490
                Q 855 505 858 522
                Q 855 545 830 565
                Q 790 580 700 618
                Q 500 632 380 622
                Q 335 615 320 588
                Q 315 545 320 500
                Q 322 478 335 458
                Z`}
            fill="url(#elytra)"
            stroke={STEEL}
            strokeWidth={1.2}
          />

          {/* Abdomen taper — the rear muscle sheath around the nozzle */}
          <path
            d={`M 782 466
                Q 826 480 852 502
                Q 858 515 858 522
                Q 855 540 828 560
                Q 800 575 782 585`}
            fill="none"
            stroke={STEEL}
            strokeWidth={1}
            opacity={0.6}
          />

          {/* Elytra midline / suture */}
          <path
            d={`M 335 458 Q 480 446 700 468 Q 790 480 830 500`}
            stroke={STEEL}
            strokeWidth={0.8}
            fill="none"
            opacity={0.55}
          />

          {/* Elytra top-edge highlight — glint of chitin */}
          <path
            d={`M 350 452 Q 490 424 690 452`}
            stroke={AMBER}
            strokeWidth={1}
            fill="none"
            opacity={0.28}
          />

          {/* Cutaway window — an organic aperture revealing the reactor */}
          <path
            d={`M 342 462
                Q 550 448 782 470
                Q 800 500 800 522
                Q 795 555 782 578
                Q 550 610 340 605
                Q 322 585 320 540
                Q 322 495 342 462
                Z`}
            fill={SHEET}
            opacity={0.96}
          />
          {/* Cutaway ragged edge (dashed hairline) */}
          <path
            d={`M 342 462
                Q 550 448 782 470
                Q 800 500 800 522
                Q 795 555 782 578
                Q 550 610 340 605
                Q 322 585 320 540
                Q 322 495 342 462
                Z`}
            fill="none"
            stroke={STEEL}
            strokeDasharray="4 3"
            strokeWidth={1.1}
          />

          {/* ── Reactor schematic (inside cutaway) ─────────────────── */}
          {/* Reservoir */}
          <g>
            <rect
              x={RESERVOIR.x}
              y={RESERVOIR.y}
              width={RESERVOIR.w}
              height={RESERVOIR.h}
              rx={6}
              fill={INK}
              stroke={CHALK}
              strokeWidth={1.2}
            />
            {/* Liquid fill line */}
            <rect
              x={RESERVOIR.x + 6}
              y={RESERVOIR.y + 32}
              width={RESERVOIR.w - 12}
              height={RESERVOIR.h - 40}
              fill={STEEL}
              opacity={0.35}
            />
            <line
              x1={RESERVOIR.x + 6}
              y1={RESERVOIR.y + 32}
              x2={RESERVOIR.x + RESERVOIR.w - 6}
              y2={RESERVOIR.y + 32}
              stroke={CHALK}
              strokeWidth={0.8}
              strokeDasharray="3 3"
              opacity={0.7}
            />
            {/* Label inside reservoir */}
            <text
              x={RESERVOIR.x + RESERVOIR.w / 2}
              y={RESERVOIR.y + 22}
              textAnchor="middle"
              fill={CHALK}
              fontFamily={inter}
              fontSize={10}
              letterSpacing={2.4}
              fontWeight={600}
            >
              CHAMBER A
            </text>
            <text
              x={RESERVOIR.x + RESERVOIR.w / 2}
              y={RESERVOIR.y + 66}
              textAnchor="middle"
              fill={CHALK}
              fontFamily={inter}
              fontSize={13}
              letterSpacing={0.8}
              fontWeight={500}
            >
              H₂O₂
            </text>
            <text
              x={RESERVOIR.x + RESERVOIR.w / 2}
              y={RESERVOIR.y + 86}
              textAnchor="middle"
              fill={CHALK}
              opacity={0.85}
              fontFamily={inter}
              fontSize={13}
              letterSpacing={0.8}
              fontWeight={500}
            >
              C₆H₆O₂
            </text>
          </g>

          {/* Conduit — reservoir → valve → reactor */}
          <g
            stroke={CHALK}
            strokeWidth={1.6}
            fill="none"
            strokeLinecap="round"
          >
            <line
              x1={RESERVOIR.x + RESERVOIR.w}
              y1={525}
              x2={VALVE_X - 6}
              y2={525}
            />
            {/* Valve (hourglass) */}
            <path
              d={`M ${VALVE_X - 6} 512
                  L ${VALVE_X + 6} 525
                  L ${VALVE_X - 6} 538
                  M ${VALVE_X + 6} 512
                  L ${VALVE_X - 6} 525
                  L ${VALVE_X + 6} 538`}
            />
            <line
              x1={VALVE_X + 6}
              y1={525}
              x2={REACTOR.x}
              y2={525}
            />
          </g>

          {/* Flowing reactant particles from reservoir → reaction chamber */}
          {(() => {
            const startX = RESERVOIR.x + RESERVOIR.w;
            const endX = REACTOR.x;
            const y = 525;
            const dots: React.ReactElement[] = [];
            for (let i = 0; i < 4; i++) {
              const phase = (flowT * 1.4 + i * 0.25) % 1;
              const x = startX + (endX - startX) * phase;
              const op =
                flowT > 0
                  ? Math.sin(phase * Math.PI) * 0.9
                  : 0;
              dots.push(
                <circle
                  key={`flow-${i}`}
                  cx={x}
                  cy={y}
                  r={3}
                  fill={AMBER}
                  opacity={op}
                />,
              );
            }
            return dots;
          })()}

          {/* Reaction chamber */}
          <g>
            {/* Outer armored wall (double line) */}
            <rect
              x={REACTOR.x - 4}
              y={REACTOR.y - 4}
              width={REACTOR.w + 8}
              height={REACTOR.h + 8}
              rx={10}
              fill="none"
              stroke={CHALK}
              strokeWidth={1.2}
            />
            <rect
              x={REACTOR.x}
              y={REACTOR.y}
              width={REACTOR.w}
              height={REACTOR.h}
              rx={7}
              fill={INK}
              stroke={CHALK}
              strokeWidth={1.4}
            />
            {/* Flash (when reaction fires) */}
            {flashIntensity > 0 && (
              <rect
                x={REACTOR.x + 3}
                y={REACTOR.y + 3}
                width={REACTOR.w - 6}
                height={REACTOR.h - 6}
                rx={5}
                fill="url(#chamber-flash)"
                opacity={flashIntensity * 0.95}
              />
            )}
            {/* Catalyst tick marks on inner wall (top + bottom) */}
            <g stroke={AMBER} strokeWidth={1}>
              {Array.from({ length: 9 }).map((_, i) => {
                const x = REACTOR.x + 12 + i * 15;
                return (
                  <g key={i}>
                    <line x1={x} y1={REACTOR.y + 4} x2={x} y2={REACTOR.y + 12} />
                    <line
                      x1={x}
                      y1={REACTOR.y + REACTOR.h - 4}
                      x2={x}
                      y2={REACTOR.y + REACTOR.h - 12}
                    />
                  </g>
                );
              })}
            </g>
            {/* Chamber label */}
            <text
              x={REACTOR.x + REACTOR.w / 2}
              y={REACTOR.y + 26}
              textAnchor="middle"
              fill={CHALK}
              fontFamily={inter}
              fontSize={10}
              letterSpacing={2.4}
              fontWeight={600}
            >
              CHAMBER B
            </text>
            {/* Reaction formula */}
            <text
              x={REACTOR.x + REACTOR.w / 2}
              y={REACTOR.y + 66}
              textAnchor="middle"
              fill={CHALK}
              fontFamily={inter}
              fontSize={11}
              letterSpacing={0.8}
              fontWeight={500}
              opacity={0.95}
            >
              H₂O₂ + C₆H₆O₂
            </text>
            <text
              x={REACTOR.x + REACTOR.w / 2}
              y={REACTOR.y + 82}
              textAnchor="middle"
              fill={AMBER}
              fontFamily={inter}
              fontSize={14}
              fontWeight={600}
            >
              ↓
            </text>
            <text
              x={REACTOR.x + REACTOR.w / 2}
              y={REACTOR.y + 100}
              textAnchor="middle"
              fill={AMBER}
              fontFamily={inter}
              fontSize={11}
              letterSpacing={0.8}
              fontWeight={600}
            >
              C₆H₄O₂ + H₂O + ΔH
            </text>
          </g>

          {/* Nozzle taper — from reactor to abdomen tip */}
          <path
            d={`M ${REACTOR.x + REACTOR.w} ${REACTOR.y + 10}
                L ${NOZZLE_X - 4} ${NOZZLE_Y - 20}
                L ${NOZZLE_X - 4} ${NOZZLE_Y + 20}
                L ${REACTOR.x + REACTOR.w} ${REACTOR.y + REACTOR.h - 10}
                Z`}
            fill={INK}
            stroke={CHALK}
            strokeWidth={1.2}
          />
          {/* Nozzle aperture ring */}
          <line
            x1={NOZZLE_X - 4}
            y1={NOZZLE_Y - 20}
            x2={NOZZLE_X - 4}
            y2={NOZZLE_Y + 20}
            stroke={AMBER}
            strokeWidth={2}
            opacity={0.85}
          />

          {/* ── Spray plume — pulsed arcs to the right ────────────── */}
          {fireT > 0 &&
            Array.from({ length: NUM_PULSES }).map((_, i) => {
              const localFrame = (fireT - i * pulsePeriod) % (pulsePeriod * NUM_PULSES);
              if (localFrame < 0) return null;
              const life = pulsePeriod * NUM_PULSES;
              const lifeT = localFrame / life;
              if (lifeT > 1) return null;
              // Arc grows outward and fades
              const eased = 1 - Math.pow(1 - lifeT, 2);
              const r = 20 + eased * 160;
              const op = Math.max(0, 1 - lifeT) * 0.9;
              const cx = NOZZLE_X - 4;
              const cy = NOZZLE_Y;
              // Path: arc facing right
              const startAngle = -Math.PI * 0.42;
              const endAngle = Math.PI * 0.42;
              const sx = cx + Math.cos(startAngle) * r;
              const sy = cy + Math.sin(startAngle) * r;
              const ex = cx + Math.cos(endAngle) * r;
              const ey = cy + Math.sin(endAngle) * r;
              return (
                <path
                  key={`arc-${i}`}
                  d={`M ${sx} ${sy} A ${r} ${r} 0 0 1 ${ex} ${ey}`}
                  stroke={i % 2 === 0 ? AMBER : ORANGE}
                  strokeWidth={Math.max(1.5, 6 - eased * 4)}
                  strokeLinecap="round"
                  fill="none"
                  opacity={op}
                  filter="url(#soft-glow)"
                />
              );
            })}

          {/* Hot core at nozzle */}
          {fireT > 0 && (
            <circle
              cx={NOZZLE_X - 4}
              cy={NOZZLE_Y}
              r={10}
              fill={AMBER}
              opacity={0.6 + 0.4 * Math.abs(Math.sin(fireT / 3))}
              filter="url(#soft-glow)"
            />
          )}
        </g>

        {/* Caption strip below sheet */}
        <g
          transform={`translate(${FRAME.x}, ${FRAME.y + FRAME.h + 22})`}
          fill={GRAY}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
        >
          <text>FIG. 1 · SIMPLIFIED CROSS-SECTION</text>
          <text
            x={FRAME.w}
            textAnchor="end"
            fill={ORANGE}
            opacity={0.9}
          >
            SPRAY DISCHARGE ~ 500 CYCLES/SEC
          </text>
        </g>
      </svg>

      {/* ── Type lockup ────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 970,
          opacity: titleSpring,
          transform: `translateY(${titleTrans}px)`,
        }}
      >
        <div
          style={{
            color: ORANGE,
            fontFamily: inter,
            fontSize: 13,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 20,
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
            fontSize: 84,
            lineHeight: 0.96,
            letterSpacing: -1.4,
            fontStyle: "italic",
          }}
        >
          The 500-pulse
          <br />
          pulse jet.
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
          Deep inside the beetle's abdomen, a reservoir of{" "}
          <span style={{ color: AMBER, fontWeight: 600 }}>
            25% hydrogen peroxide
          </span>{" "}
          and hydroquinones meters into an armoured reaction chamber where{" "}
          <span style={{ color: AMBER, fontWeight: 600 }}>
            catalase and peroxidase
          </span>{" "}
          drive an exothermic decomposition to ~100 °C — ejected as{" "}
          <span style={{ color: AMBER, fontWeight: 600 }}>
            ~500 pulses per second
          </span>
          . A biological pulse jet.
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
        <span>Dean, Aneshansley, Edgerton & Eisner · Science 248 (1990)</span>
        <span>
          <span style={{ color: ORANGE }}>●</span> Reservoir&nbsp;&nbsp;
          <span style={{ color: AMBER }}>◐</span> Plume
        </span>
      </div>

      {/* Reference to duration so lint doesn't complain */}
      <div style={{ display: "none" }}>{durationInFrames}</div>
    </AbsoluteFill>
  );
};
