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
const INK = "#070E16";
const ABYSS = "#0C1E2E";
const BOARD = "#12314A";
const BOARD_LO = "#0D2436";
const GRID = "#18364F";
const GRID_MAJOR = "#1F4461";
const SILK = "#E6DEC8";
const SILK_GLOW = "#F7EFD8";
const PEARL = "#F1EFEA";
const MUCOSA = "#C86B6B";
const GRAY = "#8FA2B2";
const GRAY_DIM = "#6A7A88";

// ── Layout (1080 × 1350 portrait) ─────────────────────────────────────────
const PAGE_W = 1080;
const PAGE_H = 1350;

// Spec-plate frame (where the diagram lives)
const FRAME = { x: 60, y: 130, w: 960, h: 760 };

// Diagram coordinate space (logical units mapped into FRAME via scale)
const DIAG_W = 960;
const DIAG_H = 760;

// Skein (coiled thread-cell) centre, in diagram space
const SKEIN = { cx: 215, cy: 410, r: 108 };

// Scale bar runs horizontally to the right of the skein
const BAR = {
  x0: SKEIN.cx + 10, // just inside the skein so the thread exits from its body
  x1: 880,
  y: SKEIN.cy,
};
const BAR_LEN_PX = BAR.x1 - BAR.x0;

// Helper — a deterministic 2D vortex path for the coiled skein (archimedean spiral)
const spiralPath = (
  cx: number,
  cy: number,
  rMin: number,
  rMax: number,
  turns: number,
  phase = 0,
): string => {
  const steps = 420;
  const pts: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const r = rMin + (rMax - rMin) * (1 - t);
    const theta = phase + turns * Math.PI * 2 * t;
    const x = cx + Math.cos(theta) * r;
    const y = cy + Math.sin(theta) * r;
    pts.push(`${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`);
  }
  return pts.join(" ");
};

// Sine-shaped filament along the scale bar; amplitude and wavelength tuned to feel like silk
const filamentPath = (x0: number, x1: number, y: number): string => {
  const steps = 320;
  const amp = 7;
  const wavelength = 180;
  const pts: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = x0 + (x1 - x0) * t;
    // Taper the wave: calmer near the skein, more sustained across the bar
    const envelope = Math.min(1, t * 2.2) * Math.min(1, (1 - t) * 3 + 0.4);
    const yy =
      y +
      Math.sin((x / wavelength) * Math.PI * 2) * amp * envelope;
    pts.push(`${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${yy.toFixed(2)}`);
  }
  return pts.join(" ");
};

// Hagfish silhouette — a slender eel-like body that follows the filament's
// baseline with a small gentle undulation, a distinct head bulb on the right,
// and a tapering tail on the left. Returns a closed fillable path.
const hagfishSilhouette = (
  x0: number,
  x1: number,
  y: number,
): { path: string; headCx: number; headCy: number } => {
  const steps = 280;
  const top: Array<[number, number]> = [];
  const bot: Array<[number, number]> = [];
  let headCx = x1;
  let headCy = y;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps; // 0 = tail (left), 1 = head (right)
    const x = x0 + (x1 - x0) * t;
    // gentle undulation — quieter than the filament's wave so it reads as body
    const spine = y + Math.sin((x / 320) * Math.PI * 2) * 6 * (0.3 + (1 - t) * 0.4);
    // Slim profile — tail blade, slender body, pronounced head bulb at nose.
    let thick: number;
    if (t < 0.06) {
      thick = 1.2 + t * 60; // caudal fin fans up quickly from a point
    } else if (t < 0.12) {
      // narrow neck after the caudal fin
      const nt = (t - 0.06) / 0.06;
      thick = 4.8 - nt * 2.6;
    } else if (t < 0.88) {
      const bt = (t - 0.12) / 0.76;
      thick = 2.2 + bt * 2.4;
    } else {
      const ht = (t - 0.88) / 0.12;
      // head bulb, tucking in at the nose
      thick = 4.6 + Math.sin(ht * Math.PI) * 3.4 - Math.pow(ht, 3) * 2.2;
    }
    top.push([x, spine - thick]);
    bot.push([x, spine + thick]);
    if (i === steps) {
      headCx = x - 10;
      headCy = spine;
    }
  }
  const closed = [
    ...top.map(
      ([x, yy], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${yy.toFixed(2)}`,
    ),
    ...bot
      .slice()
      .reverse()
      .map(([x, yy]) => `L ${x.toFixed(2)} ${yy.toFixed(2)}`),
    "Z",
  ].join(" ");
  return { path: closed, headCx, headCy };
};

// Compute an approximate stroke length for a spiral (used to animate uncoiling via dashoffset)
const spiralLength = (rMin: number, rMax: number, turns: number): number => {
  const steps = 420;
  let L = 0;
  let prev: [number, number] | null = null;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const r = rMin + (rMax - rMin) * (1 - t);
    const theta = turns * Math.PI * 2 * t;
    const x = Math.cos(theta) * r;
    const y = Math.sin(theta) * r;
    if (prev) L += Math.hypot(x - prev[0], y - prev[1]);
    prev = [x, y];
  }
  return L;
};

const filamentLength = (x0: number, x1: number): number => {
  // approximate length of the mild-sine filament
  const steps = 320;
  let L = 0;
  let prev: [number, number] | null = null;
  const amp = 7;
  const wavelength = 180;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = x0 + (x1 - x0) * t;
    const envelope =
      Math.min(1, t * 2.2) * Math.min(1, (1 - t) * 3 + 0.4);
    const y = Math.sin((x / wavelength) * Math.PI * 2) * amp * envelope;
    if (prev) L += Math.hypot(x - prev[0], y - prev[1]);
    prev = [x, y];
  }
  return L;
};

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ── Timing ───────────────────────────────────────────────────────────
  // 0.0–0.8s   plate fades in, grid settles
  // 0.6–3.2s   filament unspools from skein across the scale bar (primary motion)
  // 1.5–2.4s   title springs in
  // 2.0–3.0s   hook fades in
  // 3.2–5.0s   steady hold on fully-extended plate
  const plateIn = interpolate(frame, [0, fps * 0.8], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateRight: "clamp",
  });

  // Primary uncoil progress
  const uncoilRaw = interpolate(
    frame,
    [fps * 0.6, fps * 3.2],
    [0, 1],
    {
      easing: Easing.bezier(0.22, 1, 0.36, 1), // easeOutQuint-ish
      extrapolateRight: "clamp",
      extrapolateLeft: "clamp",
    },
  );

  // Two phases of uncoil: first 45% "unwinds" the skein, remaining "extends" the filament
  const skeinPhase = Math.min(1, uncoilRaw / 0.45);
  const filamentPhase = Math.max(0, (uncoilRaw - 0.4) / 0.6);

  // Title spring
  const titleSpring = spring({
    frame: frame - fps * 1.5,
    fps,
    config: { damping: 200, mass: 0.9 },
  });

  const hookOpacity = interpolate(
    frame,
    [fps * 2.0, fps * 3.0],
    [0, 1],
    {
      easing: Easing.out(Easing.cubic),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  // Skein — compute the animated uncoiling spiral
  const spiralTurns = 11;
  const spiralR = { min: 10, max: SKEIN.r - 6 };
  const spiralD = spiralPath(
    SKEIN.cx,
    SKEIN.cy,
    spiralR.min,
    spiralR.max,
    spiralTurns,
  );
  const spiralL = spiralLength(spiralR.min, spiralR.max, spiralTurns);
  // As the skein "unwinds", draw the inner portion less, revealing outward motion
  const skeinDashOffset = spiralL * skeinPhase * 0.75;

  // Filament — dasharray-based reveal across the bar
  const filD = filamentPath(BAR.x0, BAR.x1, BAR.y);
  const filL = filamentLength(BAR.x0, BAR.x1);
  const filOffset = filL * (1 - filamentPhase);

  // Hagfish silhouette traces the filament
  const HAG_OFFSET_Y = 78; // pushed below the scale bar so the filament stays the hero
  const hag = hagfishSilhouette(BAR.x0 + 28, BAR.x1 - 24, BAR.y + HAG_OFFSET_Y);
  const hagOpacity = interpolate(uncoilRaw, [0.55, 0.9], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Scale-bar ticks
  const ticks: Array<{ x: number; cm: number; major: boolean }> = [];
  for (let cm = 0; cm <= 15; cm++) {
    const x = BAR.x0 + (cm / 15) * BAR_LEN_PX;
    ticks.push({ x, cm, major: cm % 5 === 0 });
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
          color: GRAY,
          fontFamily: inter,
          fontSize: 13,
          letterSpacing: 4.5,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Everyday Motivation · No. 003</span>
        <span style={{ color: SILK }}>2026 · 11 · 15</span>
      </div>

      <svg
        width={PAGE_W}
        height={PAGE_H}
        viewBox={`0 0 ${PAGE_W} ${PAGE_H}`}
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          {/* Grid patterns anchored to the frame */}
          <pattern
            id="grid"
            x={FRAME.x}
            y={FRAME.y}
            width={40}
            height={40}
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke={GRID}
              strokeWidth={1}
            />
          </pattern>
          <pattern
            id="grid-major"
            x={FRAME.x}
            y={FRAME.y}
            width={160}
            height={160}
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 160 0 L 0 0 0 160"
              fill="none"
              stroke={GRID_MAJOR}
              strokeWidth={1.1}
            />
          </pattern>

          {/* Board vignette */}
          <radialGradient id="board-vignette" cx="30%" cy="55%" r="85%">
            <stop offset="0%" stopColor={BOARD} stopOpacity={1} />
            <stop offset="70%" stopColor={BOARD_LO} stopOpacity={1} />
            <stop offset="100%" stopColor={ABYSS} stopOpacity={1} />
          </radialGradient>

          {/* Silk glow filter */}
          <filter id="silk-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Skein radial glow */}
          <radialGradient id="skein-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={SILK_GLOW} stopOpacity={0.35} />
            <stop offset="55%" stopColor={SILK} stopOpacity={0.12} />
            <stop offset="100%" stopColor={SILK} stopOpacity={0} />
          </radialGradient>

          {/* Tapered filament gradient — brighter near skein, cooler at tip */}
          <linearGradient
            id="filament-grad"
            x1={BAR.x0}
            y1={BAR.y}
            x2={BAR.x1}
            y2={BAR.y}
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor={SILK_GLOW} />
            <stop offset="55%" stopColor={SILK} />
            <stop offset="100%" stopColor="#D3C5A4" />
          </linearGradient>

          {/* Clip the board */}
          <clipPath id="board-clip">
            <rect
              x={FRAME.x}
              y={FRAME.y}
              width={FRAME.w}
              height={FRAME.h}
            />
          </clipPath>
        </defs>

        {/* Drafting board */}
        <g opacity={plateIn}>
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

          {/* Inner hairline border */}
          <rect
            x={FRAME.x + 0.5}
            y={FRAME.y + 0.5}
            width={FRAME.w - 1}
            height={FRAME.h - 1}
            fill="none"
            stroke="#255275"
            strokeOpacity={0.7}
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
            <g key={i} stroke={MUCOSA} strokeWidth={1.5} fill="none">
              <line x1={cx} y1={cy} x2={cx + sx * 26} y2={cy} />
              <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 26} />
            </g>
          ))}

          {/* Plate title (upper-left of frame) */}
          <g
            transform={`translate(${FRAME.x + 28}, ${FRAME.y + 42})`}
            fill={GRAY}
            fontFamily={inter}
            fontWeight={600}
            letterSpacing={3}
          >
            <text fontSize={11} opacity={0.75}>
              PLATE III
            </text>
            <text y={20} fontSize={13} fill={PEARL}>
              SLIME-GLAND THREAD CELL
            </text>
            <text y={38} fontSize={10} fill={GRAY_DIM} letterSpacing={2.4}>
              EPTATRETUS STOUTII · DORSAL GLAND · SECTIO
            </text>
          </g>

          {/* Plate label (upper-right of frame) */}
          <g
            transform={`translate(${FRAME.x + FRAME.w - 28}, ${FRAME.y + 42})`}
            fill={GRAY}
            fontFamily={inter}
            fontWeight={500}
            fontSize={11}
            letterSpacing={3}
            textAnchor="end"
          >
            <text>N × 15,000 PER GLAND</text>
            <text y={18} fill={MUCOSA} fontWeight={600}>
              ×2000 MAG.
            </text>
          </g>
        </g>

        {/* Diagram payload — clipped to board */}
        <g
          clipPath="url(#board-clip)"
          transform={`translate(${FRAME.x}, ${FRAME.y})`}
          opacity={plateIn}
        >
          {/* Scale bar baseline */}
          <line
            x1={BAR.x0}
            y1={BAR.y}
            x2={BAR.x1}
            y2={BAR.y}
            stroke="#23527B"
            strokeWidth={1}
            strokeOpacity={0.75}
          />
          {/* Scale ticks */}
          {ticks.map((tk) => (
            <g key={tk.cm}>
              <line
                x1={tk.x}
                y1={BAR.y + (tk.major ? -9 : -5)}
                x2={tk.x}
                y2={BAR.y + (tk.major ? 9 : 5)}
                stroke={tk.major ? "#3C7AA5" : "#285877"}
                strokeWidth={tk.major ? 1.4 : 1}
              />
              {tk.major && (
                <text
                  x={tk.x}
                  y={BAR.y + 28}
                  fontFamily={inter}
                  fontSize={11}
                  letterSpacing={2.4}
                  fontWeight={500}
                  fill={GRAY}
                  textAnchor="middle"
                >
                  {tk.cm === 0 ? "0" : `${tk.cm} CM`}
                </text>
              )}
            </g>
          ))}
          {/* Scale caption */}
          <text
            x={(BAR.x0 + BAR.x1) / 2}
            y={BAR.y + 50}
            fontFamily={inter}
            fontSize={10}
            letterSpacing={3.6}
            fontWeight={600}
            fill={GRAY_DIM}
            textAnchor="middle"
          >
            CONTOUR LENGTH · SINGLE THREAD CELL
          </text>

          {/* Skein glow halo */}
          <circle
            cx={SKEIN.cx}
            cy={SKEIN.cy}
            r={SKEIN.r + 40}
            fill="url(#skein-glow)"
          />

          {/* Cell membrane — the gland-thread cell casing */}
          <circle
            cx={SKEIN.cx}
            cy={SKEIN.cy}
            r={SKEIN.r + 8}
            fill="none"
            stroke="#2E5F86"
            strokeOpacity={0.65}
            strokeWidth={1.4}
            strokeDasharray="2 4"
          />
          <circle
            cx={SKEIN.cx}
            cy={SKEIN.cy}
            r={SKEIN.r + 2}
            fill="none"
            stroke="#4F8FBD"
            strokeOpacity={0.35}
            strokeWidth={1}
          />

          {/* Coiled thread (spiral) — unwinds via dashoffset */}
          <g filter="url(#silk-glow)">
            <path
              d={spiralD}
              fill="none"
              stroke={SILK}
              strokeWidth={2.1}
              strokeLinecap="round"
              strokeOpacity={0.95 * (1 - skeinPhase * 0.25)}
              strokeDasharray={spiralL}
              strokeDashoffset={skeinDashOffset}
            />
            <path
              d={spiralD}
              fill="none"
              stroke={SILK_GLOW}
              strokeWidth={0.9}
              strokeLinecap="round"
              strokeOpacity={0.7 * (1 - skeinPhase * 0.4)}
              strokeDasharray={spiralL}
              strokeDashoffset={skeinDashOffset}
            />
          </g>

          {/* Nucleus dot */}
          <circle
            cx={SKEIN.cx - 4}
            cy={SKEIN.cy + 2}
            r={4}
            fill={MUCOSA}
            opacity={0.8}
          />
          <circle
            cx={SKEIN.cx - 4}
            cy={SKEIN.cy + 2}
            r={9}
            fill="none"
            stroke={MUCOSA}
            strokeOpacity={0.35}
            strokeWidth={1}
          />

          {/* Filament — unspools along scale bar */}
          <g filter="url(#silk-glow)">
            {/* soft outer halo */}
            <path
              d={filD}
              fill="none"
              stroke={SILK}
              strokeOpacity={0.25}
              strokeWidth={6}
              strokeLinecap="round"
              strokeDasharray={filL}
              strokeDashoffset={filOffset}
            />
            {/* core filament */}
            <path
              d={filD}
              fill="none"
              stroke="url(#filament-grad)"
              strokeOpacity={0.98}
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeDasharray={filL}
              strokeDashoffset={filOffset}
            />
            {/* bright inner highlight */}
            <path
              d={filD}
              fill="none"
              stroke={SILK_GLOW}
              strokeOpacity={0.9}
              strokeWidth={0.7}
              strokeLinecap="round"
              strokeDasharray={filL}
              strokeDashoffset={filOffset}
            />
          </g>

          {/* Hagfish silhouette following the thread (fades in late) */}
          <g opacity={hagOpacity}>
            <defs>
              <linearGradient
                id="hagfish-grad"
                x1={BAR.x0}
                y1={0}
                x2={BAR.x1}
                y2={0}
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0%" stopColor={MUCOSA} stopOpacity={0} />
                <stop offset="18%" stopColor={MUCOSA} stopOpacity={0.6} />
                <stop offset="100%" stopColor={MUCOSA} stopOpacity={0.95} />
              </linearGradient>
              <clipPath id="hagfish-reveal">
                <rect
                  x={BAR.x0 + 28}
                  y={BAR.y + HAG_OFFSET_Y - 24}
                  width={Math.max(
                    0,
                    (BAR.x1 - 24 - (BAR.x0 + 28)) *
                      Math.max(0, (uncoilRaw - 0.55) / 0.45),
                  )}
                  height={60}
                />
              </clipPath>
            </defs>
            <g clipPath="url(#hagfish-reveal)">
              <path
                d={hag.path}
                fill="url(#hagfish-grad)"
                opacity={0.75}
              />
              {/* Eye — a tiny pale dot on the head bulb */}
              <circle
                cx={hag.headCx - 8}
                cy={hag.headCy - 1.5}
                r={1.8}
                fill={PEARL}
                opacity={0.95}
              />
              {/* Barbels — four short sensory whiskers fanning from the mouth */}
              {[-9, -4, 4, 9].map((dy, i) => (
                <line
                  key={i}
                  x1={hag.headCx + 6}
                  y1={hag.headCy + dy * 0.25}
                  x2={hag.headCx + 22 + Math.abs(dy) * 0.5}
                  y2={hag.headCy + dy * 1.3}
                  stroke={MUCOSA}
                  strokeWidth={1.1}
                  strokeOpacity={0.95}
                  strokeLinecap="round"
                />
              ))}
              {/* Caudal fin — subtle paddle at the tail (left end) */}
              <path
                d={(() => {
                  const tx = BAR.x0 + 28;
                  const ty = BAR.y + HAG_OFFSET_Y;
                  return `M ${tx - 2} ${ty - 10} Q ${tx - 14} ${ty} ${tx - 2} ${ty + 10} Z`;
                })()}
                fill={MUCOSA}
                opacity={0.55}
              />
              {/* Gill slit tick marks on the body — hagfish have 5-15 gill pores */}
              {[0.78, 0.8, 0.82, 0.84, 0.86].map((t, i) => {
                const cx = BAR.x0 + 28 + (BAR.x1 - 24 - (BAR.x0 + 28)) * t;
                return (
                  <circle
                    key={i}
                    cx={cx}
                    cy={BAR.y + HAG_OFFSET_Y + 1}
                    r={0.8}
                    fill={INK}
                    opacity={0.75}
                  />
                );
              })}
            </g>
          </g>

          {/* ── Callouts ─────────────────────────────────────── */}
          {/* Callout: "GLAND THREAD CELL" above the skein */}
          <g
            opacity={interpolate(uncoilRaw, [0.0, 0.3], [0, 1], {
              extrapolateRight: "clamp",
            })}
          >
            <line
              x1={SKEIN.cx + 55}
              y1={SKEIN.cy - SKEIN.r - 6}
              x2={SKEIN.cx + 55}
              y2={SKEIN.cy - SKEIN.r - 46}
              stroke={MUCOSA}
              strokeWidth={1.1}
            />
            <line
              x1={SKEIN.cx + 55}
              y1={SKEIN.cy - SKEIN.r - 46}
              x2={SKEIN.cx + 200}
              y2={SKEIN.cy - SKEIN.r - 46}
              stroke={MUCOSA}
              strokeWidth={1.1}
            />
            <text
              x={SKEIN.cx + 60}
              y={SKEIN.cy - SKEIN.r - 54}
              fontFamily={inter}
              fontWeight={600}
              fontSize={11}
              letterSpacing={3.2}
              fill={MUCOSA}
            >
              GLAND · THREAD · CELL
            </text>
            <text
              x={SKEIN.cx + 60}
              y={SKEIN.cy - SKEIN.r - 38}
              fontFamily={inter}
              fontWeight={500}
              fontSize={10}
              letterSpacing={2.4}
              fill={GRAY}
            >
              ∅ ≈ 150 μm · ONE PER FILAMENT
            </text>
          </g>

          {/* Callout: "SKEIN" pointing to the coil */}
          <g
            opacity={interpolate(uncoilRaw, [0.0, 0.3], [0, 1], {
              extrapolateRight: "clamp",
            })}
          >
            <line
              x1={SKEIN.cx - 70}
              y1={SKEIN.cy + 40}
              x2={SKEIN.cx - 155}
              y2={SKEIN.cy + 115}
              stroke={GRAY}
              strokeOpacity={0.75}
              strokeWidth={1}
            />
            <line
              x1={SKEIN.cx - 155}
              y1={SKEIN.cy + 115}
              x2={SKEIN.cx - 70}
              y2={SKEIN.cy + 115}
              stroke={GRAY}
              strokeOpacity={0.75}
              strokeWidth={1}
            />
            <text
              x={SKEIN.cx - 155}
              y={SKEIN.cy + 132}
              fontFamily={inter}
              fontWeight={600}
              fontSize={11}
              letterSpacing={3.2}
              fill={PEARL}
            >
              SKEIN
            </text>
            <text
              x={SKEIN.cx - 155}
              y={SKEIN.cy + 148}
              fontFamily={inter}
              fontWeight={500}
              fontSize={10}
              letterSpacing={2.4}
              fill={GRAY}
            >
              11-TURN COIL · PRE-LOADED
            </text>
          </g>

          {/* Callout: "FILAMENT" above the bar midpoint */}
          <g
            opacity={interpolate(uncoilRaw, [0.5, 0.9], [0, 1], {
              extrapolateRight: "clamp",
            })}
          >
            <line
              x1={(BAR.x0 + BAR.x1) / 2}
              y1={BAR.y - 10}
              x2={(BAR.x0 + BAR.x1) / 2}
              y2={BAR.y - 70}
              stroke={SILK}
              strokeOpacity={0.9}
              strokeWidth={1.1}
              strokeDasharray="2 3"
            />
            <text
              x={(BAR.x0 + BAR.x1) / 2}
              y={BAR.y - 80}
              textAnchor="middle"
              fontFamily={inter}
              fontWeight={600}
              fontSize={11}
              letterSpacing={3.2}
              fill={SILK}
            >
              FILAMENT · 1–3 μm ∅
            </text>
            <text
              x={(BAR.x0 + BAR.x1) / 2}
              y={BAR.y - 64}
              textAnchor="middle"
              fontFamily={inter}
              fontWeight={500}
              fontSize={10}
              letterSpacing={2.4}
              fill={GRAY}
            >
              UNSPOOLS IN &lt; 0.4 s
            </text>
          </g>

          {/* 15-cm span indicator spanning the bar */}
          <g
            opacity={interpolate(uncoilRaw, [0.75, 1.0], [0, 1], {
              extrapolateRight: "clamp",
            })}
          >
            <line
              x1={BAR.x0}
              y1={BAR.y + 128}
              x2={BAR.x1}
              y2={BAR.y + 128}
              stroke={MUCOSA}
              strokeOpacity={0.9}
              strokeWidth={1.3}
            />
            <line
              x1={BAR.x0}
              y1={BAR.y + 120}
              x2={BAR.x0}
              y2={BAR.y + 136}
              stroke={MUCOSA}
              strokeWidth={1.3}
            />
            <line
              x1={BAR.x1}
              y1={BAR.y + 120}
              x2={BAR.x1}
              y2={BAR.y + 136}
              stroke={MUCOSA}
              strokeWidth={1.3}
            />
            <rect
              x={(BAR.x0 + BAR.x1) / 2 - 46}
              y={BAR.y + 117}
              width={92}
              height={24}
              fill={INK}
              stroke={MUCOSA}
              strokeWidth={1}
            />
            <text
              x={(BAR.x0 + BAR.x1) / 2}
              y={BAR.y + 133}
              textAnchor="middle"
              fontFamily={inter}
              fontWeight={700}
              fontSize={12}
              letterSpacing={3.5}
              fill={MUCOSA}
            >
              ≈ 15 CM
            </text>
          </g>

          {/* Expansion caption bottom of plate */}
          <g
            opacity={interpolate(uncoilRaw, [0.8, 1.0], [0, 1], {
              extrapolateRight: "clamp",
            })}
            transform={`translate(${SKEIN.cx - 90}, ${BAR.y + 230})`}
          >
            <text
              fontFamily={inter}
              fontSize={11}
              letterSpacing={3}
              fontWeight={600}
              fill={GRAY}
            >
              <tspan fill={PEARL}>10,000×</tspan> VOLUME
            </text>
            <text
              y={16}
              fontFamily={inter}
              fontSize={10}
              letterSpacing={2.4}
              fontWeight={500}
              fill={GRAY_DIM}
            >
              SKEIN → SEAWATER-BOUND SLIME
            </text>
          </g>
        </g>

        {/* Caption strip below the frame */}
        <g
          transform={`translate(${FRAME.x}, ${FRAME.y + FRAME.h + 22})`}
          fill={GRAY}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
          opacity={plateIn}
        >
          <text>FIG. 1 · ONE OF ~15,000 COILED FILAMENTS PER GLAND</text>
          <text x={FRAME.w} textAnchor="end" fill={SILK} opacity={0.9}>
            UNSPOOLED IN &lt; 400 ms
          </text>
        </g>
      </svg>

      {/* ── Type lockup ────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 955,
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
            color: MUCOSA,
            fontFamily: inter,
            fontSize: 13,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 18,
            fontWeight: 600,
          }}
        >
          Role <span style={{ color: GRAY_DIM, margin: "0 4px" }}>/</span>
          <span style={{ color: PEARL, letterSpacing: 5 }}>
            Textile Engineer
          </span>
        </div>

        <div
          style={{
            color: PEARL,
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 84,
            lineHeight: 0.96,
            letterSpacing: -1.4,
            fontStyle: "italic",
          }}
        >
          The deep-sea
          <br />
          loom.
        </div>

        <div
          style={{
            marginTop: 26,
            color: "#CBD3DC",
            fontFamily: inter,
            fontSize: 19,
            lineHeight: 1.42,
            fontWeight: 400,
            maxWidth: 900,
            opacity: hookOpacity,
          }}
        >
          Each of a hagfish's ~100 slime glands packs ~15,000{" "}
          <span style={{ color: SILK, fontWeight: 600 }}>
            gland-thread cells
          </span>
          , and every cell cradles a single 15 cm protein filament coiled like
          a skein — released, the skeins unspool in under half a second and
          bind seawater into slime up to{" "}
          <span style={{ color: MUCOSA, fontWeight: 600 }}>10,000×</span> the
          volume of the exudate.
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
          color: GRAY_DIM,
          fontFamily: inter,
          fontSize: 11,
          letterSpacing: 3,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Fudge et al. · Biology Letters 6 (2010) · Lim et al. · JEB 209 (2006)</span>
        <span>
          <span style={{ color: SILK }}>●</span> 1 CELL = 1 FILAMENT
        </span>
      </div>
    </AbsoluteFill>
  );
};
