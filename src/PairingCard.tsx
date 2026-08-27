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
const INK = "#040914";
const SKY_TOP = "#0E1A33";
const SKY_MID = "#0A1224";
const HORIZON = "#050B18";
const AURORA_GREEN = "#3AF0A6";
const AURORA_CORE = "#D8FFEC";
const AURORA_MAG = "#FF4E86";
const AURORA_VIOLET = "#8A7BFF";
const GRAY = "#8991A5";
const GRAY_DIM = "#4A5164";
const GRID = "#141C30";
const GRID_MAJOR = "#1E2942";
const RULE = "#2A3350";

// Sky panel geometry (in the parent 1080×1350 space)
const PANEL = { x: 60, y: 116, w: 960, h: 680 };

// Altitude scale: y = f(km).  100 km sits at the horizon, 400 km near the top.
const KM_MIN = 80;
const KM_MAX = 420;
const HORIZON_Y = PANEL.y + PANEL.h - 68; // horizon strip
const SKY_TOP_Y = PANEL.y + 30;
const kmToY = (km: number) =>
  interpolate(km, [KM_MIN, KM_MAX], [HORIZON_Y, SKY_TOP_Y], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

// ── Aurora modelled as vertical rays, packed into a few "curtain" clusters.
type Cluster = {
  cx: number;      // horizontal center at horizon
  spread: number;  // total half-width of the cluster
  count: number;   // number of rays
  hMeanKm: number; // mean top altitude
  hVarKm: number;
  arcAmp: number;  // how much the cluster's tops arc
  sway: number;    // horizontal sway amplitude
  phase: number;
  intensity: number;
};

const CLUSTERS: Cluster[] = [
  { cx: 260, spread: 78,  count: 12, hMeanKm: 315, hVarKm: 55, arcAmp: 22, sway: 6, phase: 0.4, intensity: 0.85 },
  { cx: 505, spread: 118, count: 18, hMeanKm: 380, hVarKm: 70, arcAmp: 32, sway: 8, phase: 1.6, intensity: 1.00 },
  { cx: 800, spread: 88,  count: 14, hMeanKm: 340, hVarKm: 55, arcAmp: 24, sway: 5, phase: 2.9, intensity: 0.90 },
];

// Deterministic 0..1 for a seed
const R = (seed: number) => {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

type Ray = {
  cid: number;      // cluster index
  u: number;        // -1..1 position within cluster (rank)
  x0: number;       // horizon x
  topKm: number;
  width: number;
  intensity: number;
  tilt: number;      // horizontal offset at top vs. bottom (curtain lean)
  twinklePhase: number;
};

const RAYS: Ray[] = (() => {
  const out: Ray[] = [];
  CLUSTERS.forEach((cl, ci) => {
    for (let i = 0; i < cl.count; i++) {
      const u = (i + 0.5) / cl.count * 2 - 1; // -1..1
      // Concentrate rays near the middle of a cluster (fold densest at center)
      const density = Math.sign(u) * Math.pow(Math.abs(u), 1.2);
      const seed = ci * 137 + i * 7 + 3;
      const jitter = (R(seed) - 0.5) * 6;
      const x0 = cl.cx + density * cl.spread + jitter;
      // Top arcs: peak in middle, lower on edges — plus jagged variation
      // so the upper edge doesn't read as an equaliser bar-chart.
      const arc = (1 - Math.pow(Math.abs(u), 1.4)) * cl.arcAmp;
      const bigNoise = (R(seed + 1) - 0.5) * cl.hVarKm;
      const smallNoise = Math.sin(seed * 0.71) * 22 + Math.sin(seed * 2.17) * 14;
      const topKm = cl.hMeanKm + arc * 0.55 + bigNoise + smallNoise * 0.6;
      const width = 3.2 + R(seed + 2) * 5.4;
      const intensity =
        cl.intensity *
        (0.55 + 0.45 * (1 - Math.pow(Math.abs(u), 1.4))) *
        (0.82 + R(seed + 3) * 0.28);
      // Curtain lean: tops fan outward from cluster center (like a folded sheet).
      const tilt = Math.sign(u) * (4 + R(seed + 5) * 10) + (R(seed + 6) - 0.5) * 4;
      out.push({
        cid: ci,
        u,
        x0,
        topKm: Math.max(210, Math.min(420, topKm)),
        width,
        intensity,
        tilt,
        twinklePhase: R(seed + 4) * Math.PI * 2,
      });
    }
  });
  return out;
})();

// Deterministic pseudo-random for star positions
const rand = (seed: number) => {
  let x = Math.sin(seed * 9301.311 + 49297.7) * 233280.317;
  return x - Math.floor(x);
};

type Star = { x: number; y: number; r: number; a: number };
const STARS: Star[] = Array.from({ length: 90 }, (_, i) => ({
  x: PANEL.x + 8 + rand(i * 2 + 1) * (PANEL.w - 16),
  y: PANEL.y + 8 + rand(i * 2 + 3) * (PANEL.h - 200),
  r: 0.5 + rand(i * 2 + 5) * 1.4,
  a: 0.25 + rand(i * 2 + 7) * 0.65,
}));

// Spectral lines the aurora actually emits.  Wavelength in nm; species-tagged.
type Line = {
  nm: number;
  height: number; // 0..1 relative peak
  color: string;
  label: string;
  species: string;
  primary?: boolean;
};
const LINES: Line[] = [
  { nm: 391.4, height: 0.18, color: AURORA_VIOLET, label: "391.4", species: "N₂⁺" },
  { nm: 427.8, height: 0.30, color: AURORA_VIOLET, label: "427.8", species: "N₂⁺" },
  { nm: 557.7, height: 1.00, color: AURORA_GREEN,  label: "557.7", species: "O ¹S→¹D", primary: true },
  { nm: 630.0, height: 0.58, color: AURORA_MAG,    label: "630.0", species: "O ¹D→³P" },
  { nm: 636.4, height: 0.20, color: AURORA_MAG,    label: "636.4", species: "O ¹D→³P" },
];

// Spectrum panel geometry
const SPEC = { x: 60, y: 830, w: 960, h: 140 };
const NM_MIN = 380;
const NM_MAX = 700;
const nmToX = (nm: number) =>
  interpolate(nm, [NM_MIN, NM_MAX], [SPEC.x + 100, SPEC.x + SPEC.w - 24]);

// A single ray → path (thin filament wedge, leaning slightly, with a soft top).
// Ray base sits at HORIZON_Y-ish; top at kmToY(topKm). Sway shifts the whole
// ray, and each ray has its own lean so the curtain fans out from its center.
const rayPath = (r: Ray, sway: number) => {
  const yBot = HORIZON_Y + 4;
  const yTop = kmToY(r.topKm);
  const dxBot = r.x0 + sway;
  const dxTop = dxBot + r.tilt + sway * 0.5;
  const wBot = r.width * 0.9;
  const wTop = r.width * 0.34;
  return `M ${dxBot - wBot} ${yBot} L ${dxTop - wTop} ${yTop} L ${dxTop + wTop} ${yTop} L ${dxBot + wBot} ${yBot} Z`;
};

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ── Rise of the curtains (spring-eased) ─────────────────────────────
  const rise = spring({
    frame: frame - fps * 0.15,
    fps,
    config: { damping: 22, mass: 1.1, stiffness: 60 },
  });

  // ── Type block reveal ───────────────────────────────────────────────
  const titleSpring = spring({
    frame: frame - fps * 0.55,
    fps,
    config: { damping: 200, mass: 0.8 },
  });
  const hookOpacity = interpolate(frame, [fps * 1.15, fps * 2.05], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Spectrum "tune-in" — flat noise floor rises into sharp spikes ──
  const tune = spring({
    frame: frame - fps * 0.9,
    fps,
    config: { damping: 24, mass: 0.9, stiffness: 55 },
  });

  // Slow shimmer intensity (breathing)
  const shimmer = 0.92 + 0.08 * Math.sin((frame / fps) * 2 * Math.PI * 0.3);

  return (
    <AbsoluteFill style={{ backgroundColor: INK, fontFamily: inter }}>
      <style>{fontCss}</style>

      {/* ── Top metadata band ─────────────────────────────────────── */}
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
        <span style={{ color: AURORA_GREEN }}>2026 · 08 · 27</span>
      </div>

      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          {/* ── Sky background gradient ─────────────────────────── */}
          <linearGradient id="sky" x1="0" y1={PANEL.y} x2="0" y2={PANEL.y + PANEL.h} gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={SKY_TOP} />
            <stop offset="55%" stopColor={SKY_MID} />
            <stop offset="88%" stopColor={HORIZON} />
            <stop offset="100%" stopColor={INK} />
          </linearGradient>

          {/* Faint grid inside sky panel */}
          <pattern
            id="grid"
            x={PANEL.x}
            y={PANEL.y}
            width={48}
            height={48}
            patternUnits="userSpaceOnUse"
          >
            <path d={`M 48 0 L 0 0 0 48`} fill="none" stroke={GRID} strokeWidth={1} />
          </pattern>
          <pattern
            id="grid-major"
            x={PANEL.x}
            y={PANEL.y}
            width={192}
            height={192}
            patternUnits="userSpaceOnUse"
          >
            <path d={`M 192 0 L 0 0 0 192`} fill="none" stroke={GRID_MAJOR} strokeWidth={1} />
          </pattern>

          {/* Ray body gradient — a shared vertical gradient in user space so all rays
              share consistent altitude-based color banding: transparent at horizon
              (behind emissive floor), bright green in the mid-thermosphere, magenta
              at the top, fading to transparent. */}
          <linearGradient
            id="ray-body"
            x1="0" y1={HORIZON_Y + 4} x2="0" y2={kmToY(400)}
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor={AURORA_GREEN} stopOpacity={0} />
            <stop offset="7%" stopColor={AURORA_GREEN} stopOpacity={0.98} />
            <stop offset="24%" stopColor={AURORA_GREEN} stopOpacity={0.94} />
            <stop offset="46%" stopColor={AURORA_GREEN} stopOpacity={0.72} />
            <stop offset="62%" stopColor={AURORA_MAG} stopOpacity={0.48} />
            <stop offset="82%" stopColor={AURORA_MAG} stopOpacity={0.22} />
            <stop offset="100%" stopColor={AURORA_MAG} stopOpacity={0} />
          </linearGradient>
          <linearGradient
            id="ray-core"
            x1="0" y1={HORIZON_Y + 4} x2="0" y2={kmToY(400)}
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor={AURORA_CORE} stopOpacity={0} />
            <stop offset="9%" stopColor={AURORA_CORE} stopOpacity={0.9} />
            <stop offset="26%" stopColor={AURORA_CORE} stopOpacity={0.45} />
            <stop offset="55%" stopColor={AURORA_CORE} stopOpacity={0} />
          </linearGradient>

          {/* Horizon glow — the bright emissive band sitting on the 100 km line */}
          <linearGradient id="floor-glow" x1="0" y1={HORIZON_Y - 46} x2="0" y2={HORIZON_Y + 24} gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={AURORA_GREEN} stopOpacity={0} />
            <stop offset="72%" stopColor={AURORA_GREEN} stopOpacity={0.42} />
            <stop offset="100%" stopColor={AURORA_GREEN} stopOpacity={0} />
          </linearGradient>

          {/* Blurs for outer halo layers */}
          <filter id="aurora-blur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
          <filter id="aurora-blur-strong" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="14" />
          </filter>
          <filter id="aurora-blur-soft" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" />
          </filter>

          {/* Spectrum-line glow */}
          <filter id="line-glow" x="-40%" y="-20%" width="180%" height="140%">
            <feGaussianBlur stdDeviation="1.6" />
          </filter>
        </defs>

        {/* ── Sky panel ────────────────────────────────────────── */}
        <rect x={PANEL.x} y={PANEL.y} width={PANEL.w} height={PANEL.h} fill="url(#sky)" />
        <rect x={PANEL.x} y={PANEL.y} width={PANEL.w} height={PANEL.h} fill="url(#grid)" />
        <rect x={PANEL.x} y={PANEL.y} width={PANEL.w} height={PANEL.h} fill="url(#grid-major)" />

        {/* Thin panel border */}
        <rect
          x={PANEL.x + 0.5}
          y={PANEL.y + 0.5}
          width={PANEL.w - 1}
          height={PANEL.h - 1}
          fill="none"
          stroke={RULE}
          strokeWidth={1}
        />

        {/* Corner crop marks */}
        {(
          [
            [PANEL.x, PANEL.y, 1, 1],
            [PANEL.x + PANEL.w, PANEL.y, -1, 1],
            [PANEL.x, PANEL.y + PANEL.h, 1, -1],
            [PANEL.x + PANEL.w, PANEL.y + PANEL.h, -1, -1],
          ] as const
        ).map(([cx, cy, sx, sy], i) => (
          <g key={i} stroke={AURORA_GREEN} strokeWidth={1.5} fill="none" opacity={0.9}>
            <line x1={cx} y1={cy} x2={cx + sx * 26} y2={cy} />
            <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 26} />
          </g>
        ))}

        {/* Stars (softly twinkling) */}
        {STARS.map((s, i) => {
          const tw = 0.7 + 0.3 * Math.sin((frame / fps) * 2 * Math.PI * (0.4 + rand(i) * 0.6) + i);
          return (
            <circle
              key={`s-${i}`}
              cx={s.x}
              cy={s.y}
              r={s.r}
              fill="#FFFFFF"
              opacity={s.a * tw * 0.9}
            />
          );
        })}

        {/* ── Altitude scale (left gutter of panel) ─────────────── */}
        {[100, 150, 200, 300, 400].map((km) => {
          const y = kmToY(km);
          const isMajor = km % 100 === 0;
          return (
            <g key={`alt-${km}`}>
              <line
                x1={PANEL.x + 68}
                y1={y}
                x2={PANEL.x + PANEL.w - 20}
                y2={y}
                stroke={isMajor ? RULE : GRID}
                strokeWidth={isMajor ? 1 : 0.8}
                strokeDasharray={isMajor ? "" : "3 5"}
              />
              <text
                x={PANEL.x + 24}
                y={y + 4}
                fill={isMajor ? GRAY : GRAY_DIM}
                fontFamily={inter}
                fontSize={11}
                fontWeight={500}
                letterSpacing={2.4}
                textAnchor="start"
              >
                {km} KM
              </text>
            </g>
          );
        })}

        {/* Quenching-floor dashed line at 100 km — drawn UNDER the aurora
            (the accompanying label is drawn later, above the ground fill). */}
        <g opacity={interpolate(rise, [0, 0.5, 1], [0, 0, 0.6])}>
          <line
            x1={PANEL.x + 68}
            y1={kmToY(100)}
            x2={PANEL.x + PANEL.w - 20}
            y2={kmToY(100)}
            stroke={AURORA_GREEN}
            strokeWidth={1.2}
            strokeDasharray="6 4"
          />
        </g>

        {/* ── Aurora rays — three-layer glow (halo, body, filament core) ─── */}
        {(() => {
          // sway per cluster (px)
          const t = frame / fps;
          const swayFor = (ci: number) => {
            const cl = CLUSTERS[ci];
            return cl.sway * Math.sin(t * 2 * Math.PI * 0.14 + cl.phase);
          };
          // per-ray reveal: rays rise from horizon over ~1.3s, in cluster order
          const revealFor = (r: Ray, ci: number) => {
            const stagger = ci * 0.08 + (r.u + 1) * 0.05 + R(r.x0) * 0.06;
            const local = interpolate(rise, [stagger, Math.min(1, stagger + 0.55)], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            // ease
            return 1 - Math.pow(1 - local, 2.4);
          };
          const twinkleFor = (r: Ray) =>
            0.82 + 0.18 * Math.sin(t * 2 * Math.PI * 0.35 + r.twinklePhase);
          const shortenedRay = (r: Ray, reveal: number, sway: number) => {
            // Interpolate ray "top" from horizon upward
            const targetTopKm = r.topKm;
            const currentTopKm = 100 + (targetTopKm - 100) * reveal;
            return rayPath({ ...r, topKm: currentTopKm }, sway);
          };
          return (
            <>
              {/* Outer halo layer */}
              <g filter="url(#aurora-blur-strong)" opacity={0.55 * shimmer}>
                {RAYS.map((r, i) => {
                  const rev = revealFor(r, r.cid);
                  if (rev <= 0) return null;
                  return (
                    <path
                      key={`h-${i}`}
                      d={shortenedRay(r, rev, swayFor(r.cid))}
                      fill="url(#ray-body)"
                      opacity={r.intensity * 0.75 * twinkleFor(r)}
                    />
                  );
                })}
              </g>
              {/* Mid glow layer */}
              <g filter="url(#aurora-blur)" opacity={0.85 * shimmer}>
                {RAYS.map((r, i) => {
                  const rev = revealFor(r, r.cid);
                  if (rev <= 0) return null;
                  return (
                    <path
                      key={`m-${i}`}
                      d={shortenedRay(r, rev, swayFor(r.cid))}
                      fill="url(#ray-body)"
                      opacity={r.intensity * 0.85 * twinkleFor(r)}
                    />
                  );
                })}
              </g>
              {/* Filament body */}
              <g filter="url(#aurora-blur-soft)" opacity={shimmer}>
                {RAYS.map((r, i) => {
                  const rev = revealFor(r, r.cid);
                  if (rev <= 0) return null;
                  return (
                    <path
                      key={`b-${i}`}
                      d={shortenedRay(r, rev, swayFor(r.cid))}
                      fill="url(#ray-body)"
                      opacity={r.intensity * twinkleFor(r)}
                    />
                  );
                })}
              </g>
              {/* Bright cores — near-white central filament */}
              <g opacity={shimmer}>
                {RAYS.map((r, i) => {
                  const rev = revealFor(r, r.cid);
                  if (rev <= 0) return null;
                  return (
                    <path
                      key={`c-${i}`}
                      d={shortenedRay({ ...r, width: r.width * 0.55 }, rev, swayFor(r.cid))}
                      fill="url(#ray-core)"
                      opacity={r.intensity * twinkleFor(r) * 0.75}
                    />
                  );
                })}
              </g>
            </>
          );
        })()}

        {/* Horizon emissive band (100 km) */}
        <rect
          x={PANEL.x}
          y={HORIZON_Y - 60}
          width={PANEL.w}
          height={80}
          fill="url(#floor-glow)"
          opacity={0.85 * Math.min(1, rise * 1.5)}
        />

        {/* Solid horizon line */}
        <line
          x1={PANEL.x}
          y1={HORIZON_Y}
          x2={PANEL.x + PANEL.w}
          y2={HORIZON_Y}
          stroke={AURORA_GREEN}
          strokeOpacity={0.5}
          strokeWidth={1.2}
        />

        {/* Ground silhouette — thin dark strip below horizon */}
        <rect
          x={PANEL.x}
          y={HORIZON_Y}
          width={PANEL.w}
          height={PANEL.h - (HORIZON_Y - PANEL.y)}
          fill={INK}
        />

        {/* Quenching-floor label — sits on the dark ground strip */}
        <text
          x={PANEL.x + 78}
          y={HORIZON_Y + 22}
          fill={AURORA_GREEN}
          fontFamily={inter}
          fontSize={11}
          fontWeight={600}
          letterSpacing={3.2}
          textAnchor="start"
          opacity={interpolate(rise, [0, 0.5, 1], [0, 0, 0.95])}
        >
          QUENCHING FLOOR · O(¹S) EMITS ABOVE ~100 KM
        </text>

{/* Broadcast tower silhouette — a small pun visual anchoring the ROLE.
    Sits in the dark ground strip, RIGHT side, well below the emissive floor
    label; concentric arcs suggest broadcast waves reaching upward toward
    the aurora — same idea, different transmitter. */}
        <g
          transform={`translate(${PANEL.x + PANEL.w - 118}, ${PANEL.y + PANEL.h - 14})`}
          stroke={GRAY_DIM}
          strokeWidth={1}
          fill="none"
          opacity={0.95}
        >
          {/* legs */}
          <line x1={0} y1={0} x2={-18} y2={-60} />
          <line x1={0} y1={0} x2={18} y2={-60} />
          <line x1={0} y1={-60} x2={0} y2={-66} />
          {/* cross-braces */}
          {Array.from({ length: 6 }).map((_, k) => {
            const y = -8 - k * 10;
            const w = 18 * ((60 + y) / 60 + 0.03);
            return <line key={k} x1={-w} y1={y} x2={w} y2={y} />;
          })}
          {[0, 1, 2, 3, 4].map((k) => {
            const y1 = -8 - k * 10;
            const y2 = -8 - (k + 1) * 10;
            const w1 = 18 * ((60 + y1) / 60 + 0.03);
            const w2 = 18 * ((60 + y2) / 60 + 0.03);
            return (
              <g key={`x-${k}`}>
                <line x1={-w1} y1={y1} x2={w2} y2={y2} />
                <line x1={w1} y1={y1} x2={-w2} y2={y2} />
              </g>
            );
          })}
          {/* beacon */}
          <circle cx={0} cy={-70} r={2.6} fill={AURORA_MAG} stroke="none" opacity={0.95} />
          {/* concentric broadcast waves */}
          {[10, 20, 30, 40].map((r, k) => (
            <path
              key={`w-${k}`}
              d={`M ${-r} -70 A ${r} ${r} 0 0 1 ${r} -70`}
              stroke={AURORA_MAG}
              strokeWidth={1}
              opacity={0.35 - k * 0.07}
              fill="none"
            />
          ))}
        </g>

        {/* Caption strip just below sky panel */}
        <g
          transform={`translate(${PANEL.x}, ${PANEL.y + PANEL.h + 22})`}
          fill={GRAY}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
        >
          <text>FIG. 1 · AURORAL CURTAIN, ALTITUDE PROFILE</text>
          <text x={PANEL.w} textAnchor="end" fill={AURORA_GREEN} opacity={0.85}>
            EMISSIVE FLOOR: 100 KM · THERMOSPHERE
          </text>
        </g>

        {/* ── Spectrum panel (the "signal readout") ───────────── */}
        {/* Panel frame */}
        <rect
          x={SPEC.x + 0.5}
          y={SPEC.y + 0.5}
          width={SPEC.w - 1}
          height={SPEC.h - 1}
          fill="#080D1A"
          stroke={RULE}
          strokeWidth={1}
        />

        {/* Spectrum panel label */}
        <text
          x={SPEC.x + 20}
          y={SPEC.y + 24}
          fill={GRAY}
          fontFamily={inter}
          fontSize={10}
          letterSpacing={3}
          fontWeight={600}
        >
          FIG. 2 · EMISSION SPECTRUM · λ (NM)
        </text>
        <text
          x={SPEC.x + SPEC.w - 20}
          y={SPEC.y + 24}
          fill={GRAY_DIM}
          fontFamily={inter}
          fontSize={10}
          letterSpacing={3}
          fontWeight={500}
          textAnchor="end"
        >
          I / I_MAX
        </text>

        {/* Baseline */}
        <line
          x1={SPEC.x + 60}
          y1={SPEC.y + SPEC.h - 22}
          x2={SPEC.x + SPEC.w - 12}
          y2={SPEC.y + SPEC.h - 22}
          stroke={RULE}
          strokeWidth={1}
        />

        {/* Wavelength ticks along the baseline */}
        {[400, 450, 500, 550, 600, 650, 700].map((nm) => {
          const x = nmToX(nm);
          return (
            <g key={`tk-${nm}`}>
              <line
                x1={x}
                y1={SPEC.y + SPEC.h - 22}
                x2={x}
                y2={SPEC.y + SPEC.h - 17}
                stroke={GRAY_DIM}
                strokeWidth={1}
              />
              <text
                x={x}
                y={SPEC.y + SPEC.h - 6}
                fill={GRAY_DIM}
                fontFamily={inter}
                fontSize={9}
                letterSpacing={1.5}
                fontWeight={500}
                textAnchor="middle"
              >
                {nm}
              </text>
            </g>
          );
        })}

        {/* Noise floor: a faint jagged trace that gets tuned out */}
        {(() => {
          const y0 = SPEC.y + SPEC.h - 22;
          const noiseOpacity = interpolate(tune, [0, 1], [0.6, 0.06], { extrapolateRight: "clamp" });
          const noiseAmp = interpolate(tune, [0, 1], [7, 1.4], { extrapolateRight: "clamp" });
          const pts: string[] = [];
          const x0 = SPEC.x + 60;
          const x1 = SPEC.x + SPEC.w - 12;
          const steps = 120;
          for (let i = 0; i <= steps; i++) {
            const px = x0 + ((x1 - x0) * i) / steps;
            const py = y0 - Math.abs(Math.sin(i * 1.7 + 0.9) * Math.cos(i * 0.63)) * noiseAmp;
            pts.push(`${i === 0 ? "M" : "L"} ${px.toFixed(1)} ${py.toFixed(1)}`);
          }
          return (
            <path
              d={pts.join(" ")}
              fill="none"
              stroke={GRAY}
              strokeWidth={1}
              opacity={noiseOpacity}
            />
          );
        })()}

        {/* Spectral lines — narrow spikes rising to their target heights.
            Labels for 427.8 and 630.0 sit below the baseline (with tickmarks)
            so they never collide with the primary-channel banner above 557.7. */}
        {LINES.map((L) => {
          const x = nmToX(L.nm);
          const baseY = SPEC.y + SPEC.h - 28;
          const maxH = SPEC.h - 52; // available height (leaves room for banner + baseline tick text)
          const targetH = maxH * L.height;
          const h = targetH * tune;
          const lineColor = L.color;
          return (
            <g key={`ln-${L.nm}`}>
              <line
                x1={x}
                y1={baseY}
                x2={x}
                y2={baseY - h}
                stroke={lineColor}
                strokeWidth={L.primary ? 3 : 2}
                filter="url(#line-glow)"
                opacity={0.9}
              />
              <line
                x1={x}
                y1={baseY}
                x2={x}
                y2={baseY - h}
                stroke={L.primary ? AURORA_CORE : lineColor}
                strokeWidth={L.primary ? 1.2 : 0.8}
                opacity={0.95}
              />
              {/* Secondary line labels — under the baseline, offset so they don't
                  crash the axis numbers */}
              {(L.nm === 427.8 || L.nm === 630.0) && (
                <text
                  x={x}
                  y={SPEC.y + SPEC.h - 6}
                  fill={lineColor}
                  fontFamily={inter}
                  fontSize={9}
                  letterSpacing={1.2}
                  fontWeight={700}
                  textAnchor="middle"
                  opacity={tune}
                >
                  {L.label}
                </text>
              )}
            </g>
          );
        })}

        {/* Primary channel callout — sits *above* the 557.7 nm spike, with a
            small down-arrow onto the peak. */}
        {(() => {
          const x = nmToX(557.7);
          const bannerY = SPEC.y + 22;
          return (
            <g opacity={interpolate(tune, [0.35, 1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}>
              <text
                x={x}
                y={bannerY}
                fill={AURORA_GREEN}
                fontFamily={inter}
                fontSize={10}
                letterSpacing={3.4}
                fontWeight={700}
                textAnchor="middle"
              >
                PRIMARY CHANNEL · 557.7 NM
              </text>
              <line x1={x} y1={bannerY + 6} x2={x} y2={bannerY + 14} stroke={AURORA_GREEN} strokeWidth={1} />
            </g>
          );
        })()}
      </svg>

      {/* ── Type lockup ────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 1000,
          opacity: titleSpring,
          transform: `translateY(${interpolate(titleSpring, [0, 1], [16, 0])}px)`,
        }}
      >
        <div
          style={{
            color: AURORA_GREEN,
            fontFamily: inter,
            fontSize: 13,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 14,
            fontWeight: 600,
          }}
        >
          Role <span style={{ color: GRAY, margin: "0 4px" }}>/</span>
          <span style={{ color: "#EDEDEF", letterSpacing: 5 }}>Broadcast Engineer</span>
        </div>

        <div
          style={{
            color: "#F4F4F6",
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 66,
            lineHeight: 0.98,
            letterSpacing: -1.1,
            fontStyle: "italic",
          }}
        >
          The station on
          <br />
          557.7 nanometres.
        </div>

        <div
          style={{
            marginTop: 22,
            color: "#C4C8D2",
            fontFamily: inter,
            fontSize: 17,
            lineHeight: 1.4,
            fontWeight: 400,
            maxWidth: 900,
            opacity: hookOpacity,
          }}
        >
          The aurora's signature green is a{" "}
          <span style={{ color: AURORA_GREEN, fontWeight: 600 }}>
            forbidden transition of atomic oxygen
          </span>{" "}
          — O(¹S→¹D) at 557.7 nm, a metastable line with a ~0.7-second radiative
          lifetime. Below ~100 km, collisions quench it before it can emit — so
          every green aurora on Earth transmits from the thin thermosphere on the
          same quantum-locked channel.
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          bottom: 30,
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
        <span>Chamberlain · Physics of the Aurora and Airglow · 1961</span>
        <span>
          <span style={{ color: AURORA_GREEN }}>●</span> λ = 557.7 nm · O ¹S→¹D
        </span>
      </div>
    </AbsoluteFill>
  );
};
