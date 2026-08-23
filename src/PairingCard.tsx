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

// Palette drawn from the concept's visual brief.
const SKY = "#0B1220";
const SKY_DEEP = "#070A12";
const BONE = "#E8DFCF";
const HEART = "#C69B4A";
const DRIFT = "#7A6D5A";
const FROST = "#2E4C4B";
const FROST_HI = "#4C7A78";
const BONE_DIM = "#8E8778";

// ── Ring model ────────────────────────────────────────────────────────
type Ring = {
  index: number; // 0 = pith
  year: number; // gregorian, negative = BC
  thickness: number;
  frost: boolean;
  tagged?: string;
};

const rnd = (seed: number): number => {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

const PITH_YEAR = -2832; // 2832 BC — approximate Methuselah pith year
const LAST_YEAR = 2026;
const YEARS = LAST_YEAR - PITH_YEAR;
const N_RINGS = 180;
const YEARS_PER_RING = YEARS / N_RINGS;

const TAGGED: Array<{
  year: number;
  label: string;
  sub: string;
}> = [
  { year: -2832, label: "2832 BC", sub: "Methuselah · pith" },
  { year: -43, label: "43 BC", sub: "Okmok II · frost" },
  { year: 1600, label: "AD 1600", sub: "Huaynaputina" },
  { year: 1816, label: "AD 1816", sub: "Tambora · no summer" },
];

const RINGS: Ring[] = Array.from({ length: N_RINGS }, (_, i) => {
  const year = Math.round(PITH_YEAR + i * YEARS_PER_RING);
  const n =
    0.55 * rnd(i * 1.7) +
    0.3 * rnd(i * 0.31 + 5) +
    0.15 * rnd(i * 0.07 + 91);
  const thickness = 0.55 + n * 0.9;
  const frost = rnd(i * 3.3 + 11) > 0.94;
  const tag = TAGGED.find(
    (t) => Math.abs(t.year - year) <= YEARS_PER_RING / 2 + 0.5,
  );
  return {
    index: i,
    year,
    thickness: tag ? 0.58 : thickness,
    frost: tag ? true : frost,
    tagged: tag?.label,
  };
});

const TOT_THICK = RINGS.reduce((s, r) => s + r.thickness, 0);

const cumulativeRadius = (uptoIndex: number, maxR: number): number => {
  let s = 0;
  for (let i = 0; i <= uptoIndex; i++) s += RINGS[i].thickness;
  return (s / TOT_THICK) * maxR;
};

const barkColor = (frost: boolean, i: number): string => {
  if (frost) return FROST_HI;
  const bandedMix = 0.5 + 0.5 * Math.sin(i * 0.9);
  return bandedMix > 0.5 ? BONE : HEART;
};

// ── Layout ────────────────────────────────────────────────────────────
const W = 1080;
const H = 1350;
const DISC = { cx: 740, cy: 870, r: 310 };

// Callouts positioned around the disc in clean corners. Each pins to
// a tagged ring and its card sits in the margin, never on the disc.
// Leader path: tick(on-ring) → preElbow(radius+34) → elbow → card.
type Callout = {
  year: number;
  angleDeg: number;
  elbow: { x: number; y: number };
  card: { x: number; y: number; anchor: "start" | "end" };
};
const CALLOUTS: Callout[] = [
  // Methuselah pith — south-west exit, ends in the bottom-left margin.
  {
    year: -2832,
    angleDeg: 200,
    elbow: { x: 340, y: 976 },
    card: { x: 340, y: 1240, anchor: "end" },
  },
  // 43 BC frost — west exit, ends in the left margin at mid-height.
  {
    year: -43,
    angleDeg: 160,
    elbow: { x: 340, y: 942 },
    card: { x: 340, y: 700, anchor: "end" },
  },
  // AD 1600 — north exit, up into the strip between hook and disc,
  // then right into a horizontal top-right card.
  {
    year: 1600,
    angleDeg: 270,
    elbow: { x: 740, y: 500 },
    card: { x: 900, y: 500, anchor: "end" },
  },
  // AD 1816 — bark, east exit, drops into the bottom-right margin.
  {
    year: 1816,
    angleDeg: 20,
    elbow: { x: 1055, y: 1240 },
    card: { x: 1000, y: 1240, anchor: "end" },
  },
];

const nearestRingToYear = (year: number): Ring =>
  RINGS.reduce((acc, rr) =>
    Math.abs(rr.year - year) < Math.abs(acc.year - year) ? rr : acc,
  );

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Grow outward from the pith.
  const growSpan = fps * 3.0;
  const growT = Math.max(0, Math.min(1, frame / growSpan));
  const growEased = 1 - Math.pow(1 - growT, 3);

  // Radial pulse that re-traces the record after settle.
  const pulseCycle = fps * 4.5;
  const pulseF = ((frame - fps * 3.4) % pulseCycle) / pulseCycle;
  const pulseOn = frame > fps * 3.4;

  // Type staging.
  const titleSpring = spring({
    frame: frame - fps * 0.1,
    fps,
    config: { damping: 200, mass: 0.8 },
  });
  const hookOpacity = interpolate(frame, [fps * 0.9, fps * 1.7], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: SKY, fontFamily: inter }}>
      <style>{fontCss}</style>

      {/* ── Background: sky vignette + ledger grid ─────────────── */}
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          <radialGradient id="page-vignette" cx="30%" cy="20%" r="95%">
            <stop offset="0%" stopColor="#111827" stopOpacity={1} />
            <stop offset="100%" stopColor={SKY_DEEP} stopOpacity={1} />
          </radialGradient>
          <radialGradient id="pith-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={HEART} stopOpacity={0.9} />
            <stop offset="100%" stopColor={HEART} stopOpacity={0} />
          </radialGradient>
          <radialGradient id="disc-edge" cx="50%" cy="50%" r="50%">
            <stop offset="86%" stopColor={SKY_DEEP} stopOpacity={0} />
            <stop offset="100%" stopColor={SKY_DEEP} stopOpacity={0.9} />
          </radialGradient>
          <pattern
            id="ledger"
            x={0}
            y={0}
            width={40}
            height={40}
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke="#121a26"
              strokeWidth={1}
            />
          </pattern>
          <filter id="soft-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="6" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect x={0} y={0} width={W} height={H} fill="url(#page-vignette)" />
        <rect x={0} y={0} width={W} height={H} fill="url(#ledger)" opacity={0.4} />

        {/* Archive spine rules */}
        <line
          x1={64}
          y1={120}
          x2={64}
          y2={H - 130}
          stroke={DRIFT}
          strokeOpacity={0.32}
          strokeWidth={1}
        />
        <line
          x1={W - 64}
          y1={120}
          x2={W - 64}
          y2={H - 130}
          stroke={DRIFT}
          strokeOpacity={0.15}
          strokeWidth={1}
        />

        {/* ── Disc: concentric rings ────────────────────────────── */}
        {RINGS.slice()
          .reverse()
          .map((r) => {
            const outer = cumulativeRadius(r.index, DISC.r);
            const inner =
              r.index === 0 ? 0 : cumulativeRadius(r.index - 1, DISC.r);
            const width = Math.max(0.7, outer - inner);
            const shift = r.index / RINGS.length;
            const localT = Math.max(0, Math.min(1, (growEased - shift) * 8));
            if (localT <= 0.001) return null;
            const rMid = (outer + inner) / 2 * localT;
            return (
              <circle
                key={r.index}
                cx={DISC.cx}
                cy={DISC.cy}
                r={rMid}
                fill="none"
                stroke={barkColor(r.frost, r.index)}
                strokeOpacity={r.frost ? 0.98 : 0.9}
                strokeWidth={width * (r.frost ? 1.4 : 1.0)}
              />
            );
          })}

        {/* Disc soft edge vignette (visually softens the outer bark) */}
        <circle
          cx={DISC.cx}
          cy={DISC.cy}
          r={DISC.r + 2}
          fill="url(#disc-edge)"
        />
        {/* Cambium hairline */}
        <circle
          cx={DISC.cx}
          cy={DISC.cy}
          r={DISC.r * growEased}
          fill="none"
          stroke={HEART}
          strokeOpacity={0.55 * growEased}
          strokeWidth={1.1}
        />

        {/* Pith */}
        <circle
          cx={DISC.cx}
          cy={DISC.cy}
          r={20}
          fill="url(#pith-glow)"
          opacity={growEased}
        />
        <circle
          cx={DISC.cx}
          cy={DISC.cy}
          r={4}
          fill={BONE}
          opacity={growEased}
        />

        {/* Radial pulse re-tracing the record */}
        {pulseOn && (
          <circle
            cx={DISC.cx}
            cy={DISC.cy}
            r={pulseF * DISC.r}
            fill="none"
            stroke={BONE}
            strokeOpacity={(1 - pulseF) * 0.32}
            strokeWidth={2.2}
            filter="url(#soft-glow)"
          />
        )}

        {/* ── Callouts ─────────────────────────────────────────── */}
        {CALLOUTS.map((c, i) => {
          const cardOpacity = interpolate(
            frame,
            [fps * (2.3 + i * 0.16), fps * (2.9 + i * 0.16)],
            [0, 1],
            {
              easing: Easing.out(Easing.cubic),
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            },
          );
          if (cardOpacity <= 0.001) return null;
          const tag = TAGGED.find((t) => t.year === c.year)!;
          const r = nearestRingToYear(c.year);
          const radius = cumulativeRadius(r.index, DISC.r);
          const a = (c.angleDeg * Math.PI) / 180;
          // For pith (radius ≈ 0), skip the tick-across-ring and start
          // the leader from the pith centre.
          const startR = Math.max(radius, 2);
          const tickIn = {
            x: DISC.cx + Math.cos(a) * (startR - 6),
            y: DISC.cy + Math.sin(a) * (startR - 6),
          };
          const tickOut = {
            x: DISC.cx + Math.cos(a) * (startR + 10),
            y: DISC.cy + Math.sin(a) * (startR + 10),
          };
          const preElbow = {
            x: DISC.cx + Math.cos(a) * (startR + 34),
            y: DISC.cy + Math.sin(a) * (startR + 34),
          };
          const isEnd = c.card.anchor === "end";
          const isPith = c.year === PITH_YEAR;
          const leaderPath = `M ${preElbow.x} ${preElbow.y} L ${c.elbow.x} ${c.elbow.y} L ${c.card.x} ${c.card.y}`;
          return (
            <g key={i} opacity={cardOpacity}>
              {/* Dark backing stroke so the leader stays legible over wood */}
              <path
                d={leaderPath}
                fill="none"
                stroke={SKY_DEEP}
                strokeOpacity={0.9}
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Bright bone leader on top */}
              <path
                d={leaderPath}
                fill="none"
                stroke={BONE}
                strokeOpacity={0.85}
                strokeWidth={1.1}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Tick across the ring (or a small pith crosshair) */}
              {isPith ? (
                <g stroke={BONE} strokeWidth={1.4}>
                  <line
                    x1={DISC.cx - 8}
                    y1={DISC.cy}
                    x2={DISC.cx + 8}
                    y2={DISC.cy}
                  />
                  <line
                    x1={DISC.cx}
                    y1={DISC.cy - 8}
                    x2={DISC.cx}
                    y2={DISC.cy + 8}
                  />
                </g>
              ) : (
                <line
                  x1={tickIn.x}
                  y1={tickIn.y}
                  x2={tickOut.x}
                  y2={tickOut.y}
                  stroke={HEART}
                  strokeWidth={2.2}
                />
              )}
              {/* Card marker */}
              <circle cx={c.card.x} cy={c.card.y} r={2.6} fill={HEART} />
              <text
                x={c.card.x + (isEnd ? -12 : 12)}
                y={c.card.y - 8}
                textAnchor={c.card.anchor}
                fill={BONE}
                fontFamily={inter}
                fontSize={17}
                fontWeight={600}
                letterSpacing={4}
              >
                {tag.label.toUpperCase()}
              </text>
              <text
                x={c.card.x + (isEnd ? -12 : 12)}
                y={c.card.y + 14}
                textAnchor={c.card.anchor}
                fill={BONE_DIM}
                fontFamily={inter}
                fontSize={12}
                fontWeight={500}
                letterSpacing={2.4}
              >
                {tag.sub.toUpperCase()}
              </text>
            </g>
          );
        })}
      </svg>

      {/* ── Top metadata band ───────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          top: 56,
          left: 80,
          right: 80,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          color: BONE_DIM,
          fontFamily: inter,
          fontSize: 13,
          letterSpacing: 4.5,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Everyday Motivation · No. 003</span>
        <span style={{ color: HEART }}>2026 · 08 · 23</span>
      </div>

      {/* ── Type lockup (upper-left) ────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          top: 148,
          width: 680,
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
            color: HEART,
            fontFamily: inter,
            fontSize: 13,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 20,
            fontWeight: 600,
          }}
        >
          Role <span style={{ color: DRIFT, margin: "0 6px" }}>/</span>
          <span style={{ color: BONE, letterSpacing: 5 }}>Archivist</span>
        </div>

        <div
          style={{
            color: BONE,
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 96,
            lineHeight: 0.94,
            letterSpacing: -1.6,
            fontStyle: "italic",
          }}
        >
          The living
          <br />
          archive.
        </div>
      </div>

      {/* ── Hook paragraph (under the title, left column) ───────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          top: 460,
          width: 540,
          color: "#CFC9BB",
          fontFamily: inter,
          fontSize: 18,
          lineHeight: 1.5,
          fontWeight: 400,
          opacity: hookOpacity,
        }}
      >
        A single Great Basin bristlecone in California's White Mountains —{" "}
        <span style={{ color: BONE, fontWeight: 600 }}>Methuselah</span> —
        has laid down about 4,857 annual rings. Cross-matched with dead wood
        on the same slope, its record extends an{" "}
        <span style={{ color: HEART, fontWeight: 600 }}>
          unbroken 8,800-year chronology
        </span>{" "}
        that calibrates every radiocarbon date on Earth.
      </div>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          bottom: 50,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          color: BONE_DIM,
          fontFamily: inter,
          fontSize: 11,
          letterSpacing: 3,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Ferguson 1969 · IntCal · White Mts., CA</span>
        <span>
          <span style={{ color: FROST_HI }}>▬</span>{" "}
          <span>Frost ring = Volcanic winter</span>
        </span>
      </div>
    </AbsoluteFill>
  );
};
