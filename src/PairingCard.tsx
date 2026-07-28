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
const PAPER = "#F4EBD3";
const PAPER_DEEP = "#EADFC2";
const BRONZE = "#C69349";
const BRONZE_DARK = "#A5732F";
const RESIN = "#7A3E1F";
const INK = "#3B2A1A";
const DRIFT = "#8A8778";
const RULE = "#D9CDA9";

const CENTER_X = 540;
const CENTER_Y = 470;

type RingBand = {
  r: number;
  w: number;
  tone: number;
  delay: number;
};

// Rings — heartwood inner (darker) → sapwood outer (paler). Reversed at render
// so smaller rings sit on top of larger, and the growth animation reveals inner→outer.
const RINGS: RingBand[] = (() => {
  const bands: RingBand[] = [];
  const rMax = 358;
  const rMin = 7;
  const count = 62;
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const r = rMin + (rMax - rMin) * t;
    const noise =
      Math.sin(i * 12.9898) * 43758.5453 -
      Math.floor(Math.sin(i * 12.9898) * 43758.5453);
    // Widths pulse a bit to fake late/early-wood rhythm
    const rhythm = 0.5 + 0.5 * Math.sin(i * 1.7 + 0.4);
    const w = 1.8 + (1 - t) * 2.6 + noise * 2.4 + rhythm * 1.6;
    // Inner darker (heartwood), outer paler (sapwood)
    const tone = 0.72 * (1 - t) + noise * 0.28;
    bands.push({ r, w, tone: Math.max(0.05, Math.min(0.98, tone)), delay: t });
  }
  return bands;
})();

type Flag = {
  ringR: number;
  angleDeg: number;
  textY: number; // absolute Y for the callout text in page coords
  year: string;
  label: string;
  side: "L" | "R";
};

// Angles: 0° = 3 o'clock; SVG y is inverted, so -90° = 12 o'clock, +90° = 6 o'clock.
// textY chosen to align with the shoulder Y so leader is a clean 2-segment: radial → horizontal.
const FLAGS: Flag[] = [
  {
    ringR: 338,
    angleDeg: -55,
    textY: 138,
    year: "2026 CE",
    label: "Present cambium",
    side: "R",
  },
  {
    ringR: 240,
    angleDeg: -25,
    textY: 305,
    year: "1815 CE",
    label: "Tambora · global frost ring",
    side: "R",
  },
  {
    ringR: 165,
    angleDeg: 158,
    textY: 620,
    year: "536 CE",
    label: "Global dimming event",
    side: "L",
  },
  {
    ringR: 7,
    angleDeg: 192,
    textY: 388,
    year: "3050 BCE",
    label: "Germination · pith ring",
    side: "L",
  },
];

// A subtle irregular polygon for the outer bark silhouette
const barkOutline = (rBase: number, points = 96): string => {
  const pts: [number, number][] = [];
  for (let i = 0; i < points; i++) {
    const a = (i / points) * Math.PI * 2 - Math.PI / 2;
    const wob =
      Math.sin(a * 3.2 + 0.7) * 6 +
      Math.sin(a * 7.3 - 1.4) * 4 +
      Math.sin(a * 13.1 + 2.1) * 2.4;
    const r = rBase + wob;
    pts.push([CENTER_X + Math.cos(a) * r, CENTER_Y + Math.sin(a) * r]);
  }
  return (
    "M " +
    pts
      .map(([x, y], i) => (i === 0 ? `${x} ${y}` : `L ${x} ${y}`))
      .join(" ") +
    " Z"
  );
};

// A very slightly wobbly circle for each ring — trees are not perfect circles
const wobblyRing = (r: number, seed: number): string => {
  const points = 128;
  const pts: [number, number][] = [];
  for (let i = 0; i < points; i++) {
    const a = (i / points) * Math.PI * 2 - Math.PI / 2;
    const wob =
      Math.sin(a * 2 + seed) * (r * 0.012) +
      Math.sin(a * 5 + seed * 0.7) * (r * 0.006) +
      Math.sin(a * 11 - seed * 0.3) * (r * 0.003);
    const rr = r + wob;
    pts.push([CENTER_X + Math.cos(a) * rr, CENTER_Y + Math.sin(a) * rr]);
  }
  return (
    "M " +
    pts
      .map(([x, y], i) => (i === 0 ? `${x} ${y}` : `L ${x} ${y}`))
      .join(" ") +
    " Z"
  );
};

const mix = (a: string, b: string, t: number): string => {
  const ah = a.replace("#", "");
  const bh = b.replace("#", "");
  const ar = parseInt(ah.slice(0, 2), 16);
  const ag = parseInt(ah.slice(2, 4), 16);
  const ab = parseInt(ah.slice(4, 6), 16);
  const br = parseInt(bh.slice(0, 2), 16);
  const bg = parseInt(bh.slice(2, 4), 16);
  const bb = parseInt(bh.slice(4, 6), 16);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bch = Math.round(ab + (bb - ab) * t);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${bch.toString(16).padStart(2, "0")}`;
};

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Ring reveal spans ~2.6s
  const growSpan = fps * 2.6;
  const t = Math.max(0, frame) / growSpan;

  // Index arm sweeps from noon to its resting angle over ~1.4s starting at 3.0s
  const armStart = fps * 3.0;
  const armProg = interpolate(frame, [armStart, armStart + fps * 1.4], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const activeFlag = FLAGS[1]; // 1815 · Tambora
  const armAngle = -90 + (activeFlag.angleDeg - -90) * armProg;

  // Event-ring pulse on the target
  const pulseCycle = fps * 4;
  const pulseT =
    frame > armStart + fps * 1.4
      ? ((frame - (armStart + fps * 1.4)) % pulseCycle) / pulseCycle
      : 0;

  const titleSpring = spring({
    frame: frame - fps * 0.5,
    fps,
    config: { damping: 200, mass: 0.9 },
  });

  const hookOpacity = interpolate(frame, [fps * 1.1, fps * 2.0], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Layout — page grid
  const HEADER_Y = 56;
  const DISC_TOP = 130;
  const DISC_BOTTOM = 830;
  const TITLE_TOP = 895;

  const flagRad = (f: Flag) => (f.angleDeg * Math.PI) / 180;

  return (
    <AbsoluteFill style={{ backgroundColor: PAPER, fontFamily: inter }}>
      <style>{fontCss}</style>

      {/* Faint ledger ruling across the whole page */}
      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          <pattern
            id="ledger"
            width={1080}
            height={34}
            patternUnits="userSpaceOnUse"
          >
            <line
              x1={0}
              y1={33.5}
              x2={1080}
              y2={33.5}
              stroke={RULE}
              strokeWidth={1}
              opacity={0.55}
            />
          </pattern>
          <radialGradient id="paper-tint" cx="50%" cy="42%" r="78%">
            <stop offset="0%" stopColor={PAPER} stopOpacity={0} />
            <stop offset="60%" stopColor={PAPER} stopOpacity={0} />
            <stop offset="100%" stopColor={"#B99C63"} stopOpacity={0.35} />
          </radialGradient>
          <radialGradient id="ring-shade" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={RESIN} stopOpacity={0.34} />
            <stop offset="55%" stopColor={RESIN} stopOpacity={0} />
            <stop offset="100%" stopColor={INK} stopOpacity={0.14} />
          </radialGradient>
          <filter id="paperGrain" x="0" y="0" width="100%" height="100%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.9"
              numOctaves="2"
              seed="7"
            />
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 0.23  0 0 0 0 0.16  0 0 0 0 0.10  0 0 0 0.04 0"
            />
            <feComposite in2="SourceGraphic" operator="in" />
          </filter>
        </defs>

        <rect x={0} y={0} width={1080} height={1350} fill="url(#ledger)" />
        <rect x={0} y={0} width={1080} height={1350} fill="url(#paper-tint)" />
      </svg>

      {/* Header band */}
      <div
        style={{
          position: "absolute",
          top: HEADER_Y,
          left: 80,
          right: 80,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          color: DRIFT,
          fontFamily: inter,
          fontSize: 13,
          letterSpacing: 4.5,
          textTransform: "uppercase",
          fontWeight: 600,
        }}
      >
        <span>Everyday Motivation · No. 003</span>
        <span style={{ color: RESIN }}>2026 · 07 · 28</span>
      </div>

      {/* Cross-section — the ledger */}
      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0 }}
      >
        {/* Bark silhouette — a subtle resin halo just outside the outer ring */}
        <path
          d={barkOutline(374)}
          fill={RESIN}
          fillOpacity={0.06}
        />
        <path
          d={barkOutline(368)}
          fill={PAPER_DEEP}
          fillOpacity={0.9}
        />

        {/* Rings — heartwood-out, appear inner→outer */}
        {[...RINGS]
          .slice()
          .reverse() // draw large first so small ones sit on top
          .map((band, idx) => {
            const seed = band.r * 0.13 + 1.7;
            const localT = (t - (1 - band.delay) * 0.85) / 0.15;
            const grow = Math.max(0, Math.min(1, localT));
            const eased = 1 - Math.pow(1 - grow, 3);
            // Heartwood inner (deep resin/ink) → sapwood outer (pale cream)
            const base = mix(PAPER_DEEP, RESIN, band.tone);
            const color = mix(base, INK, band.tone * 0.55);
            const strokeW = band.w * eased;
            return (
              <path
                key={`ring-${idx}`}
                d={wobblyRing(band.r, seed)}
                fill="none"
                stroke={color}
                strokeWidth={Math.max(0.001, strokeW)}
                strokeOpacity={0.5 + band.tone * 0.45}
                strokeLinejoin="round"
              />
            );
          })}

        {/* Central radial shade so the disc reads volumetric */}
        <circle
          cx={CENTER_X}
          cy={CENTER_Y}
          r={365}
          fill="url(#ring-shade)"
        />

        {/* Pith — germination point */}
        <circle
          cx={CENTER_X}
          cy={CENTER_Y}
          r={5}
          fill={INK}
          opacity={Math.min(1, Math.max(0, t) * 6)}
        />

        {/* Event-ring pulse (Tambora frost ring) — matches the ring's wobble */}
        {armProg > 0.98 && (
          <g>
            <path
              d={wobblyRing(activeFlag.ringR, activeFlag.ringR * 0.13 + 1.7)}
              fill="none"
              stroke={RESIN}
              strokeWidth={3.2 + Math.sin(pulseT * Math.PI * 2) * 1.6}
              strokeOpacity={0.55 + Math.sin(pulseT * Math.PI * 2) * 0.35}
              strokeLinejoin="round"
            />
          </g>
        )}

        {/* Radial index arm */}
        {frame > armStart - 2 && (
          <g
            transform={`rotate(${armAngle} ${CENTER_X} ${CENTER_Y})`}
            opacity={Math.min(
              1,
              Math.max(0, (frame - (armStart - fps * 0.15)) / fps),
            )}
          >
            <line
              x1={CENTER_X}
              y1={CENTER_Y}
              x2={CENTER_X + activeFlag.ringR + 8}
              y2={CENTER_Y}
              stroke={RESIN}
              strokeWidth={1.8}
            />
            <circle
              cx={CENTER_X}
              cy={CENTER_Y}
              r={3.4}
              fill={RESIN}
            />
            <circle
              cx={CENTER_X + activeFlag.ringR}
              cy={CENTER_Y}
              r={6}
              fill={RESIN}
              stroke={PAPER}
              strokeWidth={2}
            />
          </g>
        )}

        {/* Flags — leader: ring dot → shoulder just past the bark → horizontal to margin */}
        {FLAGS.map((f, i) => {
          const revealAt = fps * 1.6 + i * fps * 0.35;
          const op = interpolate(frame, [revealAt, revealAt + fps * 0.6], [0, 1], {
            easing: Easing.out(Easing.cubic),
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const a = flagRad(f);
          const rx = CENTER_X + Math.cos(a) * f.ringR;
          const ry = CENTER_Y + Math.sin(a) * f.ringR;

          // Shoulder Y is the text Y (clean horizontal); shoulder X computed
          // by extending the radial ray until it reaches shoulderR from center.
          const shoulderR = 402;
          const dy = f.textY - CENTER_Y;
          const dxSign = f.side === "L" ? -1 : 1;
          const dx = dxSign * Math.sqrt(Math.max(0, shoulderR * shoulderR - dy * dy));
          const sx = CENTER_X + dx;
          const sy = f.textY;

          const marginX = f.side === "L" ? 80 : 1000;
          const anchor = f.side === "L" ? "start" : "end";
          // Text sits just above the horizontal leader; second line below the leader
          const yYear = sy - 10;
          const yLabel = sy + 20;

          return (
            <g key={`flag-${i}`} opacity={op}>
              <line
                x1={rx}
                y1={ry}
                x2={sx}
                y2={sy}
                stroke={RESIN}
                strokeWidth={1}
              />
              <line
                x1={sx}
                y1={sy}
                x2={marginX}
                y2={sy}
                stroke={RESIN}
                strokeWidth={1}
              />
              <circle cx={rx} cy={ry} r={3.4} fill={RESIN} />
              <text
                x={marginX}
                y={yYear}
                textAnchor={anchor}
                fill={INK}
                fontFamily={inter}
                fontSize={13}
                fontWeight={700}
                letterSpacing={2.8}
              >
                {f.year}
              </text>
              <text
                x={marginX}
                y={yLabel}
                textAnchor={anchor}
                fill={DRIFT}
                fontFamily={inter}
                fontSize={11}
                fontWeight={600}
                letterSpacing={1.8}
              >
                {f.label.toUpperCase()}
              </text>
            </g>
          );
        })}

        {/* Specimen catalog card — bottom-right within the disc region */}
        <g
          transform={`translate(830, 750)`}
          opacity={Math.min(1, Math.max(0, t - 0.6) * 2)}
        >
          <rect
            x={0}
            y={0}
            width={210}
            height={64}
            fill={PAPER}
            stroke={RESIN}
            strokeWidth={1.2}
          />
          <text
            x={12}
            y={20}
            fill={RESIN}
            fontFamily={inter}
            fontSize={10}
            letterSpacing={3.2}
            fontWeight={700}
          >
            SPECIMEN · WPN-114
          </text>
          <text
            x={12}
            y={38}
            fill={INK}
            fontFamily={inter}
            fontSize={11}
            fontWeight={600}
            letterSpacing={1.4}
          >
            Pinus longaeva
          </text>
          <text
            x={12}
            y={54}
            fill={DRIFT}
            fontFamily={inter}
            fontSize={10}
            letterSpacing={1.4}
            fontWeight={500}
          >
            White Mountains · Inyo · CA
          </text>
        </g>

        {/* Caption strip just above the type block */}
        <g
          transform={`translate(80, 855)`}
          fill={DRIFT}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={600}
        >
          <text>FIG. 1 · TRANSVERSE SECTION · SCHEMATIC OF 4,789 RINGS</text>
          <text
            x={920}
            textAnchor="end"
            fill={RESIN}
          >
            1 RING = 1 YEAR = 1 RECORD
          </text>
        </g>
      </svg>

      {/* Type lockup */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: TITLE_TOP,
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
            color: RESIN,
            fontFamily: inter,
            fontSize: 13,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 20,
            fontWeight: 700,
          }}
        >
          Role <span style={{ color: DRIFT, margin: "0 6px" }}>/</span>
          <span style={{ color: INK, letterSpacing: 5 }}>Archivist</span>
        </div>

        <div
          style={{
            color: INK,
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 88,
            lineHeight: 0.96,
            letterSpacing: -1.6,
            fontStyle: "italic",
          }}
        >
          The ledger
          <br />
          that grew.
        </div>

        <div
          style={{
            marginTop: 30,
            color: "#4A3A28",
            fontFamily: inter,
            fontSize: 19,
            lineHeight: 1.42,
            fontWeight: 400,
            maxWidth: 900,
            opacity: hookOpacity,
          }}
        >
          A Great Basin bristlecone pine can live past{" "}
          <span style={{ color: RESIN, fontWeight: 700 }}>4,800 years</span>
          . Every annual ring is a dated, tamper-resistant record —
          drought, frost, volcanism, cosmic-ray flux — and cross-dated
          bristlecones anchor the ~9,000-year calibration for radiocarbon
          dating.
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          bottom: 46,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          color: DRIFT,
          fontFamily: inter,
          fontSize: 11,
          letterSpacing: 3,
          textTransform: "uppercase",
          fontWeight: 600,
        }}
      >
        <span>Schulman 1958 · Ferguson 1969 · IntCal20 (2020)</span>
        <span>
          <span style={{ color: RESIN }}>●</span> 1 ring = 1 year
        </span>
      </div>
    </AbsoluteFill>
  );
};
