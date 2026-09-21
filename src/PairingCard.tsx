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
const INK = "#14100B";
const HEART = "#D9C79A";        // sun-bleached heartwood (dominant)
const RUST = "#8C6338";         // resinous rust bark accent
const DOLOMITE = "#5C6C6E";     // dolomite / high-altitude sky (grid, secondary type)
const PARCHMENT = "#F4EBD3";    // parchment cream (primary type)

// Derived tints for wood grain
const HEART_LIGHT = "#EBDEB8";
const HEART_MID = "#C9B587";
const HEART_DEEP = "#A78E5C";
const DARK_RING = "#2B1F10";
const EVENT_RING = "#8C2E10";
const RUST_DEEP = "#6E4A22";

// Tree specification
const BIRTH_BCE = 2833;
const NOW_YEAR = 2026;
const LIFESPAN = BIRTH_BCE + NOW_YEAR; // 4859

// Historical event rings (year in CE; BCE as negative)
type Callout = {
  yearNumeric: number; // CE positive, BCE negative
  label: string;
  event: string;
  angleDeg: number; // where the leader touches the ring (SVG angle, 0 = +x, CW)
};
const CALLOUTS: Callout[] = [
  { yearNumeric: -1600, label: "1600 BCE", event: "Thera · Aegean ash veil", angleDeg: -62 },
  { yearNumeric: -44, label: "44 BCE", event: "Etna · Rome's dim summer", angleDeg: -32 },
  { yearNumeric: 536, label: "536 CE", event: "Mystery dust veil · 2 kyr cold peak", angleDeg: -8 },
  { yearNumeric: 1257, label: "1257 CE", event: "Samalas · Lombok, Indonesia", angleDeg: 18 },
  { yearNumeric: 1815, label: "1815 CE", event: "Tambora · year without summer", angleDeg: 40 },
];

const yearToLifeIndex = (yearNumeric: number): number =>
  // yearNumeric CE positive, BCE negative. BIRTH_BCE=2833 → life index for 2833 BCE = 0
  yearNumeric + BIRTH_BCE;

// ── Deterministic noise for organic ring rhythm ──────────────────────
const seededRand = (x: number): number => {
  const s = Math.sin(x * 127.13 + 3.71) * 43758.5453;
  return s - Math.floor(s);
};

// Return a growth-factor for a given ring-year (0.55 .. 1.4).
// Baseline oscillates gently; event years and nearby years are compressed.
const growthAt = (lifeIndex: number): number => {
  const base = 0.9 + 0.22 * Math.sin(lifeIndex * 0.11) + 0.16 * Math.sin(lifeIndex * 0.023);
  const jitter = (seededRand(lifeIndex) - 0.5) * 0.28;
  let g = base + jitter;
  // Suppress growth ±3 years around each event year
  for (const c of CALLOUTS) {
    const li = yearToLifeIndex(c.yearNumeric);
    const d = Math.abs(lifeIndex - li);
    if (d <= 3) g *= 0.55 + 0.1 * d;
  }
  return Math.max(0.42, Math.min(1.45, g));
};

// Build cumulative radial positions for every year of life.
// Returned radii are normalised 0..1 which we then map to pixels.
const buildRadii = (): number[] => {
  const arr: number[] = new Array(LIFESPAN + 1);
  let acc = 0;
  const raw: number[] = [];
  for (let i = 0; i <= LIFESPAN; i++) {
    const g = i === 0 ? 0 : growthAt(i);
    acc += g;
    raw.push(acc);
  }
  const total = acc;
  for (let i = 0; i <= LIFESPAN; i++) arr[i] = raw[i] / total;
  return arr;
};

const RADII = buildRadii();

// Geometry
const DISK_CX = 430;
const DISK_CY = 510;
const R_MIN = 3;
const R_MAX = 335;

const radiusFor = (lifeIndex: number): number => {
  const t = RADII[Math.max(0, Math.min(LIFESPAN, lifeIndex))];
  return R_MIN + (R_MAX - R_MIN) * t;
};

// Ring stroke set: sample every ~15 years for dense but drawable grain.
const SAMPLE_STEP = 15;

const polar = (cx: number, cy: number, r: number, angDeg: number) => {
  const rad = (angDeg * Math.PI) / 180;
  return { x: cx + Math.cos(rad) * r, y: cy + Math.sin(rad) * r };
};

// Slight elliptical squash for organic feel
const RX_SCALE = 1.0;
const RY_SCALE = 0.97;

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Growth reveal (0..1) — rings appear from pith outward
  const growSpring = spring({
    frame,
    fps,
    config: { damping: 200, mass: 1.2, stiffness: 60 },
    durationInFrames: fps * 2.8,
  });
  const reveal = growSpring;

  // Title / hook fade-ins
  const roleTag = spring({
    frame: frame - fps * 1.4,
    fps,
    config: { damping: 200, mass: 0.9 },
  });
  const titleSpring = spring({
    frame: frame - fps * 1.7,
    fps,
    config: { damping: 200, mass: 0.9 },
  });
  const hookOpacity = interpolate(frame, [fps * 2.4, fps * 3.2], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Radial pulse after full growth
  const pulsePhase = ((frame - fps * 3.0) / (fps * 2.6)) % 1;
  const pulseActive = frame > fps * 3.0;

  // Callout appearance driven by whether the reveal has reached its radius.
  const revealedRadius = reveal * R_MAX;

  return (
    <AbsoluteFill style={{ backgroundColor: INK, fontFamily: inter }}>
      <style>{fontCss}</style>

      {/* Top metadata band — asymmetric, aligned to margins */}
      <div
        style={{
          position: "absolute",
          top: 56,
          left: 80,
          right: 80,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          color: DOLOMITE,
          fontFamily: inter,
          fontSize: 13,
          letterSpacing: 4.5,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Everyday Motivation · No. 003</span>
        <span style={{ color: RUST }}>2026 · 09 · 21</span>
      </div>

      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          {/* Radial gradient — wood tonal falloff */}
          <radialGradient id="wood" cx="46%" cy="44%" r="62%">
            <stop offset="0%" stopColor={HEART_LIGHT} />
            <stop offset="42%" stopColor={HEART} />
            <stop offset="82%" stopColor={HEART_MID} />
            <stop offset="100%" stopColor={HEART_DEEP} />
          </radialGradient>

          {/* Vignette outside the disk — subtle dolomite dust field */}
          <radialGradient id="field" cx="50%" cy="42%" r="70%">
            <stop offset="0%" stopColor="#1B1712" stopOpacity={1} />
            <stop offset="100%" stopColor={INK} stopOpacity={1} />
          </radialGradient>

          {/* Grid pattern — the archivist's index card */}
          <pattern id="grid" x={0} y={0} width={40} height={40} patternUnits="userSpaceOnUse">
            <path d="M40 0 L0 0 0 40" fill="none" stroke="#1F1B14" strokeWidth={1} />
          </pattern>
          <pattern id="grid-major" x={0} y={0} width={200} height={200} patternUnits="userSpaceOnUse">
            <path d="M200 0 L0 0 0 200" fill="none" stroke="#2A241C" strokeWidth={1} />
          </pattern>

          {/* Reveal clip — a growing circle */}
          <clipPath id="reveal-clip">
            <ellipse
              cx={DISK_CX}
              cy={DISK_CY}
              rx={revealedRadius * RX_SCALE + 2}
              ry={revealedRadius * RY_SCALE + 2}
            />
          </clipPath>

          {/* Silvered weather patch on outer SW arc — subtle bleached highlight */}
          <radialGradient id="weathered" cx="30%" cy="72%" r="55%">
            <stop offset="0%" stopColor="#F0E5C6" stopOpacity="0.18" />
            <stop offset="60%" stopColor="#F0E5C6" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#F0E5C6" stopOpacity="0" />
          </radialGradient>

          <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.4" />
          </filter>
        </defs>

        {/* Background field */}
        <rect x={0} y={0} width={1080} height={1350} fill="url(#field)" />
        {/* Faint grid — the archivist's index sheet — only in the outer band */}
        <mask id="grid-mask">
          <rect x={0} y={0} width={1080} height={1350} fill="white" />
          <ellipse
            cx={DISK_CX}
            cy={DISK_CY}
            rx={R_MAX + 22}
            ry={R_MAX + 22}
            fill="black"
          />
        </mask>
        <g mask="url(#grid-mask)">
          <rect x={60} y={140} width={960} height={780} fill="url(#grid)" opacity={0.42} />
          <rect x={60} y={140} width={960} height={780} fill="url(#grid-major)" opacity={0.55} />
        </g>

        {/* ── Cross-section disk ─────────────────────────────────────── */}
        <g clipPath="url(#reveal-clip)">
          {/* Wood base fill */}
          <ellipse
            cx={DISK_CX}
            cy={DISK_CY}
            rx={R_MAX * RX_SCALE}
            ry={R_MAX * RY_SCALE}
            fill="url(#wood)"
          />

          {/* Fine grain — dense variable rings simulating real xylem */}
          {Array.from({ length: Math.floor(LIFESPAN / SAMPLE_STEP) }, (_, k) => {
            const li = k * SAMPLE_STEP;
            const r = radiusFor(li);
            const s1 = seededRand(li * 0.31);
            const s2 = seededRand(li * 1.7);
            const shade = 0.08 + 0.28 * s1 * s1; // biased dark occasionally
            const w = 0.6 + 0.9 * s2;
            const color = s1 > 0.85 ? DARK_RING : (s1 > 0.6 ? RUST_DEEP : DARK_RING);
            return (
              <ellipse
                key={`fine-${k}`}
                cx={DISK_CX}
                cy={DISK_CY}
                rx={r * RX_SCALE}
                ry={r * RY_SCALE}
                fill="none"
                stroke={color}
                strokeOpacity={shade}
                strokeWidth={w}
              />
            );
          })}

          {/* Radial medullary rays — subtle streaks from pith */}
          {Array.from({ length: 24 }, (_, k) => {
            const a = k * 15 + seededRand(k) * 6;
            const rr1 = 10 + seededRand(k * 3.7) * 60;
            const rr2 = R_MAX * (0.55 + seededRand(k * 2.1) * 0.42);
            const p1 = polar(DISK_CX, DISK_CY, rr1, a);
            const p2 = polar(DISK_CX, DISK_CY, rr2, a);
            return (
              <line
                key={`ray-${k}`}
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke={RUST_DEEP}
                strokeOpacity={0.11 + seededRand(k * 5.3) * 0.09}
                strokeWidth={0.9}
              />
            );
          })}

          {/* Event rings — bold, resinous; twin-stroke for a rich char-mark feel */}
          {CALLOUTS.map((c) => {
            const li = yearToLifeIndex(c.yearNumeric);
            const r = radiusFor(li);
            return (
              <g key={`event-${c.label}`}>
                {/* Darker inner shadow ring */}
                <ellipse
                  cx={DISK_CX}
                  cy={DISK_CY}
                  rx={(r - 1.2) * RX_SCALE}
                  ry={(r - 1.2) * RY_SCALE}
                  fill="none"
                  stroke="#1E0E05"
                  strokeOpacity={0.75}
                  strokeWidth={1.4}
                />
                {/* Event ring itself */}
                <ellipse
                  cx={DISK_CX}
                  cy={DISK_CY}
                  rx={r * RX_SCALE}
                  ry={r * RY_SCALE}
                  fill="none"
                  stroke={EVENT_RING}
                  strokeOpacity={0.95}
                  strokeWidth={2.6}
                />
              </g>
            );
          })}

          {/* Silvered weathered arc — subtle bleaching on the SW side */}
          <ellipse
            cx={DISK_CX}
            cy={DISK_CY}
            rx={R_MAX * RX_SCALE}
            ry={R_MAX * RY_SCALE}
            fill="url(#weathered)"
          />

          {/* Radial hairline check (a single realistic radial crack) */}
          <path
            d={(() => {
              const angle = 205; // degrees — heads down-and-left into empty quadrant
              const pts: string[] = [];
              for (let step = 0; step <= 22; step++) {
                const rr = (step / 22) * R_MAX * 0.72;
                const wobble = (seededRand(step * 1.9) - 0.5) * 5;
                const a = angle + wobble * 0.5;
                const p = polar(DISK_CX, DISK_CY, rr, a);
                pts.push(`${step === 0 ? "M" : "L"} ${p.x} ${p.y}`);
              }
              return pts.join(" ");
            })()}
            stroke={DARK_RING}
            strokeOpacity={0.48}
            strokeWidth={1.4}
            fill="none"
          />

          {/* Pith — the origin */}
          <circle cx={DISK_CX} cy={DISK_CY} r={4.5} fill={DARK_RING} />
          <circle cx={DISK_CX} cy={DISK_CY} r={1.5} fill={INK} />
        </g>

        {/* Disk outline + subtle outer bark hint */}
        <g clipPath="url(#reveal-clip)">
          {/* Outer bark rim — narrow annulus */}
          <ellipse
            cx={DISK_CX}
            cy={DISK_CY}
            rx={(R_MAX - 4) * RX_SCALE}
            ry={(R_MAX - 4) * RY_SCALE}
            fill="none"
            stroke={RUST_DEEP}
            strokeOpacity={0.55}
            strokeWidth={2.4}
          />
          <ellipse
            cx={DISK_CX}
            cy={DISK_CY}
            rx={R_MAX * RX_SCALE}
            ry={R_MAX * RY_SCALE}
            fill="none"
            stroke={RUST}
            strokeOpacity={0.9}
            strokeWidth={1.4}
          />
        </g>

        {/* Radial pulse breathing through the disk after full growth */}
        {pulseActive &&
          (() => {
            const p = ((pulsePhase % 1) + 1) % 1;
            const r = p * R_MAX;
            const op = 0.35 * (1 - p);
            return (
              <g clipPath="url(#reveal-clip)">
                <ellipse
                  cx={DISK_CX}
                  cy={DISK_CY}
                  rx={r * RX_SCALE}
                  ry={r * RY_SCALE}
                  fill="none"
                  stroke={HEART_LIGHT}
                  strokeOpacity={op}
                  strokeWidth={1.6}
                />
              </g>
            );
          })()}

        {/* ── Callouts on the right side ───────────────────────────── */}
        {(() => {
          // Vertical stack for label cards on the right — fits within right margin
          const LABEL_X = 795;
          const LABEL_TOP = 205;
          const LABEL_STEP = 104;
          const LABEL_W = 205;
          return CALLOUTS.map((c, i) => {
            const li = yearToLifeIndex(c.yearNumeric);
            const r = radiusFor(li);
            const start = polar(DISK_CX, DISK_CY, r, c.angleDeg);
            const midX = DISK_CX + R_MAX * 1.05;
            const cardY = LABEL_TOP + i * LABEL_STEP;
            const cardX = LABEL_X;
            const revealed = r <= revealedRadius + 4;
            const op = revealed
              ? interpolate(
                  frame,
                  [
                    fps * (0.2 + (r / R_MAX) * 2.6),
                    fps * (0.6 + (r / R_MAX) * 2.6),
                  ],
                  [0, 1],
                  {
                    easing: Easing.out(Easing.cubic),
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  },
                )
              : 0;
            // Leader: exit radially past the disk edge, then a single joint to the card
            const outward = polar(DISK_CX, DISK_CY, R_MAX + 20, c.angleDeg);
            const cardEntryY = cardY + 22;
            const cardEntryX = cardX - 8;
            return (
              <g key={`co-${c.label}`} opacity={op}>
                <path
                  d={`M ${start.x} ${start.y} L ${outward.x} ${outward.y} L ${cardEntryX} ${cardEntryY}`}
                  fill="none"
                  stroke={RUST}
                  strokeWidth={1.1}
                  strokeLinejoin="round"
                />
                {/* Small tick at ring */}
                <circle cx={start.x} cy={start.y} r={3.2} fill={EVENT_RING} stroke={PARCHMENT} strokeWidth={1} />
                {/* Label card */}
                <g transform={`translate(${cardX}, ${cardY})`}>
                  <text
                    x={0}
                    y={0}
                    fill={RUST}
                    fontFamily={inter}
                    fontSize={13}
                    fontWeight={600}
                    letterSpacing={3.8}
                  >
                    {c.label}
                  </text>
                  <text
                    x={0}
                    y={26}
                    fill={PARCHMENT}
                    fontFamily={inter}
                    fontSize={15}
                    fontWeight={500}
                    letterSpacing={0.2}
                  >
                    {c.event}
                  </text>
                  <line
                    x1={0}
                    y1={46}
                    x2={LABEL_W}
                    y2={46}
                    stroke={DOLOMITE}
                    strokeOpacity={0.45}
                    strokeWidth={1}
                  />
                </g>
              </g>
            );
          });
        })()}

        {/* Pith callout — inline next to the center dot */}
        {(() => {
          const op = interpolate(frame, [fps * 0.15, fps * 0.65], [0, 1], {
            easing: Easing.out(Easing.cubic),
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          return (
            <g opacity={op}>
              {/* Small hairline pointer from the pith dot */}
              <line
                x1={DISK_CX + 7}
                y1={DISK_CY - 5}
                x2={DISK_CX + 28}
                y2={DISK_CY - 26}
                stroke={RUST}
                strokeWidth={1}
              />
              <g transform={`translate(${DISK_CX + 32}, ${DISK_CY - 42})`}>
                <rect
                  x={-8}
                  y={-14}
                  width={196}
                  height={46}
                  rx={2}
                  fill={INK}
                  fillOpacity={0.78}
                  stroke={RUST}
                  strokeOpacity={0.55}
                  strokeWidth={0.8}
                />
                <text
                  x={0}
                  y={0}
                  fill={RUST}
                  fontFamily={inter}
                  fontSize={12}
                  fontWeight={600}
                  letterSpacing={3.4}
                >
                  2833 BCE · PITH
                </text>
                <text
                  x={0}
                  y={20}
                  fill={PARCHMENT}
                  fontFamily={inter}
                  fontSize={13}
                  fontWeight={500}
                >
                  Methuselah's first ring
                </text>
              </g>
            </g>
          );
        })()}

        {/* ── FIG caption strip below disk ─────────────────────────── */}
        <g
          transform={`translate(80, 875)`}
          fill={DOLOMITE}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
        >
          <text>FIG. 1 · CROSS-SECTION · PINUS LONGAEVA · 4,858 RINGS</text>
          <text x={920} textAnchor="end" fill={RUST} opacity={0.9}>
            READ OUTWARD FROM PITH
          </text>
        </g>
      </svg>

      {/* ── Type lockup ────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 925,
          opacity: roleTag,
        }}
      >
        <div
          style={{
            color: RUST,
            fontFamily: inter,
            fontSize: 13,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 14,
            fontWeight: 600,
            transform: `translateY(${interpolate(roleTag, [0, 1], [10, 0])}px)`,
          }}
        >
          Role <span style={{ color: DOLOMITE, margin: "0 4px" }}>/</span>
          <span style={{ color: PARCHMENT, letterSpacing: 5 }}>
            Archivist
          </span>
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 970,
          opacity: titleSpring,
          transform: `translateY(${interpolate(titleSpring, [0, 1], [16, 0])}px)`,
        }}
      >
        <div
          style={{
            color: PARCHMENT,
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 92,
            lineHeight: 0.96,
            letterSpacing: -1.6,
            fontStyle: "italic",
          }}
        >
          The slowest
          <br />
          archive on Earth.
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 1180,
          color: "#DED6BF",
          fontFamily: inter,
          fontSize: 18,
          lineHeight: 1.42,
          fontWeight: 400,
          maxWidth: 900,
          opacity: hookOpacity,
        }}
      >
        A single{" "}
        <span style={{ color: RUST, fontWeight: 600 }}>
          bristlecone pine
        </span>{" "}
        (Methuselah, White Mountains, CA) has laid down 4,858 annual rings — a
        continuous, year-by-year climate ledger in which frost rings still
        mark the exact calendar year of Samalas, Tambora and the 536 CE dust
        veil.
      </div>

      {/* Footer */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          bottom: 40,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          color: DOLOMITE,
          fontFamily: inter,
          fontSize: 11,
          letterSpacing: 3,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Schulman 1958 · Salzer et al., PNAS 2009 · Sigl et al., Nature 2015</span>
        <span>
          <span style={{ color: EVENT_RING }}>●</span> Event ring
        </span>
      </div>
    </AbsoluteFill>
  );
};
