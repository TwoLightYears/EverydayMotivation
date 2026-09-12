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
const INK = "#0F1210";
const WOOD_SILVER = "#C6B99A";
const AMBER = "#B57935";
const HIGHLIGHT = "#E9B865";
const NEEDLE = "#3F4F3D";
// tints/shades derived from the palette
const INK_2 = "#161A17";
const INK_3 = "#1D211D";
const WOOD_SILVER_DIM = "#8C8371";
const WOOD_SILVER_DEEP = "#5E5949";
const AMBER_DEEP = "#7A4E22";
const TEXT_PRIMARY = "#EFE6D0"; // warm cream
const TEXT_SECONDARY = "#9B9484";
const TEXT_MUTED = "#6E6858";

// ── The archive ledger: real dated events in the Methuselah tree's lifespan ─
// Methuselah's pith year is ~2832 BCE (4,789 rings when cored in 1957);
// by 2026 that's 4,858 rings total. Each entry: (year, short label).
type Entry = { year: number; short: string; note: string };
// Negative = BCE. Positive = CE.
const ENTRIES: Entry[] = [
  { year: -2832, short: "PITH", note: "First ring · Old Kingdom Egypt" },
  { year: -776, short: "FIRST OLYMPIAD", note: "Games at Olympia" },
  { year: 79, short: "VESUVIUS", note: "Pompeii buried" },
  { year: 1215, short: "MAGNA CARTA", note: "Runnymede" },
  { year: 1610, short: "GALILEO’S MOONS", note: "Sidereus Nuncius" },
  { year: 1957, short: "SCHULMAN CORE", note: "4,789 rings crossdated" },
];

const NOW_YEAR = 2026;
const PITH_YEAR = -2832; // Methuselah's approximate germination year
const TOTAL_RINGS = NOW_YEAR - PITH_YEAR; // = 4858

// Map a calendar year (BCE negative, CE positive) to a fraction 0..1
// where 0 is the pith (oldest) and 1 is the bark (2026).
const yearToFrac = (y: number) => (y - PITH_YEAR) / TOTAL_RINGS;

// ── Deterministic pseudo-random for ring-thickness modulation ──────────────
const hash = (n: number) => {
  let x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

// Precompute a compact set of visible rings (we draw ~140 rings that
// visually stand for 4,858 — dense near pith, wider near bark, just
// as bristlecones actually grow).
const VISIBLE_RING_COUNT = 148;
const ringFracs: number[] = [];
for (let i = 0; i < VISIBLE_RING_COUNT; i++) {
  // Bias toward outer half — bristlecone growth rings are near-hairline
  // near the pith and slightly wider at the margin in wetter years.
  const t = i / (VISIBLE_RING_COUNT - 1);
  // A gentle sqrt easing puts more rings near the pith, matching how
  // slow interior growth compresses centuries into a thin core.
  const biased = 1 - Math.pow(1 - t, 1.35);
  // Small jitter so the rings feel drawn, not printed.
  const jitter = (hash(i * 17.11) - 0.5) * 0.006;
  ringFracs.push(Math.max(0.004, Math.min(0.998, biased + jitter)));
}

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // ── Timing ────────────────────────────────────────────────────────────
  // 0.0s : slice fades in
  // 0.6s : sweep begins (highlight travels from bark → pith)
  // 5.0s : sweep completes; hero still holds through end
  const sliceFade = interpolate(frame, [0, fps * 0.5], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const sweepStart = fps * 0.6;
  const sweepEnd = fps * 5.0;
  const sweepT = interpolate(frame, [sweepStart, sweepEnd], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
  // Sweep goes from bark (frac 1) → pith (frac 0)
  const sweepFrac = 1 - sweepT;

  const titleSpring = spring({
    frame: frame - fps * 0.35,
    fps,
    config: { damping: 200, mass: 0.8 },
  });

  const hookOpacity = interpolate(frame, [fps * 1.0, fps * 1.9], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Layout (1080 × 1350 portrait) ─────────────────────────────────────
  // Margin grid: outer margin 80. Interior column starts at 80.
  // Metadata band  : y 56
  // Slice zone     : y 130..790 (h 660, w 960)
  // Caption strip  : y 812
  // Type lockup    : y 900+
  // Footer         : bottom 50
  const FRAME = { x: 60, y: 130, w: 960, h: 660 };

  // Slice geometry: circle offset to the right so the left margin holds
  // the archivist's index-card column.
  const CX = FRAME.x + FRAME.w * 0.68;
  const CY = FRAME.y + FRAME.h * 0.51;
  const R_MAX = 305; // outer bark radius (px)
  const R_MIN = 6; // pith radius (px)

  // Compute where each dated entry lands radially
  const entryData = ENTRIES.map((e) => {
    const frac = yearToFrac(e.year);
    const r = R_MIN + (R_MAX - R_MIN) * frac;
    return { ...e, frac, r };
  });

  // Where the currently sweeping highlight ring sits
  const sweepR = R_MIN + (R_MAX - R_MIN) * sweepFrac;

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
          color: TEXT_SECONDARY,
          fontFamily: inter,
          fontSize: 13,
          letterSpacing: 4.5,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Everyday Motivation · No. 003</span>
        <span style={{ color: HIGHLIGHT }}>2026 · 09 · 12</span>
      </div>

      {/* Main SVG canvas */}
      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          {/* Vault vignette */}
          <radialGradient id="vault" cx="70%" cy="45%" r="80%">
            <stop offset="0%" stopColor={INK_3} stopOpacity={1} />
            <stop offset="100%" stopColor={INK} stopOpacity={1} />
          </radialGradient>

          {/* Slice base gradient (warm heartwood → silvered, weathered exterior) */}
          <radialGradient id="wood" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={AMBER} />
            <stop offset="18%" stopColor={AMBER_DEEP} stopOpacity={0.9} />
            <stop offset="52%" stopColor={WOOD_SILVER_DEEP} />
            <stop offset="82%" stopColor={WOOD_SILVER_DIM} />
            <stop offset="100%" stopColor={WOOD_SILVER} />
          </radialGradient>

          {/* Highlight glow used for the sweep */}
          <radialGradient id="sweep-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={HIGHLIGHT} stopOpacity={0.9} />
            <stop offset="100%" stopColor={HIGHLIGHT} stopOpacity={0} />
          </radialGradient>

          {/* Subtle wood-grain noise via displacement */}
          <filter id="grain" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.9"
              numOctaves="2"
              seed="7"
            />
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 0
                      0 0 0 0 0
                      0 0 0 0 0
                      0 0 0 0.09 0"
            />
            <feComposite in2="SourceGraphic" operator="in" />
          </filter>

          {/* Clip everything ring-related to the outer bark circle */}
          <clipPath id="bark">
            <circle cx={CX} cy={CY} r={R_MAX} />
          </clipPath>

          {/* Soft mask for the sweep ring band */}
          <filter id="soft-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>

        {/* Vault background inside the working frame */}
        <rect
          x={FRAME.x}
          y={FRAME.y}
          width={FRAME.w}
          height={FRAME.h}
          fill="url(#vault)"
        />

        {/* Corner registration marks — an archivist's plate */}
        {(
          [
            [FRAME.x, FRAME.y, 1, 1],
            [FRAME.x + FRAME.w, FRAME.y, -1, 1],
            [FRAME.x, FRAME.y + FRAME.h, 1, -1],
            [FRAME.x + FRAME.w, FRAME.y + FRAME.h, -1, -1],
          ] as const
        ).map(([cx, cy, sx, sy], i) => (
          <g key={i} stroke={WOOD_SILVER_DEEP} strokeWidth={1.2} fill="none">
            <line x1={cx} y1={cy} x2={cx + sx * 24} y2={cy} />
            <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 24} />
          </g>
        ))}


        {/* Slice group — fades in */}
        <g opacity={sliceFade}>
          {/* Outer bark ring — a slightly rough, darker halo */}
          <circle
            cx={CX}
            cy={CY}
            r={R_MAX + 6}
            fill="none"
            stroke={WOOD_SILVER_DEEP}
            strokeWidth={2}
            opacity={0.55}
          />

          {/* Wood base fill */}
          <circle cx={CX} cy={CY} r={R_MAX} fill="url(#wood)" />

          {/* Growth-ring lines, clipped to the bark */}
          <g clipPath="url(#bark)">
            {ringFracs.map((f, i) => {
              const r = R_MIN + (R_MAX - R_MIN) * f;
              // Rings alternate faintly light/dark (early/latewood)
              const isLate = i % 2 === 0;
              const base = isLate ? WOOD_SILVER_DEEP : AMBER_DEEP;
              // Distance from the current sweep ring — lights the passing ring
              const d = Math.abs(f - sweepFrac);
              const sweepBoost =
                d < 0.03 ? 1 - d / 0.03 : 0; // 0..1 near the sweep
              const stroke = sweepBoost > 0.05 ? HIGHLIGHT : base;
              const alpha =
                sweepBoost > 0.05
                  ? 0.5 + 0.5 * sweepBoost
                  : 0.55 + 0.35 * hash(i * 3.11);
              const w = 0.7 + (isLate ? 0.2 : 0);
              return (
                <circle
                  key={`ring-${i}`}
                  cx={CX}
                  cy={CY}
                  r={r}
                  fill="none"
                  stroke={stroke}
                  strokeWidth={w + sweepBoost * 0.9}
                  opacity={alpha}
                />
              );
            })}

            {/* The moving amber sweep band */}
            <circle
              cx={CX}
              cy={CY}
              r={sweepR}
              fill="none"
              stroke={HIGHLIGHT}
              strokeWidth={3}
              opacity={0.85}
              filter="url(#soft-glow)"
            />
            <circle
              cx={CX}
              cy={CY}
              r={sweepR}
              fill="none"
              stroke={HIGHLIGHT}
              strokeWidth={1.1}
              opacity={0.95}
            />

            {/* Grain noise overlay to break the printed feel */}
            <circle
              cx={CX}
              cy={CY}
              r={R_MAX}
              fill={WOOD_SILVER}
              filter="url(#grain)"
              opacity={0.55}
            />
          </g>

          {/* Pith mark */}
          <circle cx={CX} cy={CY} r={2.4} fill={AMBER_DEEP} />

          {/* Compass tick at bark (12 o'clock) — "outer margin = 2026" */}
          <g>
            <line
              x1={CX}
              y1={CY - R_MAX - 4}
              x2={CX}
              y2={CY - R_MAX - 18}
              stroke={HIGHLIGHT}
              strokeWidth={1.3}
            />
            <text
              x={CX}
              y={CY - R_MAX - 26}
              textAnchor="middle"
              fill={HIGHLIGHT}
              fontFamily={inter}
              fontSize={11}
              fontWeight={600}
              letterSpacing={3.2}
            >
              2026 CE
            </text>
          </g>
        </g>

        {/* ── The archivist's index-card column, left margin ────────────── */}
        {/* Each entry: leader from the ring, into a rule, into label text. */}
        {(() => {
          // Vertical stacking anchors for the card labels
          const cardX = FRAME.x + 26;
          const cardWidth = 300;
          const yTop = FRAME.y + 46;
          const yBot = FRAME.y + FRAME.h - 40;
          const stepY = (yBot - yTop) / (entryData.length - 1);

          return entryData.map((e, i) => {
            const revealFrac = 1 - i * 0.16; // outer entries first
            const revealSweep = 1 - sweepFrac; // 0..1 from bark→pith
            // Entry appears when the sweep passes its ring
            const active = sweepFrac <= e.frac + 0.005;
            const appear = interpolate(
              revealSweep,
              [1 - e.frac - 0.02, 1 - e.frac + 0.05],
              [0, 1],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
            );

            const cardY = yTop + stepY * i;

            // Leader path from the ring on the slice to the card
            // Anchor on the ring at the same y as the card (project to circle)
            const dy = cardY - CY;
            const clampedDy = Math.max(-e.r + 2, Math.min(e.r - 2, dy));
            const dx = -Math.sqrt(Math.max(0, e.r * e.r - clampedDy * clampedDy));
            const ringPtX = CX + dx;
            const ringPtY = CY + clampedDy;

            // Elbow: horizontal short segment out of the ring, then long run
            const elbowX = ringPtX - 22;
            const cardEndX = cardX + cardWidth - 4;

            // Small dot on the ring
            return (
              <g key={`card-${i}`} opacity={appear}>
                {/* Leader line */}
                <path
                  d={`M ${ringPtX} ${ringPtY} L ${elbowX} ${ringPtY} L ${elbowX} ${cardY} L ${cardEndX} ${cardY}`}
                  fill="none"
                  stroke={active ? HIGHLIGHT : WOOD_SILVER_DIM}
                  strokeWidth={active ? 1.3 : 1}
                  opacity={0.85}
                />
                {/* Tick on the ring */}
                <circle
                  cx={ringPtX}
                  cy={ringPtY}
                  r={3.2}
                  fill={active ? HIGHLIGHT : WOOD_SILVER}
                  stroke={INK}
                  strokeWidth={1}
                />

                {/* Card label */}
                <g transform={`translate(${cardX}, ${cardY - 26})`}>
                  {/* Year band */}
                  <text
                    x={0}
                    y={0}
                    fill={active ? HIGHLIGHT : NEEDLE}
                    fontFamily={inter}
                    fontSize={11}
                    fontWeight={600}
                    letterSpacing={3.5}
                  >
                    {formatYear(e.year)}
                  </text>
                  {/* Short caption */}
                  <text
                    x={0}
                    y={19}
                    fill={TEXT_PRIMARY}
                    fontFamily={playfair}
                    fontStyle="italic"
                    fontWeight={500}
                    fontSize={19}
                  >
                    {e.short}
                  </text>
                  {/* Note */}
                  <text
                    x={0}
                    y={38}
                    fill={TEXT_MUTED}
                    fontFamily={inter}
                    fontSize={11}
                    letterSpacing={1.2}
                    fontWeight={500}
                  >
                    {e.note}
                  </text>
                </g>
              </g>
            );
          });
        })()}

        {/* Caption strip just below the frame */}
        <g
          transform={`translate(${FRAME.x}, ${FRAME.y + FRAME.h + 26})`}
          fill={TEXT_SECONDARY}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
        >
          <text>
            FIG. 1 · METHUSELAH · P. LONGAEVA · 4,858 GROWTH RINGS
          </text>
          <text x={FRAME.w} textAnchor="end" fill={HIGHLIGHT} opacity={0.9}>
            ONE RING · ONE YEAR
          </text>
        </g>
      </svg>

      {/* ── Type lockup ────────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 900,
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
            color: HIGHLIGHT,
            fontFamily: inter,
            fontSize: 13,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 18,
            fontWeight: 600,
          }}
        >
          Role <span style={{ color: TEXT_SECONDARY, margin: "0 4px" }}>/</span>
          <span style={{ color: "#EDEDEF", letterSpacing: 5 }}>Archivist</span>
        </div>

        <div
          style={{
            color: "#F4F0E2",
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 84,
            lineHeight: 0.96,
            letterSpacing: -1.4,
            fontStyle: "italic",
          }}
        >
          The tree that
          <br />
          keeps the ledger.
        </div>

        <div
          style={{
            marginTop: 28,
            color: "#D6CFB8",
            fontFamily: inter,
            fontSize: 19,
            lineHeight: 1.42,
            fontWeight: 400,
            maxWidth: 900,
            opacity: hookOpacity,
          }}
        >
          Great Basin bristlecones (
          <span style={{ color: HIGHLIGHT, fontWeight: 600 }}>
            Pinus longaeva
          </span>
          ) lay down exactly one narrow growth ring each year and preserve them
          for millennia in dense, resin-soaked wood — Edmund Schulman
          crossdated 4,789 rings in the "Methuselah" tree in 1957.
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
          color: TEXT_SECONDARY,
          fontFamily: inter,
          fontSize: 11,
          letterSpacing: 3,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Schulman · Science 128 (1958) · White Mtns, CA</span>
        <span>
          <span style={{ color: HIGHLIGHT }}>●</span> Ring = Calendar year
        </span>
      </div>
    </AbsoluteFill>
  );
};

// Format a signed year as BCE / CE with thousands separator
function formatYear(y: number): string {
  if (y < 0) return `${Math.abs(y).toLocaleString()} BCE`;
  return `${y} CE`;
}
