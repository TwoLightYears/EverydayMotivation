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

// ── Palette — from the concept's visual brief ────────────────────────────
const INK = "#0E1119";
const BOARD = "#141822";
const CREAM = "#F5EBD3";
const RUST = "#D9531F";
const HEAT = "#F5A83A";
const ELYTRA = "#2E3B54";
const GRAY = "#8A8F99";
const GRID = "#1B2130";
const GRID_MAJOR = "#242C3F";

// ── Beetle geometry (in the internal 1080×800 scene coord space) ────────
// A stylised right-facing Stenaptinus insignis side profile.
// Anchors: HEAD tip ≈ x 240, nozzle tip ≈ x 830, midline y ≈ 430.
const MID_Y = 430;

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Entrance timings
  const beetleSpring = spring({
    frame: frame - fps * 0.15,
    fps,
    config: { damping: 200, mass: 0.9 },
  });
  const cutawaySpring = spring({
    frame: frame - fps * 0.8,
    fps,
    config: { damping: 200, mass: 0.9 },
  });
  const titleSpring = spring({
    frame: frame - fps * 1.1,
    fps,
    config: { damping: 200, mass: 0.9 },
  });
  const hookOpacity = interpolate(frame, [fps * 1.6, fps * 2.4], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Micropulse train — perceptually simplified to ~5 Hz visible bursts
  const PULSE_PERIOD = fps * 0.9; // ~1.11 Hz burst rhythm
  const PULSES_PER_BURST = 8;
  const BURST_SPACING = 4; // frames between pulses in a burst

  // ── Page layout (1080 × 1350 portrait) ───────────────────────────────
  const FRAME = { x: 60, y: 130, w: 960, h: 711 };
  const SCENE_W = 1080;
  const SCENE_H = 800;
  const scale = FRAME.w / SCENE_W;

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
        <span style={{ color: HEAT }}>2026 · 08 · 02</span>
      </div>

      {/* Drafting frame + beetle diagram */}
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

          <radialGradient id="board-vignette" cx="50%" cy="42%" r="70%">
            <stop offset="0%" stopColor="#181D28" stopOpacity={1} />
            <stop offset="100%" stopColor={BOARD} stopOpacity={1} />
          </radialGradient>

          <radialGradient id="pulse-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={HEAT} stopOpacity={0.9} />
            <stop offset="55%" stopColor={RUST} stopOpacity={0.35} />
            <stop offset="100%" stopColor={RUST} stopOpacity={0} />
          </radialGradient>

          <linearGradient id="elytra-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4A5A7C" />
            <stop offset="55%" stopColor={ELYTRA} />
            <stop offset="100%" stopColor="#1B2337" />
          </linearGradient>

          <linearGradient id="pronotum-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#EE6A2C" />
            <stop offset="100%" stopColor="#B23D14" />
          </linearGradient>

          <linearGradient id="chamber-fill" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#1E2432" />
            <stop offset="100%" stopColor="#0F131C" />
          </linearGradient>

          <linearGradient id="reaction-fill" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#8E2A0C" />
            <stop offset="60%" stopColor={RUST} />
            <stop offset="100%" stopColor={HEAT} />
          </linearGradient>

          <radialGradient id="nozzle-flare" cx="20%" cy="50%" r="80%">
            <stop offset="0%" stopColor={HEAT} stopOpacity={0.9} />
            <stop offset="100%" stopColor={HEAT} stopOpacity={0} />
          </radialGradient>

          <filter id="soft-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="5" />
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
          stroke="#2E3549"
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
          <g key={i} stroke={HEAT} strokeWidth={1.5} fill="none">
            <line x1={cx} y1={cy} x2={cx + sx * 26} y2={cy} />
            <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 26} />
          </g>
        ))}

        {/* Fig no. */}
        <g
          transform={`translate(${FRAME.x + 24}, ${FRAME.y + 28})`}
          fill={GRAY}
          fontFamily={inter}
          fontWeight={600}
          fontSize={11}
          letterSpacing={3.2}
        >
          <text>FIG. 1</text>
        </g>
        {/* Spec strip top-right of board */}
        <g
          transform={`translate(${FRAME.x + FRAME.w - 24}, ${FRAME.y + 28})`}
          fill={GRAY}
          fontFamily={inter}
          fontWeight={500}
          fontSize={11}
          letterSpacing={3.2}
          textAnchor="end"
        >
          <text>PULSEJET · TWO-CHAMBER · 500 HZ</text>
        </g>

        {/* Scale bar */}
        <g
          transform={`translate(${FRAME.x + 26}, ${FRAME.y + FRAME.h - 26})`}
          stroke={GRAY}
          fill={GRAY}
          fontFamily={inter}
          fontSize={10}
          letterSpacing={3}
          fontWeight={500}
        >
          <line x1={0} y1={0} x2={80} y2={0} strokeWidth={1.2} />
          <line x1={0} y1={-5} x2={0} y2={5} strokeWidth={1.2} />
          <line x1={40} y1={-3} x2={40} y2={3} strokeWidth={1.2} />
          <line x1={80} y1={-5} x2={80} y2={5} strokeWidth={1.2} />
          <text x={90} y={4} stroke="none">
            5 MM
          </text>
        </g>

        {/* Scene contents scaled into FRAME */}
        <g transform={`translate(${FRAME.x}, ${FRAME.y}) scale(${scale})`}>
          {/* ── Inset: pressure trace / pulsejet cycle ─────────────── */}
          {(() => {
            const opac = interpolate(
              frame,
              [fps * 0.8, fps * 1.6],
              [0, 1],
              {
                easing: Easing.out(Easing.cubic),
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              },
            );
            const ORIG_X = 90;
            const ORIG_Y = 195;
            const W = 360;
            const H = 60;
            // Sample a pulsed spike train
            const pts: string[] = [];
            const cycle = 30;
            const shift = (frame * 4) % cycle;
            for (let x = 0; x <= W; x += 2) {
              const phase = ((x + shift) % cycle) / cycle;
              let y = 0;
              if (phase < 0.08) {
                y = Math.sin(phase * Math.PI * 6.25) * 1;
              } else if (phase < 0.28) {
                y = Math.exp(-(phase - 0.08) * 12) * 1;
              }
              pts.push(`${x},${-y * (H * 0.85)}`);
            }
            return (
              <g
                opacity={opac}
                transform={`translate(${ORIG_X}, ${ORIG_Y})`}
                fontFamily={inter}
              >
                {/* Y-axis */}
                <line
                  x1={0}
                  y1={4}
                  x2={0}
                  y2={-H}
                  stroke={GRAY}
                  strokeWidth={1}
                  opacity={0.7}
                />
                <text
                  x={-8}
                  y={-H + 6}
                  fill={GRAY}
                  fontSize={10}
                  letterSpacing={2}
                  textAnchor="end"
                >
                  P
                </text>
                {/* Baseline */}
                <line
                  x1={0}
                  y1={0}
                  x2={W}
                  y2={0}
                  stroke={GRAY}
                  strokeWidth={1}
                  opacity={0.7}
                />
                {/* Ticks */}
                {[0.25, 0.5, 0.75].map((f) => (
                  <line
                    key={`tx-${f}`}
                    x1={W * f}
                    y1={0}
                    x2={W * f}
                    y2={4}
                    stroke={GRAY}
                    strokeWidth={1}
                    opacity={0.55}
                  />
                ))}
                {/* Trace */}
                <polyline
                  points={pts.join(" ")}
                  fill="none"
                  stroke={HEAT}
                  strokeWidth={1.6}
                  strokeLinejoin="round"
                />
                {/* Axis tick labels */}
                <text
                  x={0}
                  y={18}
                  fill={GRAY}
                  fontSize={10}
                  letterSpacing={2}
                >
                  0
                </text>
                <text
                  x={W}
                  y={18}
                  fill={GRAY}
                  fontSize={10}
                  letterSpacing={2}
                  textAnchor="end"
                >
                  20 MS
                </text>
                {/* Caption BELOW the trace */}
                <text
                  x={0}
                  y={40}
                  fill={GRAY}
                  fontSize={11}
                  letterSpacing={3}
                  fontWeight={500}
                >
                  FIG. 1A · PRESSURE TRACE ·{" "}
                  <tspan fill={CREAM} fontWeight={600}>
                    ~500 HZ SPIKE TRAIN
                  </tspan>
                </text>
              </g>
            );
          })()}

          {/* ── Beetle diagram ─────────────────────────────────────── */}
          {(() => {
            const enter = beetleSpring;
            const dy = interpolate(enter, [0, 1], [12, 0]);
            return (
              <g
                opacity={enter}
                transform={`translate(0, ${dy})`}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {/* ── Legs (drawn beneath body) ───────────────────── */}
                {/* Each leg: coxa/femur → tibia → tarsus */}
                {[
                  // front leg — forward reach
                  {
                    hip: [340, 458],
                    knee: [318, 528],
                    foot: [284, 598],
                    tarsus: [252, 618],
                  },
                  // middle leg — mid stance
                  {
                    hip: [430, 476],
                    knee: [428, 552],
                    foot: [412, 622],
                    tarsus: [384, 640],
                  },
                  // back leg — pushing rearward
                  {
                    hip: [605, 472],
                    knee: [652, 552],
                    foot: [712, 618],
                    tarsus: [758, 632],
                  },
                ].map((L, i) => (
                  <g
                    key={`leg-${i}`}
                    stroke={RUST}
                    fill="none"
                    strokeLinecap="round"
                    strokeWidth={4.2}
                  >
                    <line
                      x1={L.hip[0]}
                      y1={L.hip[1]}
                      x2={L.knee[0]}
                      y2={L.knee[1]}
                    />
                    <line
                      x1={L.knee[0]}
                      y1={L.knee[1]}
                      x2={L.foot[0]}
                      y2={L.foot[1]}
                    />
                    {/* tarsus (small final segment, thinner) */}
                    <line
                      x1={L.foot[0]}
                      y1={L.foot[1]}
                      x2={L.tarsus[0]}
                      y2={L.tarsus[1]}
                      strokeWidth={3}
                    />
                    {/* knee joint bead */}
                    <circle
                      cx={L.knee[0]}
                      cy={L.knee[1]}
                      r={3}
                      fill={RUST}
                      stroke="none"
                    />
                  </g>
                ))}

                {/* ── Head (right-side of composition; beetle faces right) ── */}
                <g>
                  {/* Antennae */}
                  <path
                    d="M 305 405 C 260 350 220 310 190 300"
                    fill="none"
                    stroke={RUST}
                    strokeWidth={3.5}
                  />
                  <path
                    d="M 300 420 C 250 380 205 355 170 355"
                    fill="none"
                    stroke={RUST}
                    strokeWidth={3.5}
                  />
                  {/* Antennal segments */}
                  {[
                    [200, 302, 4],
                    [220, 320, 4],
                    [180, 355, 4],
                    [200, 358, 4],
                  ].map(([cx, cy, r], i) => (
                    <circle
                      key={`ant-${i}`}
                      cx={cx as number}
                      cy={cy as number}
                      r={r as number}
                      fill={RUST}
                    />
                  ))}
                  {/* Mandibles */}
                  <path
                    d="M 288 420 C 275 424 268 428 262 434"
                    stroke={RUST}
                    strokeWidth={3}
                    fill="none"
                  />
                  <path
                    d="M 292 432 C 280 438 273 442 266 446"
                    stroke={RUST}
                    strokeWidth={3}
                    fill="none"
                  />
                  {/* Head capsule */}
                  <path
                    d="M 300 400
                       C 328 395 348 405 354 425
                       C 358 445 342 462 316 465
                       C 296 466 285 452 285 435
                       C 285 415 292 402 300 400 Z"
                    fill="url(#pronotum-fill)"
                    stroke="#7A2A0A"
                    strokeWidth={1.2}
                  />
                  {/* Eye */}
                  <ellipse
                    cx={335}
                    cy={425}
                    rx={7}
                    ry={5.5}
                    fill={INK}
                  />
                  <circle cx={337} cy={424} r={1.6} fill={CREAM} />
                </g>

                {/* ── Pronotum (thorax shield) ─────────────────── */}
                <path
                  d="M 340 395
                     C 380 385 420 385 448 395
                     C 452 440 452 460 448 475
                     C 420 485 380 485 340 475
                     C 336 460 336 435 340 395 Z"
                  fill="url(#pronotum-fill)"
                  stroke="#7A2A0A"
                  strokeWidth={1.2}
                />
                {/* Pronotum midline groove */}
                <line
                  x1={394}
                  y1={392}
                  x2={394}
                  y2={478}
                  stroke="#7A2A0A"
                  strokeWidth={1}
                  opacity={0.7}
                />

                {/* ── Elytra (wing covers, main abdomen dorsal) ─── */}
                <path
                  d="M 448 400
                     C 550 390 660 395 730 415
                     C 780 430 810 445 820 465
                     C 806 490 760 500 700 495
                     C 620 490 520 485 448 470 Z"
                  fill="url(#elytra-fill)"
                  stroke="#0B111F"
                  strokeWidth={1.4}
                />
                {/* Elytra midline suture */}
                <path
                  d="M 448 435 L 810 465"
                  stroke="#0B111F"
                  strokeWidth={1.2}
                />
                {/* Elytra ridged striations */}
                {[
                  [455, 415, 795, 448],
                  [458, 425, 800, 456],
                  [455, 452, 802, 476],
                  [460, 462, 780, 488],
                ].map(([x1, y1, x2, y2], i) => (
                  <line
                    key={`stria-${i}`}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="#0B111F"
                    strokeWidth={0.9}
                    opacity={0.55}
                  />
                ))}
                {/* Elytra iridescent highlight */}
                <path
                  d="M 470 410 C 570 402 660 407 720 420
                     C 720 428 660 425 570 424 C 510 423 480 418 470 410 Z"
                  fill="#8AA0C6"
                  opacity={0.28}
                />

                {/* ── Cutaway window into the reactor ────────────── */}
                {(() => {
                  const c = cutawaySpring;
                  return (
                    <g opacity={c}>
                      {/* Cutaway backdrop (interior of abdomen) */}
                      <path
                        d="M 500 445
                           C 570 438 650 442 720 452
                           C 770 458 800 466 812 476
                           C 802 487 770 490 720 488
                           C 660 484 580 482 505 477 Z"
                        fill="url(#chamber-fill)"
                        stroke={HEAT}
                        strokeWidth={1.3}
                        strokeDasharray="6 4"
                      />

                      {/* Reservoir (front, larger) */}
                      <ellipse
                        cx={555}
                        cy={462}
                        rx={38}
                        ry={16}
                        fill="#1B2130"
                        stroke={CREAM}
                        strokeWidth={1.3}
                      />
                      <text
                        x={555}
                        y={466}
                        textAnchor="middle"
                        fill={CREAM}
                        fontFamily={inter}
                        fontSize={11}
                        fontWeight={600}
                        letterSpacing={2.4}
                      >
                        RESERVOIR
                      </text>

                      {/* Valve line */}
                      <line
                        x1={594}
                        y1={462}
                        x2={620}
                        y2={462}
                        stroke={CREAM}
                        strokeWidth={1.4}
                      />
                      <polygon
                        points="620,458 620,466 628,462"
                        fill={CREAM}
                      />

                      {/* Reaction chamber (glowing) */}
                      <ellipse
                        cx={676}
                        cy={468}
                        rx={44}
                        ry={16}
                        fill="url(#reaction-fill)"
                        stroke={HEAT}
                        strokeWidth={1.4}
                      />
                      <text
                        x={676}
                        y={472}
                        textAnchor="middle"
                        fill={INK}
                        fontFamily={inter}
                        fontSize={11}
                        fontWeight={700}
                        letterSpacing={2.4}
                      >
                        REACTION
                      </text>

                      {/* Nozzle throat */}
                      <path
                        d="M 720 462 L 800 468 L 800 476 L 720 476 Z"
                        fill={CREAM}
                        opacity={0.85}
                      />
                      <path
                        d="M 720 462 L 800 468 L 800 476 L 720 476 Z"
                        fill="none"
                        stroke={HEAT}
                        strokeWidth={1.2}
                      />
                    </g>
                  );
                })()}

                {/* ── Callout labels ─────────────────────────────── */}
                {(() => {
                  const c = cutawaySpring;
                  return (
                    <g
                      opacity={c}
                      fill={CREAM}
                      fontFamily={inter}
                      fontSize={11}
                      letterSpacing={2.6}
                      fontWeight={500}
                    >
                      {/* Reservoir callout */}
                      <g>
                        <line
                          x1={555}
                          y1={446}
                          x2={555}
                          y2={330}
                          stroke={HEAT}
                          strokeWidth={1}
                        />
                        <line
                          x1={555}
                          y1={330}
                          x2={420}
                          y2={330}
                          stroke={HEAT}
                          strokeWidth={1}
                        />
                        <circle cx={555} cy={446} r={2.6} fill={HEAT} />
                        <text x={415} y={326} textAnchor="end">
                          HYDROQUINONE
                        </text>
                        <text
                          x={415}
                          y={344}
                          textAnchor="end"
                          fill={GRAY}
                          fontSize={10}
                          letterSpacing={2.4}
                        >
                          + H₂O₂ · STORED
                        </text>
                      </g>
                      {/* Reaction callout */}
                      <g>
                        <line
                          x1={676}
                          y1={484}
                          x2={676}
                          y2={620}
                          stroke={HEAT}
                          strokeWidth={1}
                        />
                        <line
                          x1={676}
                          y1={620}
                          x2={805}
                          y2={620}
                          stroke={HEAT}
                          strokeWidth={1}
                        />
                        <circle cx={676} cy={484} r={2.6} fill={HEAT} />
                        <text x={810} y={615}>
                          100 °C · ~500 Hz
                        </text>
                        <text
                          x={810}
                          y={633}
                          fill={GRAY}
                          fontSize={10}
                          letterSpacing={2.4}
                        >
                          CATALASE · PEROXIDASE
                        </text>
                      </g>
                      {/* Nozzle callout */}
                      <g>
                        <line
                          x1={790}
                          y1={470}
                          x2={870}
                          y2={370}
                          stroke={HEAT}
                          strokeWidth={1}
                        />
                        <line
                          x1={870}
                          y1={370}
                          x2={980}
                          y2={370}
                          stroke={HEAT}
                          strokeWidth={1}
                        />
                        <circle cx={790} cy={470} r={2.6} fill={HEAT} />
                        <text x={870} y={362}>
                          NOZZLE
                        </text>
                        <text
                          x={870}
                          y={386}
                          fill={GRAY}
                          fontSize={10}
                          letterSpacing={2.4}
                        >
                          AIMS 270°
                        </text>
                      </g>
                    </g>
                  );
                })()}
              </g>
            );
          })()}

          {/* ── Pulsed spray train ─────────────────────────────────── */}
          {(() => {
            const NOZZLE_X = 812;
            const NOZZLE_Y = 470;
            const dots: React.ReactElement[] = [];
            // Emit up to N pulses; each was fired k frames ago and has drifted.
            for (let k = 0; k < 26; k++) {
              const emitFrame = frame - k * BURST_SPACING;
              const burstPos = ((emitFrame % PULSE_PERIOD) + PULSE_PERIOD) % PULSE_PERIOD;
              const inBurst =
                burstPos < PULSES_PER_BURST * BURST_SPACING &&
                emitFrame >= fps * 1.4;
              if (!inBurst) continue;
              const age = k / 26;
              const eased = Easing.out(Easing.cubic)(age);
              const dist = eased * 220;
              const cx = NOZZLE_X + dist;
              const cy = NOZZLE_Y + eased * 22 + Math.sin(k * 0.7) * 3;
              const r = interpolate(age, [0, 1], [8, 1.4]);
              const op = interpolate(age, [0, 0.15, 1], [0.15, 1, 0]);
              dots.push(
                <g key={`pulse-${k}`} opacity={op}>
                  <circle
                    cx={cx}
                    cy={cy}
                    r={r * 3.2}
                    fill="url(#pulse-glow)"
                  />
                  <circle cx={cx} cy={cy} r={r} fill={HEAT} />
                </g>,
              );
            }
            // Muzzle bloom
            const bloomBurstPos = (frame % PULSE_PERIOD) / PULSE_PERIOD;
            const bloom =
              frame >= fps * 1.4
                ? Math.max(0, 1 - bloomBurstPos * 4) * 0.9
                : 0;
            return (
              <g>
                <ellipse
                  cx={NOZZLE_X + 6}
                  cy={NOZZLE_Y + 4}
                  rx={70}
                  ry={40}
                  fill="url(#nozzle-flare)"
                  opacity={bloom * 0.7}
                />
                {dots}
              </g>
            );
          })()}
        </g>

        {/* Caption strip under drafting frame */}
        <g
          transform={`translate(${FRAME.x}, ${FRAME.y + FRAME.h + 24})`}
          fill={GRAY}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
        >
          <text>FIG. 1 · STENAPTINUS INSIGNIS · MEDIAN CUTAWAY</text>
          <text
            x={FRAME.w}
            textAnchor="end"
            fill={HEAT}
            opacity={0.9}
          >
            EJECTION RATE 500 PULSES / SEC
          </text>
        </g>
      </svg>

      {/* ── Type lockup ────────────────────────────────────────────── */}
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
            color: HEAT,
            fontFamily: inter,
            fontSize: 13,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 18,
            fontWeight: 600,
          }}
        >
          Role <span style={{ color: GRAY, margin: "0 4px" }}>/</span>
          <span style={{ color: CREAM, letterSpacing: 5 }}>
            Aerospace Engineer
          </span>
        </div>

        <div
          style={{
            color: CREAM,
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 84,
            lineHeight: 0.96,
            letterSpacing: -1.4,
            fontStyle: "italic",
          }}
        >
          The beetle
          <br />
          that beat the pulsejet.
        </div>

        <div
          style={{
            marginTop: 28,
            color: "#D5D2C7",
            fontFamily: inter,
            fontSize: 19,
            lineHeight: 1.42,
            fontWeight: 400,
            maxWidth: 900,
            opacity: hookOpacity,
          }}
        >
          Two chambers, two reagents, one enzyme wall.{" "}
          <span style={{ color: HEAT, fontWeight: 600 }}>
            Stenaptinus insignis
          </span>{" "}
          fires a boiling defensive spray in staccato micropulses at{" "}
          <span style={{ color: HEAT, fontWeight: 600 }}>~500 Hz</span> — a
          combustion cycle so close to the V-1's pulsejet that aerospace
          engineers now model it to redesign real combustors.
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
        <span>Eisner & Aneshansley · PNAS 96 (1999) 9705–9709</span>
        <span>
          <span style={{ color: HEAT }}>●</span> Pulsejet analogue
        </span>
      </div>
    </AbsoluteFill>
  );
};
