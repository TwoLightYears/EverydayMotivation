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

// Palette — taken from the concept's visual brief
const INK = "#0B0F14";
const PAPER = "#0F141B";
const NAVY = "#12233F";
const NAVY_HI = "#1A3358";
const ORANGE = "#E85A1F";
const AMBER = "#F5B942";
const GRAY = "#6E7A88";
const GRID = "#161C25";
const GRID_MAJOR = "#1E2732";

// ── Diagram coord space (1080 × 800) ────────────────────────────────────
const MAP_W = 1080;
const MAP_H = 800;

// Beetle (side profile, head → left, tail → right; whole abdomen cutaway)
const BODY_Y = 470;
const HEAD = { x: 100, y: BODY_Y, r: 30 };

// Reactor components
const RES_A = { cx: 400, cy: 425, r: 30 }; // hydroquinones (amber)
const RES_B = { cx: 400, cy: 515, r: 30 }; // hydrogen peroxide (blue-white)
const VALVE = { x: 520, y: BODY_Y };
const MIX = { cx: 640, cy: BODY_Y, r: 44 };
const NOZZLE_START = 690;
const NOZZLE_END = 830;
const SPRAY_EXIT = 835;
const SPRAY_MAX = 1050;

// Floating temperature card (top of diagram, above reactor)
const TCARD = { x: 550, y: 90, w: 200, h: 100 };

// ── Helpers ─────────────────────────────────────────────────────────────
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const easeOutCubic = (v: number) => 1 - Math.pow(1 - clamp01(v), 3);

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const s = frame / fps;

  const draw = easeOutCubic((s - 0.05) / 0.9);
  const fill = easeOutCubic((s - 0.7) / 0.75);
  const tempReveal = easeOutCubic((s - 1.0) / 0.6);

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

  // ── Pulse train ───────────────────────────────────────────────────────
  const PULSE_PERIOD = 6; // frames between firings (~5 Hz @ 30 fps)
  const PUFF_LIFE = 30;
  const PUFFS: { age: number; id: number }[] = [];
  const firstFire = Math.ceil((fps * 1.4) / PULSE_PERIOD) * PULSE_PERIOD;
  for (let f = firstFire; f <= frame; f += PULSE_PERIOD) {
    const age = frame - f;
    if (age >= 0 && age <= PUFF_LIFE) PUFFS.push({ age, id: f });
  }
  const framesSinceFire = frame - firstFire;
  const cycle = ((framesSinceFire % PULSE_PERIOD) + PULSE_PERIOD) % PULSE_PERIOD;
  const chamberFlash =
    s < 1.4 ? 0 : Math.max(0, 1 - cycle / PULSE_PERIOD) * 0.9;
  const bodyKick = s < 1.4 ? 0 : Math.max(0, 1 - cycle / PULSE_PERIOD) * -3;

  // ── Page layout (1080 × 1350) ────────────────────────────────────────
  const FRAME = { x: 60, y: 130, w: 960, h: 700 };
  const scale = FRAME.w / MAP_W;

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
        <span style={{ color: ORANGE }}>2026 · 09 · 03</span>
      </div>

      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          <pattern
            id="dots"
            x={FRAME.x}
            y={FRAME.y}
            width={24 * scale}
            height={24 * scale}
            patternUnits="userSpaceOnUse"
          >
            <circle
              cx={12 * scale}
              cy={12 * scale}
              r={0.9}
              fill={GRID}
            />
          </pattern>
          <pattern
            id="grid-major"
            x={FRAME.x}
            y={FRAME.y}
            width={120 * scale}
            height={120 * scale}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M ${120 * scale} 0 L 0 0 0 ${120 * scale}`}
              fill="none"
              stroke={GRID_MAJOR}
              strokeWidth={1}
            />
          </pattern>

          <radialGradient id="paper" cx="50%" cy="45%" r="72%">
            <stop offset="0%" stopColor="#141A22" />
            <stop offset="100%" stopColor={PAPER} />
          </radialGradient>

          <radialGradient id="res-a" cx="50%" cy="45%" r="55%">
            <stop offset="0%" stopColor={AMBER} stopOpacity={0.95} />
            <stop offset="100%" stopColor={AMBER} stopOpacity={0.35} />
          </radialGradient>
          <radialGradient id="res-b" cx="50%" cy="45%" r="55%">
            <stop offset="0%" stopColor="#DCE7F3" stopOpacity={0.95} />
            <stop offset="100%" stopColor="#8FA6C0" stopOpacity={0.4} />
          </radialGradient>
          <radialGradient id="hot" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFE7B0" stopOpacity={1} />
            <stop offset="55%" stopColor={ORANGE} stopOpacity={0.85} />
            <stop offset="100%" stopColor={ORANGE} stopOpacity={0} />
          </radialGradient>
          <radialGradient id="puff" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFE1AE" stopOpacity={0.95} />
            <stop offset="45%" stopColor={ORANGE} stopOpacity={0.7} />
            <stop offset="100%" stopColor={ORANGE} stopOpacity={0} />
          </radialGradient>

          <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="6" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Paper */}
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
          fill="url(#dots)"
        />
        <rect
          x={FRAME.x}
          y={FRAME.y}
          width={FRAME.w}
          height={FRAME.h}
          fill="url(#grid-major)"
        />

        {/* Hairline border */}
        <rect
          x={FRAME.x + 0.5}
          y={FRAME.y + 0.5}
          width={FRAME.w - 1}
          height={FRAME.h - 1}
          fill="none"
          stroke="#242C38"
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

        {/* Sheet header tags */}
        <g
          transform={`translate(${FRAME.x + 24}, ${FRAME.y + 28})`}
          fill={GRAY}
          fontFamily={inter}
          fontSize={10}
          letterSpacing={3}
          fontWeight={600}
        >
          <text>SHEET 003 · A</text>
        </g>
        <g
          transform={`translate(${FRAME.x + FRAME.w - 24}, ${FRAME.y + 28})`}
          fill={GRAY}
          fontFamily={inter}
          fontSize={10}
          letterSpacing={3}
          fontWeight={600}
          textAnchor="end"
        >
          <text>BRACHINUS · REACTOR STUDY</text>
        </g>

        {/* ── Diagram content ──────────────────────────────────────── */}
        <g transform={`translate(${FRAME.x}, ${FRAME.y}) scale(${scale})`}>
          {/* --- Beetle silhouette + reactor cutaway (with tiny recoil kick) */}
          <g transform={`translate(${bodyKick}, 0)`}>
            {/* Antennae */}
            <g
              fill="none"
              stroke={NAVY_HI}
              strokeWidth={2}
              strokeLinecap="round"
              opacity={draw}
            >
              <path
                d="M 92 456 C 62 434, 40 418, 22 412"
                strokeDasharray={110}
                strokeDashoffset={110 * (1 - draw)}
              />
              <path
                d="M 92 484 C 66 500, 44 508, 26 512"
                strokeDasharray={100}
                strokeDashoffset={100 * (1 - draw)}
              />
            </g>

            {/* Head */}
            <circle
              cx={HEAD.x}
              cy={HEAD.y}
              r={HEAD.r * draw + 0.001}
              fill={NAVY}
            />

            {/* Pronotum — the rust-orange shield (kept small) */}
            <g opacity={draw}>
              <path
                d="M 130 435 C 148 424, 180 420, 210 420 C 236 420, 254 424, 268 435 L 268 505 C 254 516, 236 520, 210 520 C 180 520, 148 516, 130 505 Z"
                fill={ORANGE}
              />
              <path
                d="M 150 431 L 258 431 M 150 509 L 258 509"
                stroke="#B8461A"
                strokeWidth={1}
                opacity={0.7}
                fill="none"
              />
            </g>

            {/* Elytra — dark navy outline, cutaway shows internals */}
            <g opacity={draw}>
              {/* Front-solid section — stops well before the reservoirs
                  so the reactor reads as being inside a proper cutaway. */}
              <path
                d="M 268 428 C 288 425, 312 423, 338 425 L 338 515 C 312 517, 288 515, 268 512 Z"
                fill={NAVY}
              />
              {/* upper elytra outline (long, arching) */}
              <path
                d="M 338 425 C 470 420, 620 420, 780 425 C 830 428, 860 440, 880 470"
                stroke={NAVY_HI}
                strokeWidth={2.4}
                fill="none"
              />
              {/* lower elytra outline */}
              <path
                d="M 338 515 C 470 520, 620 520, 780 515 C 830 512, 860 500, 880 472"
                stroke={NAVY_HI}
                strokeWidth={2.4}
                fill="none"
              />
              {/* Midline suture on the front-solid part */}
              <path
                d="M 285 470 L 338 470"
                stroke="#0A1526"
                strokeWidth={1.5}
              />
              {/* Cutaway "break line" at the seam where the outline opens */}
              <g stroke={GRAY} strokeWidth={1} strokeDasharray="4 3" opacity={0.7 * draw} fill="none">
                <path d="M 340 420 C 344 440, 344 458, 340 470 C 336 482, 336 500, 340 520" />
              </g>
              {/* Cutaway hatch marks along the inside of the elytra outline */}
              <g stroke={NAVY_HI} strokeWidth={1} opacity={0.55}>
                {Array.from({ length: 12 }).map((_, i) => {
                  const x = 390 + i * 42;
                  return (
                    <line
                      key={i}
                      x1={x}
                      y1={422}
                      x2={x + 7}
                      y2={410}
                    />
                  );
                })}
                {Array.from({ length: 12 }).map((_, i) => {
                  const x = 390 + i * 42;
                  return (
                    <line
                      key={`b-${i}`}
                      x1={x}
                      y1={518}
                      x2={x + 7}
                      y2={530}
                    />
                  );
                })}
              </g>
            </g>

            {/* --- Feed pipes from reservoirs to valve --- */}
            <g
              fill="none"
              stroke={GRAY}
              strokeWidth={2.4}
              strokeLinecap="round"
              opacity={draw}
            >
              <path d="M 430 425 L 480 445 L 505 458" />
              <path d="M 430 515 L 480 495 L 505 482" />
            </g>

            {/* Reservoir A (hydroquinone — amber) */}
            <g opacity={draw}>
              <circle
                cx={RES_A.cx}
                cy={RES_A.cy}
                r={RES_A.r}
                fill={INK}
                stroke={GRAY}
                strokeWidth={1.6}
              />
              <clipPath id="clipA">
                <circle cx={RES_A.cx} cy={RES_A.cy} r={RES_A.r - 3} />
              </clipPath>
              <g clipPath="url(#clipA)">
                <rect
                  x={RES_A.cx - RES_A.r}
                  y={RES_A.cy + RES_A.r - fill * (RES_A.r * 1.6)}
                  width={RES_A.r * 2}
                  height={RES_A.r * 2}
                  fill="url(#res-a)"
                />
              </g>
              <text
                x={RES_A.cx}
                y={RES_A.cy + 6}
                fontFamily={playfair}
                fontStyle="italic"
                fontSize={22}
                fontWeight={500}
                fill={INK}
                textAnchor="middle"
                opacity={fill}
              >
                I
              </text>
            </g>

            {/* Reservoir B (peroxide) */}
            <g opacity={draw}>
              <circle
                cx={RES_B.cx}
                cy={RES_B.cy}
                r={RES_B.r}
                fill={INK}
                stroke={GRAY}
                strokeWidth={1.6}
              />
              <clipPath id="clipB">
                <circle cx={RES_B.cx} cy={RES_B.cy} r={RES_B.r - 3} />
              </clipPath>
              <g clipPath="url(#clipB)">
                <rect
                  x={RES_B.cx - RES_B.r}
                  y={RES_B.cy + RES_B.r - fill * (RES_B.r * 1.6)}
                  width={RES_B.r * 2}
                  height={RES_B.r * 2}
                  fill="url(#res-b)"
                />
              </g>
              <text
                x={RES_B.cx}
                y={RES_B.cy + 6}
                fontFamily={playfair}
                fontStyle="italic"
                fontSize={22}
                fontWeight={500}
                fill={INK}
                textAnchor="middle"
                opacity={fill}
              >
                II
              </text>
            </g>

            {/* Valve (small chevron in box) */}
            <g opacity={draw}>
              <rect
                x={VALVE.x - 12}
                y={VALVE.y - 20}
                width={24}
                height={40}
                fill={INK}
                stroke={GRAY}
                strokeWidth={1.6}
              />
              <path
                d={`M ${VALVE.x - 7} ${VALVE.y - 10} L ${VALVE.x + 7} ${
                  VALVE.y
                } L ${VALVE.x - 7} ${VALVE.y + 10}`}
                fill="none"
                stroke={ORANGE}
                strokeWidth={1.8}
              />
            </g>

            {/* Pipe from valve to mixing chamber */}
            <path
              d={`M ${VALVE.x + 12} ${VALVE.y} L ${MIX.cx - MIX.r} ${MIX.cy}`}
              stroke={GRAY}
              strokeWidth={3}
              fill="none"
              opacity={draw}
              strokeLinecap="round"
            />

            {/* Mixing chamber (flashes on each firing) */}
            <g opacity={draw}>
              <circle
                cx={MIX.cx}
                cy={MIX.cy}
                r={MIX.r}
                fill={INK}
                stroke={GRAY}
                strokeWidth={2}
              />
              {/* Hot core */}
              <circle
                cx={MIX.cx}
                cy={MIX.cy}
                r={
                  (MIX.r - 6) *
                  (0.4 + 0.6 * chamberFlash) *
                  (fill > 0.4 ? 1 : 0)
                }
                fill="url(#hot)"
                filter="url(#glow)"
                opacity={0.6 + 0.4 * chamberFlash}
              />
              {/* Enzyme-lining tick ring */}
              {Array.from({ length: 24 }).map((_, i) => {
                const a = (i / 24) * Math.PI * 2;
                const r1 = MIX.r - 3;
                const r2 = MIX.r - 8;
                return (
                  <line
                    key={i}
                    x1={MIX.cx + Math.cos(a) * r1}
                    y1={MIX.cy + Math.sin(a) * r1}
                    x2={MIX.cx + Math.cos(a) * r2}
                    y2={MIX.cy + Math.sin(a) * r2}
                    stroke={GRAY}
                    strokeWidth={1}
                  />
                );
              })}
              {/* Center label */}
              <text
                x={MIX.cx}
                y={MIX.cy + 5}
                textAnchor="middle"
                fontFamily={inter}
                fontSize={11}
                fontWeight={700}
                letterSpacing={2}
                fill="#0A0F16"
                opacity={0.85 * fill}
              >
                MIX
              </text>
            </g>

            {/* Nozzle (tapered pipe) */}
            <g opacity={draw}>
              <path
                d={`M ${NOZZLE_START} ${MIX.cy - 22} L ${NOZZLE_END} ${
                  MIX.cy - 10
                } L ${NOZZLE_END} ${MIX.cy + 10} L ${NOZZLE_START} ${
                  MIX.cy + 22
                } Z`}
                fill={INK}
                stroke={GRAY}
                strokeWidth={1.8}
              />
              <line
                x1={NOZZLE_END}
                y1={MIX.cy - 12}
                x2={NOZZLE_END}
                y2={MIX.cy + 12}
                stroke={ORANGE}
                strokeWidth={2.2}
              />
            </g>


            {/* Puffs */}
            <g>
              {PUFFS.map((p) => {
                const life = p.age / PUFF_LIFE;
                const x =
                  SPRAY_EXIT +
                  (SPRAY_MAX - SPRAY_EXIT) * easeOutCubic(life);
                const y =
                  MIX.cy +
                  Math.sin((p.id * 17) % 100) * 4 * life;
                const r = 14 + 46 * life;
                const op = (1 - life) * 0.95;
                return (
                  <g key={p.id}>
                    <circle
                      cx={x}
                      cy={y}
                      r={r}
                      fill="url(#puff)"
                      opacity={op}
                    />
                    <circle
                      cx={x - r * 0.45}
                      cy={y + r * 0.2}
                      r={r * 0.55}
                      fill="url(#puff)"
                      opacity={op * 0.8}
                    />
                    <circle
                      cx={x + r * 0.35}
                      cy={y - r * 0.3}
                      r={r * 0.45}
                      fill="url(#puff)"
                      opacity={op * 0.7}
                    />
                  </g>
                );
              })}
            </g>
          </g>

          {/* --- Callouts (leader lines + labels, cleanly separated lanes) --- */}
          <g
            fill={GRAY}
            fontFamily={inter}
            fontSize={11}
            letterSpacing={2.6}
            fontWeight={600}
            opacity={interpolate(s, [0.9, 1.6], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })}
          >
            {/* Reservoir I — top-left lane */}
            <g>
              <path
                d="M 400 395 L 400 300 L 240 300"
                stroke={GRAY}
                strokeWidth={1}
                fill="none"
              />
              <circle cx={400} cy={395} r={2.4} fill={ORANGE} />
              <text x={230} y={278} textAnchor="end" fill="#C8CCD3" fontWeight={600}>
                RESERVOIR I
              </text>
              <text x={230} y={298} textAnchor="end" letterSpacing={2}>
                HYDROQUINONES · 10%
              </text>
              <text
                x={230}
                y={320}
                textAnchor="end"
                fontFamily={playfair}
                fontStyle="italic"
                fontSize={16}
                fontWeight={500}
                letterSpacing={0.4}
                fill={AMBER}
              >
                C6H4(OH)2
              </text>
            </g>

            {/* Reservoir II — bottom-left lane */}
            <g>
              <path
                d="M 400 545 L 400 645 L 240 645"
                stroke={GRAY}
                strokeWidth={1}
                fill="none"
              />
              <circle cx={400} cy={545} r={2.4} fill={ORANGE} />
              <text x={230} y={625} textAnchor="end" fill="#C8CCD3" fontWeight={600}>
                RESERVOIR II
              </text>
              <text x={230} y={645} textAnchor="end" letterSpacing={2}>
                HYDROGEN PEROXIDE · 25%
              </text>
              <text
                x={230}
                y={668}
                textAnchor="end"
                fontFamily={playfair}
                fontStyle="italic"
                fontSize={16}
                fontWeight={500}
                letterSpacing={0.4}
                fill="#DCE7F3"
              >
                H2O2
              </text>
            </g>

            {/* Inlet valve — bottom-center lane */}
            <g>
              <path
                d="M 520 490 L 520 665 L 640 665"
                stroke={GRAY}
                strokeWidth={1}
                fill="none"
              />
              <circle cx={520} cy={490} r={2.4} fill={ORANGE} />
              <text x={650} y={655} fill="#C8CCD3" fontWeight={600}>
                INLET VALVE
              </text>
              <text x={650} y={675} letterSpacing={2}>
                CATALASE · PEROXIDASE
              </text>
            </g>

            {/* Nozzle — bottom-right lane */}
            <g>
              <path
                d="M 830 490 L 830 585 L 1030 585"
                stroke={GRAY}
                strokeWidth={1}
                fill="none"
              />
              <circle cx={830} cy={490} r={2.4} fill={ORANGE} />
              <text x={1030} y={575} textAnchor="end" fill="#C8CCD3" fontWeight={600}>
                PULSED NOZZLE
              </text>
              <text x={1030} y={595} textAnchor="end" letterSpacing={2}>
                ≈ 500 Hz · BENZOQUINONE
              </text>
            </g>
          </g>

          {/* --- Floating Temperature card (top of diagram) --- */}
          <g opacity={tempReveal}>
            {/* Leader from mix chamber up to the card */}
            <path
              d={`M ${MIX.cx} ${MIX.cy - MIX.r - 2} L ${MIX.cx} ${
                TCARD.y + TCARD.h + 6
              }`}
              stroke={ORANGE}
              strokeWidth={1.2}
              strokeDasharray="3 4"
              fill="none"
            />
            <circle
              cx={MIX.cx}
              cy={MIX.cy - MIX.r - 2}
              r={2.5}
              fill={ORANGE}
            />
            {/* Card */}
            <rect
              x={TCARD.x}
              y={TCARD.y}
              width={TCARD.w}
              height={TCARD.h}
              fill={INK}
              stroke={ORANGE}
              strokeWidth={1.4}
              rx={2}
            />
            {/* Corner ticks inside card */}
            <g stroke={ORANGE} strokeWidth={1.2} fill="none">
              <line x1={TCARD.x + 6} y1={TCARD.y + 6} x2={TCARD.x + 14} y2={TCARD.y + 6} />
              <line x1={TCARD.x + 6} y1={TCARD.y + 6} x2={TCARD.x + 6} y2={TCARD.y + 14} />
              <line x1={TCARD.x + TCARD.w - 6} y1={TCARD.y + 6} x2={TCARD.x + TCARD.w - 14} y2={TCARD.y + 6} />
              <line x1={TCARD.x + TCARD.w - 6} y1={TCARD.y + 6} x2={TCARD.x + TCARD.w - 6} y2={TCARD.y + 14} />
            </g>
            <text
              x={TCARD.x + 14}
              y={TCARD.y + 24}
              fontFamily={inter}
              fontSize={10}
              letterSpacing={3}
              fill={GRAY}
              fontWeight={600}
            >
              REACTION TEMP.
            </text>
            <text
              x={TCARD.x + TCARD.w / 2}
              y={TCARD.y + 72}
              fontFamily={playfair}
              fontStyle="italic"
              fontWeight={500}
              fontSize={44}
              fill={ORANGE}
              textAnchor="middle"
              letterSpacing={-0.5}
            >
              100 °C
            </text>
            <text
              x={TCARD.x + TCARD.w - 14}
              y={TCARD.y + TCARD.h - 10}
              fontFamily={inter}
              fontSize={9}
              letterSpacing={2.6}
              fill={GRAY}
              fontWeight={600}
              textAnchor="end"
            >
              MEASURED · EJECTION
            </text>
          </g>

          {/* --- Chemistry equation (below the diagram) --- */}
          <g
            transform="translate(60, 740)"
            fill={GRAY}
            fontFamily={inter}
            opacity={interpolate(s, [1.2, 1.9], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })}
          >
            <text
              fontSize={11}
              letterSpacing={3}
              fontWeight={600}
              fill={GRAY}
            >
              REACTION
            </text>
            <text
              y={22}
              fontFamily={inter}
              fontSize={16}
              fontWeight={500}
              letterSpacing={0.5}
              fill="#C8CCD3"
            >
              C6H4(OH)2  +  H2O2   ⟶   C6H4O2  +  2 H2O  +  Δ heat
            </text>
          </g>

          {/* --- Bottom-of-frame captions --- */}
          <g
            transform={`translate(0, 780)`}
            fill={GRAY}
            fontFamily={inter}
            fontSize={11}
            letterSpacing={3}
            fontWeight={500}
          >
            <text x={MAP_W} y={0} textAnchor="end" fill={ORANGE} opacity={0.9}>
              VALVELESS PULSE-JET · IN VIVO
            </text>
          </g>
        </g>
      </svg>

      {/* ── Type lockup ────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 895,
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
            color: ORANGE,
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
            fontSize: 88,
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
            lineHeight: 1.42,
            fontWeight: 400,
            maxWidth: 880,
            opacity: hookOpacity,
          }}
        >
          A bombardier beetle stores hydroquinones and hydrogen peroxide in
          separate reservoirs, admits them to an{" "}
          <span style={{ color: ORANGE, fontWeight: 600 }}>
            enzyme-lined reaction chamber
          </span>{" "}
          on demand, and fires a boiling-hot benzoquinone spray from its
          abdomen in discrete pulses at ~500 Hz — a working valveless
          pulse-jet, imaged in vivo by synchrotron X-ray.
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
        <span>Aneshansley & Eisner · Science 165 (1969); Arndt et al. · Science 348 (2015)</span>
        <span>
          <span style={{ color: ORANGE }}>●</span> Hot spray = 100 °C
        </span>
      </div>
      <span hidden>{durationInFrames}</span>
    </AbsoluteFill>
  );
};
