import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  interpolateColors,
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

// ── Palette (from the visual brief) ─────────────────────────────────────
const INK = "#0F0E0C";
const SAND = "#BF6A2E";
const STRAW = "#D9A646";
const STRAW_HI = "#F4C86B";
const STRAW_DK = "#8B6A26";
const BARK = "#3E2F1C";
const BARK_HI = "#6A4E2A";
const COLD = "#4F7DA3";
const COLD_DK = "#243E5C";
const PARCHMENT = "#E8DDC5";
const GRAY = "#8A8F99";
const GRID_FAINT = "#1C1A17";
const GRID_MAJOR = "#262320";

// Sky colour stops across the day cycle (t 0..1)
const skyStops: { t: number; c: string }[] = [
  { t: 0.0, c: "#13151F" },
  { t: 0.08, c: "#1C1A26" },
  { t: 0.14, c: "#51333B" },
  { t: 0.2, c: "#A05A36" },
  { t: 0.3, c: "#C9A264" },
  { t: 0.5, c: "#D7B678" },
  { t: 0.65, c: "#CC8C4C" },
  { t: 0.78, c: "#8B4228" },
  { t: 0.86, c: "#3A2232" },
  { t: 0.94, c: "#191824" },
  { t: 1.0, c: "#13151F" },
];

function skyColour(t: number): string {
  for (let i = 0; i < skyStops.length - 1; i++) {
    const a = skyStops[i];
    const b = skyStops[i + 1];
    if (t >= a.t && t <= b.t) {
      const f = (t - a.t) / (b.t - a.t);
      return interpolateColors(f, [0, 1], [a.c, b.c]);
    }
  }
  return skyStops[skyStops.length - 1].c;
}

// Ambient temperature across the day (°C)
function ambientAt(t: number): number {
  return interpolate(
    t,
    [0, 0.08, 0.2, 0.5, 0.75, 0.86, 1],
    [1, -1, 12, 33, 22, 12, 1],
    { easing: Easing.inOut(Easing.ease) },
  );
}

// ── Chamber grid ─────────────────────────────────────────────────────────
type Chamber = { x: number; y: number; delay: number };
const NEST = { cx: 740, cy: 575, rx: 220, ry: 212 };

const CHAMBERS: Chamber[] = (() => {
  const out: Chamber[] = [];
  const dx = 58;
  const dy = 52;
  const marginX = NEST.rx - 32;
  const marginY = NEST.ry - 30;
  for (let r = -3; r <= 3; r++) {
    const offset = Math.abs(r) % 2 === 1 ? dx / 2 : 0;
    for (let c = -3; c <= 3; c++) {
      const x = NEST.cx + c * dx + offset;
      const y = NEST.cy + r * dy;
      const e =
        ((x - NEST.cx) / marginX) ** 2 + ((y - NEST.cy) / marginY) ** 2;
      if (e <= 1) {
        const d = Math.hypot(x - NEST.cx, y - NEST.cy);
        out.push({ x, y, delay: d / 300 });
      }
    }
  }
  return out;
})();

// Perch silhouettes (little birds at some entrances)
const PERCH_IDX = [2, 7, 13, 21, 28];

// Thermometer layout (kept clear of the sky band)
const THERM = {
  x: 120,
  w: 26,
  yTop: 388,
  yBottom: 820,
  tMax: 40,
  tMin: -10,
};
const tempToY = (T: number) =>
  THERM.yBottom - ((T - THERM.tMin) / (THERM.tMax - THERM.tMin)) * (THERM.yBottom - THERM.yTop);

const BRANCH_Y = 352;

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const t = (frame % durationInFrames) / durationInFrames;

  const skyNow = skyColour(t);
  const ambient = ambientAt(t);
  const interior = 22;

  const sunStart = 0.08;
  const sunEnd = 0.86;
  const sunVisible = t > sunStart && t < sunEnd;
  const sunPhase = sunVisible ? (t - sunStart) / (sunEnd - sunStart) : 0;
  const sunAngle = Math.PI * (1 - sunPhase); // π → 0 (left → right)
  const arcCx = 540;
  const arcCy = 352;
  const arcR = 230;
  const sunX = arcCx + arcR * Math.cos(sunAngle);
  const sunY = arcCy - arcR * Math.sin(sunAngle);

  const starPhase = Math.min(
    Math.max(0, 1 - sunPhase * 6),
    Math.max(0, (sunPhase - 0.95) * 10),
    1,
  );
  // simpler: stars visible when far outside sun window
  const nightAmount =
    t < sunStart || t > sunEnd
      ? 1
      : Math.min(
          (t - sunStart) / 0.05,
          (sunEnd - t) / 0.05,
          1,
        ) < 0.3
      ? 0.7
      : 0;

  // Reveal timings
  const sceneIn = spring({
    frame,
    fps,
    config: { damping: 220, mass: 1 },
    durationInFrames: 36,
  });
  const titleIn = spring({
    frame: frame - 12,
    fps,
    config: { damping: 220, mass: 0.9 },
    durationInFrames: 40,
  });
  const hookOpacity = interpolate(frame, [30, 60], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const ambientY = tempToY(ambient);
  const interiorY = tempToY(interior);

  // Nest silhouette path — a hanging thatched dome
  const nestPath = (() => {
    const { cx, cy, rx, ry } = NEST;
    const topY = cy - ry;
    const botY = cy + ry;
    return (
      `M ${cx - rx + 20} ${topY + 8} ` +
      `C ${cx - rx} ${cy - 60}, ${cx - rx + 4} ${cy + 120}, ${cx - rx * 0.6} ${botY - 20} ` +
      `C ${cx - rx * 0.3} ${botY + 12}, ${cx + rx * 0.3} ${botY + 12}, ${cx + rx * 0.6} ${botY - 20} ` +
      `C ${cx + rx - 4} ${cy + 120}, ${cx + rx} ${cy - 60}, ${cx + rx - 20} ${topY + 8} ` +
      `Z`
    );
  })();

  // Format signed temp text
  const fmtTemp = (T: number) => {
    const n = Math.round(T);
    return `${n > 0 ? "+" : ""}${n}°C`;
  };

  const ambientLabel = fmtTemp(ambient);

  return (
    <AbsoluteFill style={{ backgroundColor: INK, fontFamily: inter }}>
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
          color: GRAY,
          fontFamily: inter,
          fontSize: 13,
          letterSpacing: 4.5,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Everyday Motivation · No. 003</span>
        <span style={{ color: STRAW }}>2026 · 11 · 20</span>
      </div>

      {/* Working frame rule */}
      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          <linearGradient id="sky-fade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={skyNow} stopOpacity={0.95} />
            <stop offset="100%" stopColor={INK} stopOpacity={1} />
          </linearGradient>

          <linearGradient id="therm-bar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#E74A2B" />
            <stop offset="35%" stopColor="#E9A24C" />
            <stop offset="55%" stopColor="#CFCF8F" />
            <stop offset="80%" stopColor="#6D9DBE" />
            <stop offset="100%" stopColor={COLD_DK} />
          </linearGradient>

          <radialGradient id="sun-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={STRAW_HI} stopOpacity={0.7} />
            <stop offset="100%" stopColor={STRAW_HI} stopOpacity={0} />
          </radialGradient>

          <radialGradient id="chamber-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={STRAW_HI} stopOpacity={0.9} />
            <stop offset="55%" stopColor={STRAW} stopOpacity={0.9} />
            <stop offset="100%" stopColor={STRAW_DK} stopOpacity={0.9} />
          </radialGradient>

          <radialGradient id="chamber-halo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={STRAW_HI} stopOpacity={0.35} />
            <stop offset="100%" stopColor={STRAW_HI} stopOpacity={0} />
          </radialGradient>

          <linearGradient id="nest-body" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2C2217" />
            <stop offset="55%" stopColor="#1C150E" />
            <stop offset="100%" stopColor="#0F0A05" />
          </linearGradient>

          <linearGradient id="horizon-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SAND} stopOpacity={0.9} />
            <stop offset="100%" stopColor={SAND} stopOpacity={0} />
          </linearGradient>

          <pattern
            id="thatch"
            x={0}
            y={0}
            width={9}
            height={26}
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(-4)"
          >
            <line x1={4.5} y1={0} x2={4.5} y2={26} stroke={STRAW_DK} strokeWidth={1.4} strokeOpacity={0.55} />
            <line x1={4.5} y1={2} x2={4.5} y2={22} stroke="#5A4418" strokeWidth={0.6} strokeOpacity={0.9} strokeDasharray="3 4" />
          </pattern>

          <filter id="warm-bloom" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <clipPath id="nest-clip">
            <path d={nestPath} />
          </clipPath>
        </defs>

        {/* ─── Sky band ────────────────────────────────────────────────── */}
        <rect x={60} y={120} width={960} height={232} fill={skyNow} />

        {/* Horizon haze */}
        <rect x={60} y={300} width={960} height={54} fill="url(#horizon-grad)" opacity={0.5} />

        {/* Sun arc path */}
        <path
          d={`M ${arcCx - arcR} ${arcCy} A ${arcR} ${arcR} 0 0 1 ${arcCx + arcR} ${arcCy}`}
          fill="none"
          stroke={GRID_MAJOR}
          strokeWidth={1}
          strokeDasharray="2 7"
        />

        {/* Compass marks: dawn, noon, dusk */}
        {[
          { a: Math.PI, label: "06:00" },
          { a: Math.PI / 2, label: "12:00" },
          { a: 0, label: "18:00" },
        ].map((m, i) => {
          const mx = arcCx + arcR * Math.cos(m.a);
          const my = arcCy - arcR * Math.sin(m.a);
          return (
            <g key={i}>
              <circle cx={mx} cy={my} r={2.5} fill={GRAY} />
              <text
                x={mx}
                y={i === 1 ? my - 12 : arcCy + 20}
                textAnchor="middle"
                fontFamily={inter}
                fontSize={10}
                fontWeight={500}
                letterSpacing={2.5}
                fill={GRAY}
              >
                {m.label}
              </text>
            </g>
          );
        })}

        {/* Stars at night */}
        {nightAmount > 0 &&
          [
            [220, 200],
            [310, 165],
            [440, 215],
            [560, 148],
            [700, 200],
            [820, 170],
            [920, 230],
            [170, 260],
            [380, 275],
            [650, 275],
            [860, 290],
          ].map(([sx, sy], i) => (
            <circle
              key={i}
              cx={sx}
              cy={sy}
              r={i % 3 === 0 ? 1.6 : 1.0}
              fill={PARCHMENT}
              opacity={nightAmount * (i % 2 === 0 ? 0.9 : 0.55)}
            />
          ))}

        {/* Sun */}
        {sunVisible && (
          <g>
            <circle cx={sunX} cy={sunY} r={96} fill="url(#sun-glow)" />
            <circle cx={sunX} cy={sunY} r={56} fill="url(#sun-glow)" opacity={0.9} />
            <circle cx={sunX} cy={sunY} r={22} fill="#FFECC2" />
            <circle cx={sunX} cy={sunY} r={13} fill={PARCHMENT} opacity={0.85} />
          </g>
        )}

        {/* Weaver silhouettes in flight against the sky */}
        {[
          { x: 260, y: 182, s: 1.0, flip: 1 },
          { x: 400, y: 232, s: 0.85, flip: 1 },
          { x: 780, y: 168, s: 0.8, flip: -1 },
          { x: 900, y: 214, s: 0.72, flip: -1 },
        ].map((b, i) => (
          <path
            key={`fly-${i}`}
            d={`M ${-14 * b.s} 0 Q ${-7 * b.s} ${-10 * b.s} 0 ${-2 * b.s} Q ${7 * b.s} ${-10 * b.s} ${14 * b.s} 0`}
            transform={`translate(${b.x}, ${b.y}) scale(${b.flip}, 1)`}
            fill="none"
            stroke={INK}
            strokeWidth={2.4}
            strokeOpacity={0.85}
            strokeLinecap="round"
          />
        ))}

        {/* Sky-band inner border */}
        <rect
          x={60 + 0.5}
          y={120 + 0.5}
          width={960 - 1}
          height={232 - 1}
          fill="none"
          stroke="#28251F"
          strokeWidth={1}
        />

        {/* ─── Ground zone ─────────────────────────────────────────────── */}
        <rect x={60} y={352} width={960} height={530} fill={INK} />

        {/* Subtle ground grid */}
        <g opacity={0.5}>
          {[400, 460, 520, 580, 640, 700, 760, 820].map((y, i) => (
            <line
              key={i}
              x1={60}
              y1={y}
              x2={1020}
              y2={y}
              stroke={GRID_FAINT}
              strokeWidth={1}
            />
          ))}
        </g>

        {/* Camelthorn branch */}
        <g>
          <line
            x1={300}
            y1={BRANCH_Y + 2}
            x2={1020}
            y2={BRANCH_Y - 18}
            stroke={BARK}
            strokeWidth={14}
            strokeLinecap="round"
          />
          <line
            x1={310}
            y1={BRANCH_Y + 1}
            x2={1020}
            y2={BRANCH_Y - 18}
            stroke={BARK_HI}
            strokeWidth={2}
            opacity={0.8}
          />
          {/* Thorn twigs */}
          <line x1={420} y1={BRANCH_Y - 6} x2={408} y2={BRANCH_Y - 22} stroke={BARK_HI} strokeWidth={1.5} />
          <line x1={520} y1={BRANCH_Y - 10} x2={505} y2={BRANCH_Y - 26} stroke={BARK_HI} strokeWidth={1.5} />
          <line x1={600} y1={BRANCH_Y - 12} x2={616} y2={BRANCH_Y - 30} stroke={BARK_HI} strokeWidth={1.5} />
          <line x1={880} y1={BRANCH_Y - 20} x2={866} y2={BRANCH_Y - 38} stroke={BARK_HI} strokeWidth={1.5} />
        </g>

        {/* ─── Nest cross-section ──────────────────────────────────────── */}
        <g opacity={sceneIn}>
          {/* Shadow under nest */}
          <ellipse
            cx={NEST.cx}
            cy={NEST.cy + NEST.ry + 18}
            rx={NEST.rx * 0.9}
            ry={14}
            fill="#000"
            opacity={0.45}
          />

          {/* Thatch body */}
          <path d={nestPath} fill="url(#nest-body)" />
          <path d={nestPath} fill="url(#thatch)" opacity={0.55} />

          {/* Cross-section cut line — a vertical seam running down middle-left */}
          <line
            x1={NEST.cx - NEST.rx * 0.75}
            y1={NEST.cy - NEST.ry * 0.7}
            x2={NEST.cx - NEST.rx * 0.55}
            y2={NEST.cy + NEST.ry * 0.85}
            stroke={PARCHMENT}
            strokeWidth={1}
            strokeOpacity={0.35}
            strokeDasharray="2 5"
          />

          {/* Interior chambers */}
          <g clipPath="url(#nest-clip)">
            {CHAMBERS.map((ch, i) => {
              const reveal = Math.min(
                1,
                Math.max(0, sceneIn * 1.6 - ch.delay),
              );
              const warm = 0.75 + 0.25 * Math.sin((frame / fps + i * 0.3) * 1.2);
              return (
                <g key={i} opacity={reveal}>
                  <circle
                    cx={ch.x}
                    cy={ch.y}
                    r={30}
                    fill="url(#chamber-halo)"
                    opacity={warm * 0.6}
                  />
                  <circle
                    cx={ch.x}
                    cy={ch.y}
                    r={16}
                    fill="url(#chamber-glow)"
                  />
                  <circle
                    cx={ch.x}
                    cy={ch.y}
                    r={7.5}
                    fill={INK}
                  />
                  <circle
                    cx={ch.x - 2}
                    cy={ch.y - 2}
                    r={2.8}
                    fill={STRAW_HI}
                    opacity={0.55}
                  />
                </g>
              );
            })}

          </g>

          {/* Nest outline */}
          <path
            d={nestPath}
            fill="none"
            stroke={STRAW_DK}
            strokeWidth={2.5}
            strokeOpacity={0.85}
          />

          {/* Bloom over whole nest for the warmth */}
          <path
            d={nestPath}
            fill="none"
            stroke={STRAW_HI}
            strokeWidth={0.6}
            strokeOpacity={0.5}
            filter="url(#warm-bloom)"
          />
        </g>

        {/* ─── Thermometer (left) ──────────────────────────────────────── */}
        <g opacity={sceneIn}>
          {/* Column label */}
          <text
            x={THERM.x + THERM.w / 2}
            y={THERM.yTop - 16}
            textAnchor="middle"
            fontFamily={inter}
            fontSize={10}
            letterSpacing={3}
            fontWeight={600}
            fill={GRAY}
          >
            AMBIENT
          </text>

          {/* Bar */}
          <rect
            x={THERM.x}
            y={THERM.yTop}
            width={THERM.w}
            height={THERM.yBottom - THERM.yTop}
            fill="url(#therm-bar)"
            rx={THERM.w / 2}
          />
          <rect
            x={THERM.x + 0.5}
            y={THERM.yTop + 0.5}
            width={THERM.w - 1}
            height={THERM.yBottom - THERM.yTop - 1}
            fill="none"
            stroke="#2A2620"
            strokeWidth={1}
            rx={THERM.w / 2}
          />

          {/* Scale ticks + labels */}
          {[40, 30, 20, 10, 0, -10].map((v) => {
            const y = tempToY(v);
            return (
              <g key={v}>
                <line
                  x1={THERM.x - 6}
                  y1={y}
                  x2={THERM.x}
                  y2={y}
                  stroke={GRAY}
                  strokeWidth={1}
                />
                <text
                  x={THERM.x - 10}
                  y={y + 3}
                  textAnchor="end"
                  fontFamily={inter}
                  fontSize={11}
                  fontWeight={500}
                  fill={GRAY}
                  letterSpacing={0.5}
                >
                  {v > 0 ? `+${v}` : v}
                </text>
              </g>
            );
          })}

          {/* Interior line — the one steady value */}
          <g>
            <line
              x1={THERM.x + THERM.w}
              y1={interiorY}
              x2={NEST.cx + NEST.rx * 0.75}
              y2={interiorY}
              stroke={STRAW_HI}
              strokeWidth={1.5}
              strokeDasharray="6 5"
              opacity={0.85}
            />
            {/* Marker on bar */}
            <rect
              x={THERM.x - 2}
              y={interiorY - 4}
              width={THERM.w + 4}
              height={8}
              fill={STRAW_HI}
              stroke={INK}
              strokeWidth={1}
            />
            {/* Label block sits just above the dashed line, in free space between therm and nest */}
            <g transform={`translate(${THERM.x + 230}, ${interiorY - 48})`}>
              <text
                x={0}
                y={0}
                fontFamily={inter}
                fontSize={10}
                fontWeight={600}
                fill={STRAW_HI}
                letterSpacing={3.5}
              >
                INTERIOR &nbsp;·&nbsp; ALL DAY, ALL NIGHT
              </text>
              <text
                x={0}
                y={30}
                fontFamily={inter}
                fontSize={26}
                fontWeight={600}
                fill={STRAW_HI}
                letterSpacing={0.6}
              >
                +22&#176;C
              </text>
            </g>
          </g>

          {/* Ambient marker (moving) */}
          <g>
            <circle
              cx={THERM.x + THERM.w + 4}
              cy={ambientY}
              r={7}
              fill={INK}
              stroke={PARCHMENT}
              strokeWidth={1.5}
            />
            <polygon
              points={`${THERM.x + THERM.w + 12},${ambientY - 6} ${THERM.x + THERM.w + 22},${ambientY} ${THERM.x + THERM.w + 12},${ambientY + 6}`}
              fill={PARCHMENT}
            />
            <text
              x={THERM.x + THERM.w + 30}
              y={ambientY + 5}
              fontFamily={inter}
              fontSize={16}
              fontWeight={600}
              fill={PARCHMENT}
              letterSpacing={0.5}
            >
              {ambientLabel}
            </text>
            <text
              x={THERM.x + THERM.w + 30}
              y={ambientY + 20}
              fontFamily={inter}
              fontSize={9}
              fontWeight={500}
              fill={GRAY}
              letterSpacing={2.5}
            >
              OUTSIDE AIR
            </text>
          </g>

          {/* Bar bottom + top caps */}
          <circle cx={THERM.x + THERM.w / 2} cy={THERM.yBottom + 12} r={14} fill={COLD_DK} stroke="#2A2620" strokeWidth={1} />
        </g>

        {/* ─── Caption strip under scene ───────────────────────────────── */}
        <g
          transform={`translate(80, 870)`}
          fill={GRAY}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
        >
          <text>FIG. 1 · CROSS-SECTION, PHILETAIRUS SOCIUS COMMUNAL NEST</text>
          <text x={920} textAnchor="end" fill={STRAW} opacity={0.9}>
            UP TO 23&#176;C DIFFERENTIAL
          </text>
        </g>
      </svg>

      {/* ── Type lockup ──────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 920,
          opacity: titleIn,
          transform: `translateY(${interpolate(titleIn, [0, 1], [16, 0])}px)`,
        }}
      >
        <div
          style={{
            color: STRAW,
            fontFamily: inter,
            fontSize: 13,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 20,
            fontWeight: 600,
          }}
        >
          Role <span style={{ color: GRAY, margin: "0 4px" }}>/</span>
          <span style={{ color: PARCHMENT, letterSpacing: 5 }}>HVAC Engineer</span>
        </div>

        <div
          style={{
            color: PARCHMENT,
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 86,
            lineHeight: 0.96,
            letterSpacing: -1.6,
            fontStyle: "italic",
          }}
        >
          The hundred&#8209;door
          <br />
          thermostat.
        </div>

        <div
          style={{
            marginTop: 30,
            color: "#C6C2B3",
            fontFamily: inter,
            fontSize: 19,
            lineHeight: 1.42,
            fontWeight: 400,
            maxWidth: 890,
            opacity: hookOpacity,
          }}
        >
          A colony of sociable weavers (
          <span style={{ color: STRAW, fontStyle: "italic", fontWeight: 500 }}>
            Philetairus socius
          </span>
          ) builds the largest communal nest on Earth — one thatched dome, 100+ breeding pairs — and the insulation of the straw alone keeps interior chambers up to{" "}
          <span style={{ color: STRAW_HI, fontWeight: 600 }}>23&#8201;&#176;C warmer</span>{" "}
          than outside on winter desert nights, with no mechanical part anywhere in the system.
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
        <span>Bartholomew, White &amp; Howell · The Condor 78 (1976) 268&ndash;273</span>
        <span>
          <span style={{ color: STRAW }}>&#9679;</span> Thatch = Insulation
        </span>
      </div>
    </AbsoluteFill>
  );
};
