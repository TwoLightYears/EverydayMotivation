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

// Palette — taken from the concept's visual brief
const INK = "#061724";
const PLATE = "#0C3240";
const PLATE_DEEP = "#071E27";
const SILICA = "#E6F0F2";
const AQUA = "#79C3BF";
const AMBER = "#D98936";
const GRID = "#0E2C37";
const GRID_MAJOR = "#133B48";
const GRAY = "#7F96A0";

// ── Diatom geometry (map coord space 1080 × 990, centered at 540,495) ──
const CENTER = { x: 540, y: 495 };
const R_OUTER = 380; // outer silica rim
const R_INNER = 346; // inner draft rim
const R_HUB_OUTER = 92; // outer edge of central hub rosette
const R_HUB_INNER = 44; // inner hub circle
const SECTORS = 6; // wedge dividers — Actinoptychus-style

type PoreCell = {
  cx: number;
  cy: number;
  r: number;
  angle: number;
  delay: number;
};

const buildPores = (): PoreCell[] => {
  const cells: PoreCell[] = [];
  const ringSpacing = 24;
  const ringStart = R_HUB_OUTER + 18;
  const ringEnd = R_INNER - 20;
  let ringIndex = 0;
  for (let r = ringStart; r <= ringEnd; r += ringSpacing) {
    const circumference = 2 * Math.PI * r;
    const targetSpacing = 24;
    const count = Math.max(12, Math.round(circumference / targetSpacing));
    const offset = ringIndex % 2 === 0 ? 0 : Math.PI / count;
    for (let i = 0; i < count; i++) {
      const a = offset + (i * 2 * Math.PI) / count;
      const cx = CENTER.x + Math.cos(a) * r;
      const cy = CENTER.y + Math.sin(a) * r;
      const norm = (r - ringStart) / (ringEnd - ringStart);
      const angularJitter = (Math.sin(a * 3.1) + 1) * 0.5 * 0.06;
      const delay = Math.min(0.95, norm * 0.78 + angularJitter);
      const poreR = 4.2 + norm * 2.4;
      cells.push({ cx, cy, r: poreR, angle: a, delay });
    }
    ringIndex++;
  }
  return cells;
};
const PORES = buildPores();

const sectorAngles = Array.from(
  { length: SECTORS },
  (_, i) => (i * 2 * Math.PI) / SECTORS,
);

const polar = (angleRad: number, r: number) => ({
  x: CENTER.x + Math.cos(angleRad) * r,
  y: CENTER.y + Math.sin(angleRad) * r,
});

// ── Technical callouts — anchored by y in map coords, side chooses margin ──
type Callout = {
  y: number;
  side: "left" | "right";
  label: string;
  value: string;
};
const CALLOUTS: Callout[] = [
  { y: 346, side: "left", label: "PORE Ø", value: "180 nm" },
  { y: 495, side: "left", label: "FRUSTULE Ø", value: "62 µm" },
  { y: 644, side: "left", label: "LATTICE", value: "SiO₂" },
  { y: 346, side: "right", label: "AMBIENT", value: "4 °C" },
  { y: 495, side: "right", label: "CATALYST", value: "silaffin" },
  { y: 644, side: "right", label: "SPECIES", value: "≈ 100 000" },
];

const LEFT_END_X = 24;
const RIGHT_END_X = 1056;

// Rim intersection x for a given y
const rimX = (y: number, side: "left" | "right") => {
  const dy = y - CENTER.y;
  const dx = Math.sqrt(Math.max(0, R_OUTER * R_OUTER - dy * dy));
  return side === "left" ? CENTER.x - dx : CENTER.x + dx;
};

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const growSpan = fps * 2.6;
  const t = Math.max(0, frame) / growSpan;

  const rimT = interpolate(frame, [fps * 0.1, fps * 1.4], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const hubT = interpolate(frame, [0, fps * 0.6], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const spokeT = interpolate(frame, [fps * 0.4, fps * 1.1], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const sweepDuration = fps * 4.0;
  const sweepStart = fps * 2.6;
  const sweepPhase =
    frame > sweepStart
      ? ((frame - sweepStart) % sweepDuration) / sweepDuration
      : 0;
  const sweepAngle = sweepPhase * Math.PI * 2;

  const titleSpring = spring({
    frame: frame - fps * 0.4,
    fps,
    config: { damping: 200, mass: 0.8 },
  });

  const hookOpacity = interpolate(frame, [fps * 1.0, fps * 1.9], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const calloutOpacity = interpolate(frame, [fps * 1.4, fps * 2.2], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Page layout (1080 × 1350 portrait) ──────────────────────────────
  //   Metadata band  : 50..70
  //   Plate          : 100..980   (h 880, w 960; map 1080×990)
  //   Caption strip  : 1004..1024
  //   Role tag       : 1056..
  //   Title          : 1084..
  //   Hook           : ~1230..
  //   Footer         : 1316..
  const FRAME = { x: 60, y: 100, w: 960, h: 880 };
  const MAP_W = 1080;
  const MAP_H = 990;
  const scale = FRAME.w / MAP_W; // 960/1080 = 0.889
  // scale * MAP_H = 0.889 * 990 = 880, matches FRAME.h — no distortion.

  const rimPerimeter = 2 * Math.PI * R_OUTER;

  return (
    <AbsoluteFill style={{ backgroundColor: INK, fontFamily: inter }}>
      <style>{fontCss}</style>

      {/* Top metadata band */}
      <div
        style={{
          position: "absolute",
          top: 50,
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
        <span style={{ color: AMBER }}>2026 · 10 · 19</span>
      </div>

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
            width={48 * scale}
            height={48 * scale}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M ${48 * scale} 0 L 0 0 0 ${48 * scale}`}
              fill="none"
              stroke={GRID}
              strokeWidth={1}
            />
          </pattern>
          <pattern
            id="grid-major"
            x={FRAME.x}
            y={FRAME.y}
            width={192 * scale}
            height={192 * scale}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M ${192 * scale} 0 L 0 0 0 ${192 * scale}`}
              fill="none"
              stroke={GRID_MAJOR}
              strokeWidth={1}
            />
          </pattern>

          <radialGradient id="plate-vignette" cx="50%" cy="50%" r="70%">
            <stop offset="0%" stopColor={PLATE} stopOpacity={1} />
            <stop offset="100%" stopColor={PLATE_DEEP} stopOpacity={1} />
          </radialGradient>

          <radialGradient id="frustule-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={AQUA} stopOpacity={0.18} />
            <stop offset="60%" stopColor={AQUA} stopOpacity={0.08} />
            <stop offset="100%" stopColor={AQUA} stopOpacity={0} />
          </radialGradient>

          <radialGradient id="hub-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={AMBER} stopOpacity={0.9} />
            <stop offset="70%" stopColor={AMBER} stopOpacity={0.15} />
            <stop offset="100%" stopColor={AMBER} stopOpacity={0} />
          </radialGradient>

          <radialGradient id="pore-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={AQUA} stopOpacity={0.9} />
            <stop offset="100%" stopColor={AQUA} stopOpacity={0} />
          </radialGradient>
        </defs>

        {/* Drafting plate */}
        <rect
          x={FRAME.x}
          y={FRAME.y}
          width={FRAME.w}
          height={FRAME.h}
          fill="url(#plate-vignette)"
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
        <rect
          x={FRAME.x + 0.5}
          y={FRAME.y + 0.5}
          width={FRAME.w - 1}
          height={FRAME.h - 1}
          fill="none"
          stroke="#164354"
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
          <g key={i} stroke={AMBER} strokeWidth={1.5} fill="none">
            <line x1={cx} y1={cy} x2={cx + sx * 26} y2={cy} />
            <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 26} />
          </g>
        ))}

        {/* Scale micron bar (bottom-right of plate) */}
        <g
          transform={`translate(${FRAME.x + FRAME.w - 180}, ${
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
          <text x={130} y={4} stroke="none">
            20 µm
          </text>
        </g>

        {/* Plate label (top-left) */}
        <g
          transform={`translate(${FRAME.x + 26}, ${FRAME.y + 32})`}
          fill={GRAY}
          fontFamily={inter}
          fontWeight={600}
          fontSize={11}
          letterSpacing={3}
        >
          <text>PLATE III · ACTINOPTYCHUS SP. · VALVE VIEW</text>
        </g>

        {/* Diatom content, scaled into plate */}
        <g transform={`translate(${FRAME.x}, ${FRAME.y}) scale(${scale})`}>
          {/* Soft inner halo */}
          <circle
            cx={CENTER.x}
            cy={CENTER.y}
            r={R_OUTER + 60}
            fill="url(#frustule-core)"
            opacity={Math.min(1, rimT * 1.2)}
          />

          {/* Outer silica rim (draw-in) */}
          <circle
            cx={CENTER.x}
            cy={CENTER.y}
            r={R_OUTER}
            fill="none"
            stroke={SILICA}
            strokeWidth={2.2}
            strokeDasharray={rimPerimeter}
            strokeDashoffset={rimPerimeter * (1 - rimT)}
            transform={`rotate(-90 ${CENTER.x} ${CENTER.y})`}
            opacity={0.95}
          />
          <circle
            cx={CENTER.x}
            cy={CENTER.y}
            r={R_OUTER - 6}
            fill="none"
            stroke={AQUA}
            strokeWidth={1}
            strokeDasharray={rimPerimeter}
            strokeDashoffset={rimPerimeter * (1 - rimT)}
            transform={`rotate(-90 ${CENTER.x} ${CENTER.y})`}
            opacity={0.55}
          />
          <circle
            cx={CENTER.x}
            cy={CENTER.y}
            r={R_INNER}
            fill="none"
            stroke={AQUA}
            strokeWidth={0.8}
            strokeDasharray={rimPerimeter}
            strokeDashoffset={rimPerimeter * (1 - rimT)}
            transform={`rotate(-90 ${CENTER.x} ${CENTER.y})`}
            opacity={0.35}
          />

          {/* Six wedge dividers (spokes) — silica ribs */}
          {sectorAngles.map((a, i) => {
            const start = polar(a, R_HUB_OUTER);
            const end = polar(a, R_INNER);
            const localT = Math.max(0, Math.min(1, spokeT * 1.1 - i * 0.03));
            const sx = start.x + (end.x - start.x) * localT;
            const sy = start.y + (end.y - start.y) * localT;
            return (
              <g key={`spoke-${i}`}>
                <line
                  x1={start.x}
                  y1={start.y}
                  x2={sx}
                  y2={sy}
                  stroke={SILICA}
                  strokeWidth={1.6}
                  strokeOpacity={0.78}
                />
              </g>
            );
          })}

          {/* Mid-radius guide ring (hairline) */}
          <circle
            cx={CENTER.x}
            cy={CENTER.y}
            r={238}
            fill="none"
            stroke={SILICA}
            strokeWidth={0.6}
            strokeOpacity={0.18 * rimT}
            strokeDasharray="3 6"
          />

          {/* Ocelli — Actinoptychus hyaline spots, in alternating sectors */}
          {sectorAngles.map((a, i) => {
            if (i % 2 !== 0) return null;
            // Place one ocellus mid-way between hub and rim, on the sector midline
            const mid = polar(a + Math.PI / SECTORS, 232);
            const op = Math.max(0, Math.min(1, (t - 0.6) * 2));
            return (
              <g key={`ocellus-${i}`} opacity={op}>
                <circle
                  cx={mid.x}
                  cy={mid.y}
                  r={16}
                  fill={PLATE_DEEP}
                  stroke={SILICA}
                  strokeWidth={1.4}
                />
                <circle
                  cx={mid.x}
                  cy={mid.y}
                  r={5}
                  fill={AMBER}
                  opacity={0.85}
                />
              </g>
            );
          })}

          {/* Pores — reveal outward, lit by rotating sweep */}
          {PORES.map((p, i) => {
            const localT = (t - p.delay) * 3;
            const vis = Math.max(0, Math.min(1, localT));
            if (vis <= 0) return null;

            let dA = Math.abs(p.angle - sweepAngle);
            dA = Math.min(dA, Math.PI * 2 - dA);
            const sweepStrength = Math.max(0, Math.cos(dA));
            const extra = frame > sweepStart ? sweepStrength * 0.6 : 0;

            const fillOpacity = 0.55 * vis + extra * vis;
            return (
              <g key={`pore-${i}`} opacity={vis}>
                <circle
                  cx={p.cx}
                  cy={p.cy}
                  r={p.r * 1.9}
                  fill="url(#pore-glow)"
                  opacity={0.3 * vis + extra * 0.4}
                />
                <circle
                  cx={p.cx}
                  cy={p.cy}
                  r={p.r}
                  fill={AQUA}
                  fillOpacity={fillOpacity}
                  stroke={SILICA}
                  strokeWidth={0.9}
                  strokeOpacity={0.8 * vis}
                />
              </g>
            );
          })}

          {/* Hub rosette */}
          <g opacity={hubT}>
            <circle
              cx={CENTER.x}
              cy={CENTER.y}
              r={R_HUB_OUTER}
              fill={PLATE_DEEP}
              stroke={SILICA}
              strokeWidth={1.6}
            />
            {sectorAngles.map((a, i) => {
              const a0 = a - Math.PI / SECTORS + 0.03;
              const a1 = a + Math.PI / SECTORS - 0.03;
              const p0 = polar(a0, R_HUB_INNER);
              const p1 = polar(a1, R_HUB_INNER);
              const p2 = polar(a1, R_HUB_OUTER - 4);
              const p3 = polar(a0, R_HUB_OUTER - 4);
              const d =
                `M ${p0.x} ${p0.y} ` +
                `A ${R_HUB_INNER} ${R_HUB_INNER} 0 0 1 ${p1.x} ${p1.y} ` +
                `L ${p2.x} ${p2.y} ` +
                `A ${R_HUB_OUTER - 4} ${R_HUB_OUTER - 4} 0 0 0 ${p3.x} ${p3.y} Z`;
              const petalFill = i % 2 === 0 ? AQUA : SILICA;
              return (
                <path
                  key={`petal-${i}`}
                  d={d}
                  fill={petalFill}
                  fillOpacity={i % 2 === 0 ? 0.22 : 0.14}
                  stroke={SILICA}
                  strokeWidth={1}
                  strokeOpacity={0.75}
                />
              );
            })}
            <circle
              cx={CENTER.x}
              cy={CENTER.y}
              r={R_HUB_INNER + 4}
              fill="url(#hub-glow)"
            />
            <circle
              cx={CENTER.x}
              cy={CENTER.y}
              r={R_HUB_INNER}
              fill={PLATE_DEEP}
              stroke={SILICA}
              strokeWidth={1.4}
            />
            <circle
              cx={CENTER.x}
              cy={CENTER.y}
              r={6}
              fill={AMBER}
              opacity={0.85}
            />
          </g>

          {/* ── Technical callouts — straight leader into margin ──── */}
          <g opacity={calloutOpacity} fontFamily={inter}>
            {CALLOUTS.map((c, i) => {
              const anchorX = rimX(c.y, c.side);
              const endX = c.side === "left" ? LEFT_END_X : RIGHT_END_X;
              const textAnchor = c.side === "left" ? "start" : "end";
              const textX = endX;
              return (
                <g key={`callout-${i}`}>
                  <line
                    x1={anchorX}
                    y1={c.y}
                    x2={endX}
                    y2={c.y}
                    stroke={AMBER}
                    strokeWidth={1.1}
                    opacity={0.9}
                  />
                  <circle
                    cx={anchorX}
                    cy={c.y}
                    r={3.2}
                    fill={AMBER}
                    stroke={INK}
                    strokeWidth={1}
                  />
                  <text
                    x={textX}
                    y={c.y - 10}
                    fill={GRAY}
                    fontSize={12}
                    letterSpacing={3.5}
                    fontWeight={500}
                    textAnchor={textAnchor}
                  >
                    {c.label}
                  </text>
                  <text
                    x={textX}
                    y={c.y + 22}
                    fill={SILICA}
                    fontSize={22}
                    fontWeight={600}
                    letterSpacing={1.2}
                    textAnchor={textAnchor}
                  >
                    {c.value}
                  </text>
                </g>
              );
            })}
          </g>
        </g>

        {/* Caption strip just below the plate */}
        <g
          transform={`translate(${FRAME.x}, ${FRAME.y + FRAME.h + 22})`}
          fill={GRAY}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
        >
          <text>FIG. 1 · SILICA FRUSTULE, VALVE VIEW · 400× MAG</text>
          <text x={FRAME.w} textAnchor="end" fill={AQUA} opacity={0.85}>
            GROWN AT AMBIENT SEAWATER TEMPERATURE
          </text>
        </g>
      </svg>

      {/* ── Type lockup ────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 1044,
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
            marginBottom: 12,
            fontWeight: 600,
          }}
        >
          Role <span style={{ color: GRAY, margin: "0 4px" }}>/</span>
          <span style={{ color: "#EDEDEF", letterSpacing: 5 }}>Glassblower</span>
        </div>

        <div
          style={{
            color: "#F4F4F6",
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 64,
            lineHeight: 0.98,
            letterSpacing: -0.8,
            fontStyle: "italic",
          }}
        >
          The glassblower
          <br />
          who works in the cold.
        </div>

        <div
          style={{
            marginTop: 20,
            color: "#C8CAD0",
            fontFamily: inter,
            fontSize: 16,
            lineHeight: 1.42,
            fontWeight: 400,
            maxWidth: 920,
            opacity: hookOpacity,
          }}
        >
          Each of ~100,000{" "}
          <span style={{ color: AQUA, fontWeight: 600 }}>diatom</span> species —
          single-celled algae — grows its own silica shell at seawater
          temperature, polymerising dissolved silicic acid into a
          species-signature lattice with 40–200 nm pores. Industrial glassmakers
          need 1,600 °C.
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          bottom: 24,
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
        <span>Kröger et al. · Science 286 (1999) 1129–1132</span>
        <span>
          <span style={{ color: AQUA }}>●</span> Pore = SiO₂ lattice
        </span>
      </div>
    </AbsoluteFill>
  );
};
