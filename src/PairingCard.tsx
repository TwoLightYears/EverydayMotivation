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

// ── Palette (from the concept's visual brief) ───────────────────────────────
const INK = "#07091A";
const NIGHT = "#0B0F28";
const MILKY = "#F5ECD3";
const MILKY_CORE = "#FFF4D1";
const BRASS = "#D4A94B";
const BRASS_DEEP = "#8A6E2C";
const SCARAB = "#2A4A3C";
const SCARAB_DEEP = "#13241E";
const SCARAB_HI = "#5E9476";
const GRAY = "#9A9CB3";
const GRID = "#141935";
const BALL = "#4A3626";
const BALL_HI = "#6E513A";

// ── Chart frame (inside 1080×1350) ──────────────────────────────────────────
// Top band:   56..100
// Sky panel : 130..840  (w 960, h 710)
// Caption   : 862
// Type      : 905..
// Footer    : bottom 50
const FRAME = { x: 60, y: 130, w: 960, h: 710 };
// Sky-local coordinate space 0..SKY_W × 0..SKY_H
const SKY_W = 960;
const SKY_H = 710;
const SKY_SCALE = FRAME.w / SKY_W; // = 1

// ── Milky Way axis in sky-local coords ──────────────────────────────────────
// Line from (0, 760) to (960, -60) → crosses x=480 at y=350
const MW_START = { x: 0, y: 760 };
const MW_END = { x: 960, y: -60 };
const MW_SLOPE =
  (MW_END.y - MW_START.y) / (MW_END.x - MW_START.x); // ≈ -0.854
const MW_LEN = Math.hypot(MW_END.x - MW_START.x, MW_END.y - MW_START.y);
const MW_UX = (MW_END.x - MW_START.x) / MW_LEN; // unit along axis
const MW_UY = (MW_END.y - MW_START.y) / MW_LEN;
const MW_NX = -MW_UY; // perpendicular
const MW_NY = MW_UX;
const MW_ANGLE_DEG = (Math.atan2(MW_UY, MW_UX) * 180) / Math.PI;

const mwDistance = (x: number, y: number): number =>
  Math.abs(y - (MW_START.y + MW_SLOPE * x)) / Math.sqrt(1 + MW_SLOPE * MW_SLOPE);

// ── Seeded RNG ──────────────────────────────────────────────────────────────
function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// ── Pre-compute star field (dense inside the galactic band) ─────────────────
type Star = { x: number; y: number; r: number; phase: number; bright: number };
const STARS: Star[] = (() => {
  const rnd = makeRng(1337);
  const list: Star[] = [];
  const MAX = 260;
  for (let i = 0; i < MAX; i++) {
    const x = rnd() * SKY_W;
    const y = rnd() * SKY_H;
    const d = mwDistance(x, y);
    const inBand = Math.max(0, 1 - d / 190);
    const keep = 0.32 + inBand * 0.95;
    if (rnd() < keep) {
      list.push({
        x,
        y,
        r: 0.4 + rnd() * (inBand > 0.5 ? 2.2 : 1.2),
        phase: rnd() * Math.PI * 2,
        bright: inBand * 0.6 + rnd() * 0.5,
      });
    }
  }
  return list;
})();

const MARQUEE_STARS: Star[] = (() => {
  // Bigger "signpost" stars with 4-point gleams — a few land inside the band
  const rnd = makeRng(991);
  const list: Star[] = [];
  const picks = [
    { x: 180, y: 540 }, // sky
    { x: 820, y: 130 }, // high right
    { x: 300, y: 500 }, // within band
    { x: 620, y: 290 }, // within band
    { x: 860, y: 580 }, // low right sky
    { x: 140, y: 230 }, // high left sky
    { x: 720, y: 220 }, // within band upper right
    { x: 400, y: 440 }, // within band lower left
  ];
  picks.forEach((p) => {
    list.push({
      x: p.x,
      y: p.y,
      r: 2.4 + rnd() * 1.4,
      phase: rnd() * Math.PI * 2,
      bright: 1,
    });
  });
  return list;
})();

// ── Pre-compute Milky Way "nebula" blobs along the axis ─────────────────────
type Blob = {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  rot: number;
  op: number;
  core: boolean;
};
const MW_BLOBS: Blob[] = (() => {
  const rnd = makeRng(73);
  const list: Blob[] = [];
  const COUNT = 90;
  for (let i = 0; i < COUNT; i++) {
    const t = i / (COUNT - 1);
    const along = -0.08 + t * 1.16; // overshoot both ends
    const cx = MW_START.x + (MW_END.x - MW_START.x) * along;
    const cyOnAxis = MW_START.y + (MW_END.y - MW_START.y) * along;
    const perp = (rnd() * 2 - 1) * 180;
    const cx2 = cx + MW_NX * perp;
    const cy2 = cyOnAxis + MW_NY * perp;
    const falloff = Math.exp(-Math.abs(perp) / 110);
    const core = Math.abs(perp) < 55 && rnd() < 0.55;
    list.push({
      cx: cx2,
      cy: cy2,
      rx: 50 + rnd() * 140,
      ry: 25 + rnd() * 55,
      rot: (Math.atan2(MW_UY, MW_UX) * 180) / Math.PI + (rnd() - 0.5) * 10,
      op: (0.035 + rnd() * 0.08) * falloff,
      core,
    });
  }
  return list;
})();

// ── Bearing geometry ────────────────────────────────────────────────────────
const BEETLE_CX = 480; // sky-local
const BEETLE_CY = 620; // on compass center
// Vertical bearing line up from beetle
const BEARING_X = 480;
const BEARING_Y_START = BEETLE_CY - 24;
// Hit point on galactic plane for vertical bearing:
//   y = MW_START.y + MW_SLOPE * x  →  at x=480, y = 760 + (-0.854)*480 = 349.9
const MW_HIT = {
  x: BEARING_X,
  y: MW_START.y + MW_SLOPE * BEARING_X,
};

// ── Beetle silhouette (side view, atop ball, facing up/slightly right) ──────
const Beetle: React.FC<{ rollAngle: number }> = ({ rollAngle }) => {
  // Ball center at (0, 22) in local; beetle on top centred at (0, -2)
  const ballR = 22;
  // Dung-ball surface texture (small flecks), rotated by rollAngle
  const rnd = makeRng(55);
  const flecks: { x: number; y: number; r: number }[] = [];
  for (let i = 0; i < 14; i++) {
    const a = rnd() * Math.PI * 2;
    const d = rnd() * (ballR - 3);
    flecks.push({ x: Math.cos(a) * d, y: Math.sin(a) * d, r: 0.9 + rnd() * 1.4 });
  }
  return (
    <g>
      {/* Ball */}
      <circle cx={0} cy={22} r={ballR + 1} fill={SCARAB_DEEP} opacity={0.5} />
      <circle cx={0} cy={22} r={ballR} fill={BALL} />
      <circle cx={0} cy={22} r={ballR} fill="url(#ball-shade)" />
      <g transform={`rotate(${rollAngle} 0 22)`} opacity={0.75}>
        {flecks.map((f, i) => (
          <circle
            key={i}
            cx={f.x}
            cy={22 + f.y}
            r={f.r}
            fill={i % 2 === 0 ? BALL_HI : SCARAB_DEEP}
          />
        ))}
      </g>
      {/* Beetle sitting on top of ball — compact scarab silhouette */}
      {/* Rear legs gripping ball */}
      <g
        stroke={SCARAB_DEEP}
        strokeWidth={1.4}
        strokeLinecap="round"
        fill="none"
      >
        <path d="M -8 2 Q -14 6 -12 14" />
        <path d="M 8 2 Q 14 6 12 14" />
        <path d="M -6 -2 Q -12 -4 -14 2" />
        <path d="M 6 -2 Q 12 -4 14 2" />
      </g>
      {/* Elytra (wing cases) */}
      <ellipse cx={0} cy={0} rx={11} ry={9} fill={SCARAB_DEEP} />
      <ellipse cx={0} cy={-1} rx={10} ry={8} fill={SCARAB} />
      <path
        d="M 0 -8 L 0 7"
        stroke={SCARAB_DEEP}
        strokeWidth={0.8}
        opacity={0.8}
      />
      {/* Iridescent highlight */}
      <ellipse cx={-3} cy={-4} rx={5} ry={2.4} fill={SCARAB_HI} opacity={0.7} />
      {/* Pronotum */}
      <ellipse cx={0} cy={-7} rx={6.5} ry={4} fill={SCARAB_DEEP} />
      <ellipse cx={-2} cy={-8} rx={3.4} ry={1.6} fill={SCARAB_HI} opacity={0.55} />
      {/* Head */}
      <ellipse cx={0} cy={-11.5} rx={3.6} ry={2.4} fill={SCARAB_DEEP} />
      {/* Antennae splayed up-right (toward the sky) */}
      <g stroke={BRASS} strokeWidth={1} strokeLinecap="round" fill="none">
        <path d="M 1 -13 Q 3 -17 5 -20" />
        <path d="M -1 -13 Q -3 -17 -5 -20" />
      </g>
      <circle cx={5} cy={-20} r={1.1} fill={BRASS} />
      <circle cx={-5} cy={-20} r={1.1} fill={BRASS} />
    </g>
  );
};

// ── Compass protractor (brass half-circle around beetle) ────────────────────
const Compass: React.FC<{ progress: number }> = ({ progress }) => {
  const R = 170;
  const ticks: React.ReactNode[] = [];
  for (let deg = -90; deg <= 90; deg += 5) {
    const a = ((deg - 90) * Math.PI) / 180; // -90 => straight up
    const major = deg % 15 === 0;
    const r1 = R - (major ? 14 : 6);
    const r2 = R - 1;
    const x1 = Math.cos(a) * r1;
    const y1 = Math.sin(a) * r1;
    const x2 = Math.cos(a) * r2;
    const y2 = Math.sin(a) * r2;
    ticks.push(
      <line
        key={deg}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={major ? BRASS : BRASS_DEEP}
        strokeWidth={major ? 1.4 : 1}
        opacity={major ? 0.95 : 0.6}
      />,
    );
    if (major && deg !== 0) {
      const lr = R - 28;
      const lx = Math.cos(a) * lr;
      const ly = Math.sin(a) * lr;
      ticks.push(
        <text
          key={`t${deg}`}
          x={lx}
          y={ly + 3}
          textAnchor="middle"
          fill={BRASS}
          fontFamily={inter}
          fontSize={9}
          fontWeight={600}
          letterSpacing={1.2}
          opacity={0.85}
        >
          {Math.abs(deg)}°
        </text>,
      );
    }
  }
  // Baseline (horizon)
  const dashLen = Math.PI * R; // half-circle arc length
  const arcPath = `M ${-R} 0 A ${R} ${R} 0 0 1 ${R} 0`;
  return (
    <g>
      {/* Faint outer ring */}
      <circle cx={0} cy={0} r={R + 10} fill="none" stroke={BRASS_DEEP} strokeWidth={0.6} opacity={0.35} />
      {/* Horizon baseline */}
      <line
        x1={-R - 40}
        y1={0}
        x2={R + 40}
        y2={0}
        stroke={BRASS_DEEP}
        strokeWidth={1}
        opacity={0.55}
        strokeDasharray="3 5"
      />
      {/* Arc drawn in */}
      <path
        d={arcPath}
        fill="none"
        stroke={BRASS}
        strokeWidth={1.8}
        strokeDasharray={dashLen}
        strokeDashoffset={dashLen * (1 - progress)}
        opacity={0.9}
      />
      <g opacity={Math.min(1, progress * 1.4)}>{ticks}</g>
      {/* 0° marker — galactic azimuth label */}
      <text
        x={0}
        y={-R - 18}
        textAnchor="middle"
        fill={BRASS}
        fontFamily={inter}
        fontSize={10}
        letterSpacing={3}
        fontWeight={600}
        opacity={Math.min(1, progress * 1.4)}
      >
        GALACTIC MERIDIAN
      </text>
      <line x1={0} y1={-R - 8} x2={0} y2={-R + 6} stroke={BRASS} strokeWidth={1.4} opacity={Math.min(1, progress * 1.4)} />
      {/* W / E labels at ends */}
      <text
        x={-R - 20}
        y={4}
        textAnchor="end"
        fill={GRAY}
        fontFamily={inter}
        fontSize={10}
        letterSpacing={3}
        fontWeight={600}
        opacity={Math.min(1, progress * 1.4) * 0.8}
      >
        W
      </text>
      <text
        x={R + 20}
        y={4}
        textAnchor="start"
        fill={GRAY}
        fontFamily={inter}
        fontSize={10}
        letterSpacing={3}
        fontWeight={600}
        opacity={Math.min(1, progress * 1.4) * 0.8}
      >
        E
      </text>
    </g>
  );
};

// ── Composition ─────────────────────────────────────────────────────────────
export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Phases (30 fps → 180 frames total)
  const stars01 = interpolate(frame, [0, fps * 1.4], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const milkyway01 = interpolate(frame, [fps * 0.4, fps * 2.2], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
  const compassSpring = spring({
    frame: frame - fps * 1.0,
    fps,
    config: { damping: 18, mass: 0.8, stiffness: 110 },
  });
  const bearing01 = interpolate(frame, [fps * 2.0, fps * 3.0], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const tickPop = spring({
    frame: frame - fps * 2.9,
    fps,
    config: { damping: 12, mass: 0.6, stiffness: 160 },
  });

  // Ball rolls a quarter turn after bearing is set
  const rollAngle = interpolate(frame, [fps * 3.2, fps * 5.6], [0, 90], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });

  // Title
  const titleSpring = spring({
    frame: frame - fps * 0.4,
    fps,
    config: { damping: 200, mass: 0.8 },
  });
  const hookOpacity = interpolate(frame, [fps * 1.1, fps * 2.1], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Twinkle factor for star field
  const twinkle = frame / fps;

  const bearingLen = BEARING_Y_START - MW_HIT.y;
  const bearingY2 = BEARING_Y_START - bearing01 * bearingLen;

  return (
    <AbsoluteFill style={{ backgroundColor: INK, fontFamily: inter }}>
      <style>{fontCss}</style>

      {/* ── Top metadata band ────────────────────────────────── */}
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
        <span style={{ color: BRASS }}>2026 · 11 · 14</span>
      </div>

      {/* ── Chart (celestial plate) ─────────────────────────── */}
      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          <linearGradient id="sky-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#060818" />
            <stop offset="55%" stopColor={NIGHT} />
            <stop offset="100%" stopColor="#0C122E" />
          </linearGradient>
          <radialGradient id="horizon-glow" cx="50%" cy="100%" r="80%">
            <stop offset="0%" stopColor="#1A2050" stopOpacity={0.55} />
            <stop offset="60%" stopColor="#0E1230" stopOpacity={0.2} />
            <stop offset="100%" stopColor={NIGHT} stopOpacity={0} />
          </radialGradient>
          <radialGradient id="ball-shade" cx="35%" cy="30%" r="80%">
            <stop offset="0%" stopColor={BALL_HI} stopOpacity={0.9} />
            <stop offset="55%" stopColor={BALL} stopOpacity={0.4} />
            <stop offset="100%" stopColor="#1A1008" stopOpacity={0.9} />
          </radialGradient>
          <filter id="mw-blur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="10" />
          </filter>
          <filter id="mw-core-blur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="5" />
          </filter>
          {/* Milky Way: wide soft halo */}
          <linearGradient
            id="mw-halo-grad"
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop offset="0%" stopColor={MILKY} stopOpacity="0" />
            <stop offset="50%" stopColor={MILKY} stopOpacity="0.20" />
            <stop offset="100%" stopColor={MILKY} stopOpacity="0" />
          </linearGradient>
          {/* Milky Way: bright inner band */}
          <linearGradient
            id="mw-core-grad"
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop offset="0%" stopColor={MILKY} stopOpacity="0" />
            <stop offset="42%" stopColor={MILKY_CORE} stopOpacity="0.42" />
            <stop offset="58%" stopColor={MILKY_CORE} stopOpacity="0.42" />
            <stop offset="100%" stopColor={MILKY} stopOpacity="0" />
          </linearGradient>
          {/* Galactic center bulge */}
          <radialGradient id="mw-bulge" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={MILKY_CORE} stopOpacity="0.55" />
            <stop offset="55%" stopColor={BRASS} stopOpacity="0.1" />
            <stop offset="100%" stopColor={MILKY} stopOpacity="0" />
          </radialGradient>
          {/* Compass vignette — restores type contrast under the band */}
          <radialGradient id="compass-vignette" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={INK} stopOpacity="0.72" />
            <stop offset="55%" stopColor={INK} stopOpacity="0.45" />
            <stop offset="100%" stopColor={INK} stopOpacity="0" />
          </radialGradient>
          <filter id="soft-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <clipPath id="sky-clip">
            <rect
              x={FRAME.x}
              y={FRAME.y}
              width={FRAME.w}
              height={FRAME.h}
            />
          </clipPath>
        </defs>

        {/* Sky fill */}
        <rect
          x={FRAME.x}
          y={FRAME.y}
          width={FRAME.w}
          height={FRAME.h}
          fill="url(#sky-grad)"
        />
        {/* Horizon glow */}
        <rect
          x={FRAME.x}
          y={FRAME.y}
          width={FRAME.w}
          height={FRAME.h}
          fill="url(#horizon-glow)"
        />

        {/* Celestial grid: fine RA/dec */}
        <g clipPath="url(#sky-clip)" opacity={0.55}>
          {Array.from({ length: 10 }).map((_, i) => (
            <line
              key={`gv${i}`}
              x1={FRAME.x + (i + 1) * (FRAME.w / 10)}
              y1={FRAME.y}
              x2={FRAME.x + (i + 1) * (FRAME.w / 10)}
              y2={FRAME.y + FRAME.h}
              stroke={GRID}
              strokeWidth={1}
            />
          ))}
          {Array.from({ length: 7 }).map((_, i) => (
            <line
              key={`gh${i}`}
              x1={FRAME.x}
              y1={FRAME.y + (i + 1) * (FRAME.h / 8)}
              x2={FRAME.x + FRAME.w}
              y2={FRAME.y + (i + 1) * (FRAME.h / 8)}
              stroke={GRID}
              strokeWidth={1}
            />
          ))}
        </g>

        {/* Thin border of the plate */}
        <rect
          x={FRAME.x + 0.5}
          y={FRAME.y + 0.5}
          width={FRAME.w - 1}
          height={FRAME.h - 1}
          fill="none"
          stroke="#1D2240"
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
          <g key={i} stroke={BRASS} strokeWidth={1.5} fill="none">
            <line x1={cx} y1={cy} x2={cx + sx * 26} y2={cy} />
            <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 26} />
          </g>
        ))}

        {/* N marker — upper left */}
        <g
          transform={`translate(${FRAME.x + 28}, ${FRAME.y + 32})`}
          fill={GRAY}
          fontFamily={inter}
          fontWeight={600}
          fontSize={11}
          letterSpacing={3}
        >
          <text textAnchor="start">N</text>
          <line x1={5} y1={6} x2={5} y2={24} stroke={GRAY} strokeWidth={1.2} />
          <polygon points="2,9 5,2 8,9" fill={BRASS} />
        </g>

        {/* Plate coordinate label — upper right */}
        <g
          transform={`translate(${FRAME.x + FRAME.w - 28}, ${FRAME.y + 32})`}
          fill={GRAY}
          fontFamily={inter}
          fontSize={10}
          letterSpacing={3}
          fontWeight={500}
        >
          <text textAnchor="end">
            PLATE III · AZIMUTHAL
          </text>
        </g>

        {/* Sky-local group */}
        <g
          transform={`translate(${FRAME.x}, ${FRAME.y}) scale(${SKY_SCALE})`}
          clipPath="url(#sky-clip)"
        >
          {/* Milky Way — continuous luminous band along the galactic axis */}
          <g opacity={milkyway01}>
            <g
              transform={`translate(${MW_START.x}, ${MW_START.y}) rotate(${MW_ANGLE_DEG})`}
            >
              {/* Outer soft halo */}
              <rect
                x={-200}
                y={-260}
                width={MW_LEN + 400}
                height={520}
                fill="url(#mw-halo-grad)"
                filter="url(#mw-blur)"
              />
              {/* Inner bright band */}
              <rect
                x={-200}
                y={-110}
                width={MW_LEN + 400}
                height={220}
                fill="url(#mw-core-grad)"
              />
              {/* Galactic bulge shifted up the band (away from compass area) */}
              <ellipse
                cx={MW_LEN * 0.74}
                cy={0}
                rx={200}
                ry={95}
                fill="url(#mw-bulge)"
              />
            </g>

            {/* Stellar nurseries — warm highlights along the band */}
            <g filter="url(#mw-core-blur)">
              {MW_BLOBS.filter((b) => b.core).map((b, i) => (
                <ellipse
                  key={`c${i}`}
                  cx={b.cx}
                  cy={b.cy}
                  rx={b.rx * 0.5}
                  ry={b.ry * 0.45}
                  transform={`rotate(${b.rot} ${b.cx} ${b.cy})`}
                  fill={MILKY_CORE}
                  opacity={b.op * 1.8}
                />
              ))}
            </g>
          </g>

          {/* Faint galactic axis line */}
          <line
            x1={MW_START.x}
            y1={MW_START.y}
            x2={MW_END.x}
            y2={MW_END.y}
            stroke={MILKY}
            strokeWidth={1}
            strokeDasharray="1 7"
            opacity={milkyway01 * 0.25}
          />

          {/* Star field */}
          <g>
            {STARS.map((s, i) => {
              const tw =
                0.55 + 0.45 * Math.sin(twinkle * 1.2 + s.phase + i * 0.12);
              const op = stars01 * s.bright * tw;
              return (
                <circle
                  key={i}
                  cx={s.x}
                  cy={s.y}
                  r={s.r}
                  fill="#F2EEFC"
                  opacity={op}
                />
              );
            })}
          </g>

          {/* Marquee stars with 4-point gleam */}
          <g filter="url(#soft-glow)">
            {MARQUEE_STARS.map((s, i) => {
              const tw =
                0.7 + 0.3 * Math.sin(twinkle * 1.8 + s.phase + i * 0.7);
              const op = stars01 * tw;
              return (
                <g key={`m${i}`} opacity={op}>
                  <circle cx={s.x} cy={s.y} r={s.r} fill="#FFFFFF" />
                  <path
                    d={`M ${s.x - 12} ${s.y} L ${s.x + 12} ${s.y} M ${s.x} ${
                      s.y - 12
                    } L ${s.x} ${s.y + 12}`}
                    stroke="#FFFFFF"
                    strokeWidth={0.8}
                    opacity={0.65}
                  />
                </g>
              );
            })}
          </g>

          {/* Bearing line — vertical from beetle to galactic plane */}
          <g>
            <line
              x1={BEARING_X}
              y1={BEARING_Y_START}
              x2={BEARING_X}
              y2={bearingY2}
              stroke={BRASS}
              strokeWidth={1.4}
              strokeDasharray="4 5"
              opacity={0.95}
            />
            {/* Fine echo line */}
            <line
              x1={BEARING_X}
              y1={BEARING_Y_START}
              x2={BEARING_X}
              y2={bearingY2}
              stroke={MILKY_CORE}
              strokeWidth={0.6}
              opacity={bearing01 * 0.6}
            />
            {/* Tick where bearing crosses galactic plane */}
            {bearing01 > 0.75 && (
              <g
                transform={`translate(${MW_HIT.x}, ${MW_HIT.y}) scale(${Math.min(
                  1,
                  tickPop,
                )})`}
              >
                {/* Dark backing pill behind the labels so brass reads against the band */}
                <rect
                  x={14}
                  y={-20}
                  width={178}
                  height={38}
                  rx={3}
                  fill={INK}
                  opacity={0.78}
                />
                <rect
                  x={14}
                  y={-20}
                  width={178}
                  height={38}
                  rx={3}
                  fill="none"
                  stroke={BRASS_DEEP}
                  strokeWidth={0.8}
                  opacity={0.6}
                />
                <line
                  x1={-12}
                  y1={0}
                  x2={12}
                  y2={0}
                  stroke={BRASS}
                  strokeWidth={1.8}
                />
                <line
                  x1={0}
                  y1={-10}
                  x2={0}
                  y2={10}
                  stroke={BRASS}
                  strokeWidth={1.8}
                />
                <circle
                  cx={0}
                  cy={0}
                  r={6}
                  fill={INK}
                  stroke={MILKY_CORE}
                  strokeWidth={1.3}
                />
                <text
                  x={22}
                  y={-5}
                  fill={BRASS}
                  fontFamily={inter}
                  fontSize={11}
                  fontWeight={600}
                  letterSpacing={2.5}
                >
                  α · GALACTIC PLANE
                </text>
                <text
                  x={22}
                  y={11}
                  fill={GRAY}
                  fontFamily={inter}
                  fontSize={10}
                  letterSpacing={2}
                >
                  Δ 000° 00′ · RA 17ʰ 45ᵐ
                </text>
              </g>
            )}
          </g>

          {/* Compass + beetle at base */}
          <g transform={`translate(${BEETLE_CX}, ${BEETLE_CY})`}>
            {/* Dark vignette so dial reads against the Milky Way */}
            <circle
              cx={0}
              cy={0}
              r={260}
              fill="url(#compass-vignette)"
              opacity={Math.min(1, compassSpring)}
            />
            <g
              transform={`scale(${compassSpring})`}
              opacity={Math.min(1, compassSpring)}
            >
              <Compass progress={Math.min(1, compassSpring)} />
            </g>
            <g
              transform={`scale(${1.4 * compassSpring})`}
              opacity={Math.min(1, compassSpring)}
            >
              <Beetle rollAngle={rollAngle} />
            </g>
          </g>

          {/* Tiny annotation at horizon */}
          <text
            x={BEETLE_CX}
            y={BEETLE_CY + 56}
            textAnchor="middle"
            fill={GRAY}
            fontFamily={inter}
            fontSize={10}
            letterSpacing={3.5}
            fontWeight={500}
            opacity={Math.min(1, compassSpring) * 0.9}
          >
            SCARABAEUS SATYRUS · DUNG-BALL BEARING
          </text>
        </g>

        {/* Caption strip below the plate */}
        <g
          transform={`translate(${FRAME.x}, ${FRAME.y + FRAME.h + 22})`}
          fill={GRAY}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
        >
          <text>FIG. 1 · ORIENTATION TO THE GALACTIC LIGHT GRADIENT</text>
          <text x={FRAME.w} textAnchor="end" fill={BRASS} opacity={0.9}>
            PLANETARIUM, WITS UNIVERSITY · 2012
          </text>
        </g>
      </svg>

      {/* ── Type lockup ─────────────────────────────────────── */}
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
            color: BRASS,
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
            Astronomer
          </span>
        </div>

        <div
          style={{
            color: "#F4F4F6",
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 88,
            lineHeight: 0.94,
            letterSpacing: -1.6,
            fontStyle: "italic",
          }}
        >
          Walking
          <br />
          by starlight.
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
          With a brain the size of a rice grain,{" "}
          <span style={{ color: BRASS, fontWeight: 600 }}>
            Scarabaeus satyrus
          </span>{" "}
          climbs atop its dung ball, reads the diffuse glow of the Milky Way,
          and walks a dead-straight line by starlight — the first invertebrate
          shown to orient by our galaxy.
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
        <span>Dacke et al. · Current Biology 23:4 (2013)</span>
        <span>
          <span style={{ color: BRASS }}>●</span> Compass = Milky Way
        </span>
      </div>
    </AbsoluteFill>
  );
};
