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

// ── Palette — from the concept's visual brief ─────────────────────────────
const INK = "#050D18"; // abyssal background
const BOARD = "#0E1C30"; // deep-sea drafting board
const BOARD_CORE = "#122842"; // inner vignette
const PEARL = "#EEE4C4"; // biogenic silica
const PEARL_DIM = "#B8AF95"; // shaded silica
const CYAN = "#5EE7D2"; // bioluminescent photon
const CYAN_HALO = "#B8F8ED"; // photon halo
const AMBER = "#E9A94A"; // annotation accent
const GRAY = "#7C8598"; // metadata
const GRID = "#152740";
const GRID_MAJOR = "#1D3452";

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Global growth timeline — the fibre lights up left-to-right.
  const growSpan = fps * 2.0;
  const growT = Math.max(0, Math.min(1, frame / growSpan));
  const growEased = 1 - Math.pow(1 - growT, 3);

  // Photon pulse — starts once the fibre is fully lit.
  const photonPhase = ((frame - fps * 2.2) % (fps * 2.4)) / (fps * 2.4);
  const photonActive = frame > fps * 2.2;

  const titleSpring = spring({
    frame: frame - fps * 0.35,
    fps,
    config: { damping: 200, mass: 0.8 },
  });

  const hookOpacity = interpolate(frame, [fps * 0.9, fps * 1.7], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Page grid (1080 × 1350 portrait) ────────────────────────────────
  // Top metadata band: 0..110
  // Drafting frame     : 130..841  (h 711, w 960)
  // Title block        : 900..
  // Hook               : ~1095..
  // Footer             : 1290..
  const FRAME = { x: 60, y: 130, w: 960, h: 711 };
  const MAP_W = 1080;
  const MAP_H = 800;
  const scale = FRAME.w / MAP_W;

  // ── Spicule geometry in map coords (1080 × 800) ────────────────────
  // A horizontal fibre viewed from the side; the cut left end shows
  // concentric silica layers.
  const AXIS_Y = 400;
  const CUT_X = 330; // centre of the cross-section circle
  const TAIL_X = 970; // where the fibre exits the right edge
  const CUT_R = 88; // outer radius of the cross-section
  const FIBRE_H = CUT_R * 1.55; // fibre body height
  const FIBRE_TOP = AXIS_Y - FIBRE_H / 2;

  // Concentric silica layers (from outer to inner core)
  const LAYERS = [
    { r: 88, fill: PEARL_DIM, stroke: "#7A705A" }, // outer sheath
    { r: 74, fill: "#D8CDA9", stroke: "#8A8065" }, // laminated silica
    { r: 58, fill: PEARL, stroke: "#8A8065" }, // cladding
    { r: 44, fill: "#F5EBCB", stroke: "#8A8065" }, // Na-doped ring
    { r: 30, fill: CYAN_HALO, stroke: "#8A8065", opacity: 0.9 }, // graded
    { r: 16, fill: CYAN, stroke: "#4FC7B4" }, // core
  ];

  // Photon position along the fibre (map coords)
  const photonStart = CUT_X + 8;
  const photonEnd = TAIL_X - 20;
  const photonX = photonStart + (photonEnd - photonStart) * photonPhase;

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
        <span style={{ color: CYAN }}>2026 · 08 · 19</span>
      </div>

      {/* Main figure */}
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

          <radialGradient id="board-vignette" cx="45%" cy="42%" r="72%">
            <stop offset="0%" stopColor={BOARD_CORE} stopOpacity={1} />
            <stop offset="100%" stopColor={BOARD} stopOpacity={1} />
          </radialGradient>

          <linearGradient id="fibre-body" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#8A8065" />
            <stop offset="18%" stopColor={PEARL} />
            <stop offset="50%" stopColor="#FBF3D8" />
            <stop offset="82%" stopColor={PEARL_DIM} />
            <stop offset="100%" stopColor="#5C5540" />
          </linearGradient>

          <linearGradient id="beam" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor={CYAN} stopOpacity={0} />
            <stop offset="15%" stopColor={CYAN} stopOpacity={0.9} />
            <stop offset="85%" stopColor={CYAN_HALO} stopOpacity={0.9} />
            <stop offset="100%" stopColor={CYAN_HALO} stopOpacity={0} />
          </linearGradient>

          <radialGradient id="photon-halo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={CYAN_HALO} stopOpacity={0.9} />
            <stop offset="60%" stopColor={CYAN} stopOpacity={0.35} />
            <stop offset="100%" stopColor={CYAN} stopOpacity={0} />
          </radialGradient>

          <filter id="beam-glow" x="-20%" y="-40%" width="140%" height="180%">
            <feGaussianBlur stdDeviation="4" />
          </filter>

          <filter id="soft-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.5" />
          </filter>
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
        <rect
          x={FRAME.x + 0.5}
          y={FRAME.y + 0.5}
          width={FRAME.w - 1}
          height={FRAME.h - 1}
          fill="none"
          stroke="#26405F"
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

        {/* Depth marker (top-left of the frame) */}
        <g
          transform={`translate(${FRAME.x + 22}, ${FRAME.y + 34})`}
          fill={GRAY}
          fontFamily={inter}
          fontWeight={500}
          fontSize={10}
          letterSpacing={2.8}
        >
          <text>DEPTH · 500–1000 M</text>
        </g>

        {/* ── Main figure: spicule in map coords ─────────────────── */}
        <g transform={`translate(${FRAME.x}, ${FRAME.y}) scale(${scale})`}>
          {/* ── Whole-organism silhouette (upper-right corner) ──── */}
          <g transform="translate(935, 78)" opacity={0.9}>
            {(() => {
              // Slender vase-lattice cage — a schematic of the whole sponge.
              const bw = 86;
              const bh = 168;
              const bx = -bw / 2;
              const paths: React.ReactElement[] = [];
              const rows = 9;
              const cols = 5;
              const dx = bw / cols;
              const dy = bh / rows;
              // Diagonal ribs (both diagonals) — the sponge's cross-lattice
              for (let r = 0; r < rows; r++) {
                for (let c = 0; c <= cols; c++) {
                  const x1 = bx + c * dx;
                  const y1 = r * dy;
                  const x2 = bx + (c + 1) * dx;
                  const y2 = (r + 1) * dy;
                  paths.push(
                    <line
                      key={`d1-${r}-${c}`}
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke={PEARL}
                      strokeOpacity={0.55}
                      strokeWidth={1.1}
                    />,
                  );
                  paths.push(
                    <line
                      key={`d2-${r}-${c}`}
                      x1={x1 + dx}
                      y1={y1}
                      x2={x1}
                      y2={y2}
                      stroke={PEARL}
                      strokeOpacity={0.55}
                      strokeWidth={1.1}
                    />,
                  );
                }
              }
              // Horizontal binding rings
              for (let r = 0; r <= rows; r++) {
                paths.push(
                  <line
                    key={`h-${r}`}
                    x1={bx}
                    y1={r * dy}
                    x2={bx + bw}
                    y2={r * dy}
                    stroke={PEARL}
                    strokeOpacity={0.85}
                    strokeWidth={1.4}
                  />,
                );
              }
              // Outer bounding rectangle (subtle)
              paths.push(
                <rect
                  key="bound"
                  x={bx}
                  y={0}
                  width={bw}
                  height={bh}
                  fill="none"
                  stroke={PEARL}
                  strokeOpacity={0.25}
                  strokeWidth={1}
                />,
              );
              return <g>{paths}</g>;
            })()}
            <text
              x={0}
              y={-42}
              textAnchor="middle"
              fill={PEARL}
              fontFamily={inter}
              fontStyle="italic"
              fontSize={14}
              fontWeight={500}
            >
              Euplectella aspergillum
            </text>
            <text
              x={0}
              y={-22}
              textAnchor="middle"
              fill={GRAY}
              fontFamily={inter}
              fontSize={11}
              letterSpacing={3.2}
              fontWeight={500}
            >
              WHOLE ORGANISM · 20 CM
            </text>
          </g>

          {/* ── Hero: the spicule ──────────────────────────────── */}

          {/* Body — pill-shape reveal from left to right */}
          <clipPath id="spicule-clip">
            <rect
              x={CUT_X - 20}
              y={FIBRE_TOP - 4}
              width={(TAIL_X + 20 - (CUT_X - 20)) * growEased}
              height={FIBRE_H + 8}
            />
          </clipPath>

          <g clipPath="url(#spicule-clip)">
            {/* Fibre body */}
            <rect
              x={CUT_X}
              y={FIBRE_TOP}
              width={TAIL_X - CUT_X + 40}
              height={FIBRE_H}
              fill="url(#fibre-body)"
            />
            {/* Right-end taper */}
            <ellipse
              cx={TAIL_X}
              cy={AXIS_Y}
              rx={14}
              ry={FIBRE_H / 2}
              fill="#3E3A2A"
            />
            {/* Highlight bar */}
            <rect
              x={CUT_X}
              y={FIBRE_TOP + 12}
              width={TAIL_X - CUT_X + 40}
              height={6}
              fill="#FBF3D8"
              opacity={0.55}
            />
            {/* Subtle length striations (annular joints along the fibre) */}
            {Array.from({ length: 8 }).map((_, i) => {
              const x = CUT_X + 80 + i * 90;
              return (
                <line
                  key={`stria-${i}`}
                  x1={x}
                  y1={FIBRE_TOP + 2}
                  x2={x}
                  y2={FIBRE_TOP + FIBRE_H - 2}
                  stroke="#6C6142"
                  strokeOpacity={0.35}
                  strokeWidth={1}
                />
              );
            })}

            {/* Light beam inside the fibre (once the tube is lit) */}
            <rect
              x={CUT_X + 12}
              y={AXIS_Y - 6}
              width={TAIL_X - CUT_X - 20}
              height={12}
              fill="url(#beam)"
              opacity={growEased}
              filter="url(#beam-glow)"
            />
            <rect
              x={CUT_X + 12}
              y={AXIS_Y - 1.5}
              width={TAIL_X - CUT_X - 20}
              height={3}
              fill={CYAN_HALO}
              opacity={growEased}
            />

            {/* Photon pulse */}
            {photonActive && (
              <g opacity={Math.min(1, (frame - fps * 2.2) / fps)}>
                <circle
                  cx={photonX}
                  cy={AXIS_Y}
                  r={26}
                  fill="url(#photon-halo)"
                />
                <circle
                  cx={photonX}
                  cy={AXIS_Y}
                  r={7}
                  fill="#FFFFFF"
                  filter="url(#soft-glow)"
                />
                <circle
                  cx={photonX}
                  cy={AXIS_Y}
                  r={3}
                  fill="#FFFFFF"
                />
              </g>
            )}
          </g>

          {/* Cross-section (cut end) — concentric silica layers */}
          <g transform={`translate(${CUT_X}, ${AXIS_Y})`}>
            {/* Subtle drop shadow */}
            <circle cx={0} cy={4} r={CUT_R + 2} fill="#000" opacity={0.35} />
            {LAYERS.map((L, i) => (
              <circle
                key={`layer-${i}`}
                cx={0}
                cy={0}
                r={L.r}
                fill={L.fill}
                stroke={L.stroke}
                strokeWidth={i === LAYERS.length - 1 ? 1.4 : 0.9}
                opacity={
                  L.opacity !== undefined
                    ? L.opacity * Math.min(1, growEased * 1.4)
                    : Math.min(1, growEased * 1.4)
                }
              />
            ))}
            {/* Center highlight */}
            <circle cx={-6} cy={-6} r={5} fill="#FFFFFF" opacity={0.55} />
          </g>

          {/* ── Callouts / annotations ────────────────────────── */}

          {/* Callout A: CORE — leader goes UP-LEFT from the top of the
              cross-section to a label above (inside frame margins) */}
          <g
            opacity={Math.min(1, Math.max(0, growEased - 0.15) * 1.4)}
            fill={AMBER}
            stroke={AMBER}
            fontFamily={inter}
          >
            <line
              x1={CUT_X - 6}
              y1={AXIS_Y - CUT_R + 12}
              x2={CUT_X - 90}
              y2={AXIS_Y - CUT_R - 60}
              strokeWidth={1.2}
              fill="none"
            />
            <line
              x1={CUT_X - 90}
              y1={AXIS_Y - CUT_R - 60}
              x2={135}
              y2={AXIS_Y - CUT_R - 60}
              strokeWidth={1.2}
              fill="none"
            />
            <text
              x={135}
              y={AXIS_Y - CUT_R - 74}
              fontSize={15}
              letterSpacing={3}
              fontWeight={600}
            >
              CORE · Na-DOPED SiO₂
            </text>
            <text
              x={135}
              y={AXIS_Y - CUT_R - 50}
              fontSize={13}
              letterSpacing={2}
              fontWeight={400}
              fill={PEARL}
              stroke="none"
            >
              graded refractive index
            </text>
          </g>

          {/* Callout B: LAMINATED SILICA — leader goes DOWN-LEFT from
              the bottom outer ring to a label below the cross-section */}
          <g
            opacity={Math.min(1, Math.max(0, growEased - 0.2) * 1.4)}
            fill={AMBER}
            stroke={AMBER}
            fontFamily={inter}
          >
            <line
              x1={CUT_X - CUT_R + 18}
              y1={AXIS_Y + CUT_R - 20}
              x2={CUT_X - 130}
              y2={AXIS_Y + CUT_R + 60}
              strokeWidth={1.2}
              fill="none"
            />
            <line
              x1={CUT_X - 130}
              y1={AXIS_Y + CUT_R + 60}
              x2={135}
              y2={AXIS_Y + CUT_R + 60}
              strokeWidth={1.2}
              fill="none"
            />
            <text
              x={135}
              y={AXIS_Y + CUT_R + 78}
              fontSize={15}
              letterSpacing={3}
              fontWeight={600}
            >
              LAMINATED SILICA
            </text>
            <text
              x={135}
              y={AXIS_Y + CUT_R + 102}
              fontSize={13}
              letterSpacing={2}
              fontWeight={400}
              fill={PEARL}
              stroke="none"
            >
              5–10 nm organic interleaves
            </text>
          </g>

          {/* ── Comparison stat below the fibre — the story ── */}
          <g
            transform={`translate(500, ${AXIS_Y + FIBRE_H / 2 + 88})`}
            opacity={Math.min(1, Math.max(0, growEased - 0.35) * 1.4)}
            fontFamily={inter}
          >
            {/* Divider */}
            <line
              x1={240}
              y1={-52}
              x2={240}
              y2={36}
              stroke="#31445E"
              strokeWidth={1}
            />

            {/* Left cell — this sponge */}
            <text
              x={0}
              y={-32}
              fill={GRAY}
              fontSize={11}
              letterSpacing={3.2}
              fontWeight={500}
            >
              SPONGE · SEAFLOOR
            </text>
            <text
              x={0}
              y={22}
              fill={CYAN}
              fontFamily={playfair}
              fontSize={54}
              fontWeight={500}
              fontStyle="italic"
              letterSpacing={-0.4}
            >
              4 °C
            </text>

            {/* Right cell — industry */}
            <text
              x={270}
              y={-32}
              fill={GRAY}
              fontSize={11}
              letterSpacing={3.2}
              fontWeight={500}
            >
              INDUSTRIAL DRAW TOWER
            </text>
            <text
              x={270}
              y={22}
              fill={PEARL_DIM}
              fontFamily={playfair}
              fontSize={54}
              fontWeight={500}
              fontStyle="italic"
              letterSpacing={-0.4}
            >
              ~2000 °C
            </text>

            {/* Footnote spanning both cells */}
            <text
              x={240}
              y={64}
              textAnchor="middle"
              fill={GRAY}
              fontSize={11}
              letterSpacing={2.8}
              fontWeight={500}
            >
              — SAME FIBRE-OPTIC BEHAVIOUR —
            </text>
          </g>
        </g>

        {/* Caption strip just below the drafting frame */}
        <g
          transform={`translate(${FRAME.x}, ${FRAME.y + FRAME.h + 22})`}
          fill={GRAY}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
        >
          <text>FIG. 1 · BASAL SPICULE, EUPLECTELLA ASPERGILLUM</text>
          <text x={FRAME.w} textAnchor="end" fill={CYAN} opacity={0.85}>
            LIGHT-GUIDING BIOGENIC SILICA
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
            color: CYAN,
            fontFamily: inter,
            fontSize: 13,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 18,
            fontWeight: 600,
          }}
        >
          Role <span style={{ color: GRAY, margin: "0 4px" }}>/</span>
          <span style={{ color: "#EDEDEF", letterSpacing: 5 }}>
            Fiber-Optic Engineer
          </span>
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
          The 4 °C
          <br />
          glass foundry.
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
          Grown on the abyssal seafloor at{" "}
          <span style={{ color: CYAN, fontWeight: 600 }}>4 °C</span>, the basal
          spicules of{" "}
          <span style={{ color: PEARL, fontWeight: 600, fontStyle: "italic" }}>
            Euplectella aspergillum
          </span>{" "}
          are sodium-doped, layered biogenic silica — their refractive-index
          profile and light-guiding behaviour rival commercial optical fibre
          drawn at ~2000 °C.
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
        <span>Sundar et al. · Nature 424 (2003) 899–900</span>
        <span>
          <span style={{ color: CYAN }}>●</span> Photon along fibre axis
        </span>
      </div>
    </AbsoluteFill>
  );
};
