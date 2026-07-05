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

// ── Palette — from the concept's visual brief ───────────────────────────
const INK = "#07080F";
const INK_2 = "#0C0E17";
const CRUST = "#2A2620";
const CRUST_DEEP = "#141210";
const CRUST_EDGE = "#3A342A";
const DUST = "#C9B693";
const AMBER = "#E5B24E";
const COMA = "#7DC0C0";
const COMA_DEEP = "#3F7F82";
const GRAY = "#6E717C";
const GRID = "#171B26";

// ── Deterministic pseudo-random for stars / dust particles ──────────────
const seeded = (i: number): number => {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

type Star = { x: number; y: number; r: number; a: number };
const STARS: Star[] = Array.from({ length: 140 }, (_, i) => ({
  x: seeded(i * 3 + 1) * 1080,
  y: seeded(i * 3 + 2) * 900,
  r: 0.4 + seeded(i * 3 + 3) * 1.6,
  a: 0.15 + seeded(i * 5 + 7) * 0.55,
}));

// Dust particles fanning along the plume — parameterised in plume-local
// coords (s = 0..1 along the axis, t = -1..1 across). Then rotated & placed.
type Particle = { s: number; t: number; r: number; a: number; teal: boolean };
const PARTICLES: Particle[] = Array.from({ length: 220 }, (_, i) => {
  const s = Math.pow(seeded(i * 7 + 11), 0.85); // biased toward the nucleus
  // spread widens with s
  const spread = 0.14 + s * 0.62;
  const tSign = seeded(i * 7 + 12) < 0.5 ? -1 : 1;
  const tMag = Math.pow(seeded(i * 7 + 13), 1.4) * spread;
  return {
    s,
    t: tSign * tMag,
    r: 0.6 + seeded(i * 7 + 14) * 2.6,
    a: 0.18 + seeded(i * 7 + 15) * 0.55,
    teal: seeded(i * 7 + 16) > 0.55,
  };
});

// Molecules Rosetta / ROSINA detected in 67P's coma — with the scent notes
// team lead Kathrin Altwegg used to describe them.
type Note = {
  formula: string;
  sub: string; // subscript rendered separately? we'll use unicode
  name: string;
  scent: string;
  s: number; // position along the plume axis
  t: number; // position across the plume axis
  align: "left" | "right";
};
const NOTES: Note[] = [
  {
    formula: "H₂S",
    sub: "",
    name: "Hydrogen Sulfide",
    scent: "Rotten eggs",
    s: 0.14,
    t: 0.5,
    align: "left",
  },
  {
    formula: "NH₃",
    sub: "",
    name: "Ammonia",
    scent: "Horse stable",
    s: 0.32,
    t: -0.42,
    align: "right",
  },
  {
    formula: "HCN",
    sub: "",
    name: "Hydrogen Cyanide",
    scent: "Bitter almonds",
    s: 0.5,
    t: 0.52,
    align: "left",
  },
  {
    formula: "CH₃OH",
    sub: "",
    name: "Methanol",
    scent: "Sweet, spirituous",
    s: 0.68,
    t: -0.46,
    align: "right",
  },
  {
    formula: "SO₂",
    sub: "",
    name: "Sulfur Dioxide",
    scent: "Struck match",
    s: 0.86,
    t: 0.42,
    align: "left",
  },
];

// ── Plume geometry ──────────────────────────────────────────────────────
// Origin (nucleus sunlit shoulder) and end-point (upper-right). The
// end-point is kept inside the 80-px margin so molecule cards on the far
// end of the plume don't clip the canvas.
const PLUME_ORIGIN = { x: 470 + 30, y: 380 };
const PLUME_END = { x: 900, y: 140 };
const plumeVec = () => {
  const dx = PLUME_END.x - PLUME_ORIGIN.x;
  const dy = PLUME_END.y - PLUME_ORIGIN.y;
  const len = Math.hypot(dx, dy);
  return { dx, dy, len, ux: dx / len, uy: dy / len };
};

const plumePoint = (s: number, t: number, halfWidth = 170) => {
  const { ux, uy, dx, dy } = plumeVec();
  const cx = PLUME_ORIGIN.x + dx * s;
  const cy = PLUME_ORIGIN.y + dy * s;
  // perpendicular
  const px = -uy;
  const py = ux;
  return { x: cx + px * t * halfWidth, y: cy + py * t * halfWidth };
};

// ── 67P nucleus (approximation of the bicone / "rubber duck" silhouette)
// Two lobes joined by a distinctly narrower "neck" — the small head lobe
// sits upper-left, the larger body lobe sits lower-right. Tuned by eye
// against the Rosetta OSIRIS silhouette.
const NUCLEUS_PATH = `
  M 258 356
  C 244 320, 258 282, 296 268
  C 340 254, 388 274, 396 316
  C 400 340, 384 356, 372 372
  C 366 380, 372 388, 386 388
  C 428 388, 480 408, 522 442
  C 566 478, 588 528, 574 574
  C 556 626, 502 652, 442 652
  C 372 652, 320 620, 300 566
  C 288 534, 296 500, 314 476
  C 328 458, 328 442, 314 428
  C 288 410, 268 388, 258 356
  Z
`;

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Timings
  const nucleusSpring = spring({
    frame,
    fps,
    config: { damping: 200, mass: 1 },
    durationInFrames: fps * 1.4,
  });
  const plumeGrow = spring({
    frame: frame - fps * 0.4,
    fps,
    config: { damping: 200, mass: 1.1 },
    durationInFrames: fps * 2.2,
  });
  const titleSpring = spring({
    frame: frame - fps * 0.7,
    fps,
    config: { damping: 200, mass: 0.9 },
  });
  const hookOpacity = interpolate(frame, [fps * 1.5, fps * 2.4], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Gentle drift on outer coma particles — 5s loop
  const loopT = ((frame % (fps * 5)) / (fps * 5)) * Math.PI * 2;

  return (
    <AbsoluteFill style={{ backgroundColor: INK, fontFamily: inter }}>
      <style>{fontCss}</style>

      {/* Base radial cosmic wash */}
      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          <radialGradient id="cosmic" cx="30%" cy="35%" r="90%">
            <stop offset="0%" stopColor={INK_2} stopOpacity={1} />
            <stop offset="60%" stopColor={INK} stopOpacity={1} />
            <stop offset="100%" stopColor="#03040A" stopOpacity={1} />
          </radialGradient>
          <radialGradient id="sunGlow" cx="90%" cy="8%" r="45%">
            <stop offset="0%" stopColor={AMBER} stopOpacity={0.14} />
            <stop offset="70%" stopColor={AMBER} stopOpacity={0} />
          </radialGradient>

          <radialGradient id="crustGrad" cx="30%" cy="30%" r="80%">
            <stop offset="0%" stopColor={CRUST_EDGE} stopOpacity={1} />
            <stop offset="55%" stopColor={CRUST} stopOpacity={1} />
            <stop offset="100%" stopColor={CRUST_DEEP} stopOpacity={1} />
          </radialGradient>

          <radialGradient id="sunlitEdge" cx="78%" cy="30%" r="60%">
            <stop offset="0%" stopColor={AMBER} stopOpacity={0.85} />
            <stop offset="35%" stopColor={DUST} stopOpacity={0.45} />
            <stop offset="75%" stopColor={CRUST} stopOpacity={0} />
          </radialGradient>

          <radialGradient id="comaGlow" cx="15%" cy="85%" r="95%">
            <stop offset="0%" stopColor={COMA} stopOpacity={0.34} />
            <stop offset="35%" stopColor={COMA} stopOpacity={0.18} />
            <stop offset="70%" stopColor={COMA} stopOpacity={0.06} />
            <stop offset="100%" stopColor={COMA} stopOpacity={0} />
          </radialGradient>

          <radialGradient id="particleAmber" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={DUST} stopOpacity={0.9} />
            <stop offset="60%" stopColor={AMBER} stopOpacity={0.35} />
            <stop offset="100%" stopColor={AMBER} stopOpacity={0} />
          </radialGradient>
          <radialGradient id="particleTeal" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#B7E4E4" stopOpacity={0.85} />
            <stop offset="60%" stopColor={COMA} stopOpacity={0.3} />
            <stop offset="100%" stopColor={COMA} stopOpacity={0} />
          </radialGradient>

          <clipPath id="nucleusClip">
            <path d={NUCLEUS_PATH} />
          </clipPath>

          <filter id="softBlur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="8" />
          </filter>
          <filter id="plumeBlur" x="-25%" y="-25%" width="150%" height="150%">
            <feGaussianBlur stdDeviation="26" />
          </filter>

          <pattern
            id="apothGrid"
            x={0}
            y={0}
            width={54}
            height={54}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M 54 0 L 0 0 0 54`}
              fill="none"
              stroke={GRID}
              strokeWidth={1}
              opacity={0.55}
            />
          </pattern>
        </defs>

        {/* Cosmic background */}
        <rect width={1080} height={1350} fill="url(#cosmic)" />

        {/* Faint apothecary/star-chart grid — only in the visual zone */}
        <g opacity={0.55}>
          <rect x={0} y={110} width={1080} height={790} fill="url(#apothGrid)" />
        </g>

        {/* Sun glow (unseen sun, upper-right) */}
        <rect width={1080} height={900} fill="url(#sunGlow)" />

        {/* Stars — a faint but real starfield */}
        <g>
          {STARS.map((s, i) => (
            <circle
              key={`star-${i}`}
              cx={s.x}
              cy={s.y}
              r={s.r}
              fill="#E8ECF2"
              opacity={s.a * (0.7 + 0.3 * Math.sin(loopT + i))}
            />
          ))}
        </g>

        {/* Ecliptic / measurement arc — an apothecary chart line */}
        <g opacity={0.35} stroke={GRAY} fill="none">
          <path
            d="M 40 780 Q 540 520 1040 300"
            strokeWidth={1}
            strokeDasharray="2 6"
          />
          <text
            x={60}
            y={775}
            fill={GRAY}
            fontFamily={inter}
            fontSize={10}
            letterSpacing={3}
            fontWeight={500}
          >
            ECLIPTIC · +2.7 AU
          </text>
        </g>

        {/* Plume — a soft cone of gas glow behind the particles */}
        <g opacity={plumeGrow}>
          {(() => {
            const { ux, uy } = plumeVec();
            const px = -uy;
            const py = ux;
            // Soft elliptical envelope: a wide radial around the plume
            // axis midpoint, heavily blurred so the boundary never reads
            // as a hard trapezoid.
            const midX = (PLUME_ORIGIN.x + PLUME_END.x) / 2;
            const midY = (PLUME_ORIGIN.y + PLUME_END.y) / 2;
            const axisLen = Math.hypot(
              PLUME_END.x - PLUME_ORIGIN.x,
              PLUME_END.y - PLUME_ORIGIN.y,
            );
            const angle = (Math.atan2(uy, ux) * 180) / Math.PI;
            return (
              <g
                transform={`rotate(${angle}, ${midX}, ${midY})`}
                filter="url(#plumeBlur)"
              >
                <ellipse
                  cx={midX}
                  cy={midY}
                  rx={axisLen * 0.62}
                  ry={140}
                  fill="url(#comaGlow)"
                />
              </g>
            );
          })()}
        </g>

        {/* Dust + gas particles along the plume */}
        <g>
          {PARTICLES.map((p, i) => {
            // reveal along the plume as it grows
            const reveal = Math.max(0, Math.min(1, plumeGrow * 1.25 - p.s * 0.5));
            if (reveal <= 0.001) return null;
            const drift =
              Math.sin(loopT + i * 0.7) * 0.02 * (0.4 + p.s);
            const pt = plumePoint(p.s, p.t + drift);
            return (
              <circle
                key={`pt-${i}`}
                cx={pt.x}
                cy={pt.y}
                r={p.r}
                fill={p.teal ? "url(#particleTeal)" : "url(#particleAmber)"}
                opacity={p.a * reveal}
              />
            );
          })}
        </g>

        {/* Nucleus — 67P silhouette */}
        <g
          transform={`translate(${interpolate(
            nucleusSpring,
            [0, 1],
            [-24, 0],
          )}, 0)`}
          opacity={nucleusSpring}
        >
          {/* Under-shadow */}
          <ellipse
            cx={430}
            cy={630}
            rx={175}
            ry={22}
            fill="#000"
            opacity={0.35}
            filter="url(#softBlur)"
          />
          {/* Body fill */}
          <path d={NUCLEUS_PATH} fill="url(#crustGrad)" />
          {/* Terminator / sunlit crescent — an internal wash from the
              upper-right, clipped to the nucleus so it hugs the silhouette. */}
          <g clipPath="url(#nucleusClip)">
            <rect
              x={200}
              y={260}
              width={500}
              height={400}
              fill="url(#sunlitEdge)"
            />
            {/* A finer bright rim along the sunlit limb */}
            <path
              d={NUCLEUS_PATH}
              fill="none"
              stroke={AMBER}
              strokeOpacity={0.9}
              strokeWidth={1.6}
              transform="translate(-8,-4)"
            />
            {/* Craters / mottling — a handful of hand-placed darker
                circles that read as pits at this scale. */}
            {[
              { x: 340, y: 360, r: 14, a: 0.55 },
              { x: 385, y: 405, r: 8, a: 0.4 },
              { x: 320, y: 430, r: 10, a: 0.5 },
              { x: 415, y: 435, r: 20, a: 0.6 },
              { x: 470, y: 470, r: 12, a: 0.45 },
              { x: 500, y: 520, r: 18, a: 0.55 },
              { x: 452, y: 555, r: 9, a: 0.5 },
              { x: 380, y: 555, r: 14, a: 0.45 },
              { x: 340, y: 505, r: 7, a: 0.4 },
              { x: 545, y: 465, r: 6, a: 0.35 },
              { x: 425, y: 490, r: 5, a: 0.35 },
              { x: 490, y: 415, r: 4, a: 0.3 },
            ].map((c, i) => (
              <circle
                key={`crater-${i}`}
                cx={c.x}
                cy={c.y}
                r={c.r}
                fill="#000"
                opacity={c.a}
              />
            ))}
            {/* Highlight speckles — sunlit boulders */}
            {[
              { x: 470, y: 415, r: 2.4 },
              { x: 490, y: 445, r: 1.8 },
              { x: 515, y: 480, r: 2.2 },
              { x: 445, y: 400, r: 1.6 },
              { x: 400, y: 355, r: 1.6 },
              { x: 360, y: 390, r: 1.4 },
              { x: 420, y: 460, r: 1.2 },
            ].map((c, i) => (
              <circle
                key={`spec-${i}`}
                cx={c.x}
                cy={c.y}
                r={c.r}
                fill={DUST}
                opacity={0.8}
              />
            ))}
          </g>
          {/* Outer silhouette edge — deep contour on the dark side */}
          <path
            d={NUCLEUS_PATH}
            fill="none"
            stroke={CRUST_DEEP}
            strokeWidth={2}
            opacity={0.9}
          />

          {/* Callout label to the nucleus — kept inside the 80-px margin */}
          <g opacity={interpolate(nucleusSpring, [0.6, 1], [0, 1])}>
            <line
              x1={286}
              y1={584}
              x2={220}
              y2={720}
              stroke={GRAY}
              strokeWidth={1}
            />
            <line
              x1={220}
              y1={720}
              x2={330}
              y2={720}
              stroke={GRAY}
              strokeWidth={1}
            />
            <text
              x={340}
              y={714}
              textAnchor="start"
              fill={GRAY}
              fontFamily={inter}
              fontSize={11}
              fontWeight={600}
              letterSpacing={3.5}
            >
              67P/C–G
            </text>
            <text
              x={340}
              y={732}
              textAnchor="start"
              fill={GRAY}
              fontFamily={inter}
              fontSize={9}
              letterSpacing={2.5}
              opacity={0.85}
            >
              NUCLEUS · 4.3 KM · ALBEDO 0.06
            </text>
          </g>
        </g>

        {/* Molecule "notes" cards along the plume */}
        <g>
          {NOTES.map((n, i) => {
            const appear = spring({
              frame: frame - fps * (0.9 + i * 0.18),
              fps,
              config: { damping: 200, mass: 0.9 },
              durationInFrames: fps * 1.2,
            });
            if (appear < 0.001) return null;
            const pt = plumePoint(n.s, n.t);
            const isLeft = n.align === "left";
            const cardW = 210;
            const cardH = 62;
            // Clamp so cards stay inside the 80-px margins.
            const rawCx = pt.x + (isLeft ? 22 : -22 - cardW);
            const cx = Math.max(80, Math.min(1080 - 80 - cardW, rawCx));
            const cy = pt.y - cardH / 2;
            const tickX1 = pt.x;
            const tickX2 = isLeft ? cx : cx + cardW;
            return (
              <g
                key={`note-${i}`}
                opacity={appear}
                transform={`translate(0, ${interpolate(
                  appear,
                  [0, 1],
                  [8, 0],
                )})`}
              >
                {/* Anchor dot on the plume */}
                <circle cx={pt.x} cy={pt.y} r={2.6} fill={AMBER} />
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={7}
                  fill={AMBER}
                  opacity={0.18}
                />
                {/* Leader line */}
                <line
                  x1={tickX1}
                  y1={pt.y}
                  x2={tickX2}
                  y2={pt.y}
                  stroke={AMBER}
                  strokeOpacity={0.6}
                  strokeWidth={1}
                />
                {/* Card */}
                <rect
                  x={cx}
                  y={cy}
                  width={cardW}
                  height={cardH}
                  fill={INK_2}
                  fillOpacity={0.9}
                  stroke={AMBER}
                  strokeOpacity={0.55}
                  strokeWidth={1}
                  rx={2}
                />
                {/* Formula (display) */}
                <text
                  x={cx + 16}
                  y={cy + 30}
                  fill={AMBER}
                  fontFamily={playfair}
                  fontStyle="italic"
                  fontSize={26}
                  fontWeight={500}
                >
                  {n.formula}
                </text>
                {/* Divider */}
                <line
                  x1={cx + 90}
                  y1={cy + 14}
                  x2={cx + 90}
                  y2={cy + cardH - 14}
                  stroke={AMBER}
                  strokeOpacity={0.35}
                />
                {/* Name (small caps) */}
                <text
                  x={cx + 104}
                  y={cy + 26}
                  fill="#E9EAEE"
                  fontFamily={inter}
                  fontSize={10}
                  fontWeight={600}
                  letterSpacing={2.4}
                >
                  {n.name.toUpperCase()}
                </text>
                {/* Scent descriptor */}
                <text
                  x={cx + 104}
                  y={cy + 46}
                  fill={COMA}
                  fontFamily={inter}
                  fontStyle="italic"
                  fontSize={12}
                  fontWeight={400}
                  letterSpacing={0.5}
                >
                  {n.scent}
                </text>
              </g>
            );
          })}
        </g>

        {/* Divider under the visual zone */}
        <line
          x1={80}
          y1={892}
          x2={1000}
          y2={892}
          stroke={GRAY}
          strokeOpacity={0.35}
        />
      </svg>

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
        <span style={{ color: AMBER }}>2026 · 07 · 05</span>
      </div>

      {/* Caption strip just below the visual zone */}
      <div
        style={{
          position: "absolute",
          top: 862,
          left: 80,
          right: 80,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          color: GRAY,
          fontFamily: inter,
          fontSize: 11,
          letterSpacing: 3,
          fontWeight: 500,
          textTransform: "uppercase",
          opacity: 0.9,
        }}
      >
        <span>Fig. 1 · Coma sampled by ROSINA at 2.7–3.1 AU</span>
        <span style={{ color: COMA }}>Volatile inventory · six notes</span>
      </div>

      {/* ── Type lockup ────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 930,
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
            marginBottom: 20,
            fontWeight: 600,
          }}
        >
          Role <span style={{ color: GRAY, margin: "0 6px" }}>/</span>
          <span style={{ color: "#EDEDEF", letterSpacing: 5 }}>Perfumer</span>
        </div>

        <div
          style={{
            color: "#F4F4F6",
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 78,
            lineHeight: 0.98,
            letterSpacing: -1.4,
            fontStyle: "italic",
          }}
        >
          A perfumer of the
          <br />
          outer dark.
        </div>

        <div
          style={{
            marginTop: 28,
            color: "#C8CAD0",
            fontFamily: inter,
            fontSize: 19,
            lineHeight: 1.42,
            fontWeight: 400,
            maxWidth: 880,
            opacity: hookOpacity,
          }}
        >
          Rosetta's ROSINA mass spectrometer parsed the coma of{" "}
          <span style={{ color: AMBER, fontWeight: 600 }}>
            comet 67P/Churyumov–Gerasimenko
          </span>{" "}
          and read out its bouquet — hydrogen sulfide, ammonia, formaldehyde,
          bitter-almond HCN, methanol, sulfur dioxide — a 4.6-billion-year-old
          scent of the solar system's beginning.
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
        <span>Altwegg et al. · Science Advances 2, e1600285 (2016)</span>
        <span>
          <span style={{ color: COMA }}>◐</span> Coma · gas + dust
        </span>
      </div>
    </AbsoluteFill>
  );
};
