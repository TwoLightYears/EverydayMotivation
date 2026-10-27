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

// ─── Palette — honey + archive ───────────────────────────────────────
const INK = "#1F120C";
const BOARD = "#2C1C13";
const BOARD_DEEP = "#160B07";
const HONEY = "#E8A531";
const HONEY_GLOW = "#FFD37A";
const AMBER = "#B06B16";
const WAX = "#7A4A1E";
const PARCHMENT = "#F3E5CA";
const PARCHMENT_DIM = "#C9B48A";
const THREAD = "#B33B2F";
const GRAY = "#8A7A66";
const RULE = "#3B2A1E";

// ─── Hex geometry (pointy-top) ───────────────────────────────────────
const R = 60;
const H = Math.sqrt(3) * R; // ~103.92 — hex width
const V = 1.5 * R; // 90 — row spacing
const COLS = 7;
const ROWS = 8;

// First row's y position inside the drafting frame (which lives at y=130, h=750).
const FRAME = { x: 60, y: 130, w: 960, h: 750 };
// Grid total extent: rows 0..ROWS-1 vertically span (ROWS-1)*V + 2*R.
// = 7*90 + 120 = 750 → fills the frame.
const GRID_X0 = FRAME.x + (FRAME.w - ((COLS - 1) * H + H / 2 + H)) / 2 + H / 2;
const GRID_Y0 = FRAME.y + R;

const hexCenter = (col: number, row: number) => {
  const xOffset = row % 2 === 1 ? H / 2 : 0;
  return {
    x: GRID_X0 + col * H + xOffset,
    y: GRID_Y0 + row * V,
  };
};

const hexPoints = (cx: number, cy: number, r = R): string => {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = ((i * 60 - 90) * Math.PI) / 180; // pointy-top: start at -90°
    pts.push(`${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`);
  }
  return pts.join(" ");
};

// ─── Cell catalogue ──────────────────────────────────────────────────
type Cell = {
  col: number;
  row: number;
  state: "empty" | "filled" | "hero";
  label?: string;
  igniteDelay: number; // frames
};

const HERO = { col: 2, row: 3 };

const TAGGED: Array<{ col: number; row: number; label: string }> = [
  { col: 4, row: 1, label: "4 700 YA" },
  { col: 0, row: 2, label: "900 YA" },
  { col: 3, row: 5, label: "150 YA" },
  { col: 1, row: 6, label: "2 800 YA" },
  { col: 5, row: 4, label: "40 YA" },
  { col: 2, row: 7, label: "1 200 YA" },
];

const FILLED: Array<[number, number]> = [
  [1, 1],
  [3, 2],
  [0, 4],
  [2, 5],
  [4, 3],
  [5, 2],
  [1, 3],
  [3, 7],
  [1, 5],
  [4, 6],
  [5, 6],
  [0, 7],
];

const CELLS: Cell[] = [];
for (let col = 0; col < COLS; col++) {
  for (let row = 0; row < ROWS; row++) {
    const isHero = col === HERO.col && row === HERO.row;
    const tagged = TAGGED.find((t) => t.col === col && t.row === row);
    const filled = FILLED.find(([c, r]) => c === col && r === row);
    // Soft diagonal reveal: top-left → bottom-right
    const igniteDelay = (col + row) * 2.5;
    CELLS.push({
      col,
      row,
      state: isHero ? "hero" : tagged || filled ? "filled" : "empty",
      label: tagged?.label,
      igniteDelay,
    });
  }
}

// ─── Component ───────────────────────────────────────────────────────
export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Hero bloom spring — starts after lattice ignites
  const heroSpring = spring({
    frame: frame - fps * 1.6,
    fps,
    config: { damping: 180, mass: 1.1, stiffness: 90 },
  });

  // Specimen tag slide
  const tagProgress = spring({
    frame: frame - fps * 2.1,
    fps,
    config: { damping: 200, mass: 0.9 },
  });

  // Title spring + hook fade-in
  const titleSpring = spring({
    frame: frame - fps * 1.9,
    fps,
    config: { damping: 220, mass: 0.9 },
  });
  const hookOpacity = interpolate(frame, [fps * 2.4, fps * 3.3], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Slow honey drop pulse at hero
  const pulsePhase = (frame % (fps * 3)) / (fps * 3);
  const dropPulse = 0.85 + 0.15 * Math.sin(pulsePhase * Math.PI * 2);

  const hero = hexCenter(HERO.col, HERO.row);

  return (
    <AbsoluteFill style={{ backgroundColor: INK, fontFamily: inter }}>
      <style>{fontCss}</style>

      {/* Paper-grain overlay via radial vignette */}
      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          {/* Board vignette */}
          <radialGradient id="board" cx="48%" cy="38%" r="72%">
            <stop offset="0%" stopColor={BOARD} />
            <stop offset="100%" stopColor={BOARD_DEEP} />
          </radialGradient>

          {/* Hex fill — amber */}
          <radialGradient id="amber-fill" cx="50%" cy="38%" r="70%">
            <stop offset="0%" stopColor="#D28320" />
            <stop offset="100%" stopColor={AMBER} />
          </radialGradient>

          {/* Hero cell honey glow */}
          <radialGradient id="honey-fill" cx="50%" cy="42%" r="65%">
            <stop offset="0%" stopColor={HONEY_GLOW} />
            <stop offset="55%" stopColor={HONEY} />
            <stop offset="100%" stopColor={AMBER} />
          </radialGradient>

          {/* Hero outer bloom */}
          <radialGradient id="hero-bloom" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={HONEY_GLOW} stopOpacity={0.55} />
            <stop offset="60%" stopColor={HONEY} stopOpacity={0.15} />
            <stop offset="100%" stopColor={HONEY} stopOpacity={0} />
          </radialGradient>

          {/* Soft hex drop-shadow for depth */}
          <filter id="cell-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feOffset in="blur" dx="0" dy="2" result="offset" />
            <feComponentTransfer in="offset" result="shadow">
              <feFuncA type="linear" slope="0.5" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode in="shadow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="hero-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="12" />
          </filter>

          {/* Paper noise — subtle dot pattern */}
          <pattern
            id="paper-noise"
            x="0"
            y="0"
            width="4"
            height="4"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="1" cy="1" r="0.5" fill="#000" opacity="0.08" />
          </pattern>
        </defs>

        {/* Backdrop */}
        <rect width={1080} height={1350} fill={INK} />

        {/* Drafting board */}
        <rect
          x={FRAME.x}
          y={FRAME.y}
          width={FRAME.w}
          height={FRAME.h}
          fill="url(#board)"
        />
        <rect
          x={FRAME.x}
          y={FRAME.y}
          width={FRAME.w}
          height={FRAME.h}
          fill="url(#paper-noise)"
        />

        {/* Thin frame & corner marks */}
        <rect
          x={FRAME.x + 0.5}
          y={FRAME.y + 0.5}
          width={FRAME.w - 1}
          height={FRAME.h - 1}
          fill="none"
          stroke={RULE}
          strokeWidth={1}
        />
        {(
          [
            [FRAME.x, FRAME.y, 1, 1],
            [FRAME.x + FRAME.w, FRAME.y, -1, 1],
            [FRAME.x, FRAME.y + FRAME.h, 1, -1],
            [FRAME.x + FRAME.w, FRAME.y + FRAME.h, -1, -1],
          ] as const
        ).map(([cx, cy, sx, sy], i) => (
          <g key={i} stroke={WAX} strokeWidth={1.5} fill="none">
            <line x1={cx} y1={cy} x2={cx + sx * 24} y2={cy} />
            <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 24} />
          </g>
        ))}

        {/* Catalogue header strip inside frame */}
        <g
          transform={`translate(${FRAME.x + 24}, ${FRAME.y + 36})`}
          fill={PARCHMENT_DIM}
          fontFamily={inter}
          fontSize={10}
          letterSpacing={3}
          fontWeight={500}
        >
          <text>CATALOGUE · HIVE DRAWER</text>
        </g>
        <g
          transform={`translate(${FRAME.x + FRAME.w - 24}, ${FRAME.y + 36})`}
          fill={PARCHMENT_DIM}
          fontFamily={inter}
          fontSize={10}
          letterSpacing={3}
          fontWeight={500}
        >
          <text textAnchor="end">a_w ≈ 0.6 · pH ≈ 3.9</text>
        </g>

        {/* ─── Hex lattice ────────────────────────────────────────── */}
        <g>
          {CELLS.map((cell) => {
            const { x, y } = hexCenter(cell.col, cell.row);
            const ignition = Math.max(
              0,
              Math.min(1, (frame - cell.igniteDelay) / 18),
            );
            const strokeOp = 0.1 + 0.5 * ignition;
            const fillReveal = Math.max(
              0,
              Math.min(1, (frame - cell.igniteDelay - 10) / 24),
            );

            if (cell.state === "hero") {
              const bloom = heroSpring; // 0..1
              const outlineOp = 0.3 + 0.7 * ignition;
              return (
                <g key={`${cell.col}-${cell.row}`}>
                  {/* Outline (base) */}
                  <polygon
                    points={hexPoints(x, y)}
                    fill="none"
                    stroke={HONEY}
                    strokeWidth={1.5}
                    strokeOpacity={outlineOp}
                  />
                </g>
              );
            }

            if (cell.state === "filled") {
              return (
                <g key={`${cell.col}-${cell.row}`}>
                  <polygon
                    points={hexPoints(x, y)}
                    fill="none"
                    stroke={WAX}
                    strokeWidth={1.5}
                    strokeOpacity={strokeOp}
                  />
                  <polygon
                    points={hexPoints(x, y, R - 4)}
                    fill="url(#amber-fill)"
                    opacity={fillReveal * 0.95}
                  />
                  {cell.label && (
                    <text
                      x={x}
                      y={y + 4}
                      textAnchor="middle"
                      fill={INK}
                      fontFamily={inter}
                      fontSize={13}
                      fontWeight={600}
                      letterSpacing={1.5}
                      opacity={fillReveal}
                    >
                      {cell.label}
                    </text>
                  )}
                </g>
              );
            }

            // empty
            // Soft radial attenuation from the hero so the lattice feels
            // like it radiates out from the specimen cell.
            const dxh = x - hero.x;
            const dyh = y - hero.y;
            const dist = Math.sqrt(dxh * dxh + dyh * dyh);
            const attenuation = Math.max(0.35, 1 - dist / 540);
            return (
              <polygon
                key={`${cell.col}-${cell.row}`}
                points={hexPoints(x, y)}
                fill="none"
                stroke={WAX}
                strokeWidth={1.1}
                strokeOpacity={strokeOp * 0.9 * attenuation}
              />
            );
          })}

          {/* ─── Hero cell (drawn last for stacking) ─────────────── */}
          {(() => {
            const bloom = heroSpring;
            const dropR = 12 * dropPulse * bloom;
            return (
              <g>
                {/* Wide ambient bloom */}
                <circle
                  cx={hero.x}
                  cy={hero.y}
                  r={240 * bloom}
                  fill="url(#hero-bloom)"
                  opacity={0.9 * bloom}
                />
                {/* Hex fill */}
                <polygon
                  points={hexPoints(hero.x, hero.y, R - 2)}
                  fill="url(#honey-fill)"
                  opacity={bloom}
                />
                {/* Inner highlight ring on top-left */}
                <polygon
                  points={hexPoints(hero.x, hero.y, R - 10)}
                  fill="none"
                  stroke={HONEY_GLOW}
                  strokeWidth={1.4}
                  strokeOpacity={0.45 * bloom}
                />
                {/* Hex outer rim */}
                <polygon
                  points={hexPoints(hero.x, hero.y)}
                  fill="none"
                  stroke={HONEY_GLOW}
                  strokeWidth={2.4}
                  strokeOpacity={0.45 + 0.55 * bloom}
                />
                {/* Honey drop at center */}
                <circle
                  cx={hero.x}
                  cy={hero.y - 2}
                  r={dropR * 1.8}
                  fill={HONEY_GLOW}
                  opacity={0.45 * bloom}
                  filter="url(#hero-glow)"
                />
                <circle
                  cx={hero.x}
                  cy={hero.y - 2}
                  r={dropR}
                  fill="#FFF4CC"
                  opacity={bloom}
                />
                {/* Specular highlight on droplet */}
                <ellipse
                  cx={hero.x - dropR * 0.3}
                  cy={hero.y - dropR * 0.55}
                  rx={dropR * 0.42}
                  ry={dropR * 0.3}
                  fill="#FFFFFF"
                  opacity={0.95 * bloom}
                />
                {/* No. 001 label */}
                <text
                  x={hero.x}
                  y={hero.y + 38}
                  textAnchor="middle"
                  fill={BOARD_DEEP}
                  fontFamily={inter}
                  fontSize={11}
                  letterSpacing={2.6}
                  fontWeight={700}
                  opacity={bloom}
                >
                  № 001
                </text>
              </g>
            );
          })()}

          {/* ─── Curator's thread + specimen tag ─────────────────── */}
          {(() => {
            // Thread from hero out to tag (always kept inside drafting frame)
            const tagW = 206;
            const tagH = 76;
            // Keep right edge inside FRAME.x + FRAME.w - 24 margin.
            const tagX = FRAME.x + FRAME.w - 24 - tagW;
            const tagY = hero.y - 120;
            const start = { x: hero.x + R - 10, y: hero.y - 18 };
            const bend1 = { x: hero.x + 200, y: hero.y - 90 };
            const op = tagProgress;
            return (
              <g opacity={op}>
                <path
                  d={`M ${start.x} ${start.y} Q ${bend1.x} ${bend1.y} ${tagX} ${
                    tagY + tagH / 2
                  }`}
                  fill="none"
                  stroke={THREAD}
                  strokeWidth={1.6}
                  strokeLinecap="round"
                  strokeDasharray="300"
                  strokeDashoffset={300 * (1 - op)}
                />
                {/* Wax seal on hero end */}
                <circle
                  cx={start.x}
                  cy={start.y}
                  r={5}
                  fill={THREAD}
                  stroke={INK}
                  strokeWidth={1.2}
                />
                {/* Specimen tag (parchment card) */}
                <g
                  transform={`translate(${tagX}, ${tagY}) rotate(-3 ${
                    tagW / 2
                  } ${tagH / 2})`}
                >
                  {/* Soft shadow */}
                  <rect
                    x={0}
                    y={4}
                    width={tagW}
                    height={tagH}
                    rx={3}
                    fill="#000"
                    opacity={0.35}
                  />
                  {/* Parchment */}
                  <rect
                    width={tagW}
                    height={tagH}
                    rx={3}
                    fill={PARCHMENT}
                  />
                  {/* Punch-hole & thread anchor */}
                  <circle
                    cx={12}
                    cy={tagH / 2}
                    r={4}
                    fill={INK}
                    opacity={0.35}
                  />
                  <circle
                    cx={12}
                    cy={tagH / 2}
                    r={2.3}
                    fill={BOARD}
                  />
                  {/* Ruled line */}
                  <line
                    x1={28}
                    y1={30}
                    x2={tagW - 14}
                    y2={30}
                    stroke={WAX}
                    strokeWidth={0.8}
                    opacity={0.45}
                  />
                  <text
                    x={28}
                    y={23}
                    fill={WAX}
                    fontFamily={inter}
                    fontSize={9.5}
                    letterSpacing={2.4}
                    fontWeight={600}
                  >
                    SPECIMEN № 001
                  </text>
                  <text
                    x={28}
                    y={46}
                    fill={INK}
                    fontFamily={inter}
                    fontSize={13}
                    letterSpacing={0.4}
                    fontWeight={600}
                  >
                    HONEY · c. 1 300 BCE
                  </text>
                  <text
                    x={28}
                    y={62}
                    fill={WAX}
                    fontFamily={inter}
                    fontSize={10}
                    letterSpacing={1.6}
                    fontWeight={500}
                  >
                    EGYPTIAN TOMB · THEBES
                  </text>
                </g>
              </g>
            );
          })()}
        </g>
      </svg>

      {/* ─── Top metadata band ────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          top: 56,
          left: 80,
          right: 80,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          color: PARCHMENT_DIM,
          fontFamily: inter,
          fontSize: 13,
          letterSpacing: 4.5,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Everyday Motivation · No. 003</span>
        <span style={{ color: HONEY }}>2026 · 10 · 27</span>
      </div>

      {/* ─── Type lockup ──────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 915,
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
            color: HONEY,
            fontFamily: inter,
            fontSize: 13,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 18,
            fontWeight: 600,
          }}
        >
          Role{" "}
          <span style={{ color: WAX, margin: "0 4px" }}>/</span>
          <span style={{ color: "#EDE4D1", letterSpacing: 5 }}>
            Archivist
          </span>
        </div>

        <div
          style={{
            color: "#F4ECD6",
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 78,
            lineHeight: 0.96,
            letterSpacing: -1.4,
            fontStyle: "italic",
          }}
        >
          The three-thousand-
          <br />
          year archivist.
        </div>

        <div
          style={{
            marginTop: 28,
            color: "#D7CBAE",
            fontFamily: inter,
            fontSize: 19,
            lineHeight: 1.42,
            fontWeight: 400,
            maxWidth: 900,
            opacity: hookOpacity,
          }}
        >
          Honey jars recovered from Egyptian tombs over 3 000 years old were
          still edible — kept by{" "}
          <span style={{ color: HONEY, fontWeight: 600 }}>
            water activity near 0.6
          </span>
          , an acidic pH, and the slow release of hydrogen peroxide from
          glucose oxidase. The archive preserves itself.
        </div>
      </div>

      {/* ─── Footer ──────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          bottom: 50,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          color: PARCHMENT_DIM,
          fontFamily: inter,
          fontSize: 11,
          letterSpacing: 3,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Molan · Bee World 73 (1992) · 5–28</span>
        <span>
          <span style={{ color: HONEY }}>●</span> One hex = one specimen
        </span>
      </div>
    </AbsoluteFill>
  );
};
