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

// ── Palette from the concept's visual brief ─────────────────────────
const INK = "#07070A";
const INK_2 = "#0B0B10";
const GLASS_DEEP = "#141319";
const GRAPHITE = "#2A2F3B";
const CLINICAL = "#E9EEF3";
const MAHOGANY = "#7A2E1F";
const GRAY = "#8A8F99";

// ── Blade geometry ──────────────────────────────────────────────────
// The blade is a hand-knapped, leaf-shaped obsidian blade — a bifacial
// tool with slightly faceted sides. It lies at a strong diagonal across
// the stage, tapering to a fine point at the bottom-right of the map.
//
// Map is exactly STAGE-sized (scale = 1). Blade tip is well inside the
// stage bounds so it never crosses the type lockup below.
const MAP_W = 960;
const MAP_H = 820;

// Cutting edge (right side of the blade, top → tip). Slightly convex.
const EDGE_POINTS: [number, number][] = [
  [270, 60], // butt / top
  [355, 130],
  [455, 205],
  [560, 300],
  [665, 415],
  [745, 530],
  [800, 640],
  [830, 730],
  [830, 770], // tip
];

// Spine (left side of the blade, tip → top). Nearly straight, faceted.
const SPINE_POINTS: [number, number][] = [
  [830, 770], // tip
  [790, 720],
  [720, 610],
  [630, 490],
  [540, 380],
  [455, 285],
  [370, 195],
  [290, 110],
  [270, 60], // back to butt
];

const bladePath = (): string => {
  const all = [...EDGE_POINTS, ...SPINE_POINTS.slice(1)];
  const [first, ...rest] = all;
  return (
    `M ${first[0]} ${first[1]} ` +
    rest.map((p) => `L ${p[0]} ${p[1]}`).join(" ") +
    " Z"
  );
};

const cuttingEdgePath = (): string =>
  "M " + EDGE_POINTS.map(([x, y]) => `${x} ${y}`).join(" L ");

const spinePath = (): string =>
  "M " + SPINE_POINTS.map(([x, y]) => `${x} ${y}`).join(" L ");

// Sample a point along the cutting edge polyline at fraction u ∈ [0,1].
const edgeAt = (u: number): { x: number; y: number; tx: number; ty: number } => {
  const segs: number[] = [];
  let total = 0;
  for (let i = 0; i < EDGE_POINTS.length - 1; i++) {
    const [ax, ay] = EDGE_POINTS[i];
    const [bx, by] = EDGE_POINTS[i + 1];
    const L = Math.hypot(bx - ax, by - ay);
    segs.push(L);
    total += L;
  }
  let target = Math.max(0, Math.min(1, u)) * total;
  for (let i = 0; i < segs.length; i++) {
    if (target <= segs[i]) {
      const [ax, ay] = EDGE_POINTS[i];
      const [bx, by] = EDGE_POINTS[i + 1];
      const f = segs[i] === 0 ? 0 : target / segs[i];
      const dx = bx - ax;
      const dy = by - ay;
      const L = Math.hypot(dx, dy) || 1;
      return { x: ax + dx * f, y: ay + dy * f, tx: dx / L, ty: dy / L };
    }
    target -= segs[i];
  }
  const [bx, by] = EDGE_POINTS[EDGE_POINTS.length - 1];
  return { x: bx, y: by, tx: 0, ty: 1 };
};

// Conchoidal ripples — concentric fracture arcs radiating from a
// Hertzian cone near the butt end of the blade.
const RIPPLES = Array.from({ length: 11 }, (_, i) => ({
  cx: 260,
  cy: 80,
  r: 90 + i * 78,
  op: 0.05 + i * 0.007,
}));

// Flake scars — subtle chevron ridges suggesting knapped facets across
// the blade face.
const FLAKE_SCARS: [number, number, number, number][] = [
  [345, 170, 385, 300],
  [430, 240, 470, 380],
  [520, 320, 560, 460],
  [600, 400, 640, 540],
  [680, 490, 715, 620],
  [755, 590, 780, 700],
];

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // ── Timing (a calm ~5s beat) ──────────────────────────────────────
  const titleSpring = spring({
    frame: frame - fps * 0.3,
    fps,
    config: { damping: 200, mass: 0.8 },
  });

  const roleTagOpacity = interpolate(frame, [0, fps * 0.6], [0, 1], {
    extrapolateRight: "clamp",
  });

  const bladeReveal = spring({
    frame: frame - fps * 0.2,
    fps,
    config: { damping: 200, mass: 1.2, stiffness: 60 },
  });

  const calloutSpring = spring({
    frame: frame - fps * 1.6,
    fps,
    config: { damping: 200, mass: 0.9 },
  });

  const hookOpacity = interpolate(frame, [fps * 1.1, fps * 2.0], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Specular sweep progress — travels from butt to tip, loops.
  // Bias toward the middle so the still (frame 90) shows a visible sweep.
  const sweepDur = fps * 5;
  const sweepU = (frame % sweepDur) / sweepDur;
  const sweepEased = 0.5 - 0.5 * Math.cos(sweepU * Math.PI * 2); // smooth in/out
  const sweep = edgeAt(0.15 + sweepEased * 0.7);

  // ── Poster layout ─────────────────────────────────────────────────
  // 0..110    top metadata band
  // 120..940  blade stage
  // 970..     type lockup
  // 1280..    footer
  const STAGE = { x: 60, y: 120, w: MAP_W, h: MAP_H };
  const scale = 1;

  // Callout inspects the very tip of the cutting edge.
  const tip = EDGE_POINTS[EDGE_POINTS.length - 1];
  const tipScreen = {
    x: STAGE.x + tip[0] * scale,
    y: STAGE.y + tip[1] * scale,
  };

  return (
    <AbsoluteFill style={{ backgroundColor: INK, fontFamily: inter }}>
      <style>{fontCss}</style>

      {/* subtle vignette wash */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(120% 90% at 30% 20%, #0F0F16 0%, #07070A 60%, #050508 100%)",
        }}
      />

      {/* Top metadata band */}
      <div
        style={{
          position: "absolute",
          top: 52,
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
        <span style={{ color: CLINICAL }}>2026 · 07 · 21</span>
      </div>

      {/* Stage SVG — the blade */}
      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          {/* Deep glass body gradient — cool graphite core, near-black edges */}
          <linearGradient id="glassBody" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#101018" />
            <stop offset="45%" stopColor={GRAPHITE} />
            <stop offset="100%" stopColor="#050508" />
          </linearGradient>

          {/* Mahogany streak — real coloration in some flows */}
          <linearGradient id="mahogany" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={MAHOGANY} stopOpacity={0} />
            <stop offset="45%" stopColor={MAHOGANY} stopOpacity={0.55} />
            <stop offset="55%" stopColor={MAHOGANY} stopOpacity={0.6} />
            <stop offset="100%" stopColor={MAHOGANY} stopOpacity={0} />
          </linearGradient>

          {/* Specular sweep — a soft warm-white bar */}
          <linearGradient id="specular" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={CLINICAL} stopOpacity={0} />
            <stop offset="50%" stopColor="#FFFFFF" stopOpacity={0.9} />
            <stop offset="100%" stopColor={CLINICAL} stopOpacity={0} />
          </linearGradient>

          {/* Edge glow */}
          <filter id="edgeGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3.5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Blade clip so ripples/streaks stay inside the shape */}
          <clipPath id="bladeClip">
            <path d={bladePath()} />
          </clipPath>

          {/* Instrument-tray radial background */}
          <radialGradient id="tray" cx="30%" cy="35%" r="80%">
            <stop offset="0%" stopColor="#101018" />
            <stop offset="100%" stopColor={INK} />
          </radialGradient>
        </defs>

        {/* Stage backdrop */}
        <rect
          x={STAGE.x}
          y={STAGE.y}
          width={STAGE.w}
          height={STAGE.h}
          fill="url(#tray)"
        />

        {/* Faint architectural corner registration marks */}
        {[
          [STAGE.x + 40, STAGE.y + 40],
          [STAGE.x + STAGE.w - 40, STAGE.y + 40],
          [STAGE.x + 40, STAGE.y + STAGE.h - 40],
          [STAGE.x + STAGE.w - 40, STAGE.y + STAGE.h - 40],
        ].map(([cx, cy], i) => (
          <g key={`reg-${i}`} stroke="#1A1E28" strokeWidth={1} fill="none">
            <circle cx={cx} cy={cy} r={4} />
            <line x1={cx - 8} y1={cy} x2={cx + 8} y2={cy} />
            <line x1={cx} y1={cy - 8} x2={cx} y2={cy + 8} />
          </g>
        ))}

        {/* Stage border (very subtle inner frame) */}
        <rect
          x={STAGE.x + 0.5}
          y={STAGE.y + 0.5}
          width={STAGE.w - 1}
          height={STAGE.h - 1}
          fill="none"
          stroke="#151821"
          strokeWidth={1}
        />

        {/* Corner tick marks — mahogany accent */}
        {(
          [
            [STAGE.x, STAGE.y, 1, 1],
            [STAGE.x + STAGE.w, STAGE.y, -1, 1],
            [STAGE.x, STAGE.y + STAGE.h, 1, -1],
            [STAGE.x + STAGE.w, STAGE.y + STAGE.h, -1, -1],
          ] as const
        ).map(([cx, cy, sx, sy], i) => (
          <g key={i} stroke={MAHOGANY} strokeWidth={1.5} fill="none" opacity={0.9}>
            <line x1={cx} y1={cy} x2={cx + sx * 22} y2={cy} />
            <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 22} />
          </g>
        ))}

        {/* Blade content — map coords are 1:1 with stage */}
        <g
          transform={`translate(${STAGE.x}, ${STAGE.y})`}
          opacity={bladeReveal}
        >
          {/* Cast shadow beneath the blade (soft, follows the diagonal) */}
          <ellipse
            cx={560}
            cy={790}
            rx={520}
            ry={16}
            fill="#000"
            opacity={0.55}
          />

          {/* Blade body */}
          <path d={bladePath()} fill="url(#glassBody)" />

          {/* Body detail — clipped to blade */}
          <g clipPath="url(#bladeClip)">
            {/* Base deep-glass wash (darkens body) */}
            <rect
              x={0}
              y={0}
              width={MAP_W}
              height={MAP_H}
              fill={GLASS_DEEP}
              opacity={0.35}
            />

            {/* Conchoidal ripples — concentric fracture arcs */}
            {RIPPLES.map((r, i) => (
              <circle
                key={`rip-${i}`}
                cx={r.cx}
                cy={r.cy}
                r={r.r}
                stroke={CLINICAL}
                strokeOpacity={r.op}
                strokeWidth={1.1}
                fill="none"
              />
            ))}

            {/* Flake scars — thin chevron ridges suggesting knapped facets */}
            {FLAKE_SCARS.map(([x1, y1, x2, y2], i) => (
              <g key={`fs-${i}`}>
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={CLINICAL}
                  strokeOpacity={0.08}
                  strokeWidth={1}
                />
                <line
                  x1={x1 + 6}
                  y1={y1 - 4}
                  x2={x2 - 6}
                  y2={y2 + 4}
                  stroke={"#000"}
                  strokeOpacity={0.35}
                  strokeWidth={1}
                />
              </g>
            ))}

            {/* Mahogany streak — real coloration in some flows */}
            <rect
              x={-200}
              y={330}
              width={1400}
              height={70}
              fill="url(#mahogany)"
              transform="rotate(38 480 380)"
              opacity={0.75}
            />

            {/* Specular sweep — a light gleam moving DOWN the blade,
                perpendicular to the local edge tangent */}
            <g
              transform={`translate(${sweep.x}, ${sweep.y}) rotate(${
                (Math.atan2(sweep.ty, sweep.tx) * 180) / Math.PI + 90
              })`}
              opacity={0.9}
            >
              <rect
                x={-320}
                y={-80}
                width={640}
                height={120}
                fill="url(#specular)"
                opacity={0.55}
                rx={4}
              />
              <rect
                x={-380}
                y={-12}
                width={760}
                height={6}
                fill="#FFFFFF"
                opacity={0.55}
              />
            </g>
          </g>

          {/* Central spine — a faint bifacial ridge line from butt to tip */}
          <line
            x1={270}
            y1={60}
            x2={830}
            y2={770}
            stroke={CLINICAL}
            strokeOpacity={0.08}
            strokeWidth={1}
          />

          {/* Cutting edge — luminous hairline */}
          <path
            d={cuttingEdgePath()}
            fill="none"
            stroke={CLINICAL}
            strokeWidth={2.4}
            strokeLinecap="round"
            filter="url(#edgeGlow)"
          />
          <path
            d={cuttingEdgePath()}
            fill="none"
            stroke="#FFFFFF"
            strokeWidth={1.1}
            strokeLinecap="round"
            opacity={0.95}
          />

          {/* Spine — cool graphite line */}
          <path
            d={spinePath()}
            fill="none"
            stroke="#1B1F29"
            strokeWidth={1.4}
          />
        </g>

        {/* ── Callout: magnified tip inspection ─────────────────── */}
        {(() => {
          // Positioned in the upper-right of the stage, above the blade tip.
          const panelX = STAGE.x + 570;
          const panelY = STAGE.y + 40;
          const panelW = 380;
          const panelH = 210;
          const opa = calloutSpring;
          if (opa <= 0.001) return null;

          // Compare wedges — same base width, drastically different tip radii.
          const wedgeCx = panelX + 90;
          const obsY = panelY + 78;
          const steelY = panelY + 160;
          const baseW = 120;

          return (
            <g opacity={opa}>
              {/* Leader — from tip up to the panel */}
              <line
                x1={tipScreen.x}
                y1={tipScreen.y}
                x2={panelX + 40}
                y2={panelY + panelH}
                stroke={CLINICAL}
                strokeWidth={1}
                strokeDasharray="4 4"
                opacity={0.4}
              />
              <circle
                cx={tipScreen.x}
                cy={tipScreen.y}
                r={5}
                fill="none"
                stroke={CLINICAL}
                strokeWidth={1.2}
                opacity={0.7}
              />

              {/* Panel */}
              <rect
                x={panelX}
                y={panelY}
                width={panelW}
                height={panelH}
                fill={INK_2}
                stroke={CLINICAL}
                strokeOpacity={0.28}
                strokeWidth={1}
              />

              {/* Panel label */}
              <text
                x={panelX + 16}
                y={panelY + 26}
                fill={CLINICAL}
                fontFamily={inter}
                fontSize={11}
                letterSpacing={3.5}
                fontWeight={600}
              >
                FIG. 1 · EDGE TIP RADIUS
              </text>
              <line
                x1={panelX + 16}
                y1={panelY + 38}
                x2={panelX + panelW - 16}
                y2={panelY + 38}
                stroke={CLINICAL}
                strokeOpacity={0.15}
                strokeWidth={1}
              />

              {/* Obsidian wedge — tapers to a needle point */}
              <polygon
                points={`${wedgeCx - baseW / 2},${obsY + 18} ${
                  wedgeCx + baseW / 2
                },${obsY + 18} ${wedgeCx + 0.4},${obsY - 12} ${
                  wedgeCx - 0.4
                },${obsY - 12}`}
                fill="#0A0A0F"
                stroke={CLINICAL}
                strokeOpacity={0.9}
                strokeWidth={0.8}
              />
              {/* obsidian labels */}
              <text
                x={panelX + panelW - 16}
                y={obsY - 8}
                textAnchor="end"
                fill={CLINICAL}
                fontFamily={inter}
                fontSize={11}
                letterSpacing={3}
                fontWeight={600}
              >
                OBSIDIAN
              </text>
              <text
                x={panelX + panelW - 16}
                y={obsY + 14}
                textAnchor="end"
                fill={MAHOGANY}
                fontFamily={playfair}
                fontStyle="italic"
                fontSize={20}
                fontWeight={500}
              >
                ~3 nm
              </text>

              {/* Steel wedge — much blunter */}
              <polygon
                points={`${wedgeCx - baseW / 2},${steelY + 18} ${
                  wedgeCx + baseW / 2
                },${steelY + 18} ${wedgeCx + 8},${steelY - 4} ${
                  wedgeCx - 8
                },${steelY - 4}`}
                fill={GRAPHITE}
                stroke={GRAY}
                strokeOpacity={0.55}
                strokeWidth={0.8}
              />
              {/* steel labels */}
              <text
                x={panelX + panelW - 16}
                y={steelY - 4}
                textAnchor="end"
                fill={GRAY}
                fontFamily={inter}
                fontSize={11}
                letterSpacing={3}
                fontWeight={500}
              >
                STEEL SCALPEL
              </text>
              <text
                x={panelX + panelW - 16}
                y={steelY + 18}
                textAnchor="end"
                fill={GRAY}
                fontFamily={playfair}
                fontStyle="italic"
                fontSize={20}
                fontWeight={500}
              >
                ~300 nm
              </text>
            </g>
          );
        })()}

        {/* Caption strip below the stage */}
        <g
          transform={`translate(${STAGE.x}, ${STAGE.y + STAGE.h + 14})`}
          fill={GRAY}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
        >
          <text>FIG. 2 · CONCHOIDAL FRACTURE, VOLCANIC GLASS</text>
          <text
            x={STAGE.w}
            textAnchor="end"
            fill={CLINICAL}
            opacity={0.9}
          >
            USED IN OPHTHALMIC SURGERY
          </text>
        </g>
      </svg>

      {/* ── Type lockup ────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 990,
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
            color: CLINICAL,
            fontFamily: inter,
            fontSize: 13,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 18,
            fontWeight: 600,
            opacity: roleTagOpacity,
          }}
        >
          Role <span style={{ color: GRAY, margin: "0 4px" }}>/</span>
          <span style={{ color: "#EDEDEF", letterSpacing: 5 }}>Surgeon</span>
        </div>

        <div
          style={{
            color: "#F4F4F6",
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 78,
            lineHeight: 0.98,
            letterSpacing: -1.2,
            fontStyle: "italic",
          }}
        >
          The glass
          <br />
          scalpel.
        </div>

        <div
          style={{
            marginTop: 24,
            color: "#C8CAD0",
            fontFamily: inter,
            fontSize: 17,
            lineHeight: 1.4,
            fontWeight: 400,
            maxWidth: 900,
            opacity: hookOpacity,
          }}
        >
          A freshly fractured{" "}
          <span style={{ color: CLINICAL, fontWeight: 600 }}>obsidian</span>{" "}
          edge tapers to a tip radius near{" "}
          <span style={{ color: MAHOGANY, fontWeight: 600 }}>3 nanometres</span>
          {" "}— about a hundred times finer than a surgical-steel scalpel — and
          the blades have been used in real ophthalmic and reconstructive
          surgery for their unusually clean cuts.
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
        <span>Buck · West. J. Med. 136 (1982) · Disa et al. · Plast. Reconstr. Surg. (1993)</span>
        <span>
          <span style={{ color: MAHOGANY }}>●</span> Volcanic glass · Rhyolitic
        </span>
      </div>

      {/* silence unused var warning in strict tsconfigs */}
      <span style={{ display: "none" }}>{durationInFrames}</span>
    </AbsoluteFill>
  );
};
