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

// Palette — from concept visual brief
const INK = "#0C0A08";
const PANEL_HI = "#1B140C";
const PANEL_LO = "#120D08";
const CARAPACE = "#6B5230";
const CARAPACE_LIGHT = "#A3824D";
const COPPER_BLUE = "#1E6FA7";
const COPPER_BLUE_GLOW = "#58B7E8";
const CREAM = "#E8DCC4";
const GRAY = "#7A6E58";
const GRID = "#1A140C";
const GRID_MAJOR = "#241B10";

// ── Specimen plate frame ───────────────────────────────────────────────────
const FRAME = { x: 60, y: 130, w: 960, h: 720 };

// Horseshoe crab silhouette, oriented head-up, drawn in path commands.
// Local coord space ~ 420 wide × 540 tall around origin at top of prosoma.
// Three parts: prosoma (semicircular dome), opisthosoma (trapezoidal mid),
// telson (tail spike).
const CRAB_PROSOMA = [
  // Semicircular hood: left foot to right foot via top arc
  "M -210 0",
  "C -210 -234, 210 -234, 210 0",
  // Underside concave curve back to left foot
  "C 184 22, 150 48, 110 52",
  "L -110 52",
  "C -150 48, -184 22, -210 0",
  "Z",
].join(" ");

// Opisthosoma — hexagonal abdominal shield, narrower than prosoma
const CRAB_OPISTHOSOMA = [
  "M -108 58",
  "L 108 58",
  "L 150 110",
  "L 132 240",
  "L 86 288",
  "L -86 288",
  "L -132 240",
  "L -150 110",
  "Z",
].join(" ");

// Telson — tail spike (long, straight)
const CRAB_TELSON = "M 0 294 L 11 294 L 5 530 L -5 530 L -11 294 Z";

// Compound eyes on the prosoma
const EYES = [
  { x: -84, y: -78, rx: 18, ry: 9 },
  { x: 84, y: -78, rx: 18, ry: 9 },
];

// Ocelli — median eyes
const OCELLI = [
  { x: -7, y: -168, r: 2.5 },
  { x: 7, y: -168, r: 2.5 },
];

// Annotations: (text, anchor point on crab in local coords, label position outside)
type Annot = {
  text: string;
  sub?: string;
  ax: number;
  ay: number;
  lx: number;
  ly: number;
  anchor: "start" | "end";
  delay: number;
  highlight?: boolean;
};

const ANNOTS: Annot[] = [
  {
    text: "COMPOUND EYE",
    sub: "lateral",
    ax: -102,
    ay: -78,
    lx: -300,
    ly: -78,
    anchor: "end",
    delay: 0.65,
  },
  {
    text: "OCELLI",
    sub: "median",
    ax: 10,
    ay: -168,
    lx: 220,
    ly: -168,
    anchor: "start",
    delay: 0.72,
  },
  {
    text: "PROSOMA",
    sub: "cephalothorax",
    ax: 210,
    ay: -8,
    lx: 300,
    ly: -8,
    anchor: "start",
    delay: 0.78,
  },
  {
    text: "OPISTHOSOMA",
    sub: "abdominal shield",
    ax: 140,
    ay: 210,
    lx: 300,
    ly: 210,
    anchor: "start",
    delay: 0.84,
  },
  {
    text: "TELSON",
    sub: "tail spine",
    ax: 11,
    ay: 420,
    lx: 220,
    ly: 420,
    anchor: "start",
    delay: 0.9,
  },
  {
    text: "HEART",
    sub: "amebocyte source",
    ax: -28,
    ay: 110,
    lx: -300,
    ly: 110,
    anchor: "end",
    delay: 0.56,
    highlight: true,
  },
];

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Phase timing (in seconds):
  // 0.0 – 1.0  carapace draws in
  // 0.4 – 1.6  anatomy annotations stagger in
  // 1.6 – 2.6  blood drop forms, falls, lands in vial
  // 2.2 – 3.2  chart / scale appears
  // 2.6 – 3.6  title + role + hook lock in
  // 3.0 – ∞   pulse loop on vial
  const t = frame / fps;

  // Carapace draw-in — a 0..1 progress mapped by section
  const carapaceDraw = Math.min(1, Math.max(0, t / 1.0));
  const carapaceEased = 1 - Math.pow(1 - carapaceDraw, 3);

  // Drop progression: 0..1 for the full fall from heart to vial.
  const dropT = Math.min(
    1,
    Math.max(0, (t - 1.6) / 1.0),
  );
  const dropEased = Easing.bezier(0.3, 0.0, 0.3, 1.0)(dropT);

  // Vial glow pulse (loops every 2.5 s after landing)
  const landedT = Math.max(0, t - 2.6);
  const pulse = 0.5 + 0.5 * Math.sin((landedT / 2.5) * Math.PI * 2);
  const vialGlow = Math.min(1, Math.max(0, (t - 2.4) * 1.6)) * (0.7 + 0.3 * pulse);

  // Chart fade
  const chartOpacity = interpolate(t, [2.2, 3.2], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Titles
  const titleSpring = spring({
    frame: frame - fps * 2.8,
    fps,
    config: { damping: 180, mass: 0.9 },
  });
  const hookOpacity = interpolate(t, [3.2, 4.2], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Specimen coordinate transform ────────────────────────────────────
  // Place the crab on the LEFT half of the plate, vial on the RIGHT.
  const CRAB_CX = 420; // page x — centre of crab horizontally (slightly left)
  const CRAB_TOP_Y = 220; // page y where prosoma top sits
  const SCALE = 0.68;

  const toPage = (lx: number, ly: number): [number, number] => [
    CRAB_CX + lx * SCALE,
    CRAB_TOP_Y + (ly + 234) * SCALE,
  ];
  const [heartX, heartY] = toPage(32, 110);

  // Vial location (RIGHT side of plate)
  const vialX = 810;
  const vialY = 500;

  // The drop travels diagonally from heart (upper-left) to vial top (right).
  const dropFromX = heartX + 10;
  const dropFromY = heartY + 10;
  const dropToX = vialX;
  const dropToY = vialY + 12;
  const dropX = dropFromX + (dropToX - dropFromX) * dropEased;
  const dropY = dropFromY + (dropToY - dropFromY) * dropEased;
  const dropOpacity =
    Math.min(1, Math.max(0, (t - 1.5) * 3)) *
    (1 - Math.max(0, (dropT - 0.95) * 20));

  // Trajectory arc control point (bend upward for an elegant arc)
  const trajCX = (dropFromX + dropToX) / 2;
  const trajCY = Math.min(dropFromY, dropToY) - 70;
  const trajPath = `M ${dropFromX} ${dropFromY} Q ${trajCX} ${trajCY} ${dropToX} ${dropToY}`;
  const trajectoryOp = Math.min(1, Math.max(0, (t - 1.7) * 2));

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
          fontSize: 13,
          letterSpacing: 4.5,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Everyday Motivation · No. 003</span>
        <span style={{ color: COPPER_BLUE_GLOW }}>2026 · 10 · 16</span>
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
            width={32}
            height={32}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M 32 0 L 0 0 0 32`}
              fill="none"
              stroke={GRID}
              strokeWidth={1}
            />
          </pattern>
          <pattern
            id="grid-major"
            x={FRAME.x}
            y={FRAME.y}
            width={128}
            height={128}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M 128 0 L 0 0 0 128`}
              fill="none"
              stroke={GRID_MAJOR}
              strokeWidth={1}
            />
          </pattern>

          <radialGradient id="panel-vignette" cx="35%" cy="30%" r="90%">
            <stop offset="0%" stopColor={PANEL_HI} stopOpacity={1} />
            <stop offset="100%" stopColor={PANEL_LO} stopOpacity={1} />
          </radialGradient>

          <radialGradient id="drop-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={COPPER_BLUE_GLOW} stopOpacity={0.9} />
            <stop offset="60%" stopColor={COPPER_BLUE} stopOpacity={0.3} />
            <stop offset="100%" stopColor={COPPER_BLUE} stopOpacity={0} />
          </radialGradient>

          <radialGradient id="vial-glow" cx="50%" cy="60%" r="70%">
            <stop offset="0%" stopColor={COPPER_BLUE_GLOW} stopOpacity={0.55} />
            <stop offset="55%" stopColor={COPPER_BLUE} stopOpacity={0.12} />
            <stop offset="100%" stopColor={COPPER_BLUE} stopOpacity={0} />
          </radialGradient>

          <linearGradient id="carapace-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2A1F13" />
            <stop offset="100%" stopColor="#1A1309" />
          </linearGradient>
        </defs>

        {/* Specimen panel */}
        <rect
          x={FRAME.x}
          y={FRAME.y}
          width={FRAME.w}
          height={FRAME.h}
          fill="url(#panel-vignette)"
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
          stroke="#2A1F13"
          strokeWidth={1}
        />

        {/* Corner crop marks (parchment/olive) */}
        {(
          [
            [FRAME.x, FRAME.y, 1, 1],
            [FRAME.x + FRAME.w, FRAME.y, -1, 1],
            [FRAME.x, FRAME.y + FRAME.h, 1, -1],
            [FRAME.x + FRAME.w, FRAME.y + FRAME.h, -1, -1],
          ] as const
        ).map(([cx, cy, sx, sy], i) => (
          <g key={i} stroke={CARAPACE_LIGHT} strokeWidth={1.5} fill="none">
            <line x1={cx} y1={cy} x2={cx + sx * 26} y2={cy} />
            <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 26} />
          </g>
        ))}

        {/* Plate header */}
        <g
          transform={`translate(${FRAME.x + 26}, ${FRAME.y + 36})`}
          fill={GRAY}
          fontFamily={inter}
          fontWeight={600}
          fontSize={11}
          letterSpacing={3.5}
        >
          <text>PLATE III · LIMULUS POLYPHEMUS · DORSAL</text>
        </g>
        <g
          transform={`translate(${FRAME.x + FRAME.w - 26}, ${FRAME.y + 36})`}
          fill={GRAY}
          fontFamily={inter}
          fontWeight={500}
          fontSize={11}
          letterSpacing={3.5}
          textAnchor="end"
        >
          <text>LAL ASSAY · ENDOTOXIN</text>
        </g>

        {/* ── Half-plate labels along bottom ─────────────────────────── */}
        <g
          transform={`translate(${FRAME.x + 26}, ${FRAME.y + FRAME.h - 24})`}
          fill={GRAY}
          fontFamily={inter}
          fontWeight={500}
          fontSize={10}
          letterSpacing={3}
        >
          <text>I · SPECIMEN · 450 MA UNCHANGED</text>
        </g>
        <g
          transform={`translate(${FRAME.x + FRAME.w - 26}, ${FRAME.y + FRAME.h - 24})`}
          fill={GRAY}
          fontFamily={inter}
          fontWeight={500}
          fontSize={10}
          letterSpacing={3}
          textAnchor="end"
        >
          <text>II · ASSAY · APPROVED 1977</text>
        </g>

        {/* ── Specimen: horseshoe crab ─────────────────────────────── */}
        <g transform={`translate(${CRAB_CX}, ${CRAB_TOP_Y + 234 * SCALE}) scale(${SCALE})`}>
          {/* Shadow halo */}
          <ellipse
            cx={0}
            cy={300}
            rx={240}
            ry={28}
            fill={CARAPACE}
            opacity={0.1}
          />

          {/* Prosoma fill */}
          <path
            d={CRAB_PROSOMA}
            fill="url(#carapace-fill)"
            opacity={carapaceEased}
          />
          {/* Opisthosoma fill */}
          <path
            d={CRAB_OPISTHOSOMA}
            fill="url(#carapace-fill)"
            opacity={Math.max(0, Math.min(1, (carapaceDraw - 0.3) * 2))}
          />
          {/* Telson fill */}
          <path
            d={CRAB_TELSON}
            fill="url(#carapace-fill)"
            opacity={Math.max(0, Math.min(1, (carapaceDraw - 0.6) * 2.5))}
          />

          {/* Prosoma stroke */}
          <path
            d={CRAB_PROSOMA}
            fill="none"
            stroke={CARAPACE_LIGHT}
            strokeWidth={2.6}
            strokeLinejoin="round"
            strokeDasharray={1700}
            strokeDashoffset={1700 * (1 - carapaceEased)}
          />
          {/* Opisthosoma stroke */}
          <path
            d={CRAB_OPISTHOSOMA}
            fill="none"
            stroke={CARAPACE_LIGHT}
            strokeWidth={2.3}
            strokeLinejoin="round"
            strokeDasharray={1100}
            strokeDashoffset={
              1100 * (1 - Math.max(0, Math.min(1, (carapaceDraw - 0.3) * 2)))
            }
          />
          {/* Telson stroke */}
          <path
            d={CRAB_TELSON}
            fill="none"
            stroke={CARAPACE_LIGHT}
            strokeWidth={2.0}
            strokeLinejoin="round"
            strokeDasharray={1100}
            strokeDashoffset={
              1100 *
              (1 - Math.max(0, Math.min(1, (carapaceDraw - 0.6) * 2.5)))
            }
          />

          {/* Carapace ridge contours */}
          <g
            fill="none"
            stroke={CARAPACE}
            strokeWidth={1.3}
            opacity={0.95 * Math.max(0, Math.min(1, (carapaceDraw - 0.45) * 3))}
          >
            {/* Prosoma center ridge */}
            <path d="M 0 -224 Q 0 -140 0 48" />
            {/* Prosoma lateral ridges */}
            <path d="M -140 -174 Q -140 -80 -140 20" />
            <path d="M 140 -174 Q 140 -80 140 20" />
            {/* Opisthosoma centre ridge */}
            <line x1={0} y1={60} x2={0} y2={286} />
            {/* Opisthosoma lateral ridges (follow narrowing shape) */}
            <path d="M -108 60 L -126 240" />
            <path d="M 108 60 L 126 240" />
            {/* Transverse segmentation lines — follow the inner edge of
                the opisthosoma. The shield narrows from x=±108 at y=60
                to x=±132 at y=240, so we trim the lines to sit inside. */}
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
              const yPos = 86 + i * 24;
              // Interpolate the opisthosoma half-width at this y
              const edgeAtY =
                yPos < 110
                  ? 108 + ((yPos - 58) / (110 - 58)) * (150 - 108)
                  : 150 + ((yPos - 110) / (240 - 110)) * (132 - 150);
              const halfW = Math.max(50, edgeAtY - 14);
              return (
                <line
                  key={i}
                  x1={-halfW}
                  y1={yPos}
                  x2={halfW}
                  y2={yPos}
                  strokeOpacity={0.55}
                />
              );
            })}
          </g>

          {/* Lateral spines along the opisthosoma edge — placed on the
              actual edge of the shield at each y. The shield widens from
              x=±108 at y=58 to x=±150 at y=110, then narrows to x=±132 at
              y=240. */}
          <g
            fill={CARAPACE_LIGHT}
            opacity={Math.max(0, Math.min(1, (carapaceDraw - 0.55) * 2.5))}
          >
            {[0, 1, 2, 3, 4, 5].map((i) => {
              const y = 100 + i * 26;
              const edgeAtY =
                y < 110
                  ? 108 + ((y - 58) / (110 - 58)) * (150 - 108)
                  : 150 + ((y - 110) / (240 - 110)) * (132 - 150);
              return (
                <g key={i}>
                  <polygon
                    points={`${-edgeAtY},${y} ${-edgeAtY - 14},${y + 3} ${-edgeAtY},${y + 7}`}
                  />
                  <polygon
                    points={`${edgeAtY},${y} ${edgeAtY + 14},${y + 3} ${edgeAtY},${y + 7}`}
                  />
                </g>
              );
            })}
          </g>

          {/* Compound eyes */}
          <g opacity={Math.max(0, Math.min(1, (carapaceDraw - 0.4) * 3))}>
            {EYES.map((e, i) => (
              <g key={i}>
                <ellipse
                  cx={e.x}
                  cy={e.y}
                  rx={e.rx}
                  ry={e.ry}
                  fill={PANEL_LO}
                  stroke={CARAPACE_LIGHT}
                  strokeWidth={1.6}
                />
                <ellipse
                  cx={e.x - 4}
                  cy={e.y - 2}
                  rx={5}
                  ry={2.2}
                  fill={CARAPACE_LIGHT}
                  opacity={0.65}
                />
              </g>
            ))}
            {/* Ocelli */}
            {OCELLI.map((o, i) => (
              <circle key={i} cx={o.x} cy={o.y} r={o.r} fill={CARAPACE_LIGHT} />
            ))}
          </g>

          {/* Heart marker — the key annotation point */}
          <g opacity={Math.max(0, Math.min(1, (t - 0.45) * 2.5))}>
            {/* Heart shape outline (anatomical dorsal heart tube) */}
            <path
              d="M -28 68 Q -28 56 -18 56 L 18 56 Q 28 56 28 68 L 28 150 Q 28 162 18 162 L -18 162 Q -28 162 -28 150 Z"
              fill="none"
              stroke={COPPER_BLUE}
              strokeWidth={1.6}
            />
            {/* Heart glow */}
            <circle
              cx={0}
              cy={110}
              r={26 + 4 * Math.sin(t * 2.5)}
              fill="url(#drop-glow)"
              opacity={0.65}
            />
            <circle cx={0} cy={110} r={5} fill={COPPER_BLUE_GLOW} />
          </g>
        </g>

        {/* ── Blood-drop trajectory (arc from heart → vial) ──────────── */}
        <path
          d={trajPath}
          stroke={COPPER_BLUE}
          strokeWidth={1}
          strokeDasharray="2 6"
          fill="none"
          opacity={0.4 * trajectoryOp}
        />

        {/* ── Falling blood drop (travels along trajectory) ──────────── */}
        <g opacity={dropOpacity}>
          <circle
            cx={dropX}
            cy={dropY}
            r={18}
            fill="url(#drop-glow)"
            opacity={0.7}
          />
          {/* Tear-drop shape */}
          <path
            d={`M ${dropX} ${dropY - 11} Q ${dropX + 7} ${dropY - 7} ${dropX + 7} ${dropY + 2} Q ${dropX + 7} ${dropY + 10} ${dropX} ${dropY + 10} Q ${dropX - 7} ${dropY + 10} ${dropX - 7} ${dropY + 2} Q ${dropX - 7} ${dropY - 7} ${dropX} ${dropY - 11} Z`}
            fill={COPPER_BLUE}
          />
          <ellipse
            cx={dropX - 2}
            cy={dropY - 3}
            rx={2}
            ry={3.5}
            fill={COPPER_BLUE_GLOW}
            opacity={0.9}
          />
        </g>

        {/* Impact ripple */}
        {dropT >= 0.95 && (
          <g
            opacity={
              Math.min(1, (dropT - 0.95) * 20) *
              (1 - Math.min(1, (t - 2.65) * 2))
            }
          >
            <circle
              cx={vialX}
              cy={vialY + 24}
              r={14 + 14 * Math.min(1, (t - 2.6) * 3)}
              fill="none"
              stroke={COPPER_BLUE_GLOW}
              strokeWidth={1.3}
            />
          </g>
        )}

        {/* ── Sampling vial ──────────────────────────────────────────── */}
        <g transform={`translate(${vialX}, ${vialY})`}>
          {/* Vial halo */}
          <circle cx={0} cy={70} r={92} fill="url(#vial-glow)" opacity={vialGlow} />

          {/* Vial body (test tube) */}
          <path
            d="M -32 0 L -32 110 Q -32 150 0 150 Q 32 150 32 110 L 32 0 Z"
            fill={PANEL_LO}
            stroke={CARAPACE_LIGHT}
            strokeWidth={1.8}
          />
          {/* Cap */}
          <rect x={-36} y={-14} width={72} height={14} fill={CARAPACE_LIGHT} />
          <rect x={-40} y={-20} width={80} height={8} fill={CARAPACE} />

          {/* Blood fill (rises after impact) */}
          {(() => {
            const fillLevel = Math.max(0, Math.min(1, (t - 2.6) / 0.9));
            const bloodTop = 110 - 90 * fillLevel;
            if (fillLevel <= 0) return null;
            return (
              <g>
                <clipPath id="vial-clip">
                  <path d="M -30 2 L -30 110 Q -30 148 0 148 Q 30 148 30 110 L 30 2 Z" />
                </clipPath>
                <g clipPath="url(#vial-clip)">
                  <rect
                    x={-30}
                    y={bloodTop}
                    width={60}
                    height={200}
                    fill={COPPER_BLUE}
                  />
                  {/* Meniscus highlight */}
                  <ellipse
                    cx={0}
                    cy={bloodTop}
                    rx={30}
                    ry={3}
                    fill={COPPER_BLUE_GLOW}
                    opacity={0.8}
                  />
                  {/* Rising bubbles / amebocyte dots */}
                  {[0, 1, 2, 3].map((i) => {
                    const by = bloodTop + 20 + i * 20;
                    const bx = -14 + ((i * 11) % 28);
                    return (
                      <circle
                        key={i}
                        cx={bx}
                        cy={by}
                        r={1.5}
                        fill={COPPER_BLUE_GLOW}
                        opacity={0.7}
                      />
                    );
                  })}
                </g>
              </g>
            );
          })()}

          {/* Measurement ticks */}
          <g stroke={GRAY} strokeWidth={1}>
            {[0, 1, 2, 3, 4].map((i) => (
              <line
                key={i}
                x1={32}
                y1={14 + i * 22}
                x2={40}
                y2={14 + i * 22}
              />
            ))}
          </g>

          {/* LAL header — placed ABOVE the vial, left-aligned */}
          <g transform="translate(-56, -56)" opacity={chartOpacity}>
            <text
              fontFamily={inter}
              fontSize={10}
              letterSpacing={4}
              fontWeight={600}
              fill={COPPER_BLUE_GLOW}
            >
              LAL · AMEBOCYTE LYSATE
            </text>
            <text
              y={14}
              fontFamily={inter}
              fontSize={9}
              letterSpacing={2.5}
              fontWeight={500}
              fontStyle="italic"
              fill={GRAY}
            >
              sterility assay · FDA 1977
            </text>
          </g>

          {/* Threshold readout — placed BELOW the vial, centered */}
          <g
            transform="translate(0, 180)"
            fill={CREAM}
            fontFamily={inter}
            opacity={chartOpacity}
            textAnchor="middle"
          >
            <text
              fontSize={10}
              letterSpacing={3.5}
              fontWeight={600}
              fill={COPPER_BLUE_GLOW}
            >
              DETECTION THRESHOLD
            </text>
            <text
              y={34}
              fontSize={30}
              letterSpacing={0}
              fontWeight={500}
              fontFamily={playfair}
              fill={CREAM}
              fontStyle="italic"
            >
              0.001 EU/mL
            </text>
            <text
              y={56}
              fontSize={10}
              letterSpacing={2.8}
              fontWeight={500}
              fill={GRAY}
            >
              {"<"} 1 PART PER TRILLION
            </text>
          </g>
        </g>

        {/* ── Annotation leader lines + labels ──────────────────────── */}
        {ANNOTS.map((a, i) => {
          const [ax, ay] = toPage(a.ax, a.ay);
          const [lx, ly] = toPage(a.lx, a.ly);
          const op = Math.max(0, Math.min(1, (t - a.delay) * 3));
          const colour = a.highlight ? COPPER_BLUE_GLOW : CARAPACE_LIGHT;
          const labelColour = a.highlight ? COPPER_BLUE_GLOW : CREAM;
          return (
            <g key={i} opacity={op}>
              <circle cx={ax} cy={ay} r={2.4} fill={colour} />
              <line
                x1={ax}
                y1={ay}
                x2={lx}
                y2={ly}
                stroke={colour}
                strokeWidth={1}
                strokeOpacity={0.7}
              />
              <text
                x={lx + (a.anchor === "start" ? 10 : -10)}
                y={ly - 4}
                textAnchor={a.anchor}
                fill={labelColour}
                fontFamily={inter}
                fontSize={11}
                fontWeight={600}
                letterSpacing={3}
              >
                {a.text}
              </text>
              {a.sub ? (
                <text
                  x={lx + (a.anchor === "start" ? 10 : -10)}
                  y={ly + 12}
                  textAnchor={a.anchor}
                  fill={GRAY}
                  fontFamily={inter}
                  fontSize={10}
                  letterSpacing={2.4}
                  fontStyle="italic"
                >
                  {a.sub}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>

      {/* ── Type lockup ────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 900,
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
            color: COPPER_BLUE_GLOW,
            fontSize: 13,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 18,
            fontWeight: 600,
          }}
        >
          Role <span style={{ color: GRAY, margin: "0 4px" }}>/</span>
          <span style={{ color: CREAM, letterSpacing: 5 }}>
            Vaccine Quality Inspector
          </span>
        </div>

        <div
          style={{
            color: "#F4F0E4",
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 76,
            lineHeight: 0.98,
            letterSpacing: -1.2,
            fontStyle: "italic",
          }}
        >
          The 450-million-year-old
          <br />
          sterility officer.
        </div>

        <div
          style={{
            marginTop: 26,
            color: "#D4CCB4",
            fontSize: 18,
            lineHeight: 1.45,
            fontWeight: 400,
            maxWidth: 920,
            opacity: hookOpacity,
          }}
        >
          Horseshoe crab blood is copper-blue because its respiratory pigment is{" "}
          <span style={{ color: COPPER_BLUE_GLOW, fontWeight: 600 }}>
            hemocyanin
          </span>
          , and its amebocytes clot in the presence of bacterial endotoxin
          below one part per trillion — the LAL assay derived from it has
          certified the sterility of nearly every injectable vaccine, drug,
          and medical implant since the 1970s.
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
          fontSize: 11,
          letterSpacing: 3,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Levin & Bang · J. Hopkins Bull. 115 (1964) 265–274</span>
        <span>
          <span style={{ color: COPPER_BLUE_GLOW }}>●</span> Hemocyanin · Cu-based blood
        </span>
      </div>
    </AbsoluteFill>
  );
};
