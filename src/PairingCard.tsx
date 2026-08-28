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

// ── Palette — pulled from the concept's visual brief ─────────────────────
const VAULT = "#14100E"; // near-black backing
const PLATE = "#1A1512"; // slightly warmer wood-ground panel
const AMBER = "#C79A5A"; // resin amber / late-wood highlights
const CREAM = "#B8A57C"; // weathered sapwood cream
const BARK = "#6C6155"; // silvery strip-bark
const NEEDLE = "#384A2C"; // deep needle green (used sparingly)
const BONE = "#E8D9B5"; // paper cream

// ── Ring generation ─────────────────────────────────────────────────────
// Trunk cross-section centered at (CX, CY) with max radius R_MAX. Rings are
// generated with variable spacing (drought years compress, wet years widen)
// via a cheap deterministic noise so the pattern reads as real growth.
const CX = 540;
const CY = 495;
const R_MAX = 360;
const R_MIN = 4;

// Seeded PRNG (mulberry32)
const mulberry32 = (a: number) => () => {
  let t = (a += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// Slight elliptical bristlecone silhouette (asymmetric strip-bark) —
// per-angle radius factor. We use a smooth field of cos harmonics so
// every ring shares the same lobed shape, growing outward.
const shapeFactor = (theta: number): number => {
  const t = theta;
  return (
    1 +
    0.04 * Math.cos(t + 0.4) +
    0.03 * Math.cos(2 * t - 0.9) +
    0.02 * Math.cos(3 * t + 1.7) -
    0.02 * Math.sin(2 * t)
  );
};

// A small dent on the "dead" side — bristlecones grow only on a live strip.
const stripBarkDent = (theta: number): number => {
  // Bark stripe centred around θ ≈ 2.2 rad (upper-left)
  const d = Math.cos(theta - 2.2);
  return d > 0.55 ? -0.055 * (d - 0.55) * 6 : 0;
};

const ringRadius = (theta: number, r: number): number =>
  r * (shapeFactor(theta) + stripBarkDent(theta));

const buildRingPath = (r: number): string => {
  if (r < 0.5) return "";
  const steps = 96;
  let d = "";
  for (let i = 0; i <= steps; i++) {
    const th = (i / steps) * Math.PI * 2;
    const rr = ringRadius(th, r);
    const x = CX + Math.cos(th) * rr;
    const y = CY + Math.sin(th) * rr;
    d += (i === 0 ? "M" : "L") + " " + x.toFixed(1) + " " + y.toFixed(1) + " ";
  }
  return d + "Z";
};

// Build ~200 rings from pith (2833 BCE) to bark (2026 CE) with variable widths.
type Ring = { r: number; year: number; drought: number };
const buildRings = (): Ring[] => {
  const yStart = -2833; // BCE negative
  const yEnd = 2026;
  const totalYears = yEnd - yStart; // 4859
  const N = 208;
  const rand = mulberry32(7);
  // Assign non-uniform "yearsPerRing" so density feels organic.
  const raw: number[] = [];
  for (let i = 0; i < N; i++) raw.push(0.6 + rand() * 0.9);
  const sum = raw.reduce((a, b) => a + b, 0);
  let year = yStart;
  const rings: Ring[] = [];
  // Non-linear radius scaling: densest near pith, then eases outward.
  for (let i = 0; i < N; i++) {
    const frac = (i + 1) / N;
    // ease so rings are packed near center, wider farther out
    const eased = Math.pow(frac, 0.72);
    const r = R_MIN + (R_MAX - R_MIN) * eased;
    const yearsThisRing = (raw[i] / sum) * totalYears;
    year += yearsThisRing;
    // Drought signature: occasional very compressed dark rings
    const drought = rand() < 0.11 ? 1 : 0;
    rings.push({ r, year: Math.round(year), drought });
  }
  return rings;
};

const RINGS = buildRings();

// ── Historical annotations — real years that Methuselah lived through ──
// Each annotation gives an on-ring "hit angle" and an absolute target
// position for its label chip, so nothing can clip against the plate frame.
type Anno = {
  year: number;
  label: string;
  subLabel: string;
  angle: number; // radians, direction on the ring to anchor the leader
  chip: { x: number; y: number; side: "left" | "right" };
};
const ANNOS: Anno[] = [
  {
    year: -2833,
    label: "2833 BCE",
    subLabel: "PITH · GERMINATION",
    angle: -Math.PI / 2,
    chip: { x: 605, y: 405, side: "right" },
  },
  {
    year: -2560,
    label: "2560 BCE",
    subLabel: "GREAT PYRAMID BUILT",
    angle: -2.4,
    chip: { x: 265, y: 380, side: "left" },
  },
  {
    year: -776,
    label: "776 BCE",
    subLabel: "FIRST OLYMPIAD",
    angle: -1.1,
    chip: { x: 720, y: 220, side: "right" },
  },
  {
    year: 79,
    label: "79 CE",
    subLabel: "POMPEII BURIED",
    angle: 0.3,
    chip: { x: 860, y: 560, side: "right" },
  },
  {
    year: 1215,
    label: "1215 CE",
    subLabel: "MAGNA CARTA SEALED",
    angle: 0.95,
    chip: { x: 700, y: 780, side: "right" },
  },
  {
    year: 1815,
    label: "1815 CE",
    subLabel: "TAMBORA · FROST RING",
    angle: 2.25,
    chip: { x: 275, y: 680, side: "left" },
  },
  {
    year: 2026,
    label: "2026 CE",
    subLabel: "OUTER BARK · TODAY",
    angle: -2.75,
    chip: { x: 240, y: 210, side: "left" },
  },
];

// Find the ring closest to a given year and return its radius.
const ringRForYear = (y: number): number => {
  let best = RINGS[0];
  let bestD = Math.abs(best.year - y);
  for (const r of RINGS) {
    const d = Math.abs(r.year - y);
    if (d < bestD) {
      best = r;
      bestD = d;
    }
  }
  return best.r;
};

// ── Frame layout (portrait 1080 × 1350) ─────────────────────────────────
const FRAME = { x: 60, y: 130, w: 960, h: 780 };

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Ring paint-on progress: 0.6 s hold, 3.0 s grow
  const growStart = fps * 0.6;
  const growDur = fps * 3.0;
  const growth = interpolate(frame, [growStart, growStart + growDur], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const rGrown = R_MIN + (R_MAX - R_MIN) * growth;

  // Year counter — tied to same growth curve
  const displayedYear = Math.round(-2833 + (2026 - -2833) * growth);
  const yearLabel =
    displayedYear < 0 ? `${-displayedYear} BCE` : `${displayedYear} CE`;

  // Title & hook
  const titleSpring = spring({
    frame: frame - fps * 0.4,
    fps,
    config: { damping: 200, mass: 0.9 },
  });
  const hookOpacity = interpolate(frame, [fps * 1.3, fps * 2.3], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Annotation reveal sequence — after growth completes
  const annoStart = growStart + growDur + fps * 0.2;

  return (
    <AbsoluteFill style={{ backgroundColor: VAULT, fontFamily: inter }}>
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
          color: BARK,
          fontFamily: inter,
          fontSize: 13,
          letterSpacing: 4.5,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Everyday Motivation · No. 003</span>
        <span style={{ color: AMBER }}>2026 · 08 · 28</span>
      </div>

      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          {/* Wood-panel background: subtle warm vignette on the plate */}
          <radialGradient id="plate-vignette" cx="48%" cy="42%" r="70%">
            <stop offset="0%" stopColor="#1F1913" stopOpacity={1} />
            <stop offset="100%" stopColor={PLATE} stopOpacity={1} />
          </radialGradient>
          {/* Pith heartwood glow */}
          <radialGradient id="pith-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={AMBER} stopOpacity={0.9} />
            <stop offset="55%" stopColor={AMBER} stopOpacity={0.18} />
            <stop offset="100%" stopColor={AMBER} stopOpacity={0} />
          </radialGradient>
          {/* Ring stroke gradient (from amber-ish inner to cool cream outer) */}
          <linearGradient id="ring-tint" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor={AMBER} />
            <stop offset="1" stopColor={CREAM} />
          </linearGradient>
          {/* Clip so rings never bleed past frame */}
          <clipPath id="plate-clip">
            <rect x={FRAME.x} y={FRAME.y} width={FRAME.w} height={FRAME.h} />
          </clipPath>
          {/* Soft glow filter for pith */}
          <filter id="soft-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>

        {/* Plate */}
        <rect
          x={FRAME.x}
          y={FRAME.y}
          width={FRAME.w}
          height={FRAME.h}
          fill="url(#plate-vignette)"
        />
        {/* Inner hairline */}
        <rect
          x={FRAME.x + 0.5}
          y={FRAME.y + 0.5}
          width={FRAME.w - 1}
          height={FRAME.h - 1}
          fill="none"
          stroke="#2A231C"
          strokeWidth={1}
        />
        {/* Corner ticks in amber */}
        {(
          [
            [FRAME.x, FRAME.y, 1, 1],
            [FRAME.x + FRAME.w, FRAME.y, -1, 1],
            [FRAME.x, FRAME.y + FRAME.h, 1, -1],
            [FRAME.x + FRAME.w, FRAME.y + FRAME.h, -1, -1],
          ] as const
        ).map(([cx, cy, sx, sy], i) => (
          <g key={i} stroke={AMBER} strokeWidth={1.5} fill="none">
            <line x1={cx} y1={cy} x2={cx + sx * 26} y2={cy} />
            <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 26} />
          </g>
        ))}

        {/* Plate header row — inside the frame */}
        <g
          transform={`translate(${FRAME.x + 26}, ${FRAME.y + 34})`}
          fill={CREAM}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3.4}
          fontWeight={500}
        >
          <text>SPECIMEN · PINUS LONGAEVA · METHUSELAH</text>
        </g>
        <g
          transform={`translate(${FRAME.x + FRAME.w - 26}, ${FRAME.y + 34})`}
          fill={AMBER}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3.4}
          fontWeight={600}
          textAnchor="end"
        >
          <text>PLATE 003 · CROSS-SECTION</text>
        </g>

        {/* Ring assembly, clipped to plate */}
        <g clipPath="url(#plate-clip)">
          {/* Deep wood tint fill of latest grown radius (very subtle) */}
          <circle
            cx={CX}
            cy={CY}
            r={rGrown * 1.03}
            fill={"#221A12"}
            opacity={0.55}
          />

          {/* Concentric rings from pith outward */}
          {RINGS.map((ring, i) => {
            if (ring.r > rGrown) return null;
            const revealFactor =
              1 -
              Math.max(
                0,
                Math.min(1, (ring.r - (rGrown - 20)) / 20),
              );
            const isDrought = ring.drought === 1;
            const strokeW = isDrought ? 0.8 : 1.4;
            const opacity = isDrought
              ? 0.85
              : 0.55 + 0.35 * Math.sin(i * 0.9);
            const col = isDrought ? "#3A2916" : i % 3 === 0 ? AMBER : CREAM;
            return (
              <path
                key={`ring-${i}`}
                d={buildRingPath(ring.r)}
                fill="none"
                stroke={col}
                strokeWidth={strokeW}
                strokeOpacity={opacity * revealFactor}
              />
            );
          })}

          {/* Strip-bark deadwood sliver — a polished silver arc on the "dead" side */}
          <g opacity={Math.min(1, growth * 1.3)}>
            <path
              d={(() => {
                const N = 40;
                const rOuter = R_MAX * 0.995;
                const rInner = R_MAX * 0.88;
                const t0 = 2.2 - 0.55;
                const t1 = 2.2 + 0.55;
                let d = "";
                for (let i = 0; i <= N; i++) {
                  const th = t0 + ((t1 - t0) * i) / N;
                  const rr = ringRadius(th, rOuter);
                  d +=
                    (i === 0 ? "M" : "L") +
                    " " +
                    (CX + Math.cos(th) * rr).toFixed(1) +
                    " " +
                    (CY + Math.sin(th) * rr).toFixed(1) +
                    " ";
                }
                for (let i = N; i >= 0; i--) {
                  const th = t0 + ((t1 - t0) * i) / N;
                  const rr = ringRadius(th, rInner);
                  d +=
                    "L " +
                    (CX + Math.cos(th) * rr).toFixed(1) +
                    " " +
                    (CY + Math.sin(th) * rr).toFixed(1) +
                    " ";
                }
                return d + "Z";
              })()}
              fill={BARK}
              opacity={0.75}
            />
          </g>

          {/* Pith heartwood glow */}
          <circle
            cx={CX}
            cy={CY}
            r={22}
            fill="url(#pith-glow)"
            filter="url(#soft-glow)"
          />
          <circle cx={CX} cy={CY} r={4.2} fill={AMBER} />
          <circle cx={CX} cy={CY} r={1.8} fill={BONE} />
        </g>

        {/* Crosshair reticle centred on pith — small, static, scientific */}
        <g stroke={BONE} strokeOpacity={0.28} strokeWidth={1}>
          <line x1={CX - R_MAX - 20} y1={CY} x2={CX + R_MAX + 20} y2={CY} strokeDasharray="1 6" />
          <line x1={CX} y1={CY - R_MAX - 20} x2={CX} y2={CY + R_MAX + 20} strokeDasharray="1 6" />
        </g>
        {/* Growth cursor — a tiny amber tick sliding out along the +x axis
             as rings paint on, reinforcing the year-counter without stealing focus */}
        <g>
          <line
            x1={CX + rGrown}
            y1={CY - 8}
            x2={CX + rGrown}
            y2={CY + 8}
            stroke={AMBER}
            strokeWidth={1.4}
          />
          <circle cx={CX + rGrown} cy={CY} r={2.6} fill={AMBER} />
        </g>

        {/* Year counter box — floats in bottom-left of plate */}
        <g transform={`translate(${FRAME.x + 26}, ${FRAME.y + FRAME.h - 52})`}>
          <rect
            x={0}
            y={0}
            width={230}
            height={34}
            fill={VAULT}
            stroke={AMBER}
            strokeWidth={1}
          />
          <text
            x={14}
            y={22}
            fill={BARK}
            fontFamily={inter}
            fontSize={10}
            letterSpacing={2.6}
            fontWeight={500}
          >
            RING YEAR
          </text>
          <text
            x={218}
            y={23}
            fill={BONE}
            fontFamily={inter}
            fontSize={15}
            letterSpacing={2}
            fontWeight={600}
            textAnchor="end"
          >
            {yearLabel}
          </text>
        </g>

        {/* Bottom-right rings-counted box */}
        <g
          transform={`translate(${FRAME.x + FRAME.w - 26 - 230}, ${
            FRAME.y + FRAME.h - 52
          })`}
        >
          <rect
            x={0}
            y={0}
            width={230}
            height={34}
            fill={VAULT}
            stroke={AMBER}
            strokeWidth={1}
          />
          <text
            x={14}
            y={22}
            fill={BARK}
            fontFamily={inter}
            fontSize={10}
            letterSpacing={2.6}
            fontWeight={500}
          >
            RINGS COUNTED
          </text>
          <text
            x={218}
            y={23}
            fill={BONE}
            fontFamily={inter}
            fontSize={15}
            letterSpacing={2}
            fontWeight={600}
            textAnchor="end"
          >
            {Math.round((displayedYear - -2833)).toLocaleString()}
          </text>
        </g>

        {/* Historical annotations — leader lines from a ring to a fixed chip */}
        {ANNOS.map((a, i) => {
          const ringR = ringRForYear(a.year);
          const ringVisible = ringR <= rGrown + 0.5;
          const opacity = interpolate(
            frame,
            [annoStart + i * 3, annoStart + i * 3 + 10],
            [0, 1],
            {
              easing: Easing.out(Easing.cubic),
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            },
          );
          if (!ringVisible) return null;

          // Ring anchor point
          const rr = ringRadius(a.angle, ringR);
          const x0 = CX + Math.cos(a.angle) * rr;
          const y0 = CY + Math.sin(a.angle) * rr;

          // Chip geometry — width sized so the longest line clears the padding
          const chipW =
            Math.max(a.label.length * 7.6, a.subLabel.length * 7.3) + 22;
          const chipH = 36;
          const chipX = a.chip.side === "right" ? a.chip.x : a.chip.x - chipW;
          const chipY = a.chip.y;

          // Elbow just outside the chip on the leader side
          const leaderEndX =
            a.chip.side === "right" ? chipX - 4 : chipX + chipW + 4;
          const leaderEndY = chipY + chipH / 2;

          // Bend the leader through a mid elbow so it reads as engineered
          const elbowX =
            a.chip.side === "right"
              ? Math.max(x0 + 20, leaderEndX - 26)
              : Math.min(x0 - 20, leaderEndX + 26);
          const elbowY = leaderEndY;

          return (
            <g key={a.year} opacity={opacity}>
              <circle cx={x0} cy={y0} r={3.4} fill={AMBER} />
              <line
                x1={x0}
                y1={y0}
                x2={elbowX}
                y2={elbowY}
                stroke={AMBER}
                strokeWidth={1}
                strokeOpacity={0.9}
              />
              <line
                x1={elbowX}
                y1={elbowY}
                x2={leaderEndX}
                y2={leaderEndY}
                stroke={AMBER}
                strokeWidth={1}
                strokeOpacity={0.9}
              />
              <rect
                x={chipX}
                y={chipY}
                width={chipW}
                height={chipH}
                fill={VAULT}
                fillOpacity={0.94}
                stroke={AMBER}
                strokeWidth={1}
              />
              <text
                x={chipX + 12}
                y={chipY + 15}
                fill={BONE}
                fontFamily={inter}
                fontSize={12}
                fontWeight={600}
                letterSpacing={2}
              >
                {a.label}
              </text>
              <text
                x={chipX + 12}
                y={chipY + 29}
                fill={AMBER}
                fontFamily={inter}
                fontSize={9}
                fontWeight={500}
                letterSpacing={2.4}
              >
                {a.subLabel}
              </text>
            </g>
          );
        })}

        {/* Caption strip below the plate */}
        <g
          transform={`translate(${FRAME.x}, ${FRAME.y + FRAME.h + 22})`}
          fill={BARK}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
        >
          <text>FIG. 1 · METHUSELAH · ~4,859 RINGS · WHITE MTNS · CA</text>
          <text
            x={FRAME.w}
            textAnchor="end"
            fill={AMBER}
            opacity={0.9}
          >
            1 RING = 1 YEAR
          </text>
        </g>
      </svg>

      {/* Type lockup */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 970,
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
            color: AMBER,
            fontFamily: inter,
            fontSize: 13,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 18,
            fontWeight: 600,
          }}
        >
          Role <span style={{ color: BARK, margin: "0 4px" }}>/</span>
          <span style={{ color: BONE, letterSpacing: 5 }}>Archivist</span>
        </div>

        <div
          style={{
            color: BONE,
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 78,
            lineHeight: 0.96,
            letterSpacing: -1.2,
            fontStyle: "italic",
          }}
        >
          The 4,800-year
          <br />
          archivist.
        </div>

        <div
          style={{
            marginTop: 24,
            color: "#D4C6A4",
            fontFamily: inter,
            fontSize: 18,
            lineHeight: 1.42,
            fontWeight: 400,
            maxWidth: 890,
            opacity: hookOpacity,
          }}
        >
          A single{" "}
          <span style={{ color: AMBER, fontWeight: 600 }}>
            bristlecone pine
          </span>{" "}
          — Methuselah, high in California's White Mountains — has laid down one
          distinct ring every year since ~2833 BCE. By cross-dating overlapping
          bristlecone chronologies, dendrochronologists have built a continuous
          8,700-year archive that calibrates the radiocarbon curve behind every
          organic date on Earth.
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
          color: BARK,
          fontFamily: inter,
          fontSize: 11,
          letterSpacing: 3,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Schulman 1958 · IntCal20 · Reimer et al. 2020</span>
        <span>
          <span style={{ color: AMBER }}>●</span> Pith → Bark
        </span>
      </div>
    </AbsoluteFill>
  );
};
