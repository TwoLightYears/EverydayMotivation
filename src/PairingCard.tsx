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

// Palette — drawn from the concept's visual brief (narwhal + Arctic)
const BG = "#07111F";
const WATER = "#0E1D32";
const WATER_INNER = "#13273F";
const ICE = "#A9C3DD";
const ICE_DIM = "#6E89A6";
const IVORY = "#F1E6CF";
const IVORY_DEEP = "#C9B98F";
const IVORY_SHADOW = "#8E7E54";
const GOLD = "#D9A26A";
const GOLD_SOFT = "#E8BE91";
const MOTTLE = "#3C5168";
const GRID = "#132537";
const GRID_MAJOR = "#1C3049";
const RULE = "#2B4056";
const DIM = "#7E92A9";

// ── Specimen plate layout ────────────────────────────────────────────
const FRAME = { x: 60, y: 130, w: 960, h: 711 };
// Inner SVG coord space: 1080 × 800 → scaled to FRAME.w
const INNER_W = 1080;
const INNER_H = 800;
const SCALE = FRAME.w / INNER_W;

// Tusk geometry (inner coords)
const TUSK_BASE_X = 100;
const TUSK_TIP_X = 650;
const TUSK_Y = 408;
const TUSK_BASE_R = 36; // half-thickness at base
const TUSK_TIP_R = 3; // half-thickness at tip

// Tasting-wheel geometry (inner coords)
const DIAL_CX = 820;
const DIAL_CY = TUSK_Y;
const DIAL_RINGS = [68, 102, 136, 170]; // concentric gauge ring radii

type Axis = {
  key: string;
  label: string;
  reading: string;
  angleDeg: number; // 0° = east, measured clockwise
};
// 3-axis gauge; the 4th (west) axis is implied by the tusk feeding in.
const AXES: Axis[] = [
  { key: "sal", label: "SALINITY", reading: "32.1 psu", angleDeg: -90 },
  { key: "tmp", label: "TEMP", reading: "−1.8 °C", angleDeg: 0 },
  { key: "prs", label: "PRESSURE", reading: "48 bar", angleDeg: 90 },
];

function tuskRadiusAt(x: number): number {
  const u = Math.max(
    0,
    Math.min(1, (x - TUSK_BASE_X) / (TUSK_TIP_X - TUSK_BASE_X)),
  );
  // Slight easing so taper looks organic rather than linear.
  const e = 1 - Math.pow(u, 1.25);
  return TUSK_TIP_R + (TUSK_BASE_R - TUSK_TIP_R) * e;
}

// Degrees → radians helper.
const d2r = (d: number) => (d * Math.PI) / 180;

// Polar helper for the dial.
function polar(cx: number, cy: number, r: number, deg: number) {
  const a = d2r(deg);
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // ── Scene timing (seconds) ─────────────────────────────────────────
  // 0.0  frame fades in
  // 0.2–1.9  tusk draws in from left
  // 1.2–2.1  nerve-section inset blooms
  // 1.6–2.5  dial rings bloom outward
  // 2.3–2.9  gold pointer settles on salinity
  // 2.6→loop  rings pulse (4 s period)
  // 1.0–1.9  title springs in
  // 1.6–2.4  hook paragraph fades in

  const t = Math.max(0, frame) / fps;

  const easedT = (start: number, span: number) => {
    const u = Math.max(0, Math.min(1, (t - start) / span));
    return 1 - Math.pow(1 - u, 3);
  };

  const tuskDraw = easedT(0.2, 1.7);
  const sectionIn = easedT(1.2, 0.9);
  const ringBloom = easedT(1.6, 0.9);
  const axesIn = easedT(2.0, 0.6);
  const pointerT = easedT(2.3, 0.6);
  const pulsePhase = ((t - 2.6) % 4) / 4;
  const pulseIn = Math.min(1, Math.max(0, (t - 2.6) * 2));

  const titleSpring = spring({
    frame: frame - fps * 1.0,
    fps,
    config: { damping: 200, mass: 0.9 },
  });
  const hookOpacity = interpolate(frame, [fps * 1.6, fps * 2.4], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Pointer angle: eases from the chemistry axis (180°) to salinity (-90°).
  const pointerDeg = interpolate(pointerT, [0, 1], [180, -90]);
  const pointerLen = interpolate(
    pointerT,
    [0, 1],
    [DIAL_RINGS[3] - 4, DIAL_RINGS[3] - 6],
  );
  const pointerTip = polar(DIAL_CX, DIAL_CY, pointerLen, pointerDeg);

  // ── Tusk body path ────────────────────────────────────────────────
  // A smooth tapered sheath with slight sag at the base.
  const tuskLen = TUSK_TIP_X - TUSK_BASE_X;
  const drawnTipX = TUSK_BASE_X + tuskLen * tuskDraw;
  const drawnTipR = tuskRadiusAt(drawnTipX);
  const tuskBodyPath =
    `M ${TUSK_BASE_X} ${TUSK_Y - TUSK_BASE_R}` +
    ` L ${drawnTipX - 2} ${TUSK_Y - drawnTipR}` +
    ` Q ${drawnTipX + 2} ${TUSK_Y} ${drawnTipX - 2} ${TUSK_Y + drawnTipR}` +
    ` L ${TUSK_BASE_X} ${TUSK_Y + TUSK_BASE_R}` +
    ` Z`;

  // ── Helical grooves ───────────────────────────────────────────────
  // We draw diagonals that cross the tusk's width to suggest a left-handed
  // spiral. Each groove is a short Q-curve giving a 3D "wrap" cue.
  const GROOVE_SPACING = 15; // px along the x axis
  const GROOVE_SLANT = 36; // px — the x-distance between top anchor and bottom anchor
  const grooves: { xTop: number; xBot: number; rTop: number; rBot: number; mid: number }[] = [];
  for (let x = TUSK_BASE_X - 6; x < drawnTipX - 12; x += GROOVE_SPACING) {
    const xTop = x;
    const xBot = x + GROOVE_SLANT;
    if (xBot > drawnTipX - 6) continue;
    const rTop = tuskRadiusAt(xTop);
    const rBot = tuskRadiusAt(xBot);
    grooves.push({ xTop, xBot, rTop, rBot, mid: (xTop + xBot) / 2 });
  }

  // Narwhal silhouette (simplified lateral profile), inner coords.
  // Body from x≈420 to x≈760, y≈620..680. The tusk emerges at ~(420, 630).
  const whaleCX = 530;
  const whaleCY = 640;

  return (
    <AbsoluteFill style={{ backgroundColor: BG, fontFamily: inter }}>
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
          color: ICE_DIM,
          fontFamily: inter,
          fontSize: 13,
          letterSpacing: 4.5,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Everyday Motivation · No. 003</span>
        <span style={{ color: GOLD }}>2026 · 10 · 03</span>
      </div>

      {/* Specimen plate + diagram */}
      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          {/* Specimen plate background */}
          <radialGradient id="plate-vignette" cx="50%" cy="42%" r="70%">
            <stop offset="0%" stopColor={WATER_INNER} />
            <stop offset="100%" stopColor={WATER} />
          </radialGradient>

          {/* Grid patterns on the plate */}
          <pattern
            id="plate-grid"
            x={FRAME.x}
            y={FRAME.y}
            width={48 * SCALE}
            height={48 * SCALE}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M ${48 * SCALE} 0 L 0 0 0 ${48 * SCALE}`}
              fill="none"
              stroke={GRID}
              strokeWidth={1}
            />
          </pattern>
          <pattern
            id="plate-grid-major"
            x={FRAME.x}
            y={FRAME.y}
            width={192 * SCALE}
            height={192 * SCALE}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M ${192 * SCALE} 0 L 0 0 0 ${192 * SCALE}`}
              fill="none"
              stroke={GRID_MAJOR}
              strokeWidth={1}
            />
          </pattern>

          {/* Tusk ivory shading — perpendicular highlight stripe */}
          <linearGradient id="tusk-shade" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={IVORY_DEEP} />
            <stop offset="22%" stopColor={IVORY} />
            <stop offset="50%" stopColor="#FFF9E7" />
            <stop offset="78%" stopColor={IVORY} />
            <stop offset="100%" stopColor={IVORY_SHADOW} />
          </linearGradient>

          {/* Ring gradient for dial — subtle inner glow */}
          <radialGradient id="dial-core" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor={GOLD} stopOpacity={0.08} />
            <stop offset="100%" stopColor={GOLD} stopOpacity={0} />
          </radialGradient>

          <filter id="soft-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Plate background */}
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
          fill="url(#plate-grid)"
        />
        <rect
          x={FRAME.x}
          y={FRAME.y}
          width={FRAME.w}
          height={FRAME.h}
          fill="url(#plate-grid-major)"
        />

        {/* Inner thin border */}
        <rect
          x={FRAME.x + 0.5}
          y={FRAME.y + 0.5}
          width={FRAME.w - 1}
          height={FRAME.h - 1}
          fill="none"
          stroke={RULE}
          strokeWidth={1}
        />

        {/* Corner crop marks — gold */}
        {(
          [
            [FRAME.x, FRAME.y, 1, 1],
            [FRAME.x + FRAME.w, FRAME.y, -1, 1],
            [FRAME.x, FRAME.y + FRAME.h, 1, -1],
            [FRAME.x + FRAME.w, FRAME.y + FRAME.h, -1, -1],
          ] as const
        ).map(([cx, cy, sx, sy], i) => (
          <g key={i} stroke={GOLD} strokeWidth={1.5} fill="none">
            <line x1={cx} y1={cy} x2={cx + sx * 26} y2={cy} />
            <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 26} />
          </g>
        ))}

        {/* Specimen label — top-left */}
        <g
          transform={`translate(${FRAME.x + 26}, ${FRAME.y + 34})`}
          fill={ICE_DIM}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={600}
        >
          <text>SPECIMEN</text>
          <text y={16} fill={ICE} letterSpacing={2.6}>
            MONODON MONOCEROS
          </text>
          <text y={32} letterSpacing={2.6}>
            LEFT CANINE · ADULT MALE
          </text>
        </g>

        {/* Scale note — top-right */}
        <g
          transform={`translate(${FRAME.x + FRAME.w - 26}, ${FRAME.y + 34})`}
          fill={ICE_DIM}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={600}
          textAnchor="end"
        >
          <text>SEA ICE EDGE · 72° N</text>
          <text y={16} fill={ICE} letterSpacing={2.6}>
            BAFFIN BAY
          </text>
          <text y={32} letterSpacing={2.6}>
            03 OCT 2026
          </text>
        </g>

        {/* Diagram group — scale 1080×800 inner coords into FRAME */}
        <g transform={`translate(${FRAME.x}, ${FRAME.y}) scale(${SCALE})`}>
          {/* Horizontal baseline through the tusk axis */}
          <line
            x1={60}
            y1={TUSK_Y}
            x2={1030}
            y2={TUSK_Y}
            stroke={RULE}
            strokeWidth={0.8}
            strokeDasharray="2 6"
            opacity={0.6}
          />

          {/* ── Micro cross-section inset at the base ─────────────── */}
          <g
            transform={`translate(${TUSK_BASE_X - 70}, ${TUSK_Y})`}
            opacity={sectionIn}
          >
            {/* Section circle */}
            <circle
              r={44}
              fill={IVORY}
              stroke={IVORY_SHADOW}
              strokeWidth={1.2}
            />
            <circle
              r={44}
              fill="none"
              stroke={GOLD}
              strokeWidth={0.8}
              strokeDasharray="2 4"
              opacity={0.55}
            />
            {/* Nerve-fascicle dots — deterministic layout */}
            {(() => {
              const dots: React.ReactElement[] = [];
              const seed = (i: number) => ((i * 9301 + 49297) % 233280) / 233280;
              let i = 0;
              for (let ring = 0; ring < 5; ring++) {
                const rr = 6 + ring * 7.5;
                const count = 6 + ring * 4;
                for (let k = 0; k < count; k++) {
                  const a = (k / count) * Math.PI * 2 + seed(i) * 0.9;
                  const jitter = (seed(i + 101) - 0.5) * 3;
                  const dx = Math.cos(a) * (rr + jitter);
                  const dy = Math.sin(a) * (rr + jitter);
                  const size = 1.2 + seed(i + 7) * 1.2;
                  dots.push(
                    <circle
                      key={`n-${i}`}
                      cx={dx}
                      cy={dy}
                      r={size}
                      fill={GOLD}
                      opacity={0.9}
                    />,
                  );
                  i++;
                }
              }
              // Centre pulp cavity
              dots.push(
                <circle
                  key="pulp"
                  r={4}
                  fill={BG}
                  stroke={GOLD}
                  strokeWidth={0.8}
                />,
              );
              return dots;
            })()}
            {/* Section label */}
            <text
              y={-56}
              textAnchor="middle"
              fill={ICE}
              fontFamily={inter}
              fontSize={10}
              fontWeight={600}
              letterSpacing={3}
            >
              DENTIN · ×400
            </text>
            <text
              y={64}
              textAnchor="middle"
              fill={ICE_DIM}
              fontFamily={inter}
              fontSize={9}
              fontWeight={500}
              letterSpacing={2.6}
            >
              10⁷ NERVE ENDINGS
            </text>
            {/* Leader line to the tusk base */}
            <line
              x1={44}
              y1={0}
              x2={TUSK_BASE_X - (TUSK_BASE_X - 70) - 4}
              y2={0}
              stroke={GOLD}
              strokeWidth={0.8}
              strokeDasharray="2 3"
            />
          </g>

          {/* ── The tusk body ─────────────────────────────────────── */}
          <g>
            {/* Soft shadow puddle below */}
            <ellipse
              cx={(TUSK_BASE_X + TUSK_TIP_X) / 2}
              cy={TUSK_Y + 70}
              rx={(TUSK_TIP_X - TUSK_BASE_X) / 2}
              ry={10}
              fill={BG}
              opacity={0.6 * tuskDraw}
            />

            {/* Body fill */}
            <path d={tuskBodyPath} fill="url(#tusk-shade)" />
            {/* Body outline */}
            <path
              d={tuskBodyPath}
              fill="none"
              stroke={IVORY_SHADOW}
              strokeWidth={1.2}
              strokeLinejoin="round"
            />

            {/* Helical grooves */}
            {grooves.map((g, i) => {
              const topX = g.xTop;
              const topY = TUSK_Y - g.rTop;
              const botX = g.xBot;
              const botY = TUSK_Y + g.rBot;
              const midX = g.mid;
              // Curve the groove slightly to suggest a convex surface.
              const midY = TUSK_Y - g.rTop * 0.1;
              const d = `M ${topX} ${topY} Q ${midX} ${midY} ${botX} ${botY}`;
              const op = Math.max(0, Math.min(1, (tuskDraw - i / grooves.length) * 2));
              return (
                <g key={`gv-${i}`} opacity={op}>
                  <path
                    d={d}
                    stroke={IVORY_SHADOW}
                    strokeWidth={1.4}
                    fill="none"
                    opacity={0.65}
                    strokeLinecap="round"
                  />
                  <path
                    d={`M ${topX + 2} ${topY} Q ${midX + 2} ${midY - 1} ${botX + 2} ${botY}`}
                    stroke="#FFF4D8"
                    strokeWidth={0.8}
                    fill="none"
                    opacity={0.55}
                    strokeLinecap="round"
                  />
                </g>
              );
            })}

            {/* Tip highlight dot */}
            <circle
              cx={drawnTipX - 2}
              cy={TUSK_Y}
              r={2.4}
              fill="#FFF9E7"
              opacity={tuskDraw}
            />

            {/* Flow line: tusk tip → dial hub (chemistry sampled, feeding in) */}
            <g opacity={Math.min(1, Math.max(0, tuskDraw - 0.7) * 3)}>
              <line
                x1={drawnTipX + 2}
                y1={TUSK_Y}
                x2={DIAL_CX - DIAL_RINGS[0] + 4}
                y2={TUSK_Y}
                stroke={GOLD}
                strokeWidth={1.2}
                strokeDasharray="2 4"
                opacity={0.6}
              />
            </g>

            {/* "CHEMISTRY — sampling" callout above the mid-tusk */}
            <g opacity={Math.min(1, Math.max(0, tuskDraw - 0.35) * 2)}>
              <line
                x1={340}
                y1={TUSK_Y - TUSK_BASE_R - 40}
                x2={340}
                y2={TUSK_Y - tuskRadiusAt(340) - 4}
                stroke={GOLD}
                strokeWidth={0.9}
                strokeDasharray="2 3"
                opacity={0.75}
              />
              <text
                x={340}
                y={TUSK_Y - TUSK_BASE_R - 76}
                textAnchor="middle"
                fill={GOLD}
                fontFamily={inter}
                fontSize={14}
                fontWeight={600}
                letterSpacing={4.5}
              >
                CHEMISTRY
              </text>
              <text
                x={340}
                y={TUSK_Y - TUSK_BASE_R - 56}
                textAnchor="middle"
                fill={ICE_DIM}
                fontFamily={inter}
                fontSize={10}
                fontWeight={500}
                letterSpacing={3}
              >
                SAMPLING · SEAWATER
              </text>
            </g>
          </g>

          {/* ── Narwhal silhouette (lateral) ─────────────────────── */}
          <g opacity={Math.min(1, Math.max(0, tuskDraw - 0.3) * 1.6)}>
            {/* Body — stylised torpedo profile (head left, fluke right) */}
            <path
              d={`
                M ${whaleCX - 150} ${whaleCY + 4}
                C ${whaleCX - 158} ${whaleCY - 18}, ${whaleCX - 118} ${whaleCY - 30}, ${whaleCX - 70} ${whaleCY - 30}
                C ${whaleCX - 20} ${whaleCY - 30}, ${whaleCX + 30} ${whaleCY - 28}, ${whaleCX + 90} ${whaleCY - 22}
                C ${whaleCX + 140} ${whaleCY - 18}, ${whaleCX + 170} ${whaleCY - 10}, ${whaleCX + 190} ${whaleCY - 2}
                C ${whaleCX + 170} ${whaleCY + 10}, ${whaleCX + 140} ${whaleCY + 20}, ${whaleCX + 90} ${whaleCY + 26}
                C ${whaleCX + 30} ${whaleCY + 32}, ${whaleCX - 40} ${whaleCY + 34}, ${whaleCX - 110} ${whaleCY + 30}
                C ${whaleCX - 150} ${whaleCY + 24}, ${whaleCX - 158} ${whaleCY + 14}, ${whaleCX - 150} ${whaleCY + 4}
                Z
              `}
              fill={MOTTLE}
              opacity={0.95}
            />

            {/* Fluke — two triangular lobes with a central notch */}
            <path
              d={`
                M ${whaleCX + 188} ${whaleCY - 2}
                L ${whaleCX + 232} ${whaleCY - 24}
                L ${whaleCX + 220} ${whaleCY - 2}
                L ${whaleCX + 232} ${whaleCY + 20}
                L ${whaleCX + 188} ${whaleCY + 2}
                Z
              `}
              fill={MOTTLE}
              opacity={0.95}
            />

            {/* Pectoral flipper (small, short — narwhals have stubby flippers) */}
            <path
              d={`
                M ${whaleCX - 80} ${whaleCY + 20}
                C ${whaleCX - 86} ${whaleCY + 40}, ${whaleCX - 60} ${whaleCY + 44}, ${whaleCX - 48} ${whaleCY + 30}
                Z
              `}
              fill={BG}
              opacity={0.6}
            />

            {/* Dorsal ridge (no dorsal fin — just a shallow ridge of bumps) */}
            {[-20, 0, 20, 40, 60].map((dx, i) => (
              <ellipse
                key={`dr-${i}`}
                cx={whaleCX + dx}
                cy={whaleCY - 29}
                rx={5}
                ry={1.2}
                fill={BG}
                opacity={0.55}
              />
            ))}

            {/* Eye */}
            <circle cx={whaleCX - 112} cy={whaleCY - 8} r={1.8} fill={BG} />

            {/* Mottle spots scattered on the back */}
            {[
              [-80, -8], [-40, -14], [-10, -4], [20, -12], [60, -6],
              [95, -10], [120, -4], [-60, 4], [-20, 6], [40, 8], [80, 10],
            ].map(([dx, dy], i) => (
              <ellipse
                key={`m-${i}`}
                cx={whaleCX + dx}
                cy={whaleCY + dy}
                rx={2.6 + ((i * 7) % 3) * 0.4}
                ry={1.8}
                fill={BG}
                opacity={0.45}
              />
            ))}

            <text
              x={whaleCX}
              y={whaleCY + 68}
              textAnchor="middle"
              fill={ICE_DIM}
              fontFamily={inter}
              fontSize={10}
              fontWeight={500}
              letterSpacing={3.5}
            >
              MALE · 4.7 M · 1 600 KG
            </text>
          </g>

          {/* ── The tasting wheel ─────────────────────────────────── */}
          <g opacity={ringBloom}>
            {/* Soft core glow */}
            <circle
              cx={DIAL_CX}
              cy={DIAL_CY}
              r={DIAL_RINGS[3] + 10}
              fill="url(#dial-core)"
            />
            {/* Pulse ring (soft loop) */}
            <circle
              cx={DIAL_CX}
              cy={DIAL_CY}
              r={DIAL_RINGS[3] * (0.5 + pulsePhase * 0.6)}
              fill="none"
              stroke={GOLD}
              strokeWidth={1}
              opacity={(1 - pulsePhase) * 0.35 * pulseIn}
            />

            {/* Concentric gauge rings */}
            {DIAL_RINGS.map((r, i) => (
              <circle
                key={`rr-${i}`}
                cx={DIAL_CX}
                cy={DIAL_CY}
                r={r * ringBloom}
                fill="none"
                stroke={i === DIAL_RINGS.length - 1 ? GOLD : RULE}
                strokeWidth={i === DIAL_RINGS.length - 1 ? 1.4 : 1}
                opacity={i === DIAL_RINGS.length - 1 ? 0.85 : 0.7}
              />
            ))}

            {/* Tick marks around the outer ring */}
            {Array.from({ length: 72 }, (_, i) => i).map((i) => {
              const major = i % 9 === 0;
              const inner = DIAL_RINGS[3] - (major ? 10 : 5);
              const outer = DIAL_RINGS[3];
              const a = (i / 72) * 360 - 90;
              const p1 = polar(DIAL_CX, DIAL_CY, inner, a);
              const p2 = polar(DIAL_CX, DIAL_CY, outer, a);
              return (
                <line
                  key={`tk-${i}`}
                  x1={p1.x}
                  y1={p1.y}
                  x2={p2.x}
                  y2={p2.y}
                  stroke={major ? ICE : ICE_DIM}
                  strokeWidth={major ? 1.1 : 0.7}
                  opacity={0.75 * ringBloom}
                />
              );
            })}

            {/* Axis rules + readings */}
            {AXES.map((ax, i) => {
              const outer = polar(DIAL_CX, DIAL_CY, DIAL_RINGS[3] + 2, ax.angleDeg);
              const inner = polar(DIAL_CX, DIAL_CY, DIAL_RINGS[0], ax.angleDeg);
              const labelPt = polar(DIAL_CX, DIAL_CY, DIAL_RINGS[3] + 36, ax.angleDeg);
              const readingPt = polar(DIAL_CX, DIAL_CY, DIAL_RINGS[3] + 56, ax.angleDeg);
              const anchor =
                ax.angleDeg === 0
                  ? "start"
                  : ax.angleDeg === 180
                    ? "end"
                    : "middle";
              const op = axesIn;
              const dy = ax.angleDeg === -90 ? -4 : ax.angleDeg === 90 ? 14 : 4;
              const dyR = ax.angleDeg === -90 ? -22 : ax.angleDeg === 90 ? 32 : 24;
              const isSal = ax.key === "sal";
              return (
                <g key={`ax-${i}`} opacity={op}>
                  <line
                    x1={inner.x}
                    y1={inner.y}
                    x2={outer.x}
                    y2={outer.y}
                    stroke={RULE}
                    strokeWidth={0.9}
                    strokeDasharray={isSal ? "0" : "2 4"}
                    opacity={0.9}
                  />
                  <text
                    x={labelPt.x}
                    y={labelPt.y + dy}
                    textAnchor={anchor}
                    fill={isSal ? GOLD : ICE}
                    fontFamily={inter}
                    fontSize={13}
                    fontWeight={600}
                    letterSpacing={4}
                  >
                    {ax.label}
                  </text>
                  <text
                    x={readingPt.x}
                    y={readingPt.y + dyR}
                    textAnchor={anchor}
                    fill={isSal ? GOLD_SOFT : ICE_DIM}
                    fontFamily={inter}
                    fontSize={14}
                    fontWeight={500}
                    letterSpacing={2}
                  >
                    {ax.reading}
                  </text>
                </g>
              );
            })}

            {/* Hub */}
            <circle
              cx={DIAL_CX}
              cy={DIAL_CY}
              r={6}
              fill={BG}
              stroke={GOLD}
              strokeWidth={1.5}
            />
            <circle cx={DIAL_CX} cy={DIAL_CY} r={2} fill={GOLD} />

            {/* Pointer */}
            <g opacity={ringBloom}>
              {/* Outer glow */}
              <line
                x1={DIAL_CX}
                y1={DIAL_CY}
                x2={pointerTip.x}
                y2={pointerTip.y}
                stroke={GOLD}
                strokeWidth={6}
                strokeLinecap="round"
                opacity={0.25}
                filter="url(#soft-glow)"
              />
              {/* Main needle */}
              <line
                x1={DIAL_CX}
                y1={DIAL_CY}
                x2={pointerTip.x}
                y2={pointerTip.y}
                stroke={GOLD}
                strokeWidth={3.2}
                strokeLinecap="round"
              />
              {/* Needle highlight */}
              <line
                x1={DIAL_CX}
                y1={DIAL_CY}
                x2={pointerTip.x}
                y2={pointerTip.y}
                stroke="#FFE4BE"
                strokeWidth={1}
                strokeLinecap="round"
                opacity={0.9}
              />
              {/* Reading marker */}
              <circle
                cx={pointerTip.x}
                cy={pointerTip.y}
                r={14}
                fill="none"
                stroke={GOLD}
                strokeWidth={1}
                opacity={0.75}
              />
              <circle
                cx={pointerTip.x}
                cy={pointerTip.y}
                r={6}
                fill={GOLD}
              />
              <circle
                cx={pointerTip.x}
                cy={pointerTip.y}
                r={2.4}
                fill="#FFF2DA"
              />
            </g>

            {/* Center microcopy */}
            <text
              x={DIAL_CX}
              y={DIAL_CY - DIAL_RINGS[0] + 4}
              textAnchor="middle"
              fill={ICE_DIM}
              fontFamily={inter}
              fontSize={9}
              fontWeight={500}
              letterSpacing={2.6}
              opacity={axesIn}
            >
              READING
            </text>
          </g>

          {/* Scalebar — tucked bottom-left under the plate */}
          <g
            transform={`translate(${TUSK_BASE_X - 30}, 750)`}
            stroke={ICE_DIM}
            fill={ICE_DIM}
            fontFamily={inter}
            fontSize={11}
            letterSpacing={2.6}
            fontWeight={500}
            opacity={tuskDraw}
          >
            <line x1={0} y1={0} x2={200} y2={0} strokeWidth={1.2} />
            <line x1={0} y1={-5} x2={0} y2={5} strokeWidth={1.2} />
            <line x1={100} y1={-3} x2={100} y2={3} strokeWidth={1.2} />
            <line x1={200} y1={-5} x2={200} y2={5} strokeWidth={1.2} />
            <text y={22} stroke="none" fill={ICE_DIM}>
              0
            </text>
            <text x={100} y={22} stroke="none" fill={ICE_DIM} textAnchor="middle">
              1 M
            </text>
            <text x={200} y={22} stroke="none" fill={ICE_DIM} textAnchor="middle">
              2 M
            </text>
          </g>
        </g>

        {/* Caption strip below the plate */}
        <g
          transform={`translate(${FRAME.x}, ${FRAME.y + FRAME.h + 22})`}
          fill={ICE_DIM}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
        >
          <text>FIG. 1 · THE TUSK AS CHEMOSENSORY PROBE</text>
          <text
            x={FRAME.w}
            textAnchor="end"
            fill={GOLD}
            opacity={0.9}
          >
            BAFFIN BAY · 48 M DEPTH
          </text>
        </g>
      </svg>

      {/* ── Type lockup ─────────────────────────────────────────── */}
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
            color: GOLD,
            fontFamily: inter,
            fontSize: 13,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 18,
            fontWeight: 600,
          }}
        >
          Role <span style={{ color: ICE_DIM, margin: "0 4px" }}>/</span>
          <span style={{ color: "#EDEDEF", letterSpacing: 5 }}>Sommelier</span>
        </div>

        <div
          style={{
            color: "#F4F4F6",
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 84,
            lineHeight: 0.96,
            letterSpacing: -1.4,
            fontStyle: "italic",
          }}
        >
          The ivory
          <br />
          sommelier.
        </div>

        <div
          style={{
            marginTop: 30,
            color: "#C8CAD0",
            fontFamily: inter,
            fontSize: 19,
            lineHeight: 1.4,
            fontWeight: 400,
            maxWidth: 880,
            opacity: hookOpacity,
          }}
        >
          The narwhal's spiralling 2–3 m tusk is a modified left canine with
          roughly{" "}
          <span style={{ color: GOLD, fontWeight: 600 }}>
            10 million nerve endings
          </span>{" "}
          exposed through porous cementum. Seawater seeps in and the tooth
          samples salinity, temperature, pressure and chemistry — one slow,
          deliberate taste at a time.
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
          color: ICE_DIM,
          fontFamily: inter,
          fontSize: 11,
          letterSpacing: 3,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Nweeia et al. · Anatomical Record 297 (2014) 599–617</span>
        <span>
          <span style={{ color: GOLD }}>●</span> Pointer = current reading
        </span>
      </div>

      {/* Unused but kept so compiler doesn't flag */}
      <span style={{ display: "none" }}>{durationInFrames}</span>
    </AbsoluteFill>
  );
};
