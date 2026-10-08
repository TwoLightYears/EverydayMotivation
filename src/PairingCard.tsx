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

// ── Palette (from brief) ───────────────────────────────────────────────
const VOID = "#060814";
const MIDNIGHT = "#0F1530";
const MILKY = "#F2E6B9";
const BRASS = "#C9A86A";
const UMBER = "#7A4F2A";
const PARCHMENT = "#D3C6A0";
const DIM = "#5B5F74";

// ── Deterministic PRNG for star fields (hash-based) ─────────────────────
const rand = (seed: number): (() => number) => {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
};

// ── Star fields ─────────────────────────────────────────────────────────
type Star = {
  x: number;
  y: number;
  r: number;
  a: number;
  tw: number;
  phase: number;
};

// Background sprinkle across the plate
const bgStars: Star[] = (() => {
  const r = rand(0xa17c);
  const out: Star[] = [];
  for (let i = 0; i < 220; i++) {
    out.push({
      x: r() * 1080,
      y: r() * 1050,
      r: 0.4 + r() * r() * 1.2,
      a: 0.25 + r() * 0.55,
      tw: 0.4 + r() * 0.6,
      phase: r() * Math.PI * 2,
    });
  }
  return out;
})();

// Milky Way dust along a slanted band
const milkyCenterY = (x: number): number => {
  // Band tilts gently — a long arc. Centre line in plate coordinates.
  const t = (x - 540) / 540; // -1 .. 1
  return 440 - 90 * t + 24 * Math.sin(t * 2.1);
};

const milkyStars: Star[] = (() => {
  const r = rand(0x5a1d);
  const out: Star[] = [];
  // dense band
  for (let i = 0; i < 1100; i++) {
    const x = r() * 1080;
    const yJitter = (r() + r() + r()) / 3 - 0.5; // triangular-ish
    const bandHalfWidth = 140 + 40 * Math.sin((x / 1080) * 3.3);
    const y = milkyCenterY(x) + yJitter * 2 * bandHalfWidth;
    const dist = Math.abs(y - milkyCenterY(x)) / bandHalfWidth;
    if (dist > 1) continue;
    out.push({
      x,
      y,
      r: 0.4 + r() * r() * 1.3,
      a: (1 - dist) * (0.5 + r() * 0.5),
      tw: 0.3 + r() * 0.5,
      phase: r() * Math.PI * 2,
    });
  }
  return out;
})();

// Dark dust lanes along the band (patches of lower density)
const dustBlobs = (() => {
  const r = rand(0x9b22);
  const out: { x: number; y: number; rx: number; ry: number; a: number }[] = [];
  for (let i = 0; i < 12; i++) {
    const x = 60 + r() * 960;
    const y = milkyCenterY(x) + (r() - 0.5) * 90;
    out.push({
      x,
      y,
      rx: 110 + r() * 120,
      ry: 32 + r() * 46,
      a: 0.35 + r() * 0.25,
    });
  }
  return out;
})();

// A handful of "named" bright stars in / around the band
const brightStars: { x: number; y: number; r: number; label?: string }[] = [
  { x: 160, y: 500, r: 2.6, label: "α" },
  { x: 285, y: 455, r: 3.2, label: "β" },
  { x: 420, y: 430, r: 2.2 },
  { x: 560, y: 420, r: 3.4, label: "γ" },
  { x: 735, y: 405, r: 2.8 },
  { x: 865, y: 390, r: 3.6, label: "δ" },
  { x: 985, y: 355, r: 2.4 },
  { x: 630, y: 540, r: 2.0 },
  { x: 320, y: 560, r: 2.0 },
];

// ── Beetle silhouette (stylised Scarabaeus satyrus from above) ──────────
const Beetle: React.FC<{ color: string; stroke: string }> = ({
  color,
  stroke,
}) => {
  return (
    <g>
      {/* legs: three per side, splayed, chunkier */}
      <g
        stroke={color}
        strokeWidth={3.2}
        strokeLinecap="round"
        fill="none"
      >
        {/* left legs */}
        <path d="M -6 -10  L -28 -26  L -40 -38" />
        <path d="M -8  -1  L -32 -2   L -46 -4" />
        <path d="M -6  10  L -28  22  L -40  32" />
        {/* right legs */}
        <path d="M  6 -10  L  28 -26  L  40 -38" />
        <path d="M  8  -1  L  32 -2   L  46 -4" />
        <path d="M  6  10  L  28  22  L  40  32" />
      </g>
      {/* elytra (back shell) */}
      <ellipse cx={4} cy={0} rx={22} ry={14} fill={color} stroke={stroke} strokeWidth={1.2} />
      {/* pronotum (shoulder) */}
      <ellipse cx={-13} cy={0} rx={10} ry={11} fill={color} stroke={stroke} strokeWidth={1.2} />
      {/* head */}
      <path
        d="M -22 -8 Q -30 0 -22 8 L -25 5 Q -30 0 -25 -5 Z"
        fill={color}
        stroke={stroke}
        strokeWidth={1}
      />
      {/* elytral seam */}
      <line x1={4} y1={-13} x2={4} y2={13} stroke={stroke} strokeWidth={1} opacity={0.65} />
      {/* subtle shell sheen */}
      <ellipse
        cx={-2}
        cy={-6}
        rx={10}
        ry={3}
        fill="#30273D"
        opacity={0.55}
      />
    </g>
  );
};

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ── Timings ──────────────────────────────────────────────────────────
  const skyIn = interpolate(frame, [0, fps * 1.0], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const bandIn = interpolate(frame, [fps * 0.2, fps * 1.4], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const plumbSpring = spring({
    frame: frame - fps * 1.1,
    fps,
    config: { damping: 180, mass: 1 },
  });

  const beetleIn = spring({
    frame: frame - fps * 1.4,
    fps,
    config: { damping: 160, mass: 1.1 },
  });

  const titleSpring = spring({
    frame: frame - fps * 1.8,
    fps,
    config: { damping: 200, mass: 0.9 },
  });

  const hookOpacity = interpolate(frame, [fps * 2.2, fps * 3.1], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Slow sky drift (apparent rotation): shift stars left over time.
  const drift = (frame / fps) * 1.6; // px/sec feel
  const twinkleT = frame / fps;

  // Beetle creeps along a tiny forward segment
  const beetleCreep = interpolate(frame, [fps * 1.4, fps * 5], [0, 14], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Chart geometry (plate inside the frame) ──────────────────────────
  const FRAME = { x: 60, y: 150, w: 960, h: 940 };
  const AXIS_X = 400;
  const GALACTIC_Y = 420;
  const GROUND_Y = 1040;
  const BEETLE_X = AXIS_X;
  const BEETLE_Y = GROUND_Y - 60; // feet sit on horizon

  // Visible plumb-line length driven by spring
  const plumbExtent = (GROUND_Y - 130 - GALACTIC_Y - 24) * plumbSpring;

  return (
    <AbsoluteFill style={{ backgroundColor: VOID, fontFamily: inter }}>
      <style>{fontCss}</style>

      {/* Top metadata band */}
      <div
        style={{
          position: "absolute",
          top: 60,
          left: 80,
          right: 80,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          color: DIM,
          fontFamily: inter,
          fontSize: 13,
          letterSpacing: 4.5,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Everyday Motivation · No. 003</span>
        <span style={{ color: BRASS }}>2026 · 10 · 08</span>
      </div>

      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          <radialGradient id="plate-vignette" cx="50%" cy="40%" r="75%">
            <stop offset="0%" stopColor="#0A0F26" stopOpacity={1} />
            <stop offset="100%" stopColor={VOID} stopOpacity={1} />
          </radialGradient>

          <radialGradient id="star-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity={1} />
            <stop offset="40%" stopColor={MILKY} stopOpacity={0.9} />
            <stop offset="100%" stopColor={MILKY} stopOpacity={0} />
          </radialGradient>

          <filter id="band-blur" x="-20%" y="-50%" width="140%" height="200%">
            <feGaussianBlur stdDeviation="36" />
          </filter>

          <filter id="band-core-blur" x="-20%" y="-50%" width="140%" height="200%">
            <feGaussianBlur stdDeviation="14" />
          </filter>
        </defs>

        {/* Plate background */}
        <rect
          x={FRAME.x}
          y={FRAME.y}
          width={FRAME.w}
          height={FRAME.h}
          fill="url(#plate-vignette)"
        />

        {/* Soft milky band halo (behind stars) — single blurred path */}
        <g opacity={bandIn}>
          {/* outer wide glow */}
          <path
            d={(() => {
              const top: string[] = [];
              const bot: string[] = [];
              for (let i = 0; i <= 24; i++) {
                const x = (i / 24) * 1080;
                const y = milkyCenterY(x) + FRAME.y - 40;
                top.push(`${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${(y - 180).toFixed(1)}`);
                bot.push(`L ${x.toFixed(1)} ${(y + 180).toFixed(1)}`);
              }
              bot.reverse();
              return top.join(" ") + " " + bot.join(" ") + " Z";
            })()}
            fill={MILKY}
            opacity={0.09}
            filter="url(#band-blur)"
          />
          {/* narrower bright core */}
          <path
            d={(() => {
              const top: string[] = [];
              const bot: string[] = [];
              for (let i = 0; i <= 24; i++) {
                const x = (i / 24) * 1080;
                const y = milkyCenterY(x) + FRAME.y - 40;
                top.push(`${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${(y - 60).toFixed(1)}`);
                bot.push(`L ${x.toFixed(1)} ${(y + 60).toFixed(1)}`);
              }
              bot.reverse();
              return top.join(" ") + " " + bot.join(" ") + " Z";
            })()}
            fill={MILKY}
            opacity={0.14}
            filter="url(#band-core-blur)"
          />
        </g>

        {/* Background sprinkle */}
        <g opacity={skyIn}>
          {bgStars.map((s, i) => {
            const tw = 0.75 + 0.25 * Math.sin(twinkleT * s.tw + s.phase);
            const x = ((s.x - drift * 0.15) % 1080 + 1080) % 1080;
            return (
              <circle
                key={`bg-${i}`}
                cx={x}
                cy={s.y + FRAME.y - 40}
                r={s.r}
                fill={MILKY}
                opacity={s.a * tw}
              />
            );
          })}
        </g>

        {/* Milky Way dust band stars */}
        <g opacity={bandIn}>
          {milkyStars.map((s, i) => {
            const tw = 0.8 + 0.2 * Math.sin(twinkleT * s.tw + s.phase);
            const x = ((s.x - drift * 0.3) % 1080 + 1080) % 1080;
            return (
              <circle
                key={`mw-${i}`}
                cx={x}
                cy={s.y + FRAME.y - 40}
                r={s.r}
                fill={MILKY}
                opacity={s.a * tw}
              />
            );
          })}
        </g>

        {/* Dust lanes (darker patches) — subtle, blurred */}
        <g opacity={bandIn * 0.55} filter="url(#band-core-blur)">
          {dustBlobs.slice(0, 7).map((b, i) => {
            const x = ((b.x - drift * 0.3) % 1080 + 1080) % 1080;
            return (
              <ellipse
                key={`dust-${i}`}
                cx={x}
                cy={b.y + FRAME.y - 40}
                rx={b.rx * 0.6}
                ry={b.ry * 0.5}
                fill={VOID}
                opacity={0.65}
              />
            );
          })}
        </g>

        {/* Bright "named" stars with soft halos */}
        <g opacity={bandIn}>
          {brightStars.map((s, i) => {
            const x = ((s.x - drift * 0.3) % 1080 + 1080) % 1080;
            const y = s.y + FRAME.y - 40;
            const tw = 0.85 + 0.15 * Math.sin(twinkleT * 0.9 + i);
            return (
              <g key={`bright-${i}`}>
                <circle
                  cx={x}
                  cy={y}
                  r={s.r * 5}
                  fill="url(#star-core)"
                  opacity={0.55 * tw}
                />
                <circle cx={x} cy={y} r={s.r} fill="#FFFFFF" opacity={tw} />
                {s.label ? (
                  <text
                    x={x + 10}
                    y={y - 8}
                    fill={BRASS}
                    fontFamily={inter}
                    fontSize={11}
                    letterSpacing={2.4}
                    fontWeight={500}
                    opacity={0.9}
                  >
                    {s.label}
                  </text>
                ) : null}
              </g>
            );
          })}
        </g>

        {/* Corner graticule marks */}
        <g stroke={BRASS} strokeWidth={1.4} fill="none" opacity={0.9}>
          <line x1={FRAME.x} y1={FRAME.y} x2={FRAME.x + 32} y2={FRAME.y} />
          <line x1={FRAME.x} y1={FRAME.y} x2={FRAME.x} y2={FRAME.y + 32} />
          <line
            x1={FRAME.x + FRAME.w}
            y1={FRAME.y}
            x2={FRAME.x + FRAME.w - 32}
            y2={FRAME.y}
          />
          <line
            x1={FRAME.x + FRAME.w}
            y1={FRAME.y}
            x2={FRAME.x + FRAME.w}
            y2={FRAME.y + 32}
          />
          <line
            x1={FRAME.x}
            y1={FRAME.y + FRAME.h}
            x2={FRAME.x + 32}
            y2={FRAME.y + FRAME.h}
          />
          <line
            x1={FRAME.x}
            y1={FRAME.y + FRAME.h}
            x2={FRAME.x}
            y2={FRAME.y + FRAME.h - 32}
          />
          <line
            x1={FRAME.x + FRAME.w}
            y1={FRAME.y + FRAME.h}
            x2={FRAME.x + FRAME.w - 32}
            y2={FRAME.y + FRAME.h}
          />
          <line
            x1={FRAME.x + FRAME.w}
            y1={FRAME.y + FRAME.h}
            x2={FRAME.x + FRAME.w}
            y2={FRAME.y + FRAME.h - 32}
          />
        </g>

        {/* Top azimuth tick ruler just inside the plate */}
        <g
          stroke={BRASS}
          strokeWidth={1}
          fontFamily={inter}
          fontSize={10}
          letterSpacing={2}
          fill={BRASS}
          opacity={0.75}
        >
          {Array.from({ length: 13 }).map((_, i) => {
            const x = FRAME.x + 60 + i * ((FRAME.w - 120) / 12);
            const major = i % 3 === 0;
            return (
              <g key={i}>
                <line
                  x1={x}
                  y1={FRAME.y + 54}
                  x2={x}
                  y2={FRAME.y + 54 + (major ? 12 : 6)}
                />
                {major ? (
                  <text
                    x={x}
                    y={FRAME.y + 44}
                    textAnchor="middle"
                    stroke="none"
                    fontWeight={500}
                  >
                    {(i * 30).toString().padStart(3, "0")}°
                  </text>
                ) : null}
              </g>
            );
          })}
          <line
            x1={FRAME.x + 60}
            y1={FRAME.y + 54}
            x2={FRAME.x + FRAME.w - 60}
            y2={FRAME.y + 54}
            opacity={0.5}
          />
        </g>

        {/* Galactic equator reference curve */}
        <path
          d={(() => {
            const pts: string[] = [];
            for (let i = 0; i <= 24; i++) {
              const x = (i / 24) * 1080;
              const y = milkyCenterY(x) + FRAME.y - 40;
              pts.push(`${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`);
            }
            return pts.join(" ");
          })()}
          stroke={BRASS}
          strokeWidth={1}
          strokeDasharray="2 6"
          fill="none"
          opacity={bandIn * 0.4}
        />

        {/* Galactic axis label on the band */}
        <g opacity={bandIn * 0.95}>
          <circle
            cx={AXIS_X}
            cy={GALACTIC_Y}
            r={4}
            fill={BRASS}
          />
          <circle
            cx={AXIS_X}
            cy={GALACTIC_Y}
            r={14}
            fill="none"
            stroke={BRASS}
            strokeWidth={1}
            opacity={0.6}
          />
          <text
            x={AXIS_X + 24}
            y={GALACTIC_Y - 6}
            fill={BRASS}
            fontFamily={inter}
            fontSize={11}
            letterSpacing={3.5}
            fontWeight={600}
          >
            GALACTIC AXIS
          </text>
          <text
            x={AXIS_X + 24}
            y={GALACTIC_Y + 10}
            fill={DIM}
            fontFamily={inter}
            fontSize={10}
            letterSpacing={2.4}
            fontWeight={500}
          >
            l = 0°, b = 0°
          </text>
        </g>

        {/* The plumb line — surveying tie between beetle and galaxy */}
        <g>
          {/* ticks running down the axis */}
          {Array.from({ length: 32 }).map((_, i) => {
            const y = GALACTIC_Y + 24 + i * 20;
            if (y > GALACTIC_Y + 24 + plumbExtent) return null;
            const major = i % 5 === 0;
            return (
              <line
                key={`tick-${i}`}
                x1={AXIS_X - (major ? 10 : 5)}
                y1={y}
                x2={AXIS_X + (major ? 10 : 5)}
                y2={y}
                stroke={BRASS}
                strokeWidth={major ? 1.2 : 0.8}
                opacity={0.75}
              />
            );
          })}
          <line
            x1={AXIS_X}
            y1={GALACTIC_Y + 24}
            x2={AXIS_X}
            y2={GALACTIC_Y + 24 + plumbExtent}
            stroke={BRASS}
            strokeWidth={1}
            strokeDasharray="1 5"
            opacity={0.8}
          />
          {/* bearing readout — pulled to right margin, under the band */}
          <g
            transform={`translate(${FRAME.x + FRAME.w - 40}, ${GALACTIC_Y + 230})`}
            opacity={plumbSpring}
          >
            {/* small vertical rule to the left of the readout */}
            <line
              x1={-200}
              y1={-18}
              x2={-200}
              y2={88}
              stroke={BRASS}
              strokeWidth={1}
              opacity={0.5}
            />
            <text
              textAnchor="end"
              y={-2}
              fill={BRASS}
              fontFamily={inter}
              fontSize={12}
              letterSpacing={4.5}
              fontWeight={600}
            >
              HEADING
            </text>
            <text
              textAnchor="end"
              y={58}
              fill={MILKY}
              fontFamily={playfair}
              fontStyle="italic"
              fontSize={78}
              fontWeight={500}
            >
              000°
            </text>
            <text
              textAnchor="end"
              y={84}
              fill={PARCHMENT}
              fontFamily={inter}
              fontSize={11}
              letterSpacing={3.6}
              fontWeight={500}
            >
              GALACTIC NORTH
            </text>
            <text
              textAnchor="end"
              y={102}
              fill={DIM}
              fontFamily={inter}
              fontSize={10}
              letterSpacing={2.6}
              fontWeight={500}
            >
              SD ± 6.8° · n = 43
            </text>
          </g>
        </g>

        {/* Horizon line below the sky zone */}
        <g opacity={plumbSpring}>
          <line
            x1={FRAME.x + 40}
            y1={GROUND_Y}
            x2={FRAME.x + FRAME.w - 40}
            y2={GROUND_Y}
            stroke={BRASS}
            strokeWidth={1.2}
            opacity={0.9}
          />
          <text
            x={FRAME.x + 44}
            y={GROUND_Y + 22}
            fill={DIM}
            fontFamily={inter}
            fontSize={11}
            letterSpacing={3.2}
            fontWeight={500}
          >
            HORIZON · KALAHARI, 23° S
          </text>
          <text
            x={FRAME.x + FRAME.w - 44}
            y={GROUND_Y + 22}
            textAnchor="end"
            fill={DIM}
            fontFamily={inter}
            fontSize={11}
            letterSpacing={3.2}
            fontWeight={500}
          >
            PLATE III · GALACTIC COMPASS
          </text>
        </g>

        {/* Trail of straight-line roll behind the beetle, in plate coords */}
        <g opacity={beetleIn}>
          <line
            x1={FRAME.x + 40}
            y1={GROUND_Y - 2}
            x2={BEETLE_X - 90}
            y2={GROUND_Y - 2}
            stroke={PARCHMENT}
            strokeWidth={0.8}
            strokeDasharray="1 6"
            opacity={0.55}
          />
          {Array.from({ length: 20 }).map((_, i) => {
            const dx = BEETLE_X - 80 - i * 22;
            if (dx < FRAME.x + 40) return null;
            return (
              <circle
                key={`trail-${i}`}
                cx={dx}
                cy={GROUND_Y - 2}
                r={1.7}
                fill={PARCHMENT}
                opacity={0.45 - i * 0.018}
              />
            );
          })}
        </g>

        {/* The beetle + dung ball on the ground (scaled 2.0×) */}
        <g
          transform={`translate(${BEETLE_X}, ${BEETLE_Y}) scale(2.0)`}
          opacity={beetleIn}
        >
          {/* dung ball shadow */}
          <ellipse cx={36} cy={18} rx={24} ry={3.5} fill="#000" opacity={0.55} />
          {/* dung ball */}
          <circle cx={36} cy={0} r={20} fill={UMBER} />
          {/* ball texture speckles */}
          {Array.from({ length: 24 }).map((_, i) => {
            const r = rand(0x7331 + i)();
            const a = r * Math.PI * 2;
            const d = Math.sqrt(r) * 16;
            return (
              <circle
                key={`sp-${i}`}
                cx={36 + Math.cos(a) * d}
                cy={0 + Math.sin(a) * d * 0.9}
                r={0.9 + r * 1.3}
                fill="#4A2E1A"
                opacity={0.6}
              />
            );
          })}
          {/* ball highlight */}
          <ellipse cx={30} cy={-6} rx={7} ry={3.5} fill={BRASS} opacity={0.35} />
          {/* beetle shadow */}
          <ellipse cx={-4} cy={18} rx={26} ry={3} fill="#000" opacity={0.55} />
          {/* beetle silhouette (nose into ball) */}
          <Beetle color="#0A0A10" stroke="#2A2436" />
        </g>

        {/* beetle label — above the beetle, to its right */}
        <g
          opacity={beetleIn}
          transform={`translate(${BEETLE_X + 180}, ${BEETLE_Y - 70})`}
        >
          <line
            x1={-60}
            y1={56}
            x2={-10}
            y2={56}
            stroke={BRASS}
            strokeWidth={1}
            opacity={0.8}
          />
          <line
            x1={-10}
            y1={56}
            x2={-10}
            y2={20}
            stroke={BRASS}
            strokeWidth={1}
            opacity={0.8}
          />
          <text
            fill={BRASS}
            fontFamily={inter}
            fontSize={12}
            letterSpacing={3.6}
            fontWeight={600}
          >
            SCARABAEUS SATYRUS
          </text>
          <text
            y={18}
            fill={DIM}
            fontFamily={inter}
            fontSize={11}
            letterSpacing={2}
            fontStyle="italic"
          >
            Carrier · heading 000° galactic north
          </text>
        </g>

      </svg>

      {/* ── Type lockup ─────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 1130,
          opacity: titleSpring,
          transform: `translateY(${interpolate(
            titleSpring,
            [0, 1],
            [14, 0],
          )}px)`,
        }}
      >
        <div
          style={{
            color: BRASS,
            fontFamily: inter,
            fontSize: 12,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 14,
            fontWeight: 600,
          }}
        >
          Role <span style={{ color: DIM, margin: "0 4px" }}>/</span>
          <span style={{ color: PARCHMENT, letterSpacing: 5 }}>
            Celestial Navigator
          </span>
        </div>

        <div
          style={{
            color: "#F4EFD9",
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 72,
            lineHeight: 0.98,
            letterSpacing: -1.2,
            fontStyle: "italic",
          }}
        >
          Steers by a galaxy.
        </div>
      </div>

      {/* Hook caption */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 1250,
          color: "#B9B6A4",
          fontFamily: inter,
          fontSize: 17,
          lineHeight: 1.45,
          fontWeight: 400,
          maxWidth: 920,
          opacity: hookOpacity,
        }}
      >
        Alone on a moonless night with no landmarks,{" "}
        <span style={{ color: MILKY, fontWeight: 600 }}>
          Scarabaeus satyrus
        </span>{" "}
        rolls its dung ball in a dead-straight line by orienting to the
        diffuse band of the Milky Way — the first animal of any kind shown
        to navigate by the galaxy itself.
      </div>

      {/* Footer */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          bottom: 18,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          color: DIM,
          fontFamily: inter,
          fontSize: 10,
          letterSpacing: 3,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Dacke et al. · Current Biology 23 (2013) 298–300</span>
        <span>
          <span style={{ color: BRASS }}>●</span> Dung ball · payload
        </span>
      </div>
    </AbsoluteFill>
  );
};
