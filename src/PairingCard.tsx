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

// Palette — drawn from the Thorny Devil's real desert livery.
const INK = "#1A1308"; // deep umber ground
const BOARD = "#241A0E";
const BOARD_LIFT = "#2E210F";
const OCHRE = "#E8B55C"; // sun-side highlight
const SIENNA = "#A7591F"; // interstitial shadow
const BONE = "#F2DEB1"; // dry sand / channel highlight
const CYAN = "#6FB7C9"; // hygroscopic water accent
const CYAN_GLOW = "#B5E3EE";
const GRAY = "#8A7F6B";
const GRID = "#2B2015";
const GRID_MAJOR = "#38291A";

// ── Thorny Devil, side-elevation blueprint ─────────────────────────────────
// Coord system is 1080 × 800. The animal faces right. Head at ~x=870,
// tail tip at ~x=160, legs splayed beneath, dorsal spine ridge on top.

// ── Body silhouette (side view) ─────────────────────────────────────────
// Dorsal line (top of body + head), tail-first, left → right.
const DORSAL: Array<[number, number]> = [
  [160, 462], // tail tip
  [220, 440],
  [290, 418],
  [340, 400], // tail base
  [400, 388],
  [470, 378],
  [540, 374],
  [610, 374],
  [680, 378],
  [740, 388],
  [785, 400], // crown base (behind "false head" bump)
  [810, 388], // dip before the head
  [832, 378], // top of head
  [864, 392], // snout upper
  [878, 410], // nose tip
];
// Ventral line (belly + jaw), right → left, drawn after reversing dorsal.
const VENTRAL: Array<[number, number]> = [
  [878, 410], // nose tip (shared)
  [862, 428],
  [820, 452], // underjaw
  [760, 492],
  [670, 512],
  [540, 522],
  [430, 512],
  [340, 492], // belly to hip
  [295, 480],
  [240, 478],
  [190, 480],
  [160, 462], // tail tip (shared)
];

// Make a closed silhouette path (Catmull-Rom-ish smoothed).
const smoothPath = (pts: Array<[number, number]>, close = false): string => {
  if (pts.length < 2) return "";
  const d = [`M ${pts[0][0]} ${pts[0][1]}`];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d.push(`C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2[0]} ${p2[1]}`);
  }
  if (close) d.push("Z");
  return d.join(" ");
};

const bodyPath = (() => {
  // Combine dorsal (as given) + ventral (as given, which already closes).
  return smoothPath([...DORSAL, ...VENTRAL.slice(1)], true);
})();

// ── Dorsal spine ridge: tapered triangle spikes rising from the dorsal line
type Spike = {
  base: [number, number];
  h: number; // height
  w: number; // half-base width
  tilt: number; // radians, 0 = straight up
  big?: boolean;
};

const DORSAL_SPIKES: Spike[] = (() => {
  const out: Spike[] = [];
  // Big parietal "false-head" thorn pair at the crown (behind the eye).
  out.push({ base: [792, 404], h: 86, w: 14, tilt: -0.46, big: true });
  out.push({ base: [762, 400], h: 72, w: 12, tilt: -0.22, big: true });
  // Dorsal ridge: varied sizes so it doesn't read like a stegosaurus.
  // Columns: [x, y, height, tilt, big?]
  const ridge: Array<[number, number, number, number, boolean]> = [
    [720, 388, 56, 0.12, true],  // shoulder hump
    [690, 380, 24, 0.08, false], // small filler
    [664, 376, 48, 0.06, true],  // scapular
    [638, 374, 18, 0.04, false],
    [616, 374, 42, 0.03, false],
    [588, 374, 20, 0.0, false],
    [562, 374, 36, -0.02, false],
    [534, 374, 16, -0.03, false],
    [508, 376, 46, -0.04, true], // mid dorsal
    [482, 378, 20, -0.05, false],
    [456, 380, 30, -0.06, false],
    [430, 384, 14, -0.07, false],
    [406, 388, 36, -0.08, false],
    [380, 392, 16, -0.1, false],
    [352, 400, 24, -0.12, false],
    [326, 408, 12, -0.13, false],
    [300, 420, 18, -0.15, false],
    [270, 432, 9, -0.17, false],
    [240, 442, 12, -0.18, false],
  ];
  for (const [x, y, h, tilt, big] of ridge) {
    out.push({
      base: [x, y],
      h,
      w: Math.max(3.0, h * 0.17),
      tilt,
      big: big || undefined,
    });
  }
  return out;
})();

// ── Flank spikes projecting outward (down-ish) along the belly profile.
const FLANK_SPIKES: Spike[] = (() => {
  const out: Spike[] = [];
  // Ventral flank spikes pointing downward — a few bigger ones, varied.
  const lower: Array<[number, number, number, number]> = [
    [800, 468, 24, 0.22],
    [760, 500, 34, 0.12],
    [720, 514, 20, 0.06],
    [680, 520, 38, 0.03],
    [638, 523, 22, 0.0],
    [598, 524, 32, -0.02],
    [558, 523, 20, -0.03],
    [518, 522, 34, -0.04],
    [478, 518, 22, -0.06],
    [438, 512, 30, -0.07],
    [398, 506, 20, -0.09],
    [358, 496, 24, -0.11],
    [316, 484, 16, -0.13],
    [276, 480, 20, -0.15],
    [236, 478, 12, -0.17],
  ];
  for (const [x, y, h, tilt] of lower) {
    out.push({ base: [x, y], h, w: Math.max(2.8, h * 0.17), tilt });
  }
  return out;
})();

// A spike path: isoceles triangle rising from its base, rotated by tilt.
const spikePath = (s: Spike, directionSign: number): string => {
  // directionSign: -1 = up (dorsal), +1 = down (ventral).
  const [bx, by] = s.base;
  const h = s.h * directionSign * -1; // flip for dorsal
  // After rotation by tilt about base, apex and both base-corners.
  const rot = (x: number, y: number): [number, number] => {
    const c = Math.cos(s.tilt);
    const si = Math.sin(s.tilt);
    return [bx + x * c - y * si, by + x * si + y * c];
  };
  const [ax, ay] = rot(0, h);
  const [lx, ly] = rot(-s.w, 0);
  const [rx, ry] = rot(s.w, 0);
  return `M ${lx} ${ly} L ${ax} ${ay} L ${rx} ${ry} Z`;
};

// ── Legs (four short splayed appendages) ──────────────────────────────────
type Leg = { x: number; y: number; dx: number; sign: 1 | -1 };
const LEGS: Leg[] = [
  { x: 730, y: 516, dx: 10, sign: 1 }, // front-near (just behind the chest)
  { x: 672, y: 522, dx: 16, sign: 1 }, // front-far (slightly offset)
  { x: 480, y: 520, dx: -14, sign: 1 }, // rear-far
  { x: 410, y: 510, dx: -10, sign: 1 }, // rear-near
];

const legPath = (l: Leg): string => {
  const foot = l.y + 72;
  const kneeX = l.x + l.dx;
  const kneeY = l.y + 36;
  // Short limb with a 4-toe foot.
  const toes = [-10, -4, 4, 10]
    .map(
      (dx, i) =>
        `M ${kneeX + dx * 0.8} ${foot - 2} L ${kneeX + dx} ${foot + 10}`,
    )
    .join(" ");
  return [
    `M ${l.x} ${l.y}`,
    `L ${kneeX} ${kneeY}`,
    `L ${kneeX} ${foot}`,
    toes,
  ].join(" ");
};

// ── Capillary network (routed between dorsal and ventral spike bases) ─────
type Pt = [number, number];
const CAPILLARIES: Pt[][] = [
  // 0: Main dorsal arch — tail tip to mouth corner, flowing just below dorsal
  [
    [185, 468],
    [270, 440],
    [360, 416],
    [460, 400],
    [560, 394],
    [660, 396],
    [740, 406],
    [800, 412],
    [848, 416],
  ],
  // 1: Mid-flank channel
  [
    [205, 475],
    [295, 455],
    [385, 440],
    [480, 428],
    [580, 424],
    [670, 428],
    [740, 434],
    [800, 432],
    [846, 420],
  ],
  // 2: Ventral channel
  [
    [220, 478],
    [305, 468],
    [405, 462],
    [500, 460],
    [600, 462],
    [690, 466],
    [755, 468],
    [810, 450],
    [846, 420],
  ],
  // 3: Rear-leg feeder (merges into mid-flank)
  [
    [396, 568],
    [396, 520],
    [430, 490],
    [485, 450],
    [540, 430],
  ],
  // 4: Front-leg feeder (merges near mouth)
  [
    [746, 568],
    [746, 500],
    [778, 460],
    [812, 428],
    [846, 420],
  ],
  // 5: Tail-tip branch
  [
    [168, 464],
    [200, 464],
    [240, 460],
  ],
];

const polyLen = (pts: Pt[]): number => {
  let s = 0;
  for (let i = 1; i < pts.length; i++) {
    s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  }
  return s;
};

const pointAt = (pts: Pt[], p: number): Pt => {
  const total = polyLen(pts);
  const target = p * total;
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const seg = Math.hypot(
      pts[i][0] - pts[i - 1][0],
      pts[i][1] - pts[i - 1][1],
    );
    if (acc + seg >= target) {
      const f = (target - acc) / seg;
      return [
        pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f,
        pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f,
      ];
    }
    acc += seg;
  }
  return pts[pts.length - 1];
};

// ── Main composition ───────────────────────────────────────────────────────
export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Timeline
  const bodyT = interpolate(frame, [fps * 0.3, fps * 1.1], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const spikeT = interpolate(frame, [fps * 0.7, fps * 1.5], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const capT = interpolate(frame, [fps * 1.0, fps * 2.1], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const dropLoop = ((frame - fps * 1.8) % (fps * 3.4)) / (fps * 3.4);
  const dropP = Math.max(0, Math.min(1, dropLoop));
  const titleSpring = spring({
    frame: frame - fps * 2.3,
    fps,
    config: { damping: 200, mass: 0.9 },
  });
  const hookOpacity = interpolate(frame, [fps * 2.8, fps * 3.6], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const FRAME = { x: 60, y: 130, w: 960, h: 711 };
  const MAP_W = 1080;
  const MAP_H = 800;
  const scale = FRAME.w / MAP_W;

  const heroTrace = CAPILLARIES[0];
  const [dropX, dropY] = pointAt(heroTrace, dropP);

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
        <span style={{ color: OCHRE }}>2026 · 10 · 26</span>
      </div>

      {/* Drafting frame + blueprint */}
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

          <radialGradient id="board-vignette" cx="50%" cy="40%" r="70%">
            <stop offset="0%" stopColor={BOARD_LIFT} stopOpacity={1} />
            <stop offset="100%" stopColor={BOARD} stopOpacity={1} />
          </radialGradient>

          <radialGradient id="droplet" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={CYAN_GLOW} stopOpacity={1} />
            <stop offset="55%" stopColor={CYAN} stopOpacity={0.95} />
            <stop offset="100%" stopColor={CYAN} stopOpacity={0} />
          </radialGradient>

          <filter id="soft-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="drop-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="6" />
          </filter>

          <linearGradient id="body-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SIENNA} stopOpacity={0.26} />
            <stop offset="100%" stopColor={SIENNA} stopOpacity={0.14} />
          </linearGradient>
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

        {/* Inner thin border */}
        <rect
          x={FRAME.x + 0.5}
          y={FRAME.y + 0.5}
          width={FRAME.w - 1}
          height={FRAME.h - 1}
          fill="none"
          stroke="#3A2C18"
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
          <g key={i} stroke={OCHRE} strokeWidth={1.5} fill="none">
            <line x1={cx} y1={cy} x2={cx + sx * 26} y2={cy} />
            <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 26} />
          </g>
        ))}

        {/* Compass marker — "W / E" since we're in elevation (lateral view) */}
        <g
          transform={`translate(${FRAME.x + 26}, ${FRAME.y + 30})`}
          fill={GRAY}
          fontFamily={inter}
          fontWeight={600}
          fontSize={11}
          letterSpacing={3}
        >
          <text textAnchor="start">LATERAL ELEV.</text>
        </g>

        {/* Scale bar (micrometres) */}
        <g
          transform={`translate(${FRAME.x + FRAME.w - 230}, ${
            FRAME.y + FRAME.h - 28
          })`}
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
            CHANNEL W. ≈ 100 µM
          </text>
        </g>

        {/* Blueprint content: scale 1080×800 coords into FRAME */}
        <g transform={`translate(${FRAME.x}, ${FRAME.y}) scale(${scale})`}>
          {/* Dashed baseline (ground) under the belly line */}
          <line
            x1={120}
            y1={600}
            x2={960}
            y2={600}
            stroke={OCHRE}
            strokeOpacity={0.22}
            strokeWidth={1}
            strokeDasharray="2 6"
          />
          <text
            x={960}
            y={616}
            textAnchor="end"
            fill={GRAY}
            fontFamily={inter}
            fontSize={10}
            letterSpacing={2.4}
            fontWeight={500}
          >
            DAMP SUBSTRATE
          </text>

          {/* Legs (behind body fill) */}
          <g opacity={bodyT}>
            {LEGS.map((l, i) => (
              <path
                key={`leg-${i}`}
                d={legPath(l)}
                fill="none"
                stroke={OCHRE}
                strokeOpacity={0.78}
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
          </g>

          {/* Body silhouette */}
          <g opacity={bodyT}>
            {/* Fill wash */}
            <path d={bodyPath} fill="url(#body-fill)" />
            {/* Outline */}
            <path
              d={bodyPath}
              fill="none"
              stroke={OCHRE}
              strokeOpacity={0.9}
              strokeWidth={1.8}
            />
            {/* Head detail: eye and mouth cleft (facing right) */}
            <circle
              cx={848}
              cy={398}
              r={4.5}
              fill={INK}
              stroke={OCHRE}
              strokeWidth={1.4}
            />
            <circle cx={848} cy={398} r={1.6} fill={OCHRE} />
            <path
              d="M 862 426 Q 870 418 878 414"
              fill="none"
              stroke={OCHRE}
              strokeWidth={1.4}
            />
          </g>

          {/* Dorsal spike ridge */}
          <g>
            {DORSAL_SPIKES.map((s, i) => {
              const localT = Math.max(
                0,
                Math.min(1, (spikeT - i * 0.025) / 0.3),
              );
              return (
                <g
                  key={`ds-${i}`}
                  opacity={localT}
                  style={{
                    transformOrigin: `${s.base[0]}px ${s.base[1]}px`,
                    transform: `scaleY(${0.4 + 0.6 * localT})`,
                  }}
                >
                  <path
                    d={spikePath(s, -1)}
                    fill={SIENNA}
                    fillOpacity={0.72}
                    stroke={OCHRE}
                    strokeWidth={1.2}
                    strokeLinejoin="round"
                  />
                  {s.big && (
                    <path
                      d={spikePath({ ...s, h: s.h * 0.55, w: s.w * 0.5 }, -1)}
                      fill={OCHRE}
                      fillOpacity={0.35}
                      stroke="none"
                    />
                  )}
                </g>
              );
            })}
          </g>

          {/* Ventral flank spikes */}
          <g>
            {FLANK_SPIKES.map((s, i) => {
              const localT = Math.max(
                0,
                Math.min(1, (spikeT - 0.15 - i * 0.02) / 0.3),
              );
              return (
                <g
                  key={`fs-${i}`}
                  opacity={localT}
                  style={{
                    transformOrigin: `${s.base[0]}px ${s.base[1]}px`,
                    transform: `scaleY(${0.4 + 0.6 * localT})`,
                  }}
                >
                  <path
                    d={spikePath(s, 1)}
                    fill={SIENNA}
                    fillOpacity={0.6}
                    stroke={OCHRE}
                    strokeWidth={1.1}
                    strokeLinejoin="round"
                  />
                </g>
              );
            })}
          </g>

          {/* Capillary network */}
          <g>
            {CAPILLARIES.map((pts, i) => {
              const d = smoothPath(pts);
              const len = polyLen(pts) * 1.08;
              const localT = Math.max(
                0,
                Math.min(1, (capT - i * 0.08) / 0.55),
              );
              const dashOffset = len * (1 - localT);
              const isHero = i === 0;
              return (
                <g key={`cap-${i}`}>
                  <path
                    d={d}
                    fill="none"
                    stroke={CYAN}
                    strokeOpacity={isHero ? 0.22 : 0.16}
                    strokeWidth={isHero ? 8 : 6}
                    strokeLinecap="round"
                    strokeDasharray={len}
                    strokeDashoffset={dashOffset}
                    filter="url(#soft-glow)"
                  />
                  <path
                    d={d}
                    fill="none"
                    stroke={CYAN}
                    strokeOpacity={isHero ? 1 : 0.9}
                    strokeWidth={isHero ? 2.2 : 1.5}
                    strokeLinecap="round"
                    strokeDasharray={len}
                    strokeDashoffset={dashOffset}
                  />
                  {isHero && (
                    <path
                      d={d}
                      fill="none"
                      stroke={CYAN_GLOW}
                      strokeOpacity={0.55}
                      strokeWidth={0.9}
                      strokeLinecap="round"
                      strokeDasharray={len}
                      strokeDashoffset={dashOffset}
                    />
                  )}
                </g>
              );
            })}
          </g>

          {/* Water droplet travelling along the dorsal arch */}
          {capT > 0.55 && (
            <g opacity={Math.min(1, (capT - 0.55) * 3)}>
              <circle
                cx={dropX}
                cy={dropY}
                r={22}
                fill={CYAN}
                opacity={0.18}
                filter="url(#drop-glow)"
              />
              <circle cx={dropX} cy={dropY} r={9} fill="url(#droplet)" />
              <circle cx={dropX} cy={dropY} r={3.8} fill={CYAN_GLOW} />
            </g>
          )}

          {/* Mouth terminal (sink) marker at the snout corner */}
          <g opacity={bodyT}>
            <circle
              cx={856}
              cy={420}
              r={16}
              fill="none"
              stroke={CYAN}
              strokeWidth={1.4}
              strokeDasharray="3 3"
            />
            <circle cx={856} cy={420} r={3.4} fill={CYAN} />
          </g>

          {/* Flow-direction arrow above body (sits in the clear band
              between the callout box and the dorsal ridge) */}
          <g opacity={Math.min(1, Math.max(0, capT - 0.6) * 2)}>
            <line
              x1={420}
              y1={300}
              x2={820}
              y2={300}
              stroke={CYAN}
              strokeOpacity={0.55}
              strokeWidth={1.4}
            />
            <polygon
              points={`${820},${300} ${802},${291} ${802},${309}`}
              fill={CYAN}
              fillOpacity={0.75}
            />
            <text
              x={620}
              y={285}
              textAnchor="middle"
              fill={CYAN}
              fillOpacity={0.9}
              fontFamily={inter}
              fontSize={13}
              fontWeight={600}
              letterSpacing={5}
            >
              CAPILLARY FLOW  →  MOUTH
            </text>
          </g>

          {/* Cross-section callout — upper-left negative space */}
          <g opacity={bodyT}>
            {/* Target circle on a mid-dorsal spike base */}
            <circle
              cx={508}
              cy={376}
              r={30}
              fill="none"
              stroke={BONE}
              strokeOpacity={0.4}
              strokeWidth={1}
            />
            {/* Leader lines up-left into callout */}
            <line
              x1={488}
              y1={354}
              x2={260}
              y2={120}
              stroke={BONE}
              strokeOpacity={0.5}
              strokeWidth={1}
            />

            <g transform="translate(100, 60)">
              <rect
                x={0}
                y={0}
                width={260}
                height={190}
                fill={INK}
                fillOpacity={0.78}
                stroke={OCHRE}
                strokeOpacity={0.7}
                strokeWidth={1}
              />
              <text
                x={16}
                y={26}
                fill={OCHRE}
                fontFamily={inter}
                fontSize={11}
                fontWeight={600}
                letterSpacing={3}
              >
                §A  CHANNEL SECTION
              </text>

              {/* Section: two spines flanking a semi-tubular groove */}
              <g transform="translate(26, 60)">
                <line
                  x1={0}
                  y1={100}
                  x2={210}
                  y2={100}
                  stroke={BONE}
                  strokeOpacity={0.45}
                  strokeWidth={1}
                  strokeDasharray="2 3"
                />
                <path
                  d="M 30 100 L 50 20 L 70 100 Z"
                  fill={SIENNA}
                  fillOpacity={0.7}
                  stroke={OCHRE}
                  strokeWidth={1.2}
                />
                <path
                  d="M 140 100 L 160 20 L 180 100 Z"
                  fill={SIENNA}
                  fillOpacity={0.7}
                  stroke={OCHRE}
                  strokeWidth={1.2}
                />
                <path
                  d="M 70 100 Q 105 68 140 100"
                  fill={INK}
                  stroke={CYAN}
                  strokeOpacity={0.85}
                  strokeWidth={1.4}
                />
                <path
                  d="M 72 96 Q 105 112 138 96"
                  fill={CYAN}
                  fillOpacity={0.55}
                  stroke={CYAN_GLOW}
                  strokeWidth={1}
                />
                <g
                  stroke={BONE}
                  strokeOpacity={0.65}
                  fill={BONE}
                  fillOpacity={0.9}
                  fontFamily={inter}
                  fontSize={10}
                  fontWeight={500}
                  letterSpacing={2}
                >
                  <line x1={70} y1={116} x2={140} y2={116} strokeWidth={1} />
                  <line x1={70} y1={110} x2={70} y2={122} strokeWidth={1} />
                  <line x1={140} y1={110} x2={140} y2={122} strokeWidth={1} />
                  <text x={105} y={132} textAnchor="middle" stroke="none">
                    ≈ 100 µM
                  </text>
                </g>
              </g>
            </g>
          </g>

          {/* Mouth tag — leader hooks right and down into clear space
              below and right of the snout. */}
          <g opacity={bodyT}>
            <line
              x1={874}
              y1={414}
              x2={950}
              y2={414}
              stroke={CYAN}
              strokeOpacity={0.65}
              strokeWidth={1}
            />
            <line
              x1={950}
              y1={414}
              x2={950}
              y2={660}
              stroke={CYAN}
              strokeOpacity={0.65}
              strokeWidth={1}
            />
            <rect
              x={892}
              y={664}
              width={118}
              height={26}
              rx={2}
              fill={INK}
              stroke={CYAN}
              strokeOpacity={0.75}
              strokeWidth={1}
            />
            <text
              x={951}
              y={682}
              textAnchor="middle"
              fill={CYAN}
              fontFamily={inter}
              fontSize={11}
              fontWeight={600}
              letterSpacing={3.5}
            >
              MOUTH · SINK
            </text>
          </g>

          {/* Parietal thorns tag — small arrow from the big crown pair */}
          <g opacity={bodyT}>
            <line
              x1={774}
              y1={352}
              x2={870}
              y2={272}
              stroke={BONE}
              strokeOpacity={0.55}
              strokeWidth={1}
            />
            <circle
              cx={774}
              cy={352}
              r={2.4}
              fill={BONE}
              fillOpacity={0.75}
            />
            <text
              x={874}
              y={268}
              fill={BONE}
              fontFamily={inter}
              fontSize={10}
              fontWeight={500}
              letterSpacing={2.8}
            >
              PARIETAL THORNS
            </text>
          </g>

          {/* Source droplets at the feet / tail tip — the "wet sand" input */}
          <g opacity={Math.min(1, Math.max(0, capT - 0.4) * 2)}>
            {[
              [168, 466], // tail tip source
              [405, 594], // rear-near foot
              [478, 606], // rear-far foot
              [672, 606], // front-far foot
              [732, 598], // front-near foot
            ].map(([x, y], i) => (
              <g key={`src-${i}`}>
                <circle
                  cx={x}
                  cy={y}
                  r={12}
                  fill={CYAN}
                  opacity={0.14}
                  filter="url(#drop-glow)"
                />
                <circle cx={x} cy={y} r={4} fill="url(#droplet)" />
                <circle cx={x} cy={y} r={1.6} fill={CYAN_GLOW} />
              </g>
            ))}
          </g>
        </g>

        {/* Caption strip just below the drafting frame */}
        <g
          transform={`translate(${FRAME.x}, ${FRAME.y + FRAME.h + 22})`}
          fill={GRAY}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
        >
          <text>FIG. 1 · LATERAL ELEV. · PASSIVE WATER CIRCUIT</text>
          <text
            x={FRAME.w}
            textAnchor="end"
            fill={CYAN}
            opacity={0.85}
          >
            SOURCE: WET SAND  ·  SINK: MOUTH
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
            color: OCHRE,
            fontFamily: inter,
            fontSize: 13,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 18,
            fontWeight: 600,
          }}
        >
          Role <span style={{ color: GRAY, margin: "0 4px" }}>/</span>
          <span style={{ color: "#F2E6CB", letterSpacing: 5 }}>
            Microfluidics Engineer
          </span>
        </div>

        <div
          style={{
            color: "#F6EFDB",
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 84,
            lineHeight: 0.96,
            letterSpacing: -1.4,
            fontStyle: "italic",
          }}
        >
          The lizard that
          <br />
          drinks with its skin.
        </div>

        <div
          style={{
            marginTop: 30,
            color: "#D7CDB4",
            fontFamily: inter,
            fontSize: 19,
            lineHeight: 1.42,
            fontWeight: 400,
            maxWidth: 880,
            opacity: hookOpacity,
          }}
        >
          Between every pair of thorns on{" "}
          <span style={{ color: OCHRE, fontWeight: 600 }}>Moloch horridus</span>{" "}
          runs a semi-tubular channel ~100&nbsp;µm wide. The grid lifts water
          from damp sand up the lizard's legs and flanks to the mouth
          corners — surface tension alone, zero pumping.
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
        <span>Comanns et al. · J. Exp. Biol. 220 (2017) 3473–3479</span>
        <span>
          <span style={{ color: CYAN }}>●</span> Capillary channel
        </span>
      </div>
    </AbsoluteFill>
  );
};
