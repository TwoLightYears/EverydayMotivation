import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
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

// ── Palette (from the concept's visual brief) ──────────────────────────
const INK = "#0A0806";
const INK_SOFT = "#120E0A";
const SULFUR = "#F2D23A";
const MAGMA = "#F08A1F";
const EJECTA = "#CA3617";
const SCORCH = "#5A4028";
const ASH = "#B9ACA0";
const JUPITER_BAND_1 = "#C9A074";
const JUPITER_BAND_2 = "#8E6744";
const JUPITER_BAND_3 = "#E8CDA5";
const JUPITER_SHADOW = "#4A3523";

// ── Deterministic PRNG ─────────────────────────────────────────────────
const mulberry32 = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// ── Pre-compute Io surface features ────────────────────────────────────
type Blotch = {
  cx: number;
  cy: number;
  r: number;
  color: string;
  opacity: number;
};
type Hotspot = {
  cx: number;
  cy: number;
  r: number;
  name: string;
};

const IO_CX = 500;
const IO_CY = 510;
const IO_R = 290;

// A seeded sampler that avoids a given exclusion disc (so continents don't
// pile on top of named volcanic hotspots).
const sampleOnDisc = (
  rand: () => number,
  maxR: number,
  exclude: Array<{ cx: number; cy: number; r: number }>,
  tries = 20,
) => {
  for (let t = 0; t < tries; t++) {
    const u = rand();
    const v = rand();
    const theta = 2 * Math.PI * u;
    const rho = Math.sqrt(v) * maxR;
    const cx = IO_CX + rho * Math.cos(theta);
    const cy = IO_CY + rho * Math.sin(theta);
    let ok = true;
    for (const e of exclude) {
      const dx = cx - e.cx;
      const dy = cy - e.cy;
      if (Math.hypot(dx, dy) < e.r) {
        ok = false;
        break;
      }
    }
    if (ok) return { cx, cy };
  }
  const u = rand();
  const v = rand();
  const theta = 2 * Math.PI * u;
  const rho = Math.sqrt(v) * maxR;
  return {
    cx: IO_CX + rho * Math.cos(theta),
    cy: IO_CY + rho * Math.sin(theta),
  };
};

const BLOTCHES: Blotch[] = (() => {
  const rand = mulberry32(42);
  const out: Blotch[] = [];
  // Hotspot zones (defined just below) must stay clear of overpainting.
  const protect = [
    { cx: 500 - 100, cy: 510 + 40, r: 55 },
    { cx: 500 + 60, cy: 510 - 110, r: 50 },
    { cx: 500 + 150, cy: 510 + 120, r: 50 },
  ];

  // Dark basaltic continents — larger, with higher contrast, giving the
  // surface its "sulfur plain" vs "silicate plateau" look. These are
  // the backbone of the mottled read.
  for (let i = 0; i < 8; i++) {
    const p = sampleOnDisc(rand, IO_R - 45, protect);
    out.push({
      cx: p.cx,
      cy: p.cy,
      r: 42 + rand() * 60,
      color: "#3D2A18",
      opacity: 0.42 + rand() * 0.22,
    });
  }
  // Reddish-ochre regions
  for (let i = 0; i < 14; i++) {
    const p = sampleOnDisc(rand, IO_R - 25, protect);
    out.push({
      cx: p.cx,
      cy: p.cy,
      r: 28 + rand() * 42,
      color: "#B55A24",
      opacity: 0.28 + rand() * 0.18,
    });
  }
  // Warm sulfur-magma washes
  for (let i = 0; i < 18; i++) {
    const p = sampleOnDisc(rand, IO_R - 20, []);
    const palette = [SULFUR, MAGMA, "#F7E069", "#D97F2A", "#B55A24"];
    out.push({
      cx: p.cx,
      cy: p.cy,
      r: 36 + rand() * 50,
      color: palette[Math.floor(rand() * palette.length)],
      opacity: 0.18 + rand() * 0.16,
    });
  }
  // Small sharper plateau rims (lightly darker ring edges to add detail)
  for (let i = 0; i < 20; i++) {
    const p = sampleOnDisc(rand, IO_R - 40, protect);
    out.push({
      cx: p.cx,
      cy: p.cy,
      r: 14 + rand() * 24,
      color: "#5C3A1E",
      opacity: 0.3 + rand() * 0.18,
    });
  }
  // Small bright sulfur highlights (crystalline sulfur flows)
  for (let i = 0; i < 24; i++) {
    const p = sampleOnDisc(rand, IO_R - 25, []);
    out.push({
      cx: p.cx,
      cy: p.cy,
      r: 7 + rand() * 15,
      color: "#F9E89A",
      opacity: 0.22 + rand() * 0.2,
    });
  }
  // Tiny dark pock-marks (small paterae / calderas)
  for (let i = 0; i < 30; i++) {
    const p = sampleOnDisc(rand, IO_R - 30, []);
    out.push({
      cx: p.cx,
      cy: p.cy,
      r: 2 + rand() * 5,
      color: "#2A1A0A",
      opacity: 0.6 + rand() * 0.3,
    });
  }
  return out;
})();

// Named volcanoes placed at plausible-looking positions on the disc
const HOTSPOTS: Hotspot[] = [
  { cx: IO_CX - 100, cy: IO_CY + 40, r: 14, name: "PELE" },
  { cx: IO_CX + 60, cy: IO_CY - 110, r: 10, name: "LOKI" },
  { cx: IO_CX + 150, cy: IO_CY + 120, r: 9, name: "PROMETHEUS" },
];

export const IoBlacksmith: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // ── Tidal pulse: slow spring-eased breathing, 4s cycle ───────────────
  const cycle = fps * 4;
  // phase: 0 → 1 → 0 using triangle wave then eased
  const triPhase = Math.abs((frame % cycle) / cycle - 0.5) * 2; // 0..1..0
  const breathe = 1 - Math.pow(1 - triPhase, 2); // ease-out

  // On first-pulse-only animation: caliper number tick 0 → 100
  const introT = Math.min(1, frame / (fps * 1.6));
  const introEase = 1 - Math.pow(1 - introT, 3);
  const bulgeNumber = Math.round(introEase * 100);

  // Spring for title entrance
  const titleSpring = spring({
    frame: frame - fps * 0.5,
    fps,
    config: { damping: 200, mass: 0.9 },
  });
  const hookOpacity = interpolate(
    frame,
    [fps * 1.1, fps * 2.0],
    [0, 1],
    {
      easing: Easing.out(Easing.cubic),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  // Ambient small vertical squeeze — subtle, max ~1.5% y-scale
  const squeezeY = 1 + 0.012 * breathe;
  const squeezeX = 1 - 0.006 * breathe;

  const plumeIntensity = 0.6 + 0.4 * breathe;
  const hotIntensity = 0.55 + 0.45 * breathe;

  // Stress field strokes between Jupiter and Io brighten with pulse
  const fieldOpacity = 0.14 + 0.22 * breathe;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: INK,
        fontFamily: inter,
        color: ASH,
      }}
    >
      <style>{fontCss}</style>

      {/* ── Top metadata band ───────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          top: 56,
          left: 80,
          right: 100,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          color: ASH,
          fontSize: 13,
          letterSpacing: 4.5,
          textTransform: "uppercase",
          fontWeight: 500,
          zIndex: 3,
        }}
      >
        <span>Everyday Motivation · No. 003</span>
        <span style={{ color: SULFUR }}>2026 · 10 · 15</span>
      </div>

      {/* ── Hero stage ──────────────────────────────────────────────── */}
      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          {/* Jupiter's gradient — banded limb cropped at right edge */}
          <linearGradient id="jupiter-band" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={JUPITER_SHADOW} />
            <stop offset="10%" stopColor={JUPITER_BAND_2} />
            <stop offset="22%" stopColor={JUPITER_BAND_1} />
            <stop offset="34%" stopColor={JUPITER_BAND_3} />
            <stop offset="48%" stopColor={JUPITER_BAND_1} />
            <stop offset="58%" stopColor={JUPITER_BAND_2} />
            <stop offset="72%" stopColor={JUPITER_BAND_3} />
            <stop offset="86%" stopColor={JUPITER_BAND_2} />
            <stop offset="100%" stopColor={JUPITER_SHADOW} />
          </linearGradient>
          <radialGradient id="jupiter-shade" cx="20%" cy="50%" r="90%">
            <stop offset="0%" stopColor="rgba(0,0,0,0)" />
            <stop offset="70%" stopColor="rgba(0,0,0,0)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.55)" />
          </radialGradient>

          {/* Io body — base warm sulfur with limb darkening */}
          <radialGradient id="io-body" cx="42%" cy="38%" r="68%">
            <stop offset="0%" stopColor="#FBE26D" />
            <stop offset="55%" stopColor={SULFUR} />
            <stop offset="85%" stopColor={MAGMA} />
            <stop offset="100%" stopColor={SCORCH} />
          </radialGradient>

          {/* Hotspot flare */}
          <radialGradient id="hot-flare" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity={1} />
            <stop offset="22%" stopColor={EJECTA} stopOpacity={0.95} />
            <stop offset="70%" stopColor={EJECTA} stopOpacity={0.25} />
            <stop offset="100%" stopColor={EJECTA} stopOpacity={0} />
          </radialGradient>

          {/* Plume vertical gradient */}
          <linearGradient id="plume-fade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={EJECTA} stopOpacity={0} />
            <stop offset="60%" stopColor={EJECTA} stopOpacity={0.5} />
            <stop offset="100%" stopColor="#FFEDC2" stopOpacity={0.9} />
          </linearGradient>

          {/* Scene vignette */}
          <radialGradient id="scene-vignette" cx="50%" cy="50%" r="80%">
            <stop offset="60%" stopColor={INK} stopOpacity={0} />
            <stop offset="100%" stopColor="#000000" stopOpacity={0.75} />
          </radialGradient>

          {/* Clip for Io disc */}
          <clipPath id="io-clip">
            <ellipse
              cx={IO_CX}
              cy={IO_CY}
              rx={IO_R * squeezeX}
              ry={IO_R * squeezeY}
            />
          </clipPath>

          {/* Soft glow filter */}
          <filter id="soft-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
          <filter id="strong-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="14" />
          </filter>
        </defs>

        {/* ── Deep scene vignette ───────────────────────────────────── */}
        <rect x={0} y={0} width={1080} height={1350} fill="url(#scene-vignette)" />

        {/* ── Starfield (sparse, procedural) ────────────────────────── */}
        <g fill={ASH}>
          {(() => {
            const r = mulberry32(7);
            const stars = [];
            for (let i = 0; i < 70; i++) {
              const x = r() * 1080;
              const y = r() * 920;
              const s = 0.4 + r() * 1.3;
              const o = 0.15 + r() * 0.5;
              // skip stars that fall inside Io disc or Jupiter zone
              const dxIo = x - IO_CX;
              const dyIo = y - IO_CY;
              if (dxIo * dxIo + dyIo * dyIo < (IO_R + 20) * (IO_R + 20))
                continue;
              if (x > 1040) continue;
              stars.push(
                <circle key={i} cx={x} cy={y} r={s} opacity={o} />,
              );
            }
            return stars;
          })()}
        </g>

        {/* ── Jupiter: huge limb cropped at the right edge ─────────── */}
        {/* Jupiter centre far off-frame right; we show only a slim left limb,
            kept well below the metadata band and short of the frame edge. */}
        <g>
          <defs>
            <clipPath id="jupiter-clip">
              {/* Big circle centred off-frame so only a thin crescent remains inside */}
              <circle cx={2400} cy={530} r={1500} />
            </clipPath>
          </defs>
          <g clipPath="url(#jupiter-clip)">
            {/* Only show Jupiter from y=180 downward, so it never collides with
                the top metadata (which sits around y=56). Right edge sits at
                x=1056 so the frame margin (right 80px → text ends ~1000) is clear. */}
            <rect
              x={900}
              y={180}
              width={160}
              height={720}
              fill="url(#jupiter-band)"
            />
            <rect
              x={900}
              y={180}
              width={160}
              height={720}
              fill="url(#jupiter-shade)"
            />
            {/* a few swirl strokes to suggest bands */}
            <g stroke={JUPITER_SHADOW} strokeOpacity={0.35} fill="none">
              <path d="M 900 280 Q 980 272 1060 290" strokeWidth={1.2} />
              <path d="M 900 380 Q 980 370 1060 392" strokeWidth={1.2} />
              <path d="M 900 490 Q 980 480 1060 500" strokeWidth={1.2} />
              <path d="M 900 610 Q 980 598 1060 618" strokeWidth={1.2} />
              <path d="M 900 720 Q 980 710 1060 732" strokeWidth={1.2} />
              <path d="M 900 820 Q 980 812 1060 836" strokeWidth={1.2} />
            </g>
            {/* soft terminator shading on inner (left) limb */}
            <rect
              x={900}
              y={180}
              width={34}
              height={720}
              fill="rgba(0,0,0,0.45)"
            />
          </g>
          {/* annotate: JUPITER tag just below where the limb emerges */}
          <g
            fill={ASH}
            opacity={0.78}
            fontFamily={inter}
            fontSize={11}
            letterSpacing={4}
            fontWeight={500}
          >
            <line
              x1={858}
              y1={212}
              x2={898}
              y2={212}
              stroke={ASH}
              strokeOpacity={0.6}
              strokeWidth={1}
            />
            <text x={852} y={216} textAnchor="end">
              JUPITER
            </text>
          </g>
        </g>

        {/* ── Stress / gravity field between Jupiter and Io ─────────── */}
        <g
          stroke={EJECTA}
          fill="none"
          opacity={fieldOpacity * 1.6}
        >
          {Array.from({ length: 9 }).map((_, i) => {
            const spread = 240;
            const y = IO_CY - spread / 2 + (i / 8) * spread;
            const curveX1 = IO_CX + IO_R - 10;
            const curveX2 = 900;
            // sag outward (toward Io) — field lines bulging into Io
            const sagMid = 10 + Math.abs(i - 4) * 6;
            return (
              <path
                key={i}
                d={`M ${curveX1} ${y + sagMid} Q ${(curveX1 + curveX2) / 2} ${y - sagMid * 0.6} ${curveX2} ${y + sagMid}`}
                strokeDasharray="3 6"
                strokeWidth={1.1}
              />
            );
          })}
          {/* two solid lead-arrows to show the direction of pull */}
          {[0, 1].map((i) => {
            const y = IO_CY - 50 + i * 100;
            return (
              <g key={`arr-${i}`}>
                <line
                  x1={IO_CX + IO_R + 20}
                  y1={y}
                  x2={885}
                  y2={y}
                  stroke={MAGMA}
                  strokeWidth={1.4}
                  strokeOpacity={0.75}
                />
                <polygon
                  points={`${IO_CX + IO_R + 22},${y - 6} ${IO_CX + IO_R + 22},${y + 6} ${IO_CX + IO_R + 10},${y}`}
                  fill={MAGMA}
                  opacity={0.9}
                />
              </g>
            );
          })}
          {/* tiny caption on the field — right-aligned so it never
              overlaps Io's limb */}
          <text
            x={893}
            y={IO_CY - 155}
            textAnchor="end"
            fill={MAGMA}
            fontFamily={inter}
            fontSize={10}
            letterSpacing={3.5}
            fontWeight={600}
            opacity={0.95}
          >
            TIDAL PULL →
          </text>
        </g>

        {/* ── Io body ───────────────────────────────────────────────── */}
        <g>
          {/* outer glow halo */}
          <ellipse
            cx={IO_CX}
            cy={IO_CY}
            rx={IO_R * squeezeX + 40}
            ry={IO_R * squeezeY + 40}
            fill={MAGMA}
            opacity={0.1 + 0.08 * breathe}
            filter="url(#strong-glow)"
          />

          {/* disc */}
          <ellipse
            cx={IO_CX}
            cy={IO_CY}
            rx={IO_R * squeezeX}
            ry={IO_R * squeezeY}
            fill="url(#io-body)"
          />

          {/* surface features clipped to disc */}
          <g clipPath="url(#io-clip)">
            {BLOTCHES.map((b, i) => (
              <circle
                key={i}
                cx={b.cx}
                cy={b.cy}
                r={b.r}
                fill={b.color}
                opacity={b.opacity}
              />
            ))}

            {/* limb-darkening overlay */}
            <ellipse
              cx={IO_CX}
              cy={IO_CY}
              rx={IO_R * squeezeX}
              ry={IO_R * squeezeY}
              fill="url(#io-body)"
              opacity={0.15}
              style={{ mixBlendMode: "multiply" as const }}
            />
            <radialGradient id="shade" cx="68%" cy="70%" r="60%">
              <stop offset="0%" stopColor="rgba(0,0,0,0.6)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0)" />
            </radialGradient>
            <ellipse
              cx={IO_CX}
              cy={IO_CY}
              rx={IO_R * squeezeX}
              ry={IO_R * squeezeY}
              fill="url(#shade)"
            />
          </g>

          {/* hotspots — bigger, with dark caldera ring + bright core */}
          {HOTSPOTS.map((h, i) => (
            <g key={h.name}>
              {/* outer soft heat halo */}
              <circle
                cx={h.cx}
                cy={h.cy}
                r={h.r * 4.2}
                fill="url(#hot-flare)"
                opacity={hotIntensity * 0.9}
                filter="url(#strong-glow)"
              />
              {/* dark caldera ring */}
              <circle
                cx={h.cx}
                cy={h.cy}
                r={h.r * 1.9}
                fill="#1A0D04"
                opacity={0.85}
              />
              {/* molten rim */}
              <circle
                cx={h.cx}
                cy={h.cy}
                r={h.r * 1.4}
                fill={EJECTA}
                opacity={0.95}
              />
              {/* hot core */}
              <circle
                cx={h.cx}
                cy={h.cy}
                r={h.r * 0.6}
                fill="#FFF2A8"
                opacity={1}
              />
              {/* bright center */}
              <circle
                cx={h.cx}
                cy={h.cy}
                r={h.r * 0.25}
                fill="#FFFFFF"
                opacity={1}
              />
            </g>
          ))}

          {/* ── Pele plume (upper limb) — the umbrella signature ──── */}
          {(() => {
            // Angle chosen so the umbrella top stays well below the top
            // metadata band (which lives at y ≈ 56..90).
            const theta = (Math.PI * 220) / 180; // ~8 o'clock (upper-left)
            const px = IO_CX + IO_R * squeezeX * Math.cos(theta);
            const py = IO_CY + IO_R * squeezeY * Math.sin(theta);
            // Outward (radial) direction at that point
            const rxDir = Math.cos(theta);
            const ryDir = Math.sin(theta);
            const H = 118 + 18 * breathe; // plume rise distance
            const W = 180; // umbrella full width
            const stemHalfW = 15;

            const stemAx = px - ryDir * stemHalfW;
            const stemAy = py + rxDir * stemHalfW;
            const stemBx = px + ryDir * stemHalfW;
            const stemBy = py - rxDir * stemHalfW;

            const topCx = px + rxDir * H;
            const topCy = py + ryDir * H;
            const leftEdgeX = topCx - ryDir * (W / 2);
            const leftEdgeY = topCy + rxDir * (W / 2);
            const rightEdgeX = topCx + ryDir * (W / 2);
            const rightEdgeY = topCy - rxDir * (W / 2);
            const peakX = topCx + rxDir * 50;
            const peakY = topCy + ryDir * 50;

            // Umbrella path: stem on disc → outward along the two sides → dome at top
            const path = `
              M ${stemAx} ${stemAy}
              C ${stemAx + rxDir * H * 0.45 - ryDir * 10} ${stemAy + ryDir * H * 0.45 + rxDir * 10},
                ${leftEdgeX + rxDir * -30} ${leftEdgeY + ryDir * -30},
                ${leftEdgeX} ${leftEdgeY}
              Q ${peakX} ${peakY} ${rightEdgeX} ${rightEdgeY}
              C ${rightEdgeX + rxDir * -30} ${rightEdgeY + ryDir * -30},
                ${stemBx + rxDir * H * 0.45 + ryDir * 10} ${stemBy + ryDir * H * 0.45 - rxDir * 10},
                ${stemBx} ${stemBy}
              Z
            `;
            return (
              <g opacity={plumeIntensity}>
                {/* soft outer halo */}
                <path
                  d={path}
                  fill={MAGMA}
                  opacity={0.35}
                  filter="url(#strong-glow)"
                />
                {/* body */}
                <path d={path} fill="url(#plume-fade)" />
                {/* bright crown */}
                <ellipse
                  cx={topCx}
                  cy={topCy}
                  rx={W * 0.42}
                  ry={28}
                  fill="#FFE8B0"
                  opacity={0.75}
                  filter="url(#soft-glow)"
                />
                {/* vent core at base */}
                <circle cx={px} cy={py} r={10} fill="#FFFFFF" opacity={0.95} />
                <circle cx={px} cy={py} r={22} fill={EJECTA} opacity={0.55} filter="url(#soft-glow)" />
                {/* annotation — placed in the empty space to the LEFT of
                    the plume, hugging the outer dark margin so it never
                    collides with Io's disc or the metadata band. */}
                <line
                  x1={topCx - 55}
                  y1={topCy - 10}
                  x2={70}
                  y2={160}
                  stroke={ASH}
                  strokeOpacity={0.55}
                  strokeWidth={1}
                />
                <text
                  x={60}
                  y={156}
                  textAnchor="start"
                  fill={ASH}
                  opacity={0.95}
                  fontFamily={inter}
                  fontSize={11}
                  letterSpacing={3.2}
                  fontWeight={600}
                >
                  PELE PLUME
                </text>
                <text
                  x={60}
                  y={173}
                  textAnchor="start"
                  fill={SULFUR}
                  opacity={0.9}
                  fontFamily={inter}
                  fontSize={10}
                  letterSpacing={3}
                  fontWeight={500}
                >
                  ≈ 300 KM TALL
                </text>
              </g>
            );
          })()}
        </g>

        {/* ── Tidal caliper annotation across Io's belly ────────────── */}
        {(() => {
          const y = IO_CY + IO_R * squeezeY + 42;
          const left = IO_CX - IO_R * squeezeX;
          const right = IO_CX + IO_R * squeezeX;
          const mid = (left + right) / 2;
          const tickH = 10;
          const introO = Math.min(1, frame / (fps * 0.6));
          return (
            <g opacity={introO} fontFamily={inter}>
              {/* leaders from limb edges down to caliper */}
              <line
                x1={left}
                y1={IO_CY}
                x2={left}
                y2={y}
                stroke={ASH}
                strokeOpacity={0.35}
                strokeDasharray="2 4"
              />
              <line
                x1={right}
                y1={IO_CY}
                x2={right}
                y2={y}
                stroke={ASH}
                strokeOpacity={0.35}
                strokeDasharray="2 4"
              />
              {/* horizontal rule */}
              <line
                x1={left}
                y1={y}
                x2={right}
                y2={y}
                stroke={ASH}
                strokeWidth={1.2}
              />
              {/* end ticks */}
              <line
                x1={left}
                y1={y - tickH}
                x2={left}
                y2={y + tickH}
                stroke={ASH}
                strokeWidth={1.2}
              />
              <line
                x1={right}
                y1={y - tickH}
                x2={right}
                y2={y + tickH}
                stroke={ASH}
                strokeWidth={1.2}
              />
              {/* arrowheads pointing inward (tidal squeeze) */}
              <polygon
                points={`${left + 20},${y - 6} ${left + 20},${y + 6} ${left + 8},${y}`}
                fill={SULFUR}
              />
              <polygon
                points={`${right - 20},${y - 6} ${right - 20},${y + 6} ${right - 8},${y}`}
                fill={SULFUR}
              />
              {/* value */}
              <text
                x={mid}
                y={y + 32}
                textAnchor="middle"
                fill={SULFUR}
                fontSize={22}
                fontWeight={600}
                letterSpacing={4}
              >
                {`±${bulgeNumber} M`}
              </text>
              <text
                x={mid}
                y={y + 56}
                textAnchor="middle"
                fill={ASH}
                fontSize={11}
                letterSpacing={4}
                fontWeight={500}
                opacity={0.8}
              >
                TIDAL DEFORMATION
              </text>
            </g>
          );
        })()}

        {/* ── Hotspot labels — anchored OUTSIDE the disc on leaders ── */}
        {(() => {
          type LabelAnchor = {
            name: string;
            hx: number;
            hy: number;
            lx: number;
            ly: number;
            anchor: "start" | "end";
          };
          // Pele is already annotated by its plume above; LOKI + PROMETHEUS get
          // leaders out to the perimeter.
          const anchors: LabelAnchor[] = [
            {
              name: "LOKI PATERA",
              hx: HOTSPOTS[1].cx,
              hy: HOTSPOTS[1].cy,
              lx: 830,
              ly: 310,
              anchor: "end",
            },
            {
              name: "PROMETHEUS",
              hx: HOTSPOTS[2].cx,
              hy: HOTSPOTS[2].cy,
              lx: 830,
              ly: 760,
              anchor: "end",
            },
          ];
          const introO = Math.min(
            1,
            Math.max(0, (frame - fps * 1.1) / (fps * 0.8)),
          );
          return anchors.map((a) => {
            const bendX = (a.hx + a.lx) / 2;
            const bendY = a.ly;
            const underlineY = a.ly + 4;
            const underlineX1 =
              a.anchor === "start" ? a.lx : a.lx - 110;
            const underlineX2 =
              a.anchor === "start" ? a.lx + 110 : a.lx;
            return (
              <g key={`lbl-${a.name}`} opacity={introO * 0.95}>
                {/* leader: dot at hotspot → bend → endpoint */}
                <polyline
                  points={`${a.hx},${a.hy} ${bendX},${a.hy} ${a.lx},${bendY}`}
                  stroke={ASH}
                  strokeOpacity={0.55}
                  strokeWidth={0.9}
                  fill="none"
                />
                <circle
                  cx={a.hx}
                  cy={a.hy}
                  r={2.2}
                  fill={EJECTA}
                  opacity={0.95}
                />
                <text
                  x={a.lx}
                  y={a.ly - 2}
                  textAnchor={a.anchor}
                  fill={ASH}
                  fontFamily={inter}
                  fontSize={11}
                  letterSpacing={3.2}
                  fontWeight={600}
                  opacity={0.95}
                >
                  {a.name}
                </text>
                <line
                  x1={underlineX1}
                  y1={underlineY}
                  x2={underlineX2}
                  y2={underlineY}
                  stroke={SULFUR}
                  strokeOpacity={0.6}
                  strokeWidth={1}
                />
              </g>
            );
          });
        })()}

        {/* ── Horizontal rule separating stage from type ───────────── */}
        <line
          x1={80}
          y1={916}
          x2={1000}
          y2={916}
          stroke={SCORCH}
          strokeOpacity={0.9}
          strokeWidth={1}
        />
        <line
          x1={80}
          y1={916}
          x2={160}
          y2={916}
          stroke={SULFUR}
          strokeWidth={2}
        />
      </svg>

      {/* ── Type lockup ─────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 948,
          opacity: titleSpring,
          transform: `translateY(${interpolate(titleSpring, [0, 1], [16, 0])}px)`,
        }}
      >
        <div
          style={{
            color: SULFUR,
            fontSize: 13,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 16,
            fontWeight: 600,
          }}
        >
          Role <span style={{ color: ASH, opacity: 0.55, margin: "0 6px" }}>/</span>
          <span style={{ color: "#F4ECE2", letterSpacing: 5 }}>Blacksmith</span>
        </div>

        <div
          style={{
            color: "#F6ECD9",
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 86,
            lineHeight: 0.94,
            letterSpacing: -1.6,
            fontStyle: "italic",
          }}
        >
          The forge
          <br />
          Jupiter made.
        </div>

        <div
          style={{
            marginTop: 28,
            color: "#D8CFC2",
            fontSize: 19,
            lineHeight: 1.42,
            fontWeight: 400,
            maxWidth: 880,
            opacity: hookOpacity,
          }}
        >
          Caught in a 4:2:1 resonance with Europa and Ganymede,{" "}
          <span style={{ color: SULFUR, fontWeight: 600 }}>Io</span> never
          falls into a circular orbit — so Jupiter's gravity flexes its solid
          crust by up to{" "}
          <span style={{ color: MAGMA, fontWeight: 600 }}>~100 meters</span>,
          dumping on the order of 100 TW as heat and powering more than 400
          active volcanoes. A world hammered molten by a bigger body.
        </div>
      </div>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          bottom: 50,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          color: ASH,
          fontSize: 11,
          letterSpacing: 3,
          textTransform: "uppercase",
          fontWeight: 500,
          opacity: 0.85,
        }}
      >
        <span>Peale, Cassen &amp; Reynolds · Science 203 (1979)</span>
        <span>
          <span style={{ color: EJECTA }}>●</span> Hot vent &nbsp;
          <span style={{ color: SULFUR }}>●</span> Sulfur plain
        </span>
      </div>

      {/* keep lint happy about durationInFrames + INK_SOFT if unused */}
      <div style={{ display: "none" }}>{durationInFrames}{INK_SOFT}</div>
    </AbsoluteFill>
  );
};
