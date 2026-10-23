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

// Palette — taken verbatim from the concept's visual brief
const CHAR = "#0E0905";
const BARK_SHADOW = "#5B2612";
const BARK = "#B35C2C";
const EMBER = "#F0B04A";
const EMBER_HOT = "#FFD67A";
const NEEDLE = "#3F4F23";
const ASH = "#E8DAB8";
const ASH_DIM = "#9A8E73";

// Trunk centerline / extents in page coords (1080 × 1350)
const TRUNK_CX = 870;
const TRUNK_TOP_Y = 110;
const TRUNK_BOTTOM_Y = 1230;
const TRUNK_TOP_HALF_W = 72;
const TRUNK_BASE_HALF_W = 135;

// Compute trunk half-width at a given y (tapered)
const trunkHalfW = (y: number) => {
  const t = (y - TRUNK_TOP_Y) / (TRUNK_BOTTOM_Y - TRUNK_TOP_Y);
  // slight bulge near base
  const bulge = Math.pow(t, 1.35);
  return TRUNK_TOP_HALF_W + (TRUNK_BASE_HALF_W - TRUNK_TOP_HALF_W) * bulge;
};

// Deterministic hash → [0,1) for seeded jitter
const hashSeed = (n: number): number => {
  let h = 2166136261 ^ Math.floor(n * 10000);
  h = Math.imul(h ^ (h >>> 13), 16777619);
  return ((h >>> 0) % 1000) / 1000;
};

// Vertical furrow definitions — relative offset from centerline (0..1)
// positive = right side of trunk
const FURROWS: { off: number; width: number; shade: string }[] = [
  { off: -0.78, width: 10, shade: BARK_SHADOW },
  { off: -0.58, width: 7, shade: "#3C190A" },
  { off: -0.42, width: 11, shade: BARK_SHADOW },
  { off: -0.22, width: 7, shade: "#3C190A" },
  { off: -0.05, width: 10, shade: BARK_SHADOW },
  { off: 0.14, width: 7, shade: "#3C190A" },
  { off: 0.32, width: 11, shade: BARK_SHADOW },
  { off: 0.52, width: 7, shade: "#3C190A" },
  { off: 0.72, width: 10, shade: BARK_SHADOW },
  // highlight accents
  { off: -0.3, width: 2, shade: "#D97A3D" },
  { off: 0.06, width: 2, shade: "#D97A3D" },
  { off: 0.42, width: 2, shade: "#D97A3D" },
];

// Fire scar (irregular dark cavity at the base of the trunk)
const FIRE_SCAR_CX = TRUNK_CX - 20;
const FIRE_SCAR_BASE_Y = 1210;
const FIRE_SCAR_PEAK_Y = 980;
const FIRE_SCAR_HALF_W = 110;
const FIRE_SCAR_POINTS = (() => {
  const pts: [number, number][] = [];
  const n = 12;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const y = FIRE_SCAR_BASE_Y - (FIRE_SCAR_BASE_Y - FIRE_SCAR_PEAK_Y) * t;
    const seed = hashSeed(i + 7);
    const w = FIRE_SCAR_HALF_W * (1 - Math.pow(t, 1.5)) + (seed - 0.5) * 12;
    pts.push([FIRE_SCAR_CX - w, y]);
  }
  for (let i = n; i >= 0; i--) {
    const t = i / n;
    const y = FIRE_SCAR_BASE_Y - (FIRE_SCAR_BASE_Y - FIRE_SCAR_PEAK_Y) * t;
    const seed = hashSeed(i + 23);
    const w = FIRE_SCAR_HALF_W * (1 - Math.pow(t, 1.5)) + (seed - 0.5) * 12;
    pts.push([FIRE_SCAR_CX + w, y]);
  }
  return pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
})();

// Cone sits in open negative space, left of the trunk
const CONE_CX = 505;
const CONE_CY = 940;

// Seeds fall from the opening cone
type Seed = { x0: number; y0: number; drift: number; delay: number; speed: number; r: number };
const SEEDS: Seed[] = Array.from({ length: 16 }, (_, i) => {
  const s = hashSeed(i + 101);
  const s2 = hashSeed(i + 211);
  return {
    x0: CONE_CX + (s - 0.5) * 56,
    y0: CONE_CY - 24 + s2 * 10,
    drift: (hashSeed(i + 311) - 0.5) * 110,
    delay: 0.15 + s * 0.9,
    speed: 95 + s2 * 70,
    r: 2.1 + s2 * 1.5,
  };
});

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // 5-sec loop
  const loop = frame / durationInFrames;

  // ── Title / role spring in ────────────────────────────────────────
  const roleSpring = spring({
    frame: frame - fps * 0.2,
    fps,
    config: { damping: 200, mass: 0.9 },
  });
  const titleSpring = spring({
    frame: frame - fps * 0.5,
    fps,
    config: { damping: 200, mass: 1.0 },
  });
  const hookOpacity = interpolate(frame, [fps * 1.0, fps * 1.9], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Trunk reveal: wipe downward via a clip rect ───────────────────
  const trunkRevealT = spring({
    frame: frame - fps * 0.0,
    fps,
    config: { damping: 220, mass: 1.4 },
  });
  const trunkRevealY = interpolate(trunkRevealT, [0, 1], [TRUNK_TOP_Y, TRUNK_BOTTOM_Y + 40]);

  // ── Ember pulse at the base ───────────────────────────────────────
  const emberPulse = 0.75 + 0.25 * Math.sin(loop * Math.PI * 2 * 2);
  const emberFlicker = 0.85 + 0.15 * Math.sin(frame * 0.4);

  // ── Glow wave travelling up the trunk (one pass per loop) ─────────
  // Starts after trunk reveal completes
  const waveStart = fps * 1.6;
  const waveEnd = durationInFrames - 2;
  const waveProgress = interpolate(frame, [waveStart, waveEnd], [0, 1], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const waveY = interpolate(waveProgress, [0, 1], [TRUNK_BOTTOM_Y - 40, TRUNK_TOP_Y + 30]);
  const waveOpacity =
    waveProgress < 0.05
      ? waveProgress / 0.05
      : waveProgress > 0.9
        ? Math.max(0, (1 - waveProgress) / 0.1)
        : 1;

  // ── Cone open ─────────────────────────────────────────────────────
  const coneT = spring({
    frame: frame - fps * 1.2,
    fps,
    config: { damping: 180, mass: 1.1 },
  });
  // Scales 0..1 → cone open amount
  const coneOpen = coneT;

  // Seed drift (per-seed timing)
  const seedPhase = (s: Seed) => {
    const startFrame = fps * s.delay + fps * 1.6;
    const dt = (frame - startFrame) / fps;
    if (dt < 0) return null;
    return dt;
  };

  // Technical callout fades
  const calloutOpacity = interpolate(frame, [fps * 1.4, fps * 2.2], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: CHAR, fontFamily: inter }}>
      <style>{fontCss}</style>

      {/* ── Top metadata band ────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          top: 56,
          left: 72,
          right: 72,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          color: ASH_DIM,
          fontFamily: inter,
          fontSize: 13,
          letterSpacing: 4.5,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Everyday Motivation · No. 003</span>
        <span style={{ color: EMBER }}>2026 · 10 · 23</span>
      </div>

      {/* ── Scene SVG (trunk, fire, cone, callouts) ──────────────── */}
      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          {/* Trunk vertical gradient (base = warmer, top = cooler) */}
          <linearGradient id="trunk-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8E4420" />
            <stop offset="0.45" stopColor={BARK} />
            <stop offset="1" stopColor="#C96B33" />
          </linearGradient>

          {/* Ember radial */}
          <radialGradient id="ember-rad" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor={EMBER_HOT} stopOpacity={0.9} />
            <stop offset="0.4" stopColor={EMBER} stopOpacity={0.6} />
            <stop offset="1" stopColor={EMBER} stopOpacity={0} />
          </radialGradient>

          {/* Soft fire scar interior gradient */}
          <radialGradient id="scar-rad" cx="55%" cy="90%" r="80%">
            <stop offset="0" stopColor={EMBER_HOT} stopOpacity={0.75} />
            <stop offset="0.35" stopColor="#D14F18" stopOpacity={0.4} />
            <stop offset="0.7" stopColor="#2A0E04" stopOpacity={0.9} />
            <stop offset="1" stopColor={CHAR} stopOpacity={1} />
          </radialGradient>

          {/* Rising glow-wave gradient */}
          <linearGradient id="wave-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={EMBER} stopOpacity={0} />
            <stop offset="0.5" stopColor={EMBER_HOT} stopOpacity={0.55} />
            <stop offset="1" stopColor={EMBER} stopOpacity={0} />
          </linearGradient>

          {/* Cone surface highlight gradient */}
          <linearGradient id="cone-highlight" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor={BARK_SHADOW} stopOpacity={1} />
            <stop offset="0.5" stopColor={BARK} stopOpacity={1} />
            <stop offset="1" stopColor="#7A2E12" stopOpacity={1} />
          </linearGradient>

          {/* Soft glow filter */}
          <filter id="soft-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="8" />
          </filter>
          <filter id="ember-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="18" />
          </filter>

          {/* Clip for trunk reveal (wipe down) */}
          <clipPath id="trunk-reveal">
            <rect x={0} y={0} width={1080} height={trunkRevealY} />
          </clipPath>

          {/* Clip to trunk silhouette for the glow-wave */}
          <clipPath id="trunk-silhouette">
            <path d={trunkPath()} />
          </clipPath>
        </defs>

        {/* ── Fine background grain of ash flecks ─────────────────── */}
        <g opacity={0.35}>
          {Array.from({ length: 42 }).map((_, i) => {
            const s = hashSeed(i + 991);
            const s2 = hashSeed(i + 1091);
            return (
              <circle
                key={`ash-${i}`}
                cx={60 + s * 960}
                cy={160 + s2 * 1080}
                r={0.7 + s2 * 0.9}
                fill={ASH}
                opacity={0.25 + s * 0.3}
              />
            );
          })}
        </g>

        {/* ── Trunk group (clipped for wipe-in reveal) ────────────── */}
        <g clipPath="url(#trunk-reveal)">
          {/* Silhouette */}
          <path d={trunkPath()} fill="url(#trunk-grad)" />

          {/* Vertical furrows */}
          <g clipPath="url(#trunk-silhouette)">
            {FURROWS.map((f, i) => (
              <path
                key={`furrow-${i}`}
                d={furrowPath(f.off)}
                stroke={f.shade}
                strokeWidth={f.width}
                fill="none"
                strokeLinecap="round"
                opacity={0.95}
              />
            ))}

            {/* Horizontal micro-cracks for texture */}
            {Array.from({ length: 36 }).map((_, i) => {
              const s = hashSeed(i + 401);
              const s2 = hashSeed(i + 507);
              const y = TRUNK_TOP_Y + 30 + s * (TRUNK_BOTTOM_Y - TRUNK_TOP_Y - 60);
              const hw = trunkHalfW(y);
              const x1 = TRUNK_CX - hw * (0.2 + s2 * 0.6);
              const x2 = x1 + (10 + s2 * 36);
              return (
                <line
                  key={`crack-${i}`}
                  x1={x1}
                  y1={y}
                  x2={x2}
                  y2={y + (s - 0.5) * 2}
                  stroke="#2E1309"
                  strokeOpacity={0.55}
                  strokeWidth={1}
                />
              );
            })}

            {/* Rising glow-wave band — tinted light moving up inside the trunk */}
            <rect
              x={TRUNK_CX - TRUNK_BASE_HALF_W - 20}
              y={waveY - 80}
              width={(TRUNK_BASE_HALF_W + 20) * 2}
              height={160}
              fill="url(#wave-grad)"
              opacity={waveOpacity * 0.9}
            />
          </g>

          {/* Trunk edge highlight (right side, sun-warmed) */}
          <path
            d={trunkRightEdge()}
            stroke={EMBER}
            strokeWidth={2.5}
            fill="none"
            strokeLinecap="round"
            opacity={0.35}
          />
          {/* Trunk edge shadow (left side) */}
          <path
            d={trunkLeftEdge()}
            stroke="#2A0F05"
            strokeWidth={3}
            fill="none"
            strokeLinecap="round"
            opacity={0.8}
          />

          {/* ── Fire scar (char cavity at the base) ──────────────── */}
          <g opacity={Math.min(1, Math.max(0, (frame - fps * 0.4) / (fps * 0.5)))}>
            <polygon
              points={FIRE_SCAR_POINTS}
              fill="url(#scar-rad)"
            />
            {/* bright ember heart glow */}
            <ellipse
              cx={FIRE_SCAR_CX - 6}
              cy={1150}
              rx={80 * emberPulse}
              ry={30 * emberPulse}
              fill={EMBER_HOT}
              opacity={0.75 * emberFlicker}
              filter="url(#ember-glow)"
            />
            <ellipse
              cx={FIRE_SCAR_CX - 6}
              cy={1145}
              rx={44 * emberPulse}
              ry={16 * emberPulse}
              fill="#FFE7A6"
              opacity={0.95 * emberFlicker}
            />
            <ellipse
              cx={FIRE_SCAR_CX - 6}
              cy={1140}
              rx={22 * emberPulse}
              ry={8 * emberPulse}
              fill="#FFFFFF"
              opacity={0.75}
            />
          </g>
        </g>

        {/* ── Ember glow halo radiating around the base (outside trunk) ── */}
        <g opacity={Math.min(1, Math.max(0, (frame - fps * 0.6) / (fps * 0.6)))}>
          <ellipse
            cx={FIRE_SCAR_CX}
            cy={1200}
            rx={360 * emberPulse}
            ry={135 * emberPulse}
            fill="url(#ember-rad)"
            opacity={0.7 * emberFlicker}
          />
          {/* Ground line hint */}
          <line
            x1={400}
            y1={1232}
            x2={1050}
            y2={1232}
            stroke={BARK_SHADOW}
            strokeOpacity={0.55}
            strokeWidth={1}
          />
          {/* Ember flecks drifting up */}
          {Array.from({ length: 16 }).map((_, i) => {
            const s = hashSeed(i + 1301);
            const s2 = hashSeed(i + 1403);
            const localT = ((frame + s * 300) % 150) / 150;
            const y = 1215 - localT * 260;
            const x = FIRE_SCAR_CX + (s2 - 0.5) * 260 + Math.sin(localT * Math.PI * 2 + s * 6) * 10;
            const r = 1.4 + s * 1.8;
            const opac = Math.sin(localT * Math.PI) * (0.7 + s2 * 0.3);
            return (
              <circle
                key={`flec-${i}`}
                cx={x}
                cy={y}
                r={r}
                fill={EMBER_HOT}
                opacity={opac}
              />
            );
          })}
        </g>

        {/* ── Cone (opening) — anchored in open space left of trunk ── */}
        <g
          transform={`translate(${CONE_CX}, ${CONE_CY}) scale(1.55)`}
          opacity={Math.min(1, Math.max(0, (frame - fps * 1.0) / (fps * 0.5)))}
        >
          <ConeOpening open={coneOpen} />
        </g>

        {/* ── Seeds falling ──────────────────────────────────────── */}
        {SEEDS.map((s, i) => {
          const dt = seedPhase(s);
          if (dt === null || dt > 4) return null;
          const y = s.y0 + dt * s.speed;
          const sway = Math.sin(dt * 2.4 + i) * 10;
          const x = s.x0 + sway + s.drift * Math.min(1, dt * 0.4);
          const rot = (dt * 180) % 360;
          const opac =
            dt < 0.1 ? dt * 10 : y > 1120 ? Math.max(0, 1 - (y - 1120) / 60) : 1;
          return (
            <g
              key={`seed-${i}`}
              transform={`translate(${x} ${y}) rotate(${rot})`}
              opacity={opac * 0.95}
            >
              <ellipse
                cx={0}
                cy={0}
                rx={s.r * 2.6}
                ry={s.r * 0.9}
                fill={EMBER}
                opacity={0.5}
              />
              <ellipse cx={0} cy={0} rx={s.r} ry={s.r * 0.65} fill={ASH} />
            </g>
          );
        })}

        {/* ── Field-notes callouts (right side, draftsman style) ─── */}
        <g
          opacity={calloutOpacity}
          fontFamily={inter}
          fill={ASH_DIM}
          fontSize={11}
          fontWeight={500}
          letterSpacing={3}
        >
          {/* Callout 1 — Bark thickness, pointing into upper trunk edge */}
          <g transform={`translate(790, 260)`}>
            <line x1={0} y1={0} x2={-70} y2={0} stroke={ASH_DIM} strokeWidth={1} />
            <circle cx={0} cy={0} r={2.4} fill={EMBER} />
            <text x={-78} y={-6} textAnchor="end" fill={ASH}>BARK</text>
            <text x={-78} y={14} textAnchor="end">≤ 60 CM · NO RESIN</text>
          </g>

          {/* Callout 2 — Cone sealed years, next to cone */}
          <g transform={`translate(${CONE_CX - 110}, ${CONE_CY - 20})`}>
            <line x1={0} y1={0} x2={-56} y2={0} stroke={ASH_DIM} strokeWidth={1} />
            <circle cx={0} cy={0} r={2.4} fill={EMBER} />
            <text x={-62} y={-6} textAnchor="end" fill={ASH}>SEALED</text>
            <text x={-62} y={14} textAnchor="end">≤ 20 YR</text>
          </g>

          {/* Callout 3 — Opens by heat, pointing into fire glow */}
          <g transform={`translate(760, 1150)`}>
            <line x1={0} y1={0} x2={-82} y2={0} stroke={ASH_DIM} strokeWidth={1} />
            <circle cx={0} cy={0} r={2.4} fill={EMBER} />
            <text x={-90} y={-6} textAnchor="end" fill={ASH}>OPENS BY HEAT</text>
            <text x={-90} y={14} textAnchor="end">≈ 50–60 °C</text>
          </g>
        </g>
      </svg>

      {/* ── Type lockup (left column) ────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 72,
          top: 180,
          width: 500,
        }}
      >
        {/* Role tag */}
        <div
          style={{
            opacity: roleSpring,
            transform: `translateY(${interpolate(roleSpring, [0, 1], [10, 0])}px)`,
            marginBottom: 32,
          }}
        >
          <div
            style={{
              color: EMBER,
              fontFamily: inter,
              fontSize: 13,
              letterSpacing: 6,
              textTransform: "uppercase",
              fontWeight: 600,
              display: "flex",
              alignItems: "baseline",
              gap: 12,
            }}
          >
            <span>Role</span>
            <span style={{ color: ASH_DIM }}>/</span>
            <span style={{ color: ASH, letterSpacing: 5 }}>Firefighter</span>
          </div>
          <div
            style={{
              marginTop: 10,
              height: 1,
              width: 72,
              backgroundColor: EMBER,
              opacity: 0.7,
            }}
          />
        </div>

        {/* Display title */}
        <div
          style={{
            opacity: titleSpring,
            transform: `translateY(${interpolate(titleSpring, [0, 1], [18, 0])}px)`,
          }}
        >
          <div
            style={{
              color: ASH,
              fontFamily: playfair,
              fontWeight: 500,
              fontStyle: "italic",
              fontSize: 86,
              lineHeight: 0.96,
              letterSpacing: -1.6,
            }}
          >
            The tree
            <br />
            that waits
            <br />
            for fire.
          </div>
        </div>

        {/* Latin name */}
        <div
          style={{
            marginTop: 36,
            opacity: hookOpacity,
            color: EMBER,
            fontFamily: playfair,
            fontStyle: "italic",
            fontSize: 20,
            letterSpacing: 0.4,
          }}
        >
          Sequoiadendron giganteum
        </div>

        {/* Hook paragraph */}
        <div
          style={{
            marginTop: 18,
            opacity: hookOpacity,
            color: "#D8CDB1",
            fontFamily: inter,
            fontSize: 18,
            lineHeight: 1.42,
            fontWeight: 400,
            maxWidth: 480,
          }}
        >
          Bark up to{" "}
          <span style={{ color: ASH, fontWeight: 600 }}>60 cm thick</span>,
          almost no resin, high in tannins — and cones sealed for up to{" "}
          <span style={{ color: ASH, fontWeight: 600 }}>twenty years</span>{" "}
          that open only when fire's heat dries the scales.
        </div>
      </div>

      {/* ── Footer ────────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 72,
          right: 72,
          bottom: 54,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          color: ASH_DIM,
          fontFamily: inter,
          fontSize: 11,
          letterSpacing: 3,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Harvey, Shellhammer &amp; Stecker · USFS PSW-GTR-44 (1980)</span>
        <span>
          <span style={{ color: EMBER }}>●</span> Serotiny
        </span>
      </div>
    </AbsoluteFill>
  );
};

/* ──────────────────────────────────────────────────────────────────────
   Trunk geometry helpers
   ────────────────────────────────────────────────────────────────────── */

function trunkPath(): string {
  // Build silhouette by stepping down the trunk
  const steps = 40;
  const left: [number, number][] = [];
  const right: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const y = TRUNK_TOP_Y + (i / steps) * (TRUNK_BOTTOM_Y - TRUNK_TOP_Y);
    const w = trunkHalfW(y);
    // slight natural wobble
    const wobble = Math.sin(i * 0.6) * 2 + (hashSeed(i + 55) - 0.5) * 3;
    left.push([TRUNK_CX - w + wobble, y]);
    right.push([TRUNK_CX + w - wobble, y]);
  }
  // Open flare at bottom
  const flareY = TRUNK_BOTTOM_Y;
  left.push([TRUNK_CX - TRUNK_BASE_HALF_W - 60, flareY + 20]);
  right.push([TRUNK_CX + TRUNK_BASE_HALF_W + 70, flareY + 20]);

  const pts = [
    ...left,
    ...right.slice().reverse(),
  ]
    .map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(" ");

  return pts + " Z";
}

function trunkLeftEdge(): string {
  const steps = 30;
  const pts: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const y = TRUNK_TOP_Y + (i / steps) * (TRUNK_BOTTOM_Y - TRUNK_TOP_Y);
    const w = trunkHalfW(y);
    const wobble = Math.sin(i * 0.6) * 2 + (hashSeed(i + 55) - 0.5) * 3;
    const x = TRUNK_CX - w + wobble;
    pts.push(`${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  return pts.join(" ");
}

function trunkRightEdge(): string {
  const steps = 30;
  const pts: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const y = TRUNK_TOP_Y + (i / steps) * (TRUNK_BOTTOM_Y - TRUNK_TOP_Y);
    const w = trunkHalfW(y);
    const wobble = Math.sin(i * 0.6) * 2 + (hashSeed(i + 55) - 0.5) * 3;
    const x = TRUNK_CX + w - wobble;
    pts.push(`${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  return pts.join(" ");
}

// A furrow is a vertical curve at offset `off` × trunkHalfW(y)
function furrowPath(off: number): string {
  const steps = 24;
  const pts: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const y = TRUNK_TOP_Y + (i / steps) * (TRUNK_BOTTOM_Y - TRUNK_TOP_Y);
    const w = trunkHalfW(y);
    const wobble = Math.sin(i * 0.9 + off * 4) * 4;
    const x = TRUNK_CX + off * w + wobble;
    pts.push(`${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  return pts.join(" ");
}

/* ──────────────────────────────────────────────────────────────────────
   Cone subcomponent — simple serotinous cone that eases open
   ────────────────────────────────────────────────────────────────────── */

const ConeOpening: React.FC<{ open: number }> = ({ open }) => {
  // Cone silhouette (egg-shaped, pointed up, ~50 × 80 px)
  const CONE_H = 80;
  const CONE_W = 46;
  const APEX_Y = -CONE_H / 2;
  const BASE_Y = CONE_H / 2;

  // Cone silhouette path — teardrop (pointy top)
  const silhouette = (() => {
    const steps = 20;
    const left: string[] = [];
    const right: string[] = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const y = APEX_Y + t * CONE_H;
      // profile: 0 at top → peaks ~0.75 near middle-bottom
      const profile = Math.sin(Math.pow(t, 0.9) * Math.PI);
      const w = (CONE_W / 2) * profile;
      left.push(`${(-w).toFixed(1)} ${y.toFixed(1)}`);
      right.push(`${w.toFixed(1)} ${y.toFixed(1)}`);
    }
    return (
      "M " + left[0] + " " + left.slice(1).map((p) => "L " + p).join(" ") + " " +
      right.slice().reverse().map((p) => "L " + p).join(" ") + " Z"
    );
  })();

  // Scale rows: each row is a horizontal band of 5 scales, slightly offset
  const rowCount = 6;
  const scalesPerRow = 5;
  const scales: { cx: number; cy: number; rowT: number; col: number }[] = [];
  for (let r = 0; r < rowCount; r++) {
    const rowT = r / (rowCount - 1); // 0 at top → 1 at base
    const y = APEX_Y + 6 + rowT * (CONE_H - 10);
    const profile = Math.sin(Math.pow(rowT, 0.9) * Math.PI);
    const halfW = (CONE_W / 2) * profile - 2;
    const offset = r % 2 === 0 ? 0 : halfW / scalesPerRow;
    for (let c = 0; c < scalesPerRow; c++) {
      const cx = -halfW + ((c + 0.5) / scalesPerRow) * (halfW * 2) + offset;
      if (Math.abs(cx) > halfW + 0.5) continue;
      scales.push({ cx, cy: y, rowT, col: c });
    }
  }

  return (
    <g>
      {/* Soft ground shadow */}
      <ellipse cx={2} cy={BASE_Y + 10} rx={30} ry={6} fill={CHAR} opacity={0.6} />

      {/* Cone silhouette fill */}
      <path d={silhouette} fill={BARK_SHADOW} />
      {/* Subtle vertical highlight */}
      <path d={silhouette} fill="url(#cone-highlight)" opacity={0.8} />

      {/* Scales (petal shapes) */}
      {scales.map((s, i) => {
        // Top scales open visibly; bottom scales stay closed
        const openAmt = Math.max(0, 1 - s.rowT * 1.1) * open;
        const dir = s.cx === 0 ? (i % 2 === 0 ? 1 : -1) : Math.sign(s.cx);
        const rot = openAmt * 65 * dir + (s.cx < 0 ? -4 : 4);
        const dx = openAmt * 8 * dir;
        const dy = openAmt * -6 - 1;
        const scW = 11;
        const scH = 7;
        const seed = hashSeed(i + 73);
        return (
          <g
            key={`sc-${i}`}
            transform={`translate(${s.cx + dx} ${s.cy + dy}) rotate(${rot})`}
          >
            {/* Petal/scale: wedge shape pointing outward */}
            <path
              d={`M ${-scW / 2} 0 Q 0 ${-scH * 0.9} ${scW / 2} 0 Q 0 ${scH * 0.4} ${-scW / 2} 0 Z`}
              fill={BARK}
              stroke={BARK_SHADOW}
              strokeWidth={0.7}
            />
            {/* Scale tip highlight */}
            <path
              d={`M ${-scW / 2 + 2} ${-1} Q 0 ${-scH * 0.6} ${scW / 2 - 2} ${-1}`}
              stroke="#E8893E"
              strokeWidth={0.8}
              fill="none"
              opacity={0.55 + seed * 0.25}
            />
          </g>
        );
      })}

      {/* Peduncle (stalk at base) */}
      <line
        x1={0}
        y1={BASE_Y - 2}
        x2={0}
        y2={BASE_Y + 6}
        stroke={BARK_SHADOW}
        strokeWidth={1.5}
      />
    </g>
  );
};
