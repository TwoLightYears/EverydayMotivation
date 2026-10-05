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

// Palette — binding, drawn from the Peat Bog concept brief
const PEAT_DEEP = "#1A120B";
const TANNIN = "#4A2E18";
const OCHRE = "#8C5A2B";
const LINEN = "#C9A063";
const MOSS = "#5B6B36";
const LINEN_DIM = "#8E7247";
const LINEN_FAINT = "#5B4A31";
const PEAT_RULE = "#2A1F15";
const PAPER = "#EFE1C2";

// Composition is 1080 × 1350 portrait.
const FRAME = { x: 60, y: 130, w: 960, h: 711 };
const RAIL_W = 170; // index-card spine on the left
const CORE_X = FRAME.x + RAIL_W;
const CORE_W = FRAME.w - RAIL_W;

// Strata — ten horizontal drawers, labelled with calendar years descending.
type Stratum = {
  year: string;
  tint: string;
  edge: string; // drawer-lip highlight
  bandHeight: number;
  tag: string;
};
const STRATA: Stratum[] = [
  { year: "2026 CE", tint: MOSS, edge: "#8B9D5A", bandHeight: 46, tag: "LIVING SPHAGNUM" },
  { year: "1500 CE", tint: "#3E4A24", edge: "#6B7A3E", bandHeight: 58, tag: "ACROTELM" },
  { year: "1000 CE", tint: "#5A4A1E", edge: "#8E7340", bandHeight: 62, tag: "" },
  { year: "500 CE", tint: "#6E4E22", edge: "#A47439", bandHeight: 68, tag: "CATOTELM" },
  { year: "0", tint: "#7A4E1D", edge: "#B07336", bandHeight: 72, tag: "" },
  { year: "400 BCE", tint: "#8C5A2B", edge: "#C68340", bandHeight: 78, tag: "pH 3.5 · 4 °C" },
  { year: "1000 BCE", tint: "#6E4218", edge: "#9E6632", bandHeight: 80, tag: "" },
  { year: "1500 BCE", tint: "#573514", edge: "#80522B", bandHeight: 84, tag: "" },
  { year: "2000 BCE", tint: "#3F2810", edge: "#5F3F1E", bandHeight: 90, tag: "" },
  { year: "2500 BCE", tint: "#2A1B0A", edge: "#3F2A14", bandHeight: 97, tag: "BEDROCK" },
];

const stratumTops = (() => {
  const totalH = STRATA.reduce((a, s) => a + s.bandHeight, 0);
  const scale = FRAME.h / totalH;
  let acc = 0;
  return STRATA.map((s) => {
    const top = FRAME.y + acc * scale;
    const h = s.bandHeight * scale;
    acc += s.bandHeight;
    return { top, h };
  });
})();

const TOLLUND_DEPTH = 5; // the 400 BCE drawer

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const stratumProgress = (i: number) => {
    const startF = fps * (0.15 + i * 0.09);
    const span = fps * 0.55;
    const raw = (frame - startF) / span;
    const clamped = Math.max(0, Math.min(1, raw));
    return 1 - Math.pow(1 - clamped, 3);
  };

  const labelOpacity = (i: number) => {
    const startF = fps * (0.35 + i * 0.09);
    const span = fps * 0.6;
    const raw = (frame - startF) / span;
    return Math.max(0, Math.min(1, raw));
  };

  const tollundSpring = spring({
    frame: frame - fps * 1.9,
    fps,
    config: { damping: 180, mass: 1.2, stiffness: 110 },
  });

  const titleSpring = spring({
    frame: frame - fps * 1.1,
    fps,
    config: { damping: 200, mass: 0.9 },
  });

  const hookOpacity = interpolate(frame, [fps * 1.9, fps * 2.8], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const bubbles = [
    { x: 300, baseY: 820, delay: 0.6, speed: 0.9, size: 2.6 },
    { x: 430, baseY: 760, delay: 1.1, speed: 0.75, size: 2.2 },
    { x: 620, baseY: 790, delay: 1.9, speed: 1.0, size: 2.8 },
    { x: 820, baseY: 820, delay: 0.3, speed: 0.85, size: 3.0 },
    { x: 950, baseY: 780, delay: 1.5, speed: 0.95, size: 2.4 },
    { x: 510, baseY: 700, delay: 2.3, speed: 1.1, size: 2.0 },
    { x: 720, baseY: 720, delay: 0.9, speed: 0.8, size: 2.3 },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: PEAT_DEEP, fontFamily: inter }}>
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
          color: LINEN_DIM,
          fontFamily: inter,
          fontSize: 13,
          letterSpacing: 4.5,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Everyday Motivation · No. 003</span>
        <span style={{ color: LINEN }}>2026 · 10 · 05</span>
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
            x={CORE_X}
            y={FRAME.y}
            width={48}
            height={48}
            patternUnits="userSpaceOnUse"
          >
            <path d={`M 48 0 L 0 0 0 48`} fill="none" stroke={PEAT_RULE} strokeWidth={1} />
          </pattern>

          <linearGradient id="tea-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6A4320" stopOpacity={0.6} />
            <stop offset="100%" stopColor={PEAT_DEEP} stopOpacity={0} />
          </linearGradient>

          <linearGradient id="label-slip" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={PAPER} />
            <stop offset="100%" stopColor={LINEN} />
          </linearGradient>

          <linearGradient id="rail-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#161008" />
            <stop offset="100%" stopColor="#120C06" />
          </linearGradient>

          <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="0.7" />
          </filter>
        </defs>

        {/* Frame background */}
        <rect x={FRAME.x} y={FRAME.y} width={FRAME.w} height={FRAME.h} fill={PEAT_DEEP} />
        {/* Faint grid over the core area */}
        <rect x={CORE_X} y={FRAME.y} width={CORE_W} height={FRAME.h} fill="url(#grid)" />

        {/* Strata — drawn in the right pane as peat-section cards */}
        {STRATA.map((s, i) => {
          const { top, h } = stratumTops[i];
          const p = stratumProgress(i);
          const drawnH = h * p;
          return (
            <g key={`stratum-${i}`} opacity={p}>
              <rect x={CORE_X} y={top} width={CORE_W} height={drawnH} fill={s.tint} />
              {/* subtle sub-strata grain in deeper peat */}
              {i >= 2 && (
                <g opacity={0.22}>
                  {Array.from({ length: 5 }).map((_, k) => {
                    const seed = (i * 37 + k * 61) % (CORE_W - 60);
                    return (
                      <line
                        key={k}
                        x1={CORE_X + 24 + seed}
                        y1={top + h * (0.12 + k * 0.18)}
                        x2={CORE_X + 24 + seed + 110 + ((k * 23) % 70)}
                        y2={top + h * (0.12 + k * 0.18)}
                        stroke={s.edge}
                        strokeWidth={0.6}
                      />
                    );
                  })}
                </g>
              )}
              {/* drawer-lip highlight at the top edge of each stratum (except first) */}
              {i > 0 && (
                <line
                  x1={CORE_X}
                  y1={top + 0.5}
                  x2={CORE_X + CORE_W}
                  y2={top + 0.5}
                  stroke={i === TOLLUND_DEPTH ? LINEN : s.edge}
                  strokeOpacity={i === TOLLUND_DEPTH ? 0.85 : 0.9}
                  strokeWidth={i === TOLLUND_DEPTH ? 1.6 : 1.1}
                />
              )}
              {/* shadow line between strata */}
              <line
                x1={CORE_X}
                y1={top + h - 0.6}
                x2={CORE_X + CORE_W}
                y2={top + h - 0.6}
                stroke={PEAT_DEEP}
                strokeOpacity={0.75}
                strokeWidth={1.1}
              />
            </g>
          );
        })}

        {/* Tea-water sheen over the top (sphagnum / standing water) */}
        <rect
          x={CORE_X}
          y={stratumTops[0].top}
          width={CORE_W}
          height={stratumTops[0].h * 0.7}
          fill="url(#tea-grad)"
          opacity={stratumProgress(0)}
        />

        {/* Living sphagnum tufts */}
        <g opacity={stratumProgress(0)}>
          {Array.from({ length: 20 }).map((_, k) => {
            const x = CORE_X + 20 + k * 40 + ((k * 17) % 11);
            const y = stratumTops[0].top + 10 + ((k * 7) % 8);
            return (
              <circle
                key={`moss-${k}`}
                cx={x}
                cy={y}
                r={1.5}
                fill={k % 3 === 0 ? "#92A562" : MOSS}
              />
            );
          })}
        </g>

        {/* LEFT RAIL — index-card spine */}
        <rect
          x={FRAME.x}
          y={FRAME.y}
          width={RAIL_W}
          height={FRAME.h}
          fill="url(#rail-grad)"
        />
        {/* Rail vertical rule */}
        <line
          x1={CORE_X}
          y1={FRAME.y}
          x2={CORE_X}
          y2={FRAME.y + FRAME.h}
          stroke={LINEN_FAINT}
          strokeWidth={1}
        />

        {/* DEPTH axis label at top of rail */}
        <g
          transform={`translate(${FRAME.x + 18}, ${FRAME.y - 10})`}
          fill={LINEN_DIM}
          fontFamily={inter}
          fontWeight={600}
          fontSize={10}
          letterSpacing={3.2}
        >
          <text y={-6}>INDEX · DEPTH ↓</text>
        </g>

        {/* Drawer index cards on the rail */}
        {STRATA.map((s, i) => {
          const { top, h } = stratumTops[i];
          const op = labelOpacity(i);
          const yCenter = top + h / 2;
          // Divider ticks at drawer edges
          return (
            <g key={`idx-${i}`}>
              {/* drawer separator extending across the rail */}
              {i > 0 && (
                <line
                  x1={FRAME.x}
                  y1={top}
                  x2={CORE_X}
                  y2={top}
                  stroke={LINEN_FAINT}
                  strokeOpacity={0.55}
                  strokeWidth={1}
                />
              )}
              {/* small drawer handle notch */}
              <g opacity={op}>
                {i === TOLLUND_DEPTH && (
                  <rect
                    x={FRAME.x + 2}
                    y={top + 2}
                    width={RAIL_W - 2}
                    height={h - 3}
                    fill={LINEN}
                    opacity={0.08}
                  />
                )}
                <rect
                  x={FRAME.x + 10}
                  y={yCenter - 3.5}
                  width={14}
                  height={7}
                  rx={1}
                  fill={i === TOLLUND_DEPTH ? LINEN : LINEN_DIM}
                  opacity={i === TOLLUND_DEPTH ? 1 : 0.75}
                />
                <text
                  x={FRAME.x + 32}
                  y={yCenter - 3}
                  fill={
                    i === TOLLUND_DEPTH
                      ? PAPER
                      : i === 0
                        ? "#DBD1AA"
                        : LINEN
                  }
                  fontFamily={inter}
                  fontSize={14}
                  fontWeight={i === TOLLUND_DEPTH ? 700 : 600}
                  letterSpacing={2.4}
                >
                  {s.year}
                </text>
                {s.tag && (
                  <text
                    x={FRAME.x + 32}
                    y={yCenter + 12}
                    fill={i === TOLLUND_DEPTH ? LINEN : LINEN_DIM}
                    fontFamily={inter}
                    fontSize={9}
                    fontWeight={500}
                    letterSpacing={2.6}
                  >
                    {s.tag}
                  </text>
                )}
              </g>
            </g>
          );
        })}

        {/* Methane bubbles rising through core */}
        {bubbles.map((b, i) => {
          const t = (frame / fps - b.delay) * b.speed;
          if (t < 0) return null;
          const cycle = 4.5;
          const phase = ((t % cycle) + cycle) % cycle;
          const rise = phase / cycle;
          const y = b.baseY - rise * 160;
          const alpha =
            rise < 0.1 ? rise / 0.1 : rise > 0.85 ? (1 - rise) / 0.15 : 1;
          if (y < FRAME.y + 40 || y > FRAME.y + FRAME.h - 20) return null;
          const x = b.x + Math.sin(t * 1.6 + i) * 4;
          if (x < CORE_X + 10) return null;
          return (
            <g key={`bub-${i}`} opacity={0.75 * alpha}>
              <circle cx={x} cy={y} r={b.size + 1.8} fill={LINEN} opacity={0.25} filter="url(#soft)" />
              <circle cx={x} cy={y} r={b.size} fill={PAPER} opacity={0.8} />
              <circle cx={x - b.size * 0.35} cy={y - b.size * 0.35} r={b.size * 0.35} fill="#FFFFFF" opacity={0.8} />
            </g>
          );
        })}

        {/* Inner frame border */}
        <rect
          x={FRAME.x + 0.5}
          y={FRAME.y + 0.5}
          width={FRAME.w - 1}
          height={FRAME.h - 1}
          fill="none"
          stroke={LINEN_FAINT}
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
          <g key={i} stroke={LINEN} strokeWidth={1.5} fill="none">
            <line x1={cx} y1={cy} x2={cx + sx * 26} y2={cy} />
            <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 26} />
          </g>
        ))}

        {/* Scale bar in the lower-right of the core pane */}
        <g
          transform={`translate(${FRAME.x + FRAME.w - 170}, ${FRAME.y + FRAME.h - 24})`}
          stroke={LINEN_DIM}
          fill={LINEN_DIM}
          fontFamily={inter}
          fontSize={10}
          letterSpacing={3}
          fontWeight={500}
        >
          <line x1={0} y1={0} x2={100} y2={0} strokeWidth={1.2} />
          <line x1={0} y1={-5} x2={0} y2={5} strokeWidth={1.2} />
          <line x1={50} y1={-3} x2={50} y2={3} strokeWidth={1.2} />
          <line x1={100} y1={-5} x2={100} y2={5} strokeWidth={1.2} />
          <text x={110} y={4} stroke="none">
            4 M
          </text>
        </g>

        {/* TOLLUND MAN specimen card — slides UP out of its drawer, staying inside the frame */}
        {(() => {
          const stratum = stratumTops[TOLLUND_DEPTH];
          const drawerY = stratum.top + stratum.h / 2;
          const op = Math.min(1, Math.max(0, tollundSpring));
          const slideUp = interpolate(tollundSpring, [0, 1], [0, 150]);
          const hoverFrame = Math.max(0, frame - fps * 2.4);
          const hover = Math.sin((hoverFrame / fps) * 1.8) * 1.8;

          // Card is positioned in the upper-right of the core pane, with a
          // leader descending to the 400 BCE drawer.
          const cardX = CORE_X + CORE_W - 262;
          const cardY = drawerY - slideUp - 80 + hover;
          const cardW = 240;
          const cardH = 92;

          // Leader from card bottom-center down to drawer edge
          const anchorX = cardX + cardW / 2;
          const anchorY = cardY + cardH;
          const drawerX = anchorX - 60; // feels like it was pulled from a tag

          return (
            <g opacity={op}>
              {/* leader */}
              <path
                d={`M ${drawerX} ${drawerY} L ${anchorX} ${drawerY} L ${anchorX} ${anchorY}`}
                stroke={LINEN}
                strokeWidth={1}
                fill="none"
                strokeDasharray="2 3"
              />
              <circle cx={drawerX} cy={drawerY} r={2.6} fill={LINEN} />

              {/* Card body */}
              <g transform={`translate(${cardX}, ${cardY})`}>
                {/* shadow */}
                <rect
                  x={2}
                  y={6}
                  width={cardW}
                  height={cardH}
                  rx={2}
                  fill="#000"
                  opacity={0.35}
                  filter="url(#soft)"
                />
                <rect
                  x={0}
                  y={0}
                  width={cardW}
                  height={cardH}
                  fill="url(#label-slip)"
                  stroke={LINEN}
                  strokeWidth={1}
                  rx={2}
                />
                {/* perforation header */}
                <rect
                  x={0}
                  y={0}
                  width={cardW}
                  height={20}
                  fill={LINEN}
                  opacity={0.6}
                />
                <line
                  x1={0}
                  y1={20}
                  x2={cardW}
                  y2={20}
                  stroke={PEAT_DEEP}
                  strokeOpacity={0.45}
                  strokeWidth={0.7}
                  strokeDasharray="3 2"
                />
                <text
                  x={12}
                  y={14}
                  fill={PEAT_DEEP}
                  fontFamily={inter}
                  fontSize={9}
                  fontWeight={700}
                  letterSpacing={2.8}
                  opacity={0.78}
                >
                  SPECIMEN · RETRIEVED 1950
                </text>
                <text
                  x={12}
                  y={46}
                  fill={PEAT_DEEP}
                  fontFamily={playfair}
                  fontStyle="italic"
                  fontSize={22}
                  fontWeight={500}
                >
                  Tollund Man
                </text>
                <text
                  x={12}
                  y={66}
                  fill={PEAT_DEEP}
                  fontFamily={inter}
                  fontSize={10.5}
                  fontWeight={500}
                  letterSpacing={1.8}
                  opacity={0.78}
                >
                  c. 405–380 BCE  ·  ¹⁴C-dated
                </text>
                <text
                  x={12}
                  y={82}
                  fill={PEAT_DEEP}
                  fontFamily={inter}
                  fontSize={10}
                  fontWeight={500}
                  letterSpacing={1.6}
                  opacity={0.62}
                >
                  Bjældskovdal, Jutland
                </text>
              </g>
            </g>
          );
        })()}

        {/* Caption strip just below the drafting frame */}
        <g
          transform={`translate(${FRAME.x}, ${FRAME.y + FRAME.h + 22})`}
          fill={LINEN_DIM}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
        >
          <text>FIG. 2 · STRATIGRAPHIC CROSS-SECTION, DANISH RAISED BOG</text>
          <text x={FRAME.w} textAnchor="end" fill={LINEN} opacity={0.9}>
            pH 3.5 · 4 °C · ANAEROBIC
          </text>
        </g>
      </svg>

      {/* Type lockup */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 905,
          opacity: titleSpring,
          transform: `translateY(${interpolate(titleSpring, [0, 1], [16, 0])}px)`,
        }}
      >
        <div
          style={{
            color: LINEN,
            fontFamily: inter,
            fontSize: 13,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 18,
            fontWeight: 600,
          }}
        >
          Role <span style={{ color: LINEN_DIM, margin: "0 4px" }}>/</span>
          <span style={{ color: PAPER, letterSpacing: 5 }}>Archivist</span>
        </div>

        <div
          style={{
            color: PAPER,
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 84,
            lineHeight: 0.96,
            letterSpacing: -1.4,
            fontStyle: "italic",
          }}
        >
          The patient
          <br />
          archivist.
        </div>

        <div
          style={{
            marginTop: 30,
            color: "#D7CBB0",
            fontFamily: inter,
            fontSize: 19,
            lineHeight: 1.4,
            fontWeight: 400,
            maxWidth: 880,
            opacity: hookOpacity,
          }}
        >
          A sphagnum peat bog holds its water near{" "}
          <span style={{ color: LINEN, fontWeight: 600 }}>pH 3.5</span>, cold
          and oxygen-starved, releasing sphagnan that inactivates the enzymes
          of decay — a vault that kept{" "}
          <span style={{ color: LINEN, fontWeight: 600 }}>Tollund Man</span>'s
          skin, eyelashes, and last meal intact for roughly{" "}
          <span style={{ color: LINEN, fontWeight: 600 }}>2,400 years</span>.
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
          color: LINEN_DIM,
          fontFamily: inter,
          fontSize: 11,
          letterSpacing: 3,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Painter &amp; Jørgensen · Nature Rev. Microbiology (2003)</span>
        <span>
          <span style={{ color: LINEN }}>●</span> One drawer ≈ 500 years
        </span>
      </div>
    </AbsoluteFill>
  );
};
