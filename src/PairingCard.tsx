import React, { useMemo } from "react";
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

// Palette — drawn from real bristlecone coloration
const INK = "#12100C";       // deep night substrate
const IVORY = "#E7D9BE";     // sun-bleached sapwood / highlight
const AMBER = "#B58A55";     // warm heartwood amber
const HEART = "#7A4A20";     // deep aged wood
const BARK = "#3A2716";      // outer bark
const EMBER = "#C24A1A";     // ember highlight (the tagged ring)
const GRAY = "#8A8478";      // archival label gray
const RULE = "#2A2620";      // subtle rule lines

// ── Disc geometry (SVG viewBox 0..1080 × 0..1350) ─────────────────────
const CX = 400;
const CY = 480;
const OUTER = 320; // outer bark radius
const ELLIPSE = 0.955; // slight vertical squash for organic feel

// Consistent trunk-shape wobble — every ring inherits the same base
// silhouette so the concentric geometry reads as one living cross-section.
const shape = (theta: number): number =>
  Math.sin(theta * 3 + 0.4) * 3.4 +
  Math.sin(theta * 5 - 1.1) * 1.7 +
  Math.sin(theta * 7 + 2.0) * 0.9 +
  Math.sin(theta * 11 + 3.7) * 0.4;

// Simple deterministic pseudo-random for ring-width variance
const rnd = (seed: number): number => {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

type Ring = { r: number; idx: number; volcanic: boolean };

const makeRings = (): Ring[] => {
  const rings: Ring[] = [];
  let r = 4.5;
  let i = 0;
  while (r < OUTER - 5) {
    // Slow decadal modulation — some multi-year runs run tighter (bad decades)
    const decadal = 0.7 + 0.5 * Math.sin(i * 0.11) + 0.3 * Math.sin(i * 0.037);
    const base = 1.15;
    const noise = rnd(i + 1) * 1.1;
    const volcanic = i > 6 && (i === 41 || i === 78 || i === 152 || rnd(i + 7) > 0.988);
    const w = volcanic ? 0.55 : (base + noise) * decadal;
    r += Math.max(0.55, w);
    rings.push({ r, idx: i, volcanic });
    i++;
  }
  return rings;
};

const ringPath = (r: number, cx: number, cy: number): string => {
  const N = 96;
  const pts: string[] = [];
  for (let i = 0; i < N; i++) {
    const th = (i / N) * Math.PI * 2;
    const rr = r + shape(th);
    const x = cx + Math.cos(th) * rr;
    const y = cy + Math.sin(th) * rr * ELLIPSE;
    pts.push(`${x.toFixed(2)} ${y.toFixed(2)}`);
  }
  return `M ${pts.join(" L ")} Z`;
};

// Point on ring at angle theta
const ringPoint = (r: number, theta: number): { x: number; y: number } => {
  const rr = r + shape(theta);
  return {
    x: CX + Math.cos(theta) * rr,
    y: CY + Math.sin(theta) * rr * ELLIPSE,
  };
};

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const rings = useMemo(makeRings, []);

  // Growth: expanding radial clip, spring-eased
  const growSpring = spring({
    frame,
    fps,
    config: { damping: 200, mass: 2.4, stiffness: 40 },
    durationInFrames: fps * 3.2,
  });
  const clipR = interpolate(growSpring, [0, 1], [0, OUTER + 20]);

  // Type entrance
  const titleSpring = spring({
    frame: frame - fps * 0.35,
    fps,
    config: { damping: 200, mass: 0.9 },
  });
  const hookOpacity = interpolate(frame, [fps * 1.1, fps * 2.0], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Callout — starts once growth has revealed the tagged ring
  const calloutT = interpolate(
    frame,
    [fps * 3.1, fps * 4.0],
    [0, 1],
    { easing: Easing.out(Easing.cubic), extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Gentle looping pulse on the ember tag
  const pulse = 0.55 + 0.45 * Math.sin((frame / fps) * Math.PI * 0.9);

  // The tagged ring: pick one at ~ radius 232 (an old, deep ring)
  const TAG_RING_R = 232;
  const TAG_THETA = -1.05; // upper right of disc
  const tagPt = ringPoint(TAG_RING_R, TAG_THETA);
  const elbowX = 760;
  const elbowY = tagPt.y - 70;
  const labelX = 790;

  // Radial rays (medullary), 5 subtle spokes
  const RAYS = [0.35, 1.15, 2.05, 3.4, 4.7, 5.6];

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
        <span style={{ color: EMBER }}>2026 · 08 · 16</span>
      </div>

      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          {/* Wood radial gradient — heartwood → sapwood → bark */}
          <radialGradient id="wood" cx={CX} cy={CY} r={OUTER} gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#4E2E14" />
            <stop offset="18%" stopColor={HEART} />
            <stop offset="55%" stopColor={AMBER} />
            <stop offset="82%" stopColor="#D9BE95" />
            <stop offset="100%" stopColor="#B08561" />
          </radialGradient>

          {/* Soft inner shadow on the disc for depth */}
          <radialGradient id="disc-shadow" cx={CX} cy={CY} r={OUTER} gradientUnits="userSpaceOnUse">
            <stop offset="60%" stopColor="#000" stopOpacity={0} />
            <stop offset="100%" stopColor="#000" stopOpacity={0.55} />
          </radialGradient>

          {/* Grain vignette to knock down the wood evenness */}
          <radialGradient id="grain-vignette" cx="40%" cy="35%" r="75%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.06} />
            <stop offset="100%" stopColor="#000000" stopOpacity={0.25} />
          </radialGradient>

          {/* Ember glow behind the tagged ring point */}
          <radialGradient id="ember-glow">
            <stop offset="0%" stopColor={EMBER} stopOpacity={0.7} />
            <stop offset="100%" stopColor={EMBER} stopOpacity={0} />
          </radialGradient>

          {/* Growth clip — expands from the pith outward */}
          <clipPath id="grow-clip">
            <circle cx={CX} cy={CY} r={clipR} />
          </clipPath>

          {/* Disc clip — everything ring-related stays inside the disc silhouette */}
          <clipPath id="disc-clip">
            <path d={ringPath(OUTER - 1, CX, CY)} />
          </clipPath>
        </defs>

        {/* ── Cross-section disc ────────────────────────────────────── */}
        <g clipPath="url(#disc-clip)">
          <g clipPath="url(#grow-clip)">
            {/* Wood body */}
            <path d={ringPath(OUTER, CX, CY)} fill="url(#wood)" />
            <path d={ringPath(OUTER, CX, CY)} fill="url(#grain-vignette)" />

            {/* Rings — every year drawn as a fine dark line for real endgrain density */}
            {rings.map((ring, i) => {
              const isVolcanic = ring.volcanic;
              const rf = ring.r / OUTER;
              // Base opacity: rings a bit stronger in heart, softer in sapwood
              const base = 0.55 - rf * 0.15;
              const jitter = (rnd(ring.idx + 5) - 0.5) * 0.14;
              const opacity = isVolcanic ? 0.85 : base + jitter;
              const stroke = isVolcanic
                ? "#1E1207"
                : rf < 0.4
                ? "#2E1B0A"
                : rf < 0.7
                ? "#3E260F"
                : "#5A3915";
              const sw = isVolcanic ? 1.2 : 0.7;
              return (
                <path
                  key={`r-${i}`}
                  d={ringPath(ring.r, CX, CY)}
                  fill="none"
                  stroke={stroke}
                  strokeOpacity={opacity}
                  strokeWidth={sw}
                />
              );
            })}

            {/* Medullary rays — very faint spokes from pith outward */}
            {RAYS.map((th, i) => {
              const end = ringPoint(OUTER - 4, th);
              return (
                <line
                  key={`ray-${i}`}
                  x1={CX}
                  y1={CY}
                  x2={end.x}
                  y2={end.y}
                  stroke="#000"
                  strokeOpacity={0.08}
                  strokeWidth={1.2}
                />
              );
            })}

            {/* Pith — the tree's origin dot */}
            <circle cx={CX} cy={CY} r={4} fill="#1E1207" />
            <circle cx={CX} cy={CY} r={2} fill="#000" />

            {/* Highlighted tagged ring — ember pulse only after callout enters */}
            <path
              d={ringPath(TAG_RING_R, CX, CY)}
              fill="none"
              stroke={EMBER}
              strokeWidth={1.6}
              strokeOpacity={0.85 * calloutT * (0.6 + 0.4 * pulse)}
            />

            {/* Inner shadow rim */}
            <path d={ringPath(OUTER, CX, CY)} fill="url(#disc-shadow)" />
          </g>
        </g>

        {/* Bark — layered dark outline that visually terminates the disc */}
        <path
          d={ringPath(OUTER + 5, CX, CY)}
          fill="none"
          stroke="#1A0F06"
          strokeWidth={9}
          opacity={growSpring}
        />
        <path
          d={ringPath(OUTER + 1, CX, CY)}
          fill="none"
          stroke={BARK}
          strokeWidth={4}
          opacity={growSpring}
        />
        <path
          d={ringPath(OUTER - 3, CX, CY)}
          fill="none"
          stroke="#5B3B1E"
          strokeWidth={1.2}
          strokeOpacity={0.7}
          opacity={growSpring}
        />

        {/* Corner registration marks — archival plate feel */}
        {(
          [
            [80, 130, 1, 1],
            [1000, 130, -1, 1],
            [80, 830, 1, -1],
            [1000, 830, -1, -1],
          ] as const
        ).map(([cx, cy, sx, sy], i) => (
          <g key={`crop-${i}`} stroke={GRAY} strokeWidth={1} fill="none" opacity={0.7}>
            <line x1={cx} y1={cy} x2={cx + sx * 22} y2={cy} />
            <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 22} />
          </g>
        ))}

        {/* Callout to the tagged 1815 ring */}
        <g opacity={calloutT}>
          {/* Ember glow behind ring intersection */}
          <circle cx={tagPt.x} cy={tagPt.y} r={22 + 6 * pulse} fill="url(#ember-glow)" opacity={0.85} />
          <circle cx={tagPt.x} cy={tagPt.y} r={4.5} fill={EMBER} />
          <circle cx={tagPt.x} cy={tagPt.y} r={2.2} fill="#FFE7D2" />

          {/* Elbow leader line, drawn progressively */}
          <path
            d={`M ${tagPt.x} ${tagPt.y} L ${elbowX} ${elbowY} L ${labelX} ${elbowY}`}
            fill="none"
            stroke={EMBER}
            strokeWidth={1.4}
            strokeDasharray={340}
            strokeDashoffset={340 * (1 - calloutT)}
          />

          {/* Label plate */}
          <g transform={`translate(${elbowX + 8}, ${elbowY - 34})`}>
            <rect
              x={0}
              y={0}
              width={210}
              height={54}
              rx={2}
              fill={INK}
              stroke={EMBER}
              strokeWidth={1.2}
            />
            <text
              x={14}
              y={22}
              fill={EMBER}
              fontFamily={inter}
              fontSize={11}
              fontWeight={600}
              letterSpacing={3}
            >
              RING · YEAR 1815
            </text>
            <text
              x={14}
              y={42}
              fill={IVORY}
              fontFamily={inter}
              fontSize={11}
              fontWeight={500}
              letterSpacing={2.4}
              opacity={0.85}
            >
              TAMBORA · VOLCANIC WINTER
            </text>
          </g>
        </g>

        {/* Caption strip below the disc */}
        <g
          transform={`translate(80, 855)`}
          fill={GRAY}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
        >
          <text>FIG. 003 · ENDGRAIN, PINUS LONGAEVA · WHITE MOUNTAINS, CA</text>
          <text x={920} textAnchor="end" fill={AMBER} opacity={0.9}>
            EACH RING = ONE YEAR
          </text>
        </g>
      </svg>

      {/* ── Type lockup ────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 890,
          opacity: titleSpring,
          transform: `translateY(${interpolate(titleSpring, [0, 1], [16, 0])}px)`,
        }}
      >
        <div
          style={{
            color: EMBER,
            fontFamily: inter,
            fontSize: 13,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 20,
            fontWeight: 600,
          }}
        >
          Role <span style={{ color: GRAY, margin: "0 6px" }}>/</span>
          <span style={{ color: "#EDEDEF", letterSpacing: 5 }}>Archivist</span>
        </div>

        <div
          style={{
            color: "#F4EFE5",
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 88,
            lineHeight: 0.96,
            letterSpacing: -1.5,
            fontStyle: "italic",
          }}
        >
          The 4,855-year
          <br />
          archivist.
        </div>

        <div
          style={{
            marginTop: 30,
            color: "#D3CBB9",
            fontFamily: inter,
            fontSize: 19,
            lineHeight: 1.42,
            fontWeight: 400,
            maxWidth: 900,
            opacity: hookOpacity,
          }}
        >
          A single Great Basin bristlecone pine — the tree called{" "}
          <span style={{ color: IVORY, fontWeight: 600 }}>Methuselah</span>{" "}
          — has quietly laid down{" "}
          <span style={{ color: EMBER, fontWeight: 600 }}>4,855 annual rings</span>,
          each one preserving that year's temperature and precipitation. Splicing
          overlapping ring patterns from bristlecones extends Earth's continuous
          climate record back roughly 9,000 years and calibrates every radiocarbon
          date.
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
        <span>Schulman 1958 · Ferguson 1969 · Salzer et al. 2014</span>
        <span>
          <span style={{ color: EMBER }}>●</span> One ring = One year
        </span>
      </div>
    </AbsoluteFill>
  );
};
