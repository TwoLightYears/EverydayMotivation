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
const INK = "#14100C";
const BOARD = "#1A1511";
const PAPER = "#E8DDCA";
const WOOD_LIGHT = "#D9C8AC";
const OCHRE = "#A47142";
const DARK = "#3C2A1A";
const GILT = "#D8A24A";
const GRAY = "#8F8378";
const GRID = "#221A12";
const GRID_MAJOR = "#2E2418";

// Cross-section parameters (SVG coords 1080×1350)
const CENTER = { x: 370, y: 495 };
const R_MAX = 260;
const RING_COUNT = 110;

const YEAR_MIN = -2850; // 2850 BCE at the pith
const YEAR_MAX = 2026; // present outer surface
const YEAR_SPAN = YEAR_MAX - YEAR_MIN;

const yearToR = (y: number) => ((y - YEAR_MIN) / YEAR_SPAN) * R_MAX;

const pseudo = (i: number, seed: number) => {
  const x = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

type Ring = {
  r: number;
  year: number;
  width: number;
  shade: number; // 0..1, darker = latewood
};
// Rings crowd toward the outer edge (bristlecones grow slowly at maturity).
const RINGS: Ring[] = Array.from({ length: RING_COUNT }, (_, idx) => {
  const i = idx + 1;
  // Non-linear mapping concentrates ring density near the bark
  const u = Math.pow(i / RING_COUNT, 0.78);
  const r = u * R_MAX;
  const year = YEAR_MIN + u * YEAR_SPAN;
  const width = 0.55 + pseudo(i, 1) * 1.1;
  const shade = 0.4 + pseudo(i, 3) * 0.6;
  return { r, year, width, shade };
});

// Slight eccentric drift for each ring — a real stump is never perfectly round
const driftFor = (r: number) => {
  const amt = (r / R_MAX) * 10;
  return {
    dx: Math.sin(r * 0.031) * amt + Math.cos(r * 0.017) * amt * 0.4,
    dy: Math.cos(r * 0.029) * amt * 0.7 + Math.sin(r * 0.013) * amt * 0.3,
  };
};

const ringPath = (r: number, seed: number, segments = 72): string => {
  const { dx, dy } = driftFor(r);
  const cx = CENTER.x + dx;
  const cy = CENTER.y + dy;
  let d = "";
  for (let k = 0; k <= segments; k++) {
    const theta = (k / segments) * Math.PI * 2;
    // Low-frequency undulation — organic, not jittery
    const n1 = Math.sin(theta * 3 + seed * 1.7) * 0.6;
    const n2 = Math.sin(theta * 7 + seed * 3.1) * 0.35;
    const rr = r + (n1 + n2) * 1.4;
    const x = cx + Math.cos(theta) * rr;
    const y = cy + Math.sin(theta) * rr * 0.965; // slight vertical squish
    d += (k === 0 ? "M " : "L ") + x.toFixed(2) + " " + y.toFixed(2) + " ";
  }
  d += "Z";
  return d;
};

// Archival index cards for key frost rings
type Card = {
  year: number;
  tag: string;
  title: string;
  event: string;
  anchorTheta: number; // angle on the disc where the leader attaches
  cardY: number; // absolute y of the card in SVG coords
};

const CARDS: Card[] = [
  {
    year: -1627,
    tag: "1627 BCE",
    title: "Frost ring",
    event: "Aerosol-veil summer",
    anchorTheta: -1.05, // upper right of disc
    cardY: 230,
  },
  {
    year: 536,
    tag: "536 CE",
    title: "Frost ring",
    event: "Dust-veil year",
    anchorTheta: -0.25,
    cardY: 420,
  },
  {
    year: 1816,
    tag: "1816 CE",
    title: "Frost ring",
    event: "Tambora summer",
    anchorTheta: 0.65,
    cardY: 620,
  },
];

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Timeline (seconds)
  // 0.0–1.0  rings grow from pith outward
  // 0.6–1.2  title spring in
  // 1.0–2.0  hook paragraph fades in
  // 1.2–4.8  gold scanning arc sweeps pith→bark
  // Cards fade as the arc crosses their radius
  const growSpan = fps * 1.0;
  const ringsT = Math.min(1, Math.max(0, frame) / growSpan);

  const titleSpring = spring({
    frame: frame - fps * 0.5,
    fps,
    config: { damping: 200, mass: 0.8 },
  });

  const hookOpacity = interpolate(frame, [fps * 1.0, fps * 1.9], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Scanning arc from pith to bark — completes by ~3.4s so stills land clean
  const scanStart = fps * 1.1;
  const scanEnd = fps * 3.4;
  const scanT = interpolate(frame, [scanStart, scanEnd], [0, 1], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const scanR = scanT * R_MAX;

  // Scan after completion: faint persistent trace at outer bark
  const scanTrailOpacity = interpolate(
    frame,
    [scanEnd - 2, scanEnd + 10, fps * 5],
    [0.9, 0.55, 0.45],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Reveal-based opacity for each card as scan crosses its ring
  const cardOpacity = (cardR: number) => {
    const reveal = interpolate(
      scanR,
      [cardR - 4, cardR + 22],
      [0, 1],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
    );
    return reveal;
  };

  // Page layout (1080×1350)
  const FRAME = { x: 60, y: 130, w: 960, h: 711 };

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
          color: GRAY,
          fontFamily: inter,
          fontSize: 13,
          letterSpacing: 4.5,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Everyday Motivation · No. 003</span>
        <span style={{ color: GILT }}>2026 · 11 · 07</span>
      </div>

      {/* Drafting frame + cross-section */}
      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          <pattern
            id="grid"
            x={FRAME.x}
            y={FRAME.y}
            width={48}
            height={48}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M 48 0 L 0 0 0 48`}
              fill="none"
              stroke={GRID}
              strokeWidth={1}
            />
          </pattern>
          <pattern
            id="grid-major"
            x={FRAME.x}
            y={FRAME.y}
            width={192}
            height={192}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M 192 0 L 0 0 0 192`}
              fill="none"
              stroke={GRID_MAJOR}
              strokeWidth={1}
            />
          </pattern>

          <radialGradient id="disc-vignette" cx="44%" cy="42%" r="66%">
            <stop offset="0%" stopColor={PAPER} stopOpacity={1} />
            <stop offset="55%" stopColor={WOOD_LIGHT} stopOpacity={1} />
            <stop offset="100%" stopColor={OCHRE} stopOpacity={1} />
          </radialGradient>

          {/* Directional lean — more mass on the upper-left (NW aspect) */}
          <linearGradient id="lean-shade" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={DARK} stopOpacity={0} />
            <stop offset="100%" stopColor={DARK} stopOpacity={0.28} />
          </linearGradient>

          <radialGradient id="pith" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={DARK} stopOpacity={1} />
            <stop offset="60%" stopColor={DARK} stopOpacity={0.6} />
            <stop offset="100%" stopColor={DARK} stopOpacity={0} />
          </radialGradient>

          <radialGradient id="board-vignette" cx="50%" cy="40%" r="70%">
            <stop offset="0%" stopColor="#1C1612" stopOpacity={1} />
            <stop offset="100%" stopColor={BOARD} stopOpacity={1} />
          </radialGradient>

          <filter id="scan-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Clip disc so rings don't bleed past the bark */}
          <clipPath id="disc-clip">
            <path d={ringPath(R_MAX + 4, 0)} />
          </clipPath>
        </defs>

        {/* Drafting board */}
        <rect
          x={FRAME.x}
          y={FRAME.y}
          width={FRAME.w}
          height={FRAME.h}
          fill="url(#board-vignette)"
        />
        <rect
          x={FRAME.x}
          y={FRAME.y}
          width={FRAME.w}
          height={FRAME.h}
          fill="url(#grid)"
        />
        <rect
          x={FRAME.x}
          y={FRAME.y}
          width={FRAME.w}
          height={FRAME.h}
          fill="url(#grid-major)"
        />

        {/* Inner thin border */}
        <rect
          x={FRAME.x + 0.5}
          y={FRAME.y + 0.5}
          width={FRAME.w - 1}
          height={FRAME.h - 1}
          fill="none"
          stroke="#2A2218"
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
          <g key={i} stroke={GILT} strokeWidth={1.5} fill="none">
            <line x1={cx} y1={cy} x2={cx + sx * 26} y2={cy} />
            <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 26} />
          </g>
        ))}

        {/* Scale bar (radial = 1,000 yr) */}
        <g
          transform={`translate(${FRAME.x + FRAME.w - 240}, ${
            FRAME.y + FRAME.h - 28
          })`}
          stroke={GRAY}
          fill={GRAY}
          fontFamily={inter}
          fontSize={10}
          letterSpacing={3}
          fontWeight={500}
        >
          <line x1={0} y1={0} x2={120} y2={0} strokeWidth={1.2} />
          <line x1={0} y1={-5} x2={0} y2={5} strokeWidth={1.2} />
          <line x1={60} y1={-3} x2={60} y2={3} strokeWidth={1.2} />
          <line x1={120} y1={-5} x2={120} y2={5} strokeWidth={1.2} />
          <text x={132} y={4} stroke="none">
            1,000 YR
          </text>
        </g>

        {/* Chronology key — pith→bark axis */}
        <g
          transform={`translate(${FRAME.x + 26}, ${FRAME.y + 24})`}
          fontFamily={inter}
        >
          <text
            y={0}
            fill={GILT}
            fontSize={10}
            letterSpacing={3.2}
            fontWeight={600}
          >
            CHRONOLOGY
          </text>
          <text
            y={18}
            fill={GRAY}
            fontSize={10}
            letterSpacing={2.4}
            fontWeight={500}
          >
            PITH 2850 BCE → BARK 2026 CE
          </text>
        </g>

        {/* ── Cross-section ──────────────────────────────────────────── */}
        {/* Bark edge halo */}
        <g style={{ opacity: ringsT }}>
          <path
            d={ringPath(R_MAX + 14, 99)}
            fill={DARK}
            opacity={0.65}
          />
          <path d={ringPath(R_MAX + 2, 98)} fill="url(#disc-vignette)" />
          {/* Directional lean */}
          <path
            d={ringPath(R_MAX + 2, 98)}
            fill="url(#lean-shade)"
          />
        </g>

        {/* Rings (clipped to disc) — alternating earlywood (ochre) + latewood (dark) */}
        <g clipPath="url(#disc-clip)">
          {RINGS.map((ring, i) => {
            const show = Math.min(
              1,
              Math.max(0, ringsT * RING_COUNT - i) * 1.4,
            );
            if (show <= 0) return null;
            const isLate = ring.shade > 0.55;
            const color = isLate ? DARK : OCHRE;
            return (
              <path
                key={`ring-${i}`}
                d={ringPath(ring.r, i + 7)}
                fill="none"
                stroke={color}
                strokeWidth={isLate ? ring.width + 0.4 : ring.width * 0.7}
                strokeOpacity={isLate ? 0.6 + ring.shade * 0.3 : 0.28}
                opacity={show}
              />
            );
          })}

          {/* Frost scars — unmistakable dark bands at specific years */}
          {CARDS.map((c, i) => {
            const r = yearToR(c.year);
            const show = Math.min(
              1,
              Math.max(0, ringsT * RING_COUNT - (r / R_MAX) * RING_COUNT) *
                1.4,
            );
            if (show <= 0) return null;
            return (
              <g key={`scar-${i}`}>
                <path
                  d={ringPath(r + 1.4, 50 + i)}
                  fill="none"
                  stroke={INK}
                  strokeWidth={4.6}
                  opacity={show * 0.95}
                />
                <path
                  d={ringPath(r, 51 + i)}
                  fill="none"
                  stroke={DARK}
                  strokeWidth={3.2}
                  opacity={show}
                />
                <path
                  d={ringPath(r - 2.0, 52 + i)}
                  fill="none"
                  stroke="#6B4228"
                  strokeWidth={1.2}
                  opacity={show * 0.65}
                />
              </g>
            );
          })}

          {/* Radial checks — hairline cracks, archivally fine */}
          {[-2.42, 2.78, -1.95].map((theta, i) => {
            const rStart = 10 + i * 4;
            const rEnd = R_MAX - 6 - i * 10;
            return (
              <line
                key={`check-${i}`}
                x1={CENTER.x + Math.cos(theta) * rStart}
                y1={CENTER.y + Math.sin(theta) * rStart * 0.965}
                x2={CENTER.x + Math.cos(theta) * rEnd}
                y2={CENTER.y + Math.sin(theta) * rEnd * 0.965}
                stroke={DARK}
                strokeWidth={1.2}
                strokeOpacity={(0.55 - i * 0.12) * ringsT}
              />
            );
          })}

          {/* Pith */}
          <circle
            cx={CENTER.x}
            cy={CENTER.y}
            r={8}
            fill="url(#pith)"
            opacity={ringsT}
          />
          <circle
            cx={CENTER.x}
            cy={CENTER.y}
            r={2.5}
            fill={DARK}
            opacity={ringsT}
          />
        </g>

        {/* Scanning gold arc — live during sweep, faint trail after */}
        {scanT > 0 && scanT < 1 && (
          <g filter="url(#scan-glow)">
            <circle
              cx={CENTER.x}
              cy={CENTER.y}
              r={scanR}
              fill="none"
              stroke={GILT}
              strokeWidth={1.6}
              strokeOpacity={0.85}
              strokeDasharray="3 4"
            />
          </g>
        )}
        {scanT >= 1 && (
          <g>
            <ellipse
              cx={CENTER.x}
              cy={CENTER.y}
              rx={R_MAX + 2}
              ry={(R_MAX + 2) * 0.965}
              fill="none"
              stroke={GILT}
              strokeWidth={1.2}
              strokeOpacity={scanTrailOpacity}
              strokeDasharray="4 6"
            />
          </g>
        )}

        {/* Frost-ring markers + leader lines + cards */}
        {CARDS.map((c, i) => {
          const r = yearToR(c.year);
          const op = cardOpacity(r);
          const ax = CENTER.x + Math.cos(c.anchorTheta) * r;
          const ay = CENTER.y + Math.sin(c.anchorTheta) * r * 0.965;
          const cardX = 690;
          const cardW = 300;
          const cardH = 78;
          const leaderMidX = (ax + cardX) / 2 + 30;
          const leaderMidY = ay;

          // Cards share the right rail; anchor y is the card's vertical centre
          const cy = c.cardY + cardH / 2;

          return (
            <g key={`card-${i}`} opacity={op}>
              {/* Marker tick on ring */}
              <circle
                cx={ax}
                cy={ay}
                r={6}
                fill={INK}
                stroke={GILT}
                strokeWidth={1.6}
              />
              <circle cx={ax} cy={ay} r={2} fill={GILT} />

              {/* Leader line: angled from marker to card */}
              <path
                d={`M ${ax} ${ay} L ${leaderMidX} ${leaderMidY} L ${
                  cardX - 4
                } ${cy}`}
                stroke={GILT}
                strokeWidth={1.1}
                fill="none"
                strokeOpacity={0.75}
              />

              {/* Card */}
              <rect
                x={cardX}
                y={c.cardY}
                width={cardW}
                height={cardH}
                fill={INK}
                stroke={GILT}
                strokeWidth={1.2}
              />
              {/* Ledger-rule */}
              <line
                x1={cardX}
                y1={c.cardY + 28}
                x2={cardX + cardW}
                y2={c.cardY + 28}
                stroke={GILT}
                strokeOpacity={0.35}
                strokeWidth={0.8}
              />
              {/* Catalog number strip */}
              <rect
                x={cardX}
                y={c.cardY}
                width={9}
                height={cardH}
                fill={GILT}
                opacity={0.9}
              />
              <text
                x={cardX + 24}
                y={c.cardY + 20}
                fill={GILT}
                fontFamily={inter}
                fontSize={11}
                fontWeight={600}
                letterSpacing={3.2}
              >
                {c.tag}
              </text>
              <text
                x={cardX + cardW - 14}
                y={c.cardY + 20}
                textAnchor="end"
                fill={GRAY}
                fontFamily={inter}
                fontSize={10}
                fontWeight={500}
                letterSpacing={2.4}
              >
                {c.title.toUpperCase()}
              </text>
              <text
                x={cardX + 24}
                y={c.cardY + 55}
                fill={PAPER}
                fontFamily={playfair}
                fontStyle="italic"
                fontSize={22}
                fontWeight={500}
              >
                {c.event}
              </text>
            </g>
          );
        })}

        {/* Caption strip below the drafting frame */}
        <g
          transform={`translate(${FRAME.x}, ${FRAME.y + FRAME.h + 22})`}
          fill={GRAY}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
        >
          <text>FIG. 1 · CROSS-SECTION, PINUS LONGAEVA · WHITE MTS.</text>
          <text x={FRAME.w} textAnchor="end" fill={GILT} opacity={0.85}>
            4,876-YEAR CHRONOLOGY
          </text>
        </g>
      </svg>

      {/* ── Type lockup ────────────────────────────────────────────── */}
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
            color: GILT,
            fontFamily: inter,
            fontSize: 13,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 18,
            fontWeight: 600,
          }}
        >
          Role <span style={{ color: GRAY, margin: "0 4px" }}>/</span>
          <span style={{ color: "#EDEDEF", letterSpacing: 5 }}>Archivist</span>
        </div>

        <div
          style={{
            color: "#F4EEE0",
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 84,
            lineHeight: 0.96,
            letterSpacing: -1.4,
            fontStyle: "italic",
          }}
        >
          The 4,800-year
          <br />
          ledger.
        </div>

        <div
          style={{
            marginTop: 30,
            color: "#C8C0B2",
            fontFamily: inter,
            fontSize: 19,
            lineHeight: 1.4,
            fontWeight: 400,
            maxWidth: 880,
            opacity: hookOpacity,
          }}
        >
          In California's White Mountains, individual{" "}
          <span style={{ color: GILT, fontWeight: 600 }}>Pinus longaeva</span>{" "}
          carry over 4,800 continuous annual rings — and frost-damaged rings
          resolve specific volcanic winters (1816 CE's Tambora summer, 536
          CE's "dust-veil" year) to the exact growing season.
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
        <span>Salzer &amp; Hughes · Quaternary Research 67 (2007)</span>
        <span>
          <span style={{ color: GILT }}>●</span> Frost ring = volcanic winter
        </span>
      </div>
    </AbsoluteFill>
  );
};
