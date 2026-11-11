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

// ── Palette (from the concept's visual brief) ───────────────────────────
const PLASMA = "#FFF3B0"; // lightning core
const GLASS = "#F8B64C"; // molten silica / fulgurite glow
const SAND = "#C9A26B"; // surface sand
const SKY = "#2B1C3D"; // stormy sky indigo
const DEEP = "#0E0A18"; // subsoil / night
const GRAY = "#8A8192"; // calibrated off-tone

// ── Lightning polyline (SVG coords 0..1080 × 0..1350) ────────────────────
// The bolt enters from the upper right and lands on the sand horizon at
// x=540, y=760. The diagonal keeps the title area clear.
const BOLT: Array<[number, number]> = [
  [820, 170],
  [788, 215],
  [824, 265],
  [782, 320],
  [818, 355],
  [760, 400],
  [728, 445],
  [762, 480],
  [702, 525],
  [672, 570],
  [702, 605],
  [640, 640],
  [608, 682],
  [572, 715],
  [552, 740],
  [540, 760],
];

// Short lightning forks branching off the main bolt.
const FORKS: Array<Array<[number, number]>> = [
  [[818, 265], [860, 300], [878, 345]],
  [[782, 320], [740, 330], [708, 320]],
  [[728, 445], [688, 462], [660, 470]],
  [[672, 570], [708, 600], [720, 638]],
  [[608, 682], [582, 705]],
];

// ── Fulgurite tree (below ground, grows from strike point 540,760) ───────
// A branching tube — each node has (x, y, delay 0..1 along the grow span).
type FulNode = {
  id: string;
  x: number;
  y: number;
  parent: string | null;
  w: number;
  t0: number; // normalised start time
};

const FUL: FulNode[] = [
  { id: "r", x: 540, y: 760, parent: null, w: 12, t0: 0.0 },
  { id: "a", x: 536, y: 820, parent: "r", w: 11, t0: 0.02 },
  { id: "b", x: 548, y: 890, parent: "a", w: 10, t0: 0.08 },
  // left arm
  { id: "L1", x: 505, y: 925, parent: "b", w: 8, t0: 0.18 },
  { id: "L2", x: 455, y: 975, parent: "L1", w: 7, t0: 0.28 },
  { id: "L3", x: 410, y: 1035, parent: "L2", w: 6, t0: 0.38 },
  { id: "L4", x: 380, y: 1090, parent: "L3", w: 5, t0: 0.5 },
  { id: "L4b", x: 345, y: 1130, parent: "L4", w: 4, t0: 0.6 },
  { id: "L2a", x: 430, y: 1005, parent: "L2", w: 5, t0: 0.42 },
  { id: "L2b", x: 400, y: 1050, parent: "L2a", w: 4, t0: 0.55 },

  // central trunk
  { id: "C1", x: 548, y: 960, parent: "b", w: 9, t0: 0.16 },
  { id: "C2", x: 560, y: 1035, parent: "C1", w: 8, t0: 0.27 },
  { id: "C3", x: 552, y: 1100, parent: "C2", w: 7, t0: 0.4 },
  { id: "C4", x: 568, y: 1170, parent: "C3", w: 5, t0: 0.55 },

  // right arm
  { id: "R1", x: 605, y: 935, parent: "b", w: 8, t0: 0.2 },
  { id: "R2", x: 660, y: 985, parent: "R1", w: 7, t0: 0.3 },
  { id: "R3", x: 715, y: 1030, parent: "R2", w: 6, t0: 0.42 },
  { id: "R4", x: 760, y: 1095, parent: "R3", w: 5, t0: 0.55 },
  { id: "R4b", x: 790, y: 1145, parent: "R4", w: 4, t0: 0.66 },
  { id: "R2a", x: 690, y: 1020, parent: "R2", w: 5, t0: 0.45 },
];

// ── Deterministic "grains" of sand (positions precomputed) ──────────────
const rand = (seed: number) => {
  // Mulberry32
  let t = (seed + 0x6D2B79F5) | 0;
  return () => {
    t = (t + 0x6D2B79F5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};

const SAND_GRAINS = (() => {
  const rng = rand(42);
  const out: Array<{ x: number; y: number; r: number; o: number }> = [];
  for (let i = 0; i < 180; i++) {
    out.push({
      x: 60 + rng() * 960,
      y: 762 + rng() * 32,
      r: 0.8 + rng() * 1.6,
      o: 0.35 + rng() * 0.5,
    });
  }
  return out;
})();

// Horizon stratum lines beneath the sand (define geological layers).
const STRATA: Array<{ y: number; stroke: string; o: number; dash?: string }> = [
  { y: 830, stroke: SAND, o: 0.22 },
  { y: 905, stroke: SAND, o: 0.14, dash: "3 10" },
  { y: 1000, stroke: SAND, o: 0.1, dash: "3 14" },
  { y: 1090, stroke: SAND, o: 0.08, dash: "2 18" },
];

// ── Bolt rendering helpers ──────────────────────────────────────────────
const pointsToPath = (pts: Array<[number, number]>): string =>
  pts.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x} ${y}`).join(" ");

const parentOf = (id: string) => FUL.find((n) => n.id === id) ?? null;

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // ── Timing ──────────────────────────────────────────────────────────
  // 0.00 – 0.40 s  title/role fade in
  // 0.80 – 1.20 s  bolt strikes
  // 1.10 – 2.90 s  fulgurite grows (branch-by-branch)
  // 2.30 – 3.10 s  hook fades in
  // 3.00 – loop    warm glass pulse
  const titleSpring = spring({
    frame: frame - fps * 0.1,
    fps,
    config: { damping: 200, mass: 0.8 },
  });

  const flashAnchor = fps * 0.9;
  const flash = interpolate(
    frame,
    [flashAnchor - 2, flashAnchor, flashAnchor + 6, flashAnchor + 18],
    [0, 1, 0.6, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Bolt draws top-to-bottom quickly, then persists as a dim afterglow.
  const boltDrawn = interpolate(frame, [fps * 0.7, fps * 1.1], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const boltFade = interpolate(frame, [fps * 1.2, fps * 2.0], [1, 0.62], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const growSpan = fps * 1.8;
  const growAnchor = fps * 1.1;
  const gT = Math.max(0, Math.min(1, (frame - growAnchor) / growSpan));

  const hookOpacity = interpolate(frame, [fps * 2.3, fps * 3.1], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Slow pulse along the glass (sinusoid once it exists).
  const pulsePhase = ((frame - fps * 2.5) / (fps * 4)) % 1;
  const pulseAlpha =
    frame > fps * 2.5
      ? 0.45 + 0.35 * Math.sin(pulsePhase * Math.PI * 2)
      : 0.45;

  // Impact shake ground slightly on bolt landing.
  const shakeFrame = frame - flashAnchor;
  const shakeAmp = shakeFrame >= 0 && shakeFrame < 10 ? (10 - shakeFrame) * 0.3 : 0;
  const shakeY = Math.sin(shakeFrame * 2.1) * shakeAmp;

  // Frame-end clamp so a still render past the duration still reads.
  const _unused = durationInFrames;
  void _unused;

  // Full bolt polyline length (for dash animation).
  const boltLen = (() => {
    let s = 0;
    for (let i = 1; i < BOLT.length; i++) {
      s += Math.hypot(BOLT[i][0] - BOLT[i - 1][0], BOLT[i][1] - BOLT[i - 1][1]);
    }
    return s;
  })();

  // Fulgurite segment visibility: each branch grows from its parent point.
  const segments = FUL.filter((n) => n.parent).map((n) => {
    const p = parentOf(n.parent!)!;
    const segLen = Math.hypot(n.x - p.x, n.y - p.y);
    const localT = Math.max(0, Math.min(1, (gT - n.t0) / 0.12));
    const eased = 1 - Math.pow(1 - localT, 3);
    return { n, p, segLen, dashOffset: segLen * (1 - eased), alpha: eased };
  });

  return (
    <AbsoluteFill style={{ backgroundColor: DEEP, fontFamily: inter }}>
      <style>{fontCss}</style>

      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={DEEP} />
            <stop offset="50%" stopColor={SKY} />
            <stop offset="100%" stopColor="#3C2A4F" />
          </linearGradient>

          <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1A1120" />
            <stop offset="30%" stopColor="#120E1C" />
            <stop offset="100%" stopColor={DEEP} />
          </linearGradient>

          <linearGradient id="sand-band" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#D8B57C" />
            <stop offset="100%" stopColor="#8E6A3C" />
          </linearGradient>

          <radialGradient id="strike-flash" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={PLASMA} stopOpacity={0.9} />
            <stop offset="55%" stopColor={PLASMA} stopOpacity={0.25} />
            <stop offset="100%" stopColor={PLASMA} stopOpacity={0} />
          </radialGradient>

          <radialGradient id="aerial-flash" cx="50%" cy="60%" r="60%">
            <stop offset="0%" stopColor={PLASMA} stopOpacity={0.35} />
            <stop offset="100%" stopColor={PLASMA} stopOpacity={0} />
          </radialGradient>

          <radialGradient id="glass-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={GLASS} stopOpacity={0.8} />
            <stop offset="100%" stopColor={GLASS} stopOpacity={0} />
          </radialGradient>

          <filter id="bolt-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="glass-blur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="5" />
          </filter>

          <clipPath id="sky-clip">
            <rect x={0} y={0} width={1080} height={760} />
          </clipPath>

          <clipPath id="ground-clip">
            <rect x={0} y={760} width={1080} height={590} />
          </clipPath>
        </defs>

        {/* ── Sky ──────────────────────────────────────────────── */}
        <rect x={0} y={0} width={1080} height={760} fill="url(#sky)" />

        {/* Aerial flash */}
        <g clipPath="url(#sky-clip)" opacity={flash * 0.9}>
          <rect
            x={0}
            y={0}
            width={1080}
            height={760}
            fill="url(#aerial-flash)"
          />
        </g>

        {/* Faint cloud strata in the sky */}
        {[
          { y: 300, o: 0.08 },
          { y: 380, o: 0.06 },
          { y: 470, o: 0.05 },
          { y: 580, o: 0.045 },
          { y: 660, o: 0.05 },
        ].map((c, i) => (
          <rect
            key={`cloud-${i}`}
            x={0}
            y={c.y}
            width={1080}
            height={2}
            fill={SAND}
            opacity={c.o}
          />
        ))}

        {/* Measurement ticks on the right edge of the sky (reads like a weather chart) */}
        <g
          stroke={GRAY}
          strokeWidth={1}
          fontFamily={inter}
          fontSize={9}
          letterSpacing={2}
          fill={GRAY}
          opacity={0.45}
        >
          {[200, 320, 440, 560, 680].map((y, i) => (
            <g key={i}>
              <line x1={1000} y1={y} x2={1012} y2={y} />
              <text x={1020} y={y + 3} fontWeight={500}>
                {["200 M", "500 M", "1 KM", "2 KM", "4 KM"][i]}
              </text>
            </g>
          ))}
        </g>

        {/* ── Ground ────────────────────────────────────────────── */}
        <g transform={`translate(0, ${shakeY})`}>
          <rect
            x={0}
            y={760}
            width={1080}
            height={590}
            fill="url(#ground)"
          />

          {/* Top sand band (the surface stratum, ~30 px thick) */}
          <rect
            x={0}
            y={760}
            width={1080}
            height={34}
            fill="url(#sand-band)"
            opacity={0.95}
          />

          {/* Strata lines */}
          {STRATA.map((s, i) => (
            <line
              key={`str-${i}`}
              x1={60}
              y1={s.y}
              x2={1020}
              y2={s.y}
              stroke={s.stroke}
              strokeOpacity={s.o}
              strokeWidth={1}
              strokeDasharray={s.dash}
            />
          ))}

          {/* Sand grains */}
          <g clipPath="url(#ground-clip)">
            {SAND_GRAINS.map((g, i) => (
              <circle
                key={`sand-${i}`}
                cx={g.x}
                cy={g.y}
                r={g.r}
                fill={SAND}
                opacity={g.o}
              />
            ))}
          </g>

          {/* ── Fulgurite ───────────────────────────────────────── */}
          <g>
            {/* Outer glow halo pass */}
            {segments.map(({ n, p, segLen, dashOffset, alpha }, i) => (
              <line
                key={`glow-${i}`}
                x1={p.x}
                y1={p.y}
                x2={n.x}
                y2={n.y}
                stroke={GLASS}
                strokeOpacity={0.3 * alpha * pulseAlpha}
                strokeWidth={n.w + 10}
                strokeLinecap="round"
                filter="url(#glass-blur)"
                strokeDasharray={segLen}
                strokeDashoffset={dashOffset}
              />
            ))}
            {/* Walls of the tube (dark edge) */}
            {segments.map(({ n, p, segLen, dashOffset, alpha }, i) => (
              <line
                key={`wall-${i}`}
                x1={p.x}
                y1={p.y}
                x2={n.x}
                y2={n.y}
                stroke="#1F1327"
                strokeOpacity={0.9 * alpha}
                strokeWidth={n.w + 3}
                strokeLinecap="round"
                strokeDasharray={segLen}
                strokeDashoffset={dashOffset}
              />
            ))}
            {/* Molten silica core */}
            {segments.map(({ n, p, segLen, dashOffset, alpha }, i) => (
              <line
                key={`core-${i}`}
                x1={p.x}
                y1={p.y}
                x2={n.x}
                y2={n.y}
                stroke={GLASS}
                strokeOpacity={0.95 * alpha}
                strokeWidth={n.w}
                strokeLinecap="round"
                strokeDasharray={segLen}
                strokeDashoffset={dashOffset}
              />
            ))}
            {/* Hot centreline */}
            {segments.map(({ n, p, segLen, dashOffset, alpha }, i) => (
              <line
                key={`hot-${i}`}
                x1={p.x}
                y1={p.y}
                x2={n.x}
                y2={n.y}
                stroke={PLASMA}
                strokeOpacity={0.9 * alpha * pulseAlpha}
                strokeWidth={Math.max(1, n.w * 0.35)}
                strokeLinecap="round"
                strokeDasharray={segLen}
                strokeDashoffset={dashOffset}
              />
            ))}
            {/* Terminal "droplets" of molten glass at each growing tip */}
            {FUL.filter((n) => n.parent).map((n) => {
              const localT = Math.max(0, Math.min(1, (gT - n.t0) / 0.12));
              if (localT < 0.6) return null;
              const a = (localT - 0.6) / 0.4;
              return (
                <circle
                  key={`tip-${n.id}`}
                  cx={n.x}
                  cy={n.y}
                  r={n.w * 0.9}
                  fill="url(#glass-glow)"
                  opacity={0.9 * a}
                />
              );
            })}
          </g>
        </g>

        {/* ── Lightning bolt (above ground) ─────────────────────── */}
        <g filter="url(#bolt-glow)">
          {/* Forks — drawn under the main trunk, fainter */}
          {FORKS.map((f, i) => {
            let s = 0;
            for (let k = 1; k < f.length; k++) {
              s += Math.hypot(f[k][0] - f[k - 1][0], f[k][1] - f[k - 1][1]);
            }
            const lt = Math.max(0, Math.min(1, (boltDrawn - 0.4) * 2));
            return (
              <path
                key={`fork-${i}`}
                d={pointsToPath(f)}
                fill="none"
                stroke={PLASMA}
                strokeWidth={3}
                strokeOpacity={0.75 * lt * boltFade}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={s}
                strokeDashoffset={s * (1 - lt)}
              />
            );
          })}

          {/* Soft halo */}
          <path
            d={pointsToPath(BOLT)}
            fill="none"
            stroke={PLASMA}
            strokeOpacity={0.25 * boltFade}
            strokeWidth={14}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={boltLen}
            strokeDashoffset={boltLen * (1 - boltDrawn)}
          />
          {/* Core */}
          <path
            d={pointsToPath(BOLT)}
            fill="none"
            stroke="#FFFFFF"
            strokeOpacity={boltFade}
            strokeWidth={4}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={boltLen}
            strokeDashoffset={boltLen * (1 - boltDrawn)}
          />
          {/* Inner hot line */}
          <path
            d={pointsToPath(BOLT)}
            fill="none"
            stroke={PLASMA}
            strokeOpacity={0.9 * boltFade}
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={boltLen}
            strokeDashoffset={boltLen * (1 - boltDrawn)}
          />
        </g>

        {/* Strike flash on the sand */}
        <g opacity={flash}>
          <circle cx={540} cy={762} r={240} fill="url(#strike-flash)" />
          <circle cx={540} cy={762} r={60} fill={PLASMA} opacity={0.9} />
        </g>

        {/* ── Horizon line / annotation row ─────────────────────── */}
        <g
          fontFamily={inter}
          fontSize={10}
          letterSpacing={3}
          fontWeight={500}
          fill={GRAY}
        >
          <line
            x1={60}
            y1={760}
            x2={1020}
            y2={760}
            stroke={SAND}
            strokeOpacity={0.55}
            strokeWidth={1}
          />
          <text x={60} y={753} opacity={0.75}>
            GROUND LEVEL · 0 M
          </text>
          <text
            x={1020}
            y={753}
            opacity={0.75}
            textAnchor="end"
          >
            T = 0 S · ~30,000 K
          </text>
        </g>

        {/* Depth ticks on the left (geological cross-section labels) */}
        <g
          fontFamily={inter}
          fontSize={9}
          letterSpacing={2}
          fontWeight={500}
          fill={GRAY}
          opacity={0.55}
        >
          {[
            { y: 830, l: "0.3 M" },
            { y: 905, l: "0.8 M" },
            { y: 1000, l: "1.4 M" },
            { y: 1090, l: "2.0 M" },
          ].map((d, i) => (
            <g key={`dp-${i}`}>
              <line
                x1={48}
                y1={d.y}
                x2={60}
                y2={d.y}
                stroke={GRAY}
                strokeOpacity={0.6}
                strokeWidth={1}
              />
              <text x={44} y={d.y + 3} textAnchor="end">
                {d.l}
              </text>
            </g>
          ))}
        </g>

        {/* Pointer labelling the fulgurite */}
        <g
          opacity={interpolate(frame, [fps * 1.8, fps * 2.4], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })}
        >
          <line
            x1={865}
            y1={960}
            x2={795}
            y2={970}
            stroke={GLASS}
            strokeWidth={1.2}
          />
          <line
            x1={865}
            y1={960}
            x2={990}
            y2={960}
            stroke={GLASS}
            strokeWidth={1.2}
          />
          <text
            x={990}
            y={952}
            textAnchor="end"
            fill={GLASS}
            fontFamily={inter}
            fontSize={11}
            fontWeight={600}
            letterSpacing={3.5}
          >
            FULGURITE
          </text>
          <text
            x={990}
            y={972}
            textAnchor="end"
            fill={GRAY}
            fontFamily={inter}
            fontSize={10}
            fontWeight={500}
            letterSpacing={2.6}
          >
            LECHATELIERITE · SiO₂
          </text>
        </g>
      </svg>

      {/* ── Top metadata band (over the SVG) ─────────────────────── */}
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
        <span style={{ color: GLASS }}>2026 · 11 · 11</span>
      </div>

      {/* ── Type lockup ─────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 110,
          opacity: titleSpring,
          transform: `translateY(${interpolate(
            titleSpring,
            [0, 1],
            [14, 0]
          )}px)`,
        }}
      >
        <div
          style={{
            color: GLASS,
            fontFamily: inter,
            fontSize: 13,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 14,
            fontWeight: 600,
          }}
        >
          Role <span style={{ color: GRAY, margin: "0 4px" }}>/</span>
          <span style={{ color: "#EDEDEF", letterSpacing: 5 }}>
            Glassblower
          </span>
        </div>

        <div
          style={{
            color: "#F4F4F6",
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 86,
            lineHeight: 0.96,
            letterSpacing: -1.4,
            fontStyle: "italic",
            textShadow: `0 2px 24px rgba(0,0,0,0.35)`,
          }}
        >
          The sky&apos;s
          <br />
          glassblower.
        </div>
      </div>

      {/* ── Hook block ──────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          bottom: 110,
          opacity: hookOpacity,
        }}
      >
        <div
          style={{
            color: "#DADAE0",
            fontFamily: inter,
            fontSize: 19,
            lineHeight: 1.45,
            fontWeight: 400,
            maxWidth: 880,
          }}
        >
          A cloud-to-ground strike reaches about{" "}
          <span style={{ color: PLASMA, fontWeight: 600 }}>30,000 K</span> —
          five times the Sun&apos;s surface — and vitrifies the sand it passes
          through, leaving a hollow, branching tube of{" "}
          <span style={{ color: GLASS, fontWeight: 600 }}>
            lechatelierite
          </span>{" "}
          that traces the exact path of the current. A complete glass object,
          cast by the sky in milliseconds.
        </div>
      </div>

      {/* ── Footer ──────────────────────────────────────────────── */}
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
        <span>Pasek &amp; Block · J. Geophys. Res. 114 · D20202 (2009)</span>
        <span>
          <span style={{ color: GLASS }}>●</span> Sand = SiO₂
        </span>
      </div>
    </AbsoluteFill>
  );
};
