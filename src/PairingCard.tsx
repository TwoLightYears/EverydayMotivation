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

// Palette — from concept visual brief (real F. pardalis coloration)
const INK = "#0B1024";
const BOARD = "#111634";
const BOARD_2 = "#0D1128";
const CYAN = "#0FB5D8";
const EMERALD = "#1E9E5B";
const GOLD = "#F5C842";
const ORANGE = "#E5622A";
const BONE = "#F0E8D2";
const DUST = "#7E86A6"; // cool secondary type
const GRID = "#1A2049";
const GRID_MAJOR = "#232B5D";

// Spectrum spans left (tight lattice, cyan) → right (loose lattice, orange)
const SPECTRUM: Array<{ pos: number; color: string }> = [
  { pos: 0.0, color: CYAN },
  { pos: 0.28, color: "#3ECEA5" },
  { pos: 0.5, color: EMERALD },
  { pos: 0.7, color: GOLD },
  { pos: 1.0, color: ORANGE },
];

const lerpNum = (a: number, b: number, t: number): number => a + (b - a) * t;

const hexToRgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const rgbToHex = (r: number, g: number, b: number): string =>
  "#" +
  [r, g, b]
    .map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0"))
    .join("");

const sampleSpectrum = (t: number): string => {
  const x = Math.max(0, Math.min(1, t));
  for (let i = 0; i < SPECTRUM.length - 1; i++) {
    const a = SPECTRUM[i];
    const b = SPECTRUM[i + 1];
    if (x >= a.pos && x <= b.pos) {
      const k = (x - a.pos) / (b.pos - a.pos);
      const [ar, ag, ab] = hexToRgb(a.color);
      const [br, bg, bb] = hexToRgb(b.color);
      return rgbToHex(
        lerpNum(ar, br, k),
        lerpNum(ag, bg, k),
        lerpNum(ab, bb, k),
      );
    }
  }
  return SPECTRUM[SPECTRUM.length - 1].color;
};

// A small emblematic curled-tail glyph (top-right corner of the plate)
// — a chameleon signature without a full silhouette that would fight
// the lattice for attention. Coordinates in a ~120 × 120 box.
const TAIL_GLYPH =
  "M 100 20 " +
  "C 60 20 30 46 30 84 " +
  "C 30 108 46 116 62 108 " +
  "C 74 102 76 90 68 84 " +
  "C 60 80 54 88 58 96";

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ── Timing ─────────────────────────────────────────────────────────
  // 0.0s → lattice grows in left→right
  // ~1.6s → reflected-light columns fan up in spectrum order
  // ~2.6s → chameleon silhouette fades in
  // ~3.0s → title springs
  // ~3.8s → hook fades
  const growSpan = fps * 2.4;
  const t = Math.max(0, frame) / growSpan;

  const beamOpen = interpolate(frame, [fps * 1.4, fps * 2.6], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const silhouetteOpacity = interpolate(
    frame,
    [fps * 2.4, fps * 3.4],
    [0, 1],
    {
      easing: Easing.out(Easing.cubic),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  const titleSpring = spring({
    frame: frame - fps * 2.8,
    fps,
    config: { damping: 200, mass: 0.8 },
  });

  const hookOpacity = interpolate(frame, [fps * 3.4, fps * 4.2], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Sweeping focus playhead — a moving vertical scan across the plate
  // that highlights which reflected wavelength is "current."
  const scan = interpolate(
    frame,
    [fps * 3.2, fps * 5.8],
    [0, 1],
    {
      easing: Easing.inOut(Easing.cubic),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  // ── Layout ─────────────────────────────────────────────────────────
  // Metadata band       : 56..90
  // Plate (frame)       : 130..841 (h 711, w 960)
  // Caption strip       : 861..
  // Type lockup         : 905..
  // Footer              : 1290
  const FRAME = { x: 60, y: 130, w: 960, h: 711 };

  // Plate internal coord system (1080 × 800)
  const PLATE_W = 1080;
  const PLATE_H = 800;
  const scale = FRAME.w / PLATE_W;

  // Lattice geometry (inside plate coords)
  const LATTICE = { x: 90, y: 360, w: 900, h: 240 };
  const ROWS = 6;
  const COLS = 28;
  // Column x positions — spacing widens dramatically from left (tight)
  // to right (loose): a visible "stretched lattice."
  const STRETCH_MIN = 0.55; // narrow spacing on the left
  const STRETCH_MAX = 1.55; // wide spacing on the right
  const colXPositions: number[] = (() => {
    const widths: number[] = [];
    for (let k = 0; k < COLS; k++) {
      const n = k / (COLS - 1);
      widths.push(STRETCH_MIN + (STRETCH_MAX - STRETCH_MIN) * n);
    }
    const totalW = widths.reduce((a, b) => a + b, 0);
    const positions: number[] = [];
    let acc = 0;
    for (let k = 0; k < COLS; k++) {
      const centered = acc + widths[k] / 2;
      positions.push(LATTICE.x + (centered / totalW) * LATTICE.w);
      acc += widths[k];
    }
    return positions;
  })();
  const colX = (i: number): number => colXPositions[i];
  const rowY = (r: number): number =>
    LATTICE.y + (LATTICE.h * r) / (ROWS - 1);

  // Wavelength labels along top of lattice (each = a column subset)
  const WAVELENGTH_TICKS: Array<{ i: number; label: string }> = [
    { i: 0, label: "λ 470" },
    { i: Math.floor(COLS * 0.28), label: "λ 510" },
    { i: Math.floor(COLS * 0.5), label: "λ 555" },
    { i: Math.floor(COLS * 0.72), label: "λ 590" },
    { i: COLS - 1, label: "λ 630 nm" },
  ];

  // Spacing labels along bottom of lattice
  const SPACING_TICKS: Array<{ i: number; label: string }> = [
    { i: 0, label: "d 128" },
    { i: Math.floor(COLS * 0.5), label: "d 150" },
    { i: COLS - 1, label: "d 172 nm" },
  ];

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
          color: DUST,
          fontFamily: inter,
          fontSize: 13,
          letterSpacing: 4.5,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Everyday Motivation · No. 003</span>
        <span style={{ color: CYAN }}>2026 · 09 · 26</span>
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

          <linearGradient id="board-bg" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={BOARD} />
            <stop offset="100%" stopColor={BOARD_2} />
          </linearGradient>

          {/* Spectrum gradient used for the reflected-light band + labels */}
          <linearGradient id="spectrum" x1="0" x2="1" y1="0" y2="0">
            {SPECTRUM.map((s, i) => (
              <stop key={i} offset={`${s.pos * 100}%`} stopColor={s.color} />
            ))}
          </linearGradient>

          {/* Soft glow for lattice dots */}
          <radialGradient id="dot-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={BONE} stopOpacity={0.35} />
            <stop offset="100%" stopColor={BONE} stopOpacity={0} />
          </radialGradient>

          <filter id="beam-blur" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>

        {/* Drafting board */}
        <rect
          x={FRAME.x}
          y={FRAME.y}
          width={FRAME.w}
          height={FRAME.h}
          fill="url(#board-bg)"
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

        {/* Inner thin border */}
        <rect
          x={FRAME.x + 0.5}
          y={FRAME.y + 0.5}
          width={FRAME.w - 1}
          height={FRAME.h - 1}
          fill="none"
          stroke="#2B325E"
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
          <g key={i} stroke={CYAN} strokeWidth={1.5} fill="none">
            <line x1={cx} y1={cy} x2={cx + sx * 26} y2={cy} />
            <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 26} />
          </g>
        ))}

        {/* Chameleon signature glyph (upper-right of frame) */}
        <g
          transform={`translate(${FRAME.x + FRAME.w - 88}, ${
            FRAME.y + 22
          }) scale(0.44)`}
          opacity={silhouetteOpacity}
        >
          <path
            d={TAIL_GLYPH}
            fill="none"
            stroke={CYAN}
            strokeOpacity={0.7}
            strokeWidth={2.4}
            strokeLinecap="round"
          />
        </g>

        {/* ── Plate content ─────────────────────────────────────────── */}
        <g transform={`translate(${FRAME.x}, ${FRAME.y}) scale(${scale})`}>
          {/* Reflected-light beams — vertical columns emerging up from the lattice */}
          <g opacity={beamOpen}>
            {Array.from({ length: COLS }).map((_, i) => {
              const x = colX(i);
              const c = sampleSpectrum(i / (COLS - 1));
              const yTop = 90; // beams start below the wavelength axis labels
              const yBottom = LATTICE.y - 16;
              // Beam width scales with local column spacing so tight-lattice
              // beams read as narrow, loose-lattice beams as broad.
              const prev = i > 0 ? colX(i - 1) : colX(i);
              const next = i < COLS - 1 ? colX(i + 1) : colX(i);
              const localSpacing = Math.max(
                Math.abs(x - prev),
                Math.abs(next - x),
              );
              const halfW = Math.min(18, Math.max(6, localSpacing * 0.42));
              const coreW = Math.max(2, halfW * 0.32);
              return (
                <g key={`beam-${i}`}>
                  {/* Soft blurred backing */}
                  <rect
                    x={x - halfW}
                    y={yTop}
                    width={halfW * 2}
                    height={yBottom - yTop}
                    fill={c}
                    opacity={0.14}
                    filter="url(#beam-blur)"
                  />
                  {/* Core beam */}
                  <rect
                    x={x - coreW / 2}
                    y={yTop}
                    width={coreW}
                    height={yBottom - yTop}
                    fill={c}
                    opacity={0.72}
                  />
                  {/* Emerging tip glow (where it leaves the lattice) */}
                  <circle
                    cx={x}
                    cy={yBottom - 6}
                    r={halfW * 0.9}
                    fill={c}
                    opacity={0.35}
                  />
                </g>
              );
            })}

            {/* Top wavelength axis line */}
            <line
              x1={LATTICE.x}
              y1={72}
              x2={LATTICE.x + LATTICE.w}
              y2={72}
              stroke={DUST}
              strokeOpacity={0.45}
              strokeWidth={1}
            />
            {WAVELENGTH_TICKS.map((tk, i) => {
              const x = colX(tk.i);
              return (
                <g key={`wl-${i}`}>
                  <line
                    x1={x}
                    y1={70}
                    x2={x}
                    y2={80}
                    stroke={DUST}
                    strokeOpacity={0.7}
                    strokeWidth={1}
                  />
                  <text
                    x={x}
                    y={60}
                    fill={DUST}
                    fontFamily={inter}
                    fontSize={13}
                    fontWeight={500}
                    letterSpacing={2}
                    textAnchor="middle"
                  >
                    {tk.label}
                  </text>
                </g>
              );
            })}
            {/* Axis role label */}
            <text
              x={LATTICE.x}
              y={32}
              fill={BONE}
              fontFamily={inter}
              fontSize={12}
              fontWeight={600}
              letterSpacing={4}
              opacity={0.75}
            >
              REFLECTED WAVELENGTH
            </text>
          </g>

          {/* Lattice — the guanine nanocrystal grid */}
          <g>
            {Array.from({ length: ROWS }).map((_, r) => (
              <g key={`row-${r}`}>
                {Array.from({ length: COLS }).map((_, c) => {
                  const x = colX(c);
                  const y = rowY(r);
                  const col = sampleSpectrum(c / (COLS - 1));
                  // Grow left → right with per-column delay
                  const delay = c / COLS;
                  const localT = (t - delay * 0.6) * 6;
                  const grow = Math.max(0, Math.min(1, localT));
                  // Focus scan — brightens whichever column is under the playhead
                  const scanX =
                    LATTICE.x + LATTICE.w * scan;
                  const focus =
                    scan > 0
                      ? Math.max(0, 1 - Math.abs(x - scanX) / 60)
                      : 0;
                  const dotR = 4.2 + focus * 2.5;
                  return (
                    <g key={`dot-${r}-${c}`} opacity={grow}>
                      <circle
                        cx={x}
                        cy={y}
                        r={dotR * 2.6}
                        fill="url(#dot-glow)"
                        opacity={0.6 + focus * 0.4}
                      />
                      <circle
                        cx={x}
                        cy={y}
                        r={dotR}
                        fill={col}
                        opacity={0.85 + focus * 0.15}
                      />
                      <circle
                        cx={x - dotR * 0.35}
                        cy={y - dotR * 0.4}
                        r={Math.max(0.6, dotR * 0.35)}
                        fill={BONE}
                        opacity={0.55}
                      />
                    </g>
                  );
                })}
              </g>
            ))}
          </g>

          {/* Enclosing lattice bracket — a subtle dashed rectangle */}
          <g stroke={DUST} strokeOpacity={0.35} fill="none">
            <rect
              x={LATTICE.x - 22}
              y={LATTICE.y - 22}
              width={LATTICE.w + 44}
              height={LATTICE.h + 44}
              strokeWidth={1}
              strokeDasharray="3 6"
            />
          </g>


          {/* Bottom d-spacing axis line */}
          <line
            x1={LATTICE.x}
            y1={LATTICE.y + LATTICE.h + 44}
            x2={LATTICE.x + LATTICE.w}
            y2={LATTICE.y + LATTICE.h + 44}
            stroke={DUST}
            strokeOpacity={0.45}
            strokeWidth={1}
          />
          {SPACING_TICKS.map((tk, i) => {
            const x = colX(tk.i);
            const y = LATTICE.y + LATTICE.h + 44;
            return (
              <g key={`sp-${i}`} opacity={Math.min(1, t * 1.4)}>
                <line
                  x1={x}
                  y1={y - 5}
                  x2={x}
                  y2={y + 5}
                  stroke={DUST}
                  strokeOpacity={0.7}
                  strokeWidth={1}
                />
                <text
                  x={x}
                  y={y + 24}
                  fill={DUST}
                  fontFamily={inter}
                  fontSize={13}
                  fontWeight={500}
                  letterSpacing={2}
                  textAnchor="middle"
                >
                  {tk.label}
                </text>
              </g>
            );
          })}
          {/* Bottom axis role labels — RELAXED left, EXCITED right */}
          <text
            x={LATTICE.x}
            y={LATTICE.y + LATTICE.h + 84}
            fill={CYAN}
            fontFamily={inter}
            fontSize={12}
            fontWeight={600}
            letterSpacing={4}
          >
            RELAXED
          </text>
          <text
            x={LATTICE.x + LATTICE.w}
            y={LATTICE.y + LATTICE.h + 84}
            fill={ORANGE}
            fontFamily={inter}
            fontSize={12}
            fontWeight={600}
            letterSpacing={4}
            textAnchor="end"
          >
            EXCITED
          </text>
          {/* Long thin arrow between them, in-plate */}
          <line
            x1={LATTICE.x + 82}
            y1={LATTICE.y + LATTICE.h + 79}
            x2={LATTICE.x + LATTICE.w - 82}
            y2={LATTICE.y + LATTICE.h + 79}
            stroke={DUST}
            strokeOpacity={0.5}
            strokeWidth={1}
          />
          <polygon
            points={`${LATTICE.x + LATTICE.w - 82},${LATTICE.y + LATTICE.h + 79} ${LATTICE.x + LATTICE.w - 92},${LATTICE.y + LATTICE.h + 74} ${LATTICE.x + LATTICE.w - 92},${LATTICE.y + LATTICE.h + 84}`}
            fill={ORANGE}
            opacity={0.85}
          />

          {/* Scanning playhead — a thin vertical bar traversing the plate */}
          {scan > 0 && (
            <g opacity={0.75}>
              <line
                x1={LATTICE.x + LATTICE.w * scan}
                y1={82}
                x2={LATTICE.x + LATTICE.w * scan}
                y2={LATTICE.y + LATTICE.h + 12}
                stroke={BONE}
                strokeOpacity={0.28}
                strokeWidth={1.2}
                strokeDasharray="3 5"
              />
              <circle
                cx={LATTICE.x + LATTICE.w * scan}
                cy={72}
                r={4}
                fill={BONE}
              />
            </g>
          )}
        </g>

        {/* Caption strip just below the drafting frame */}
        <g
          transform={`translate(${FRAME.x}, ${FRAME.y + FRAME.h + 22})`}
          fill={DUST}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
        >
          <text>FIG. 1 · GUANINE NANOCRYSTAL LATTICE, DORSAL IRIDOPHORE</text>
          <text
            x={FRAME.w}
            textAnchor="end"
            fill={CYAN}
            opacity={0.9}
          >
            FURCIFER PARDALIS · STRUCTURAL COLOR
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
          Role <span style={{ color: DUST, margin: "0 4px" }}>/</span>
          <span style={{ color: "#EDEDEF", letterSpacing: 5 }}>
            Nanotechnologist
          </span>
        </div>

        <div
          style={{
            color: BONE,
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 84,
            lineHeight: 0.96,
            letterSpacing: -1.4,
            fontStyle: "italic",
          }}
        >
          The lizard who
          <br />
          tunes a crystal.
        </div>

        <div
          style={{
            marginTop: 30,
            color: "#C8CAD0",
            fontFamily: inter,
            fontSize: 19,
            lineHeight: 1.4,
            fontWeight: 400,
            maxWidth: 900,
            opacity: hookOpacity,
          }}
        >
          The panther chameleon does not shift color by moving pigment. It
          actively stretches a two-layer lattice of{" "}
          <span style={{ color: CYAN, fontWeight: 600 }}>
            ~130 nm guanine nanocrystals
          </span>{" "}
          inside its skin, tuning which wavelength of light is reflected —
          from{" "}
          <span style={{ color: CYAN, fontWeight: 600 }}>470 nm blue</span>{" "}
          to{" "}
          <span style={{ color: ORANGE, fontWeight: 600 }}>
            630 nm orange
          </span>{" "}
          — a photonic crystal it can retune at will.
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
          color: DUST,
          fontFamily: inter,
          fontSize: 11,
          letterSpacing: 3,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Teyssier et al. · Nature Communications 6 (2015) 6368</span>
        <span>
          <span style={{ color: CYAN }}>●</span> tight lattice ·{" "}
          <span style={{ color: ORANGE }}>●</span> loose lattice
        </span>
      </div>
    </AbsoluteFill>
  );
};
