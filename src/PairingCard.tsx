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
const SKY = "#04081C";
const SKY_HIGH = "#020412";
const SKY_LOW = "#081739";
const GREEN = "#3EE578";
const GREEN_DEEP = "#0E4A2E";
const VIOLET = "#B95BFF";
const CRIMSON = "#FF3D6C";
const BONE = "#E9E1B7";
const GRAY = "#8A8F99";
const GROUND = "#010104";

// ── Deterministic PRNG (mulberry32) ─────────────────────────────────
const mulberry32 = (a: number) => () => {
  let t = (a += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// ── Curtain definitions (art‑directed, not random) ──────────────────
type CurtainDef = {
  baseX: number;
  width: number;
  topY: number;
  height: number;
  amp: number;
  freq: number;
  phase: number;
  swayHz: number; // per second
  brightness: number;
  hue: "green" | "violet-green" | "green-tall";
};

const CURTAINS: CurtainDef[] = [
  { baseX: 210, width: 46, topY: 165, height: 500, amp: 20, freq: 1.4, phase: 0.2, swayHz: 0.16, brightness: 0.72, hue: "green" },
  { baseX: 300, width: 70, topY: 150, height: 560, amp: 26, freq: 1.15, phase: 1.9, swayHz: 0.13, brightness: 0.88, hue: "violet-green" },
  { baseX: 420, width: 96, topY: 130, height: 610, amp: 32, freq: 1.05, phase: 3.2, swayHz: 0.11, brightness: 1.0, hue: "green-tall" },
  { baseX: 555, width: 130, topY: 115, height: 645, amp: 36, freq: 0.95, phase: 4.6, swayHz: 0.09, brightness: 1.0, hue: "green-tall" },
  { baseX: 690, width: 96, topY: 130, height: 610, amp: 30, freq: 1.05, phase: 5.9, swayHz: 0.11, brightness: 0.95, hue: "violet-green" },
  { baseX: 795, width: 66, topY: 160, height: 555, amp: 22, freq: 1.25, phase: 0.9, swayHz: 0.14, brightness: 0.82, hue: "green" },
  { baseX: 880, width: 40, topY: 190, height: 480, amp: 16, freq: 1.6, phase: 2.5, swayHz: 0.18, brightness: 0.6, hue: "green" },
];

// ── Star field, seeded ──────────────────────────────────────────────
const STAR_RNG = mulberry32(1974);
type Star = { x: number; y: number; r: number; op: number; twinklePhase: number };
const STARS: Star[] = Array.from({ length: 90 }, () => {
  const r = STAR_RNG();
  const size = r < 0.85 ? 0.9 : r < 0.97 ? 1.4 : 2.0;
  return {
    x: 90 + STAR_RNG() * 900,
    y: 130 + STAR_RNG() * 480,
    r: size,
    op: 0.35 + STAR_RNG() * 0.55,
    twinklePhase: STAR_RNG() * Math.PI * 2,
  };
});

// ── Ridgeline silhouette (jagged, hand‑drafted) ─────────────────────
const RIDGE: [number, number][] = (() => {
  const pts: [number, number][] = [];
  const R = mulberry32(42);
  const baseY = 795;
  const startX = 60;
  const endX = 1020;
  const steps = 60;
  for (let i = 0; i <= steps; i++) {
    const x = startX + ((endX - startX) * i) / steps;
    const macro = Math.sin((i / steps) * Math.PI * 1.6 + 0.4) * 26;
    const micro = (R() - 0.5) * 22;
    const y = baseY - Math.max(-8, macro + micro);
    pts.push([x, y]);
  }
  return pts;
})();

// ── AKR spectrum shape — real‑world:
// ── low @ <100 kHz, ramp up through 200, peak ~250–350 kHz, taper by 500 kHz
const spectrumAt = (kHz: number, shift: number): number => {
  const k = kHz + shift;
  // Log‑normal‑ish curve centred on 290 kHz
  const mu = Math.log(290);
  const sigma = 0.42;
  const x = Math.log(Math.max(1, k));
  const g = Math.exp(-((x - mu) ** 2) / (2 * sigma * sigma));
  return g;
};

const curtainPath = (
  c: CurtainDef,
  timeSec: number,
): { path: string; centerAt: (yFrac: number) => number } => {
  const N = 26;
  const halfBase = c.width / 2;
  const timePhase = c.swayHz * Math.PI * 2 * timeSec;

  const centerAt = (yFrac: number): number => {
    const wave1 =
      Math.sin(c.freq * Math.PI * 2 * yFrac + c.phase + timePhase) * c.amp;
    const wave2 =
      Math.sin(c.freq * 2.7 * Math.PI * yFrac + c.phase * 1.4 + timePhase * 0.8) *
      c.amp *
      0.28;
    return c.baseX + wave1 + wave2;
  };

  // Width tapers to thin at top and mid‑fat at ~35% down
  const widthAt = (yFrac: number): number => {
    const shape = 1 - Math.pow(yFrac - 0.35, 2) * 2.1;
    return halfBase * Math.max(0.15, Math.min(1.15, shape));
  };

  const left: string[] = [];
  const right: string[] = [];
  for (let i = 0; i <= N; i++) {
    const yFrac = i / N;
    const y = c.topY + yFrac * c.height;
    const cx = centerAt(yFrac);
    const hw = widthAt(yFrac);
    left.push(`${cx - hw},${y.toFixed(2)}`);
    right.push(`${cx + hw},${y.toFixed(2)}`);
  }
  const path =
    `M ${left[0]} ` +
    left
      .slice(1)
      .map((p) => `L ${p}`)
      .join(" ") +
    " " +
    right
      .reverse()
      .map((p) => `L ${p}`)
      .join(" ") +
    " Z";

  return { path, centerAt };
};

// ── Spectrum trace: dense polyline of amplitude across freqs ────────
const spectrumTrace = (
  x0: number,
  y0: number,
  w: number,
  h: number,
  scroll: number, // 0..1
): string => {
  const N = 260;
  const parts: string[] = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const kHz = 60 + u * 480; // 60 → 540 kHz across the bar
    const env = spectrumAt(kHz, 0);
    // Fine structure oscillation
    const fine =
      Math.sin(u * 90 + scroll * Math.PI * 2 * 6) * 0.18 +
      Math.sin(u * 34 + scroll * Math.PI * 2 * 2.2) * 0.4 +
      Math.sin(u * 12 - scroll * Math.PI * 2 * 1.1) * 0.6;
    const amp = Math.max(0, env * (0.55 + 0.45 * (0.5 + 0.5 * fine)));
    const px = x0 + u * w;
    const py = y0 + h - amp * h;
    parts.push(`${i === 0 ? "M" : "L"} ${px.toFixed(2)} ${py.toFixed(2)}`);
  }
  return parts.join(" ");
};

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const timeSec = frame / fps;
  const loopT = (frame % durationInFrames) / durationInFrames;

  const titleSpring = spring({
    frame: frame - fps * 0.4,
    fps,
    config: { damping: 200, mass: 0.8 },
  });

  const hookOpacity = interpolate(frame, [fps * 1.0, fps * 1.9], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Cross‑fade in the aurora curtains at the start
  const curtainsFade = interpolate(frame, [0, fps * 0.9], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Frame constants
  const FRAME = { x: 60, y: 130, w: 960, h: 770 };
  const SPECTRUM = { x: 90, y: 820, w: 900, h: 46 };

  // Carrier pulse position — one primary motion of the hook
  const carrierC = CURTAINS[3]; // tallest curtain
  const pulseY =
    carrierC.topY + carrierC.height * ((loopT * 1.0 + 0.02) % 1.0);
  const pulseYFrac = (pulseY - carrierC.topY) / carrierC.height;
  const carrierPath = curtainPath(carrierC, timeSec);
  const pulseX = carrierPath.centerAt(pulseYFrac);
  const pulseOpacity = 0.5 + 0.5 * Math.sin(loopT * Math.PI * 2);

  return (
    <AbsoluteFill style={{ backgroundColor: SKY, fontFamily: inter }}>
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
        <span style={{ color: GREEN }}>2026 · 09 · 17</span>
      </div>

      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          {/* Sky vertical gradient */}
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={SKY_HIGH} />
            <stop offset="0.55" stopColor={SKY} />
            <stop offset="1" stopColor={SKY_LOW} />
          </linearGradient>

          {/* Aurora horizon glow — soft green wash from ridge upward */}
          <linearGradient id="horizonGlow" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor={GREEN} stopOpacity={0.16} />
            <stop offset="0.35" stopColor={GREEN} stopOpacity={0.09} />
            <stop offset="1" stopColor={GREEN} stopOpacity={0} />
          </linearGradient>

          {/* Broad aurora band — a soft horizontal wash unifying the curtains */}
          <radialGradient id="auroraWash" cx="50%" cy="70%" r="70%">
            <stop offset="0" stopColor={GREEN} stopOpacity={0.24} />
            <stop offset="0.55" stopColor={GREEN} stopOpacity={0.08} />
            <stop offset="1" stopColor={GREEN} stopOpacity={0} />
          </radialGradient>

          {/* Curtain fills — one per hue variant */}
          <linearGradient id="curtain-green" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={CRIMSON} stopOpacity={0} />
            <stop offset="0.06" stopColor={CRIMSON} stopOpacity={0.55} />
            <stop offset="0.18" stopColor={VIOLET} stopOpacity={0.75} />
            <stop offset="0.38" stopColor={GREEN} stopOpacity={0.9} />
            <stop offset="0.75" stopColor={GREEN} stopOpacity={0.85} />
            <stop offset="1" stopColor={GREEN_DEEP} stopOpacity={0} />
          </linearGradient>

          <linearGradient
            id="curtain-violet-green"
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop offset="0" stopColor={CRIMSON} stopOpacity={0} />
            <stop offset="0.05" stopColor={CRIMSON} stopOpacity={0.7} />
            <stop offset="0.22" stopColor={VIOLET} stopOpacity={0.88} />
            <stop offset="0.5" stopColor={GREEN} stopOpacity={0.95} />
            <stop offset="0.85" stopColor={GREEN} stopOpacity={0.7} />
            <stop offset="1" stopColor={GREEN_DEEP} stopOpacity={0} />
          </linearGradient>

          <linearGradient id="curtain-green-tall" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={CRIMSON} stopOpacity={0} />
            <stop offset="0.04" stopColor={CRIMSON} stopOpacity={0.8} />
            <stop offset="0.14" stopColor={VIOLET} stopOpacity={0.85} />
            <stop offset="0.32" stopColor={GREEN} stopOpacity={1} />
            <stop offset="0.72" stopColor={GREEN} stopOpacity={0.85} />
            <stop offset="1" stopColor={GREEN_DEEP} stopOpacity={0} />
          </linearGradient>

          <filter id="soft-glow" x="-30%" y="-10%" width="160%" height="120%">
            <feGaussianBlur stdDeviation="8" result="b1" />
            <feMerge>
              <feMergeNode in="b1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="wide-glow" x="-40%" y="-20%" width="180%" height="140%">
            <feGaussianBlur stdDeviation="22" />
          </filter>

          {/* Clip to hero panel */}
          <clipPath id="hero-clip">
            <rect x={FRAME.x} y={FRAME.y} width={FRAME.w} height={FRAME.h} />
          </clipPath>
        </defs>

        {/* Hero panel background */}
        <rect
          x={FRAME.x}
          y={FRAME.y}
          width={FRAME.w}
          height={FRAME.h}
          fill="url(#sky)"
        />

        {/* Star field, clipped */}
        <g clipPath="url(#hero-clip)">
          {STARS.map((s, i) => {
            const twinkle =
              0.6 +
              0.4 *
                Math.sin(timeSec * 2.1 + s.twinklePhase + i * 0.13);
            return (
              <circle
                key={i}
                cx={s.x}
                cy={s.y}
                r={s.r}
                fill={BONE}
                opacity={s.op * twinkle}
              />
            );
          })}
        </g>

        {/* Soft aurora wash — unifies the curtains as one sheet */}
        <rect
          x={FRAME.x}
          y={FRAME.y + 120}
          width={FRAME.w}
          height={FRAME.h - 120}
          fill="url(#auroraWash)"
          clipPath="url(#hero-clip)"
        />
        {/* Soft horizon glow (behind curtains, above ridge) */}
        <rect
          x={FRAME.x}
          y={FRAME.y + 380}
          width={FRAME.w}
          height={FRAME.h - 380}
          fill="url(#horizonGlow)"
          clipPath="url(#hero-clip)"
        />

        {/* Aurora curtains — outer wide glow first, then core */}
        <g
          clipPath="url(#hero-clip)"
          opacity={curtainsFade}
        >
          {/* Wide diffuse glows */}
          {CURTAINS.map((c, i) => {
            const { path } = curtainPath(c, timeSec);
            return (
              <path
                key={`glow-${i}`}
                d={path}
                fill={`url(#curtain-${c.hue})`}
                filter="url(#wide-glow)"
                opacity={0.65 * c.brightness}
              />
            );
          })}
          {/* Cores */}
          {CURTAINS.map((c, i) => {
            const { path } = curtainPath(c, timeSec);
            return (
              <path
                key={`core-${i}`}
                d={path}
                fill={`url(#curtain-${c.hue})`}
                filter="url(#soft-glow)"
                opacity={0.95 * c.brightness}
              />
            );
          })}
        </g>

        {/* Carrier pulse — bright bead descending the tallest curtain */}
        <g
          clipPath="url(#hero-clip)"
          opacity={curtainsFade * pulseOpacity}
        >
          <circle
            cx={pulseX}
            cy={pulseY}
            r={22}
            fill={BONE}
            opacity={0.15}
            filter="url(#wide-glow)"
          />
          <circle cx={pulseX} cy={pulseY} r={7} fill={BONE} opacity={0.85} />
          <circle cx={pulseX} cy={pulseY} r={3} fill="#FFFFFF" />
        </g>

        {/* Ridgeline silhouette */}
        <g clipPath="url(#hero-clip)">
          <path
            d={
              `M ${FRAME.x} ${FRAME.y + FRAME.h} ` +
              `L ${RIDGE[0][0]} ${RIDGE[0][1]} ` +
              RIDGE.slice(1)
                .map(([x, y]) => `L ${x} ${y}`)
                .join(" ") +
              ` L ${FRAME.x + FRAME.w} ${FRAME.y + FRAME.h} Z`
            }
            fill={GROUND}
          />
          {/* Thin cool rim above ridge */}
          <path
            d={
              `M ${RIDGE[0][0]} ${RIDGE[0][1]} ` +
              RIDGE.slice(1)
                .map(([x, y]) => `L ${x} ${y}`)
                .join(" ")
            }
            stroke={GREEN}
            strokeOpacity={0.55}
            strokeWidth={1.4}
            fill="none"
          />
        </g>

        {/* Broadcast antenna on the ridge (right of center) */}
        {(() => {
          // Find ridge y at chosen x
          const antX = 700;
          const nearest = RIDGE.reduce((a, b) =>
            Math.abs(b[0] - antX) < Math.abs(a[0] - antX) ? b : a,
          );
          const baseX = antX;
          const baseY = nearest[1] + 2;
          const towerTop = baseY - 118;
          const halfBase = 12;
          const beacon =
            0.4 +
            0.6 *
              (Math.sin(loopT * Math.PI * 2 * 2) > 0.72 ? 1 : 0);
          return (
            <g clipPath="url(#hero-clip)" stroke={GROUND} strokeWidth={1.4} fill="none">
              {/* Guy wires */}
              <line x1={baseX - 40} y1={baseY} x2={baseX} y2={towerTop + 6} stroke={BONE} strokeOpacity={0.3} strokeWidth={0.9} />
              <line x1={baseX + 40} y1={baseY} x2={baseX} y2={towerTop + 6} stroke={BONE} strokeOpacity={0.3} strokeWidth={0.9} />
              <line x1={baseX - 24} y1={baseY} x2={baseX} y2={towerTop + 30} stroke={BONE} strokeOpacity={0.22} strokeWidth={0.9} />
              <line x1={baseX + 24} y1={baseY} x2={baseX} y2={towerTop + 30} stroke={BONE} strokeOpacity={0.22} strokeWidth={0.9} />

              {/* Tower legs */}
              <line x1={baseX - halfBase} y1={baseY} x2={baseX} y2={towerTop} stroke={BONE} strokeOpacity={0.9} strokeWidth={1.4} />
              <line x1={baseX + halfBase} y1={baseY} x2={baseX} y2={towerTop} stroke={BONE} strokeOpacity={0.9} strokeWidth={1.4} />
              {/* Cross‑bracing */}
              {Array.from({ length: 8 }).map((_, k) => {
                const t = k / 8;
                const y1 = baseY - t * (baseY - towerTop);
                const y2 = baseY - (t + 1 / 16) * (baseY - towerTop);
                const w1 = halfBase * (1 - t);
                const w2 = halfBase * (1 - (t + 1 / 16));
                return (
                  <g key={k}>
                    <line x1={baseX - w1} y1={y1} x2={baseX + w2} y2={y2} stroke={BONE} strokeOpacity={0.55} strokeWidth={0.8} />
                    <line x1={baseX + w1} y1={y1} x2={baseX - w2} y2={y2} stroke={BONE} strokeOpacity={0.55} strokeWidth={0.8} />
                    <line x1={baseX - w2} y1={y2} x2={baseX + w2} y2={y2} stroke={BONE} strokeOpacity={0.35} strokeWidth={0.6} />
                  </g>
                );
              })}
              {/* Mast + beacon */}
              <line x1={baseX} y1={towerTop} x2={baseX} y2={towerTop - 26} stroke={BONE} strokeOpacity={0.9} strokeWidth={1.2} />
              <circle cx={baseX} cy={towerTop - 28} r={22} fill={CRIMSON} opacity={0.14 * beacon} filter="url(#wide-glow)" />
              <circle cx={baseX} cy={towerTop - 28} r={3.4} fill={CRIMSON} opacity={beacon} />
              <circle cx={baseX} cy={towerTop - 28} r={1.4} fill="#FFFFFF" opacity={beacon} />
              {/* Radiating broadcast rings — 3 phases across the loop for continuity */}
              {[0, 1, 2].map((k) => {
                const localT = (loopT + k / 3) % 1;
                const ringR = 12 + localT * 96;
                const op = Math.max(0, 0.45 * (1 - localT));
                return (
                  <circle
                    key={`ring-${k}`}
                    cx={baseX}
                    cy={towerTop - 28}
                    r={ringR}
                    fill="none"
                    stroke={GREEN}
                    strokeOpacity={op}
                    strokeWidth={1}
                  />
                );
              })}
            </g>
          );
        })()}

        {/* Inner thin border of the hero panel */}
        <rect
          x={FRAME.x + 0.5}
          y={FRAME.y + 0.5}
          width={FRAME.w - 1}
          height={FRAME.h - 1}
          fill="none"
          stroke="#212736"
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
          <g key={i} stroke={CRIMSON} strokeWidth={1.5} fill="none">
            <line x1={cx} y1={cy} x2={cx + sx * 26} y2={cy} />
            <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 26} />
          </g>
        ))}

        {/* Frequency band label at top‑left of hero */}
        <g
          transform={`translate(${FRAME.x + 26}, ${FRAME.y + 30})`}
          fill={GRAY}
          fontFamily={inter}
          fontWeight={600}
          fontSize={11}
          letterSpacing={3}
        >
          <text>OBS · IMP‑6 · 100–500 kHz</text>
        </g>

        {/* Emission‑line legend, top‑right of hero */}
        <g
          transform={`translate(${FRAME.x + FRAME.w - 26}, ${FRAME.y + 30})`}
          fill={GRAY}
          fontFamily={inter}
          fontWeight={600}
          fontSize={11}
          letterSpacing={3}
          textAnchor="end"
        >
          <text>O I 557.7 · N₂⁺ 427.8 · O I 630</text>
        </g>

        {/* Spectrum band — the radio dial */}
        <g>
          {/* Bar background */}
          <rect
            x={SPECTRUM.x}
            y={SPECTRUM.y}
            width={SPECTRUM.w}
            height={SPECTRUM.h}
            fill="#0A0F22"
            stroke="#1A2338"
            strokeWidth={1}
          />
          {/* Axis baseline */}
          <line
            x1={SPECTRUM.x + 6}
            y1={SPECTRUM.y + SPECTRUM.h - 6}
            x2={SPECTRUM.x + SPECTRUM.w - 6}
            y2={SPECTRUM.y + SPECTRUM.h - 6}
            stroke={GRAY}
            strokeOpacity={0.6}
            strokeWidth={1}
          />
          {/* Ticks + labels */}
          {[100, 200, 300, 400, 500].map((kHz) => {
            const u = (kHz - 60) / 480;
            const x = SPECTRUM.x + u * SPECTRUM.w;
            const highlight = kHz === 300;
            return (
              <g key={kHz}>
                <line
                  x1={x}
                  y1={SPECTRUM.y + SPECTRUM.h - 6}
                  x2={x}
                  y2={SPECTRUM.y + SPECTRUM.h - (highlight ? 14 : 10)}
                  stroke={highlight ? GREEN : GRAY}
                  strokeOpacity={highlight ? 1 : 0.7}
                  strokeWidth={highlight ? 1.4 : 1}
                />
                <text
                  x={x}
                  y={SPECTRUM.y + SPECTRUM.h + 18}
                  fill={highlight ? GREEN : GRAY}
                  fontFamily={inter}
                  fontSize={11}
                  fontWeight={highlight ? 600 : 500}
                  letterSpacing={2.5}
                  textAnchor="middle"
                >
                  {kHz}
                </text>
              </g>
            );
          })}
          <text
            x={SPECTRUM.x + SPECTRUM.w + 12}
            y={SPECTRUM.y + SPECTRUM.h + 18}
            fill={GRAY}
            fontFamily={inter}
            fontSize={11}
            fontWeight={500}
            letterSpacing={2.5}
          >
            kHz
          </text>
          {/* Trace glow */}
          <path
            d={spectrumTrace(
              SPECTRUM.x + 6,
              SPECTRUM.y + 4,
              SPECTRUM.w - 12,
              SPECTRUM.h - 12,
              loopT,
            )}
            stroke={GREEN}
            strokeOpacity={0.35}
            strokeWidth={4}
            fill="none"
            filter="url(#wide-glow)"
          />
          {/* Trace core */}
          <path
            d={spectrumTrace(
              SPECTRUM.x + 6,
              SPECTRUM.y + 4,
              SPECTRUM.w - 12,
              SPECTRUM.h - 12,
              loopT,
            )}
            stroke={GREEN}
            strokeWidth={1.4}
            fill="none"
          />
          {/* Peak marker at 300 kHz */}
          {(() => {
            const u = (300 - 60) / 480;
            const x = SPECTRUM.x + 6 + u * (SPECTRUM.w - 12);
            const peakY = SPECTRUM.y + 4 + (SPECTRUM.h - 12) * (1 - spectrumAt(300, 0));
            return (
              <g>
                <line
                  x1={x}
                  y1={peakY - 3}
                  x2={x}
                  y2={SPECTRUM.y + SPECTRUM.h - 6}
                  stroke={GREEN}
                  strokeOpacity={0.6}
                  strokeWidth={1}
                  strokeDasharray="2 3"
                />
                <circle cx={x} cy={peakY} r={8} fill={GREEN} opacity={0.35} filter="url(#wide-glow)" />
                <circle cx={x} cy={peakY} r={3.6} fill={BONE} />
                <circle cx={x} cy={peakY} r={1.6} fill="#FFFFFF" />
              </g>
            );
          })()}
          {/* Left label */}
          <text
            x={SPECTRUM.x}
            y={SPECTRUM.y - 8}
            fill={GRAY}
            fontFamily={inter}
            fontSize={11}
            fontWeight={500}
            letterSpacing={3.5}
          >
            AKR — AURORAL KILOMETRIC RADIATION
          </text>
          {/* Right label */}
          <text
            x={SPECTRUM.x + SPECTRUM.w}
            y={SPECTRUM.y - 8}
            fill={GREEN}
            fontFamily={inter}
            fontSize={11}
            fontWeight={600}
            letterSpacing={3.5}
            textAnchor="end"
          >
            PEAK ≈ 10
            <tspan
              baselineShift="super"
              fontSize={8}
              dx={1}
              letterSpacing={0}
            >
              9
            </tspan>
            <tspan dx={5}>W</tspan>
          </text>
        </g>

        {/* Divider */}
        <line
          x1={80}
          y1={905}
          x2={1000}
          y2={905}
          stroke="#1A2338"
          strokeWidth={1}
        />
      </svg>

      {/* ── Type lockup ─────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 935,
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
            color: GREEN,
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
            Radio Broadcaster
          </span>
        </div>

        <div
          style={{
            color: "#F4F4F6",
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 80,
            lineHeight: 0.96,
            letterSpacing: -1.4,
            fontStyle: "italic",
          }}
        >
          The sky's loudest
          <br />
          radio station.
        </div>

        <div
          style={{
            marginTop: 26,
            color: "#C8CAD0",
            fontFamily: inter,
            fontSize: 19,
            lineHeight: 1.42,
            fontWeight: 400,
            maxWidth: 880,
            opacity: hookOpacity,
          }}
        >
          The same solar‑wind electrons that light the aurora also drive a
          cyclotron‑maser emission overhead — the{" "}
          <span style={{ color: GREEN, fontWeight: 600 }}>
            Auroral Kilometric Radiation
          </span>{" "}
          — radio bursts at 100–500 kHz and up to 10⁹ W, briefly the brightest
          planetary radio source in the inner solar system.
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
        <span>Gurnett · JGR 79 (1974) 4227–4238</span>
        <span>
          <span style={{ color: GREEN }}>●</span> Blocked by Earth's ionosphere
        </span>
      </div>
    </AbsoluteFill>
  );
};

