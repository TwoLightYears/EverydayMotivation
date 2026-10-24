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

// Palette — from the concept's visual brief (lightning + its nitrate product)
const INK = "#060915";
const BOARD = "#0F1424";
const BOARD_LO = "#0A0E1C";
const CYAN = "#7FD9FF";
const WHITE = "#F6F2FF";
const VIOLET = "#B38CFF";
const NITRATE = "#9FE3B0";
const GRAY = "#8A8F99";
const DIM = "#4A5168";
const GRID = "#141A2E";
const GRID_MAJOR = "#1C2440";
const SOIL = "#1A1407";
const SOIL_HI = "#2A2010";

// ── Map coord space: 1080 × 800 inside the drafting frame ────────────────
// Bolt zigzag path (one hero bolt, slightly left-of-centre, descending)
type P = { x: number; y: number };
const BOLT: P[] = [
  { x: 320, y: 40 }, // 1 cloud base
  { x: 395, y: 170 }, // 2
  { x: 345, y: 290 }, // 3  (channel label anchor)
  { x: 435, y: 410 }, // 4
  { x: 365, y: 540 }, // 5
  { x: 460, y: 660 }, // 6
  { x: 410, y: 720 }, // 7 ground strike
];
// A couple of thin forks (secondary, don't fight the main line)
const FORK_A: P[] = [
  { x: 395, y: 170 },
  { x: 300, y: 240 },
  { x: 325, y: 320 },
];
const FORK_B: P[] = [
  { x: 435, y: 410 },
  { x: 520, y: 470 },
  { x: 505, y: 540 },
];

const polyLen = (pts: P[]): number => {
  let L = 0;
  for (let i = 1; i < pts.length; i++) {
    L += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  }
  return L;
};
const polyD = (pts: P[]): string =>
  "M " + pts.map((p) => `${p.x} ${p.y}`).join(" L ");

const BOLT_LEN = polyLen(BOLT);
const FORK_A_LEN = polyLen(FORK_A);
const FORK_B_LEN = polyLen(FORK_B);
const GROUND_Y = 720;

// Altitude annotation bands (right-hand column), map coords
type Band = {
  y: number;
  label: string;
  rxn: React.ReactNode;
  caption: string;
  delay: number; // in [0,1] along bolt progress
};

// ── Component ────────────────────────────────────────────────────────────
export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // The strike completes over ~1.2 s, then a bright flash at ground, then the
  // altitude annotations resolve in sequence as the eye travels down.
  const strikeSpan = fps * 1.2;
  const t = Math.min(1, Math.max(0, frame / strikeSpan));
  // ease-out cubic — the stroke draws fast then settles
  const strikeEased = 1 - Math.pow(1 - t, 3);

  // Fork reveals piggy-back on their own small delays
  const forkA = Math.min(1, Math.max(0, (frame - fps * 0.4) / (fps * 0.6)));
  const forkB = Math.min(1, Math.max(0, (frame - fps * 0.7) / (fps * 0.6)));

  // Flash at ground when bolt lands
  const flash = interpolate(
    frame,
    [fps * 1.1, fps * 1.25, fps * 1.9],
    [0, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Title + hook spring in after the strike
  const titleSpring = spring({
    frame: frame - fps * 1.4,
    fps,
    config: { damping: 200, mass: 0.9 },
  });
  const hookOpacity = interpolate(frame, [fps * 2.0, fps * 2.9], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Nitrate droplet: falls into the soil near the end
  const dropFall = interpolate(frame, [fps * 2.4, fps * 3.2], [0, 1], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Page layout (1080 × 1350 portrait) ──────────────────────────────
  // Top metadata band : 0..110
  // Field frame       : 130..841 (h 711, w 960)
  // Title             : 880..
  // Hook              : ~1095..
  // Footer            : ~1290..
  const FRAME = { x: 60, y: 130, w: 960, h: 711 };
  const MAP_W = 1080;
  const MAP_H = 800;
  const scale = FRAME.w / MAP_W;

  // Progress thresholds for each band (triggered as the bolt sweeps past)
  const bandAt = (yMap: number): number => {
    // frame at which the bolt reveal reaches that altitude
    // reveal length progresses with strikeEased from 0..1 across BOLT_LEN
    // find the length-along-bolt at this y
    let acc = 0;
    for (let i = 1; i < BOLT.length; i++) {
      const a = BOLT[i - 1];
      const b = BOLT[i];
      if (
        (a.y <= yMap && b.y >= yMap) ||
        (a.y >= yMap && b.y <= yMap)
      ) {
        const f = (yMap - a.y) / (b.y - a.y || 1);
        acc += Math.hypot(b.x - a.x, b.y - a.y) * f;
        break;
      }
      acc += Math.hypot(b.x - a.x, b.y - a.y);
    }
    return acc / BOLT_LEN;
  };

  // Reveal 0..1 for an altitude band
  const bandReveal = (yMap: number): number => {
    const u = bandAt(yMap);
    const after = strikeEased - u;
    return Math.min(1, Math.max(0, after * 6));
  };

  const BANDS = [
    { y: 155, label: "ATMOSPHERE", unit: "78% N₂ · 21% O₂" },
    { y: 455, label: "COOLING WAKE", unit: "NO + O₂ → NO₂" },
    { y: 625, label: "RAIN-OUT", unit: "NO₂ + H₂O → HNO₃" },
  ];
  // Channel band hosts the big-number callout rather than a BANDS row,
  // so it owns its own vertical slot in the right column.
  const CHANNEL_Y = 300;

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
        <span style={{ color: CYAN }}>2026 · 10 · 24</span>
      </div>

      {/* Field frame */}
      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          {/* Patterns */}
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

          <radialGradient id="board-vignette" cx="50%" cy="35%" r="75%">
            <stop offset="0%" stopColor="#121A2E" stopOpacity={1} />
            <stop offset="100%" stopColor={BOARD_LO} stopOpacity={1} />
          </radialGradient>

          <radialGradient id="ground-flash" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={WHITE} stopOpacity={1} />
            <stop offset="35%" stopColor={CYAN} stopOpacity={0.6} />
            <stop offset="100%" stopColor={VIOLET} stopOpacity={0} />
          </radialGradient>

          <radialGradient id="molecule-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={CYAN} stopOpacity={0.35} />
            <stop offset="100%" stopColor={CYAN} stopOpacity={0} />
          </radialGradient>

          <linearGradient id="soil-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={SOIL_HI} />
            <stop offset="100%" stopColor={SOIL} />
          </linearGradient>

          <filter id="bolt-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="6" result="b1" />
            <feGaussianBlur stdDeviation="14" in="SourceGraphic" result="b2" />
            <feMerge>
              <feMergeNode in="b2" />
              <feMergeNode in="b1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
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

        {/* Inner thin border */}
        <rect
          x={FRAME.x + 0.5}
          y={FRAME.y + 0.5}
          width={FRAME.w - 1}
          height={FRAME.h - 1}
          fill="none"
          stroke="#1F2740"
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
          <g key={i} stroke={VIOLET} strokeWidth={1.5} fill="none">
            <line x1={cx} y1={cy} x2={cx + sx * 26} y2={cy} />
            <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 26} />
          </g>
        ))}

        {/* Figure index — top-right of frame, out of the strike zone */}
        <g
          transform={`translate(${FRAME.x + FRAME.w - 26}, ${FRAME.y + 30})`}
          fill={VIOLET}
          fontFamily={inter}
        >
          <text
            fontSize={11}
            letterSpacing={3.4}
            fontWeight={600}
            textAnchor="end"
          >
            FIG. 1
          </text>
        </g>

        {/* Altitude scale on the far left (inside frame) */}
        <g
          fontFamily={inter}
          fontSize={9}
          letterSpacing={2.4}
          fontWeight={500}
          fill={DIM}
        >
          {[
            { y: 100, lab: "12 KM" },
            { y: 275, lab: "8 KM" },
            { y: 450, lab: "4 KM" },
            { y: 625, lab: "1 KM" },
            { y: 720, lab: "0" },
          ].map((a, i) => {
            const yPix = FRAME.y + a.y * scale;
            return (
              <g key={i}>
                <line
                  x1={FRAME.x + 20}
                  x2={FRAME.x + 40}
                  y1={yPix}
                  y2={yPix}
                  stroke={DIM}
                  strokeWidth={1}
                />
                <text x={FRAME.x + 46} y={yPix + 3} fill={DIM}>
                  {a.lab}
                </text>
              </g>
            );
          })}
          <text
            x={FRAME.x + 20}
            y={FRAME.y + FRAME.h - 10}
            fill={DIM}
            fontSize={9}
            letterSpacing={2.6}
          >
            ALTITUDE
          </text>
        </g>

        {/* Map content: scale 1080×800 coords into FRAME */}
        <g transform={`translate(${FRAME.x}, ${FRAME.y}) scale(${scale})`}>
          {/* Horizon / soil cross-section */}
          <rect x={0} y={GROUND_Y} width={1080} height={80} fill="url(#soil-fill)" />
          <line
            x1={0}
            y1={GROUND_Y}
            x2={1080}
            y2={GROUND_Y}
            stroke={NITRATE}
            strokeOpacity={0.4}
            strokeWidth={1.2}
          />
          {/* Soil texture dots */}
          {Array.from({ length: 90 }).map((_, i) => {
            const seed = (i * 9301 + 49297) % 233280;
            const rx = (seed / 233280) * 1060 + 10;
            const ry = GROUND_Y + 8 + ((i * 71) % 60);
            return (
              <circle
                key={`soil-${i}`}
                cx={rx}
                cy={ry}
                r={0.9}
                fill={DIM}
                opacity={0.55}
              />
            );
          })}
          {/* Root descending from strike point */}
          <path
            d={`M ${BOLT[BOLT.length - 1].x} ${GROUND_Y}
                C ${BOLT[BOLT.length - 1].x + 10} ${GROUND_Y + 20},
                  ${BOLT[BOLT.length - 1].x - 25} ${GROUND_Y + 35},
                  ${BOLT[BOLT.length - 1].x - 15} ${GROUND_Y + 72}`}
            stroke={NITRATE}
            strokeWidth={1.8}
            strokeOpacity={0.85}
            fill="none"
            strokeLinecap="round"
          />
          <path
            d={`M ${BOLT[BOLT.length - 1].x + 2} ${GROUND_Y + 22}
                C ${BOLT[BOLT.length - 1].x + 24} ${GROUND_Y + 32},
                  ${BOLT[BOLT.length - 1].x + 40} ${GROUND_Y + 50},
                  ${BOLT[BOLT.length - 1].x + 48} ${GROUND_Y + 68}`}
            stroke={NITRATE}
            strokeWidth={1.2}
            strokeOpacity={0.6}
            fill="none"
            strokeLinecap="round"
          />

          {/* Cloud base — the strike's origin */}
          <g opacity={0.9}>
            {[
              { cx: 330, cy: 60, rx: 160, ry: 22 },
              { cx: 230, cy: 78, rx: 85, ry: 14 },
              { cx: 445, cy: 72, rx: 70, ry: 12 },
            ].map((c, i) => (
              <ellipse
                key={`cloud-${i}`}
                cx={c.cx}
                cy={c.cy}
                rx={c.rx}
                ry={c.ry}
                fill={BOARD}
                stroke={DIM}
                strokeWidth={1}
                strokeOpacity={0.6}
              />
            ))}
          </g>

          {/* Ground flash — radial burst when bolt lands */}
          {flash > 0.01 && (
            <g opacity={flash}>
              <circle
                cx={BOLT[BOLT.length - 1].x}
                cy={GROUND_Y}
                r={260}
                fill="url(#ground-flash)"
              />
            </g>
          )}

          {/* Fork A — thin secondary branch */}
          {forkA > 0 && (
            <g filter="url(#bolt-glow)" opacity={0.9}>
              <path
                d={polyD(FORK_A)}
                stroke={CYAN}
                strokeWidth={2.5}
                strokeOpacity={0.55}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={FORK_A_LEN}
                strokeDashoffset={FORK_A_LEN * (1 - forkA)}
              />
              <path
                d={polyD(FORK_A)}
                stroke={WHITE}
                strokeWidth={1}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={FORK_A_LEN}
                strokeDashoffset={FORK_A_LEN * (1 - forkA)}
              />
            </g>
          )}
          {/* Fork B — thin secondary branch */}
          {forkB > 0 && (
            <g filter="url(#bolt-glow)" opacity={0.85}>
              <path
                d={polyD(FORK_B)}
                stroke={CYAN}
                strokeWidth={2.5}
                strokeOpacity={0.5}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={FORK_B_LEN}
                strokeDashoffset={FORK_B_LEN * (1 - forkB)}
              />
              <path
                d={polyD(FORK_B)}
                stroke={WHITE}
                strokeWidth={1}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={FORK_B_LEN}
                strokeDashoffset={FORK_B_LEN * (1 - forkB)}
              />
            </g>
          )}

          {/* Main bolt — outer violet aura */}
          <path
            d={polyD(BOLT)}
            stroke={VIOLET}
            strokeWidth={22}
            strokeOpacity={0.22}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#bolt-glow)"
            strokeDasharray={BOLT_LEN}
            strokeDashoffset={BOLT_LEN * (1 - strikeEased)}
          />
          {/* Main bolt — cyan plasma layer */}
          <path
            d={polyD(BOLT)}
            stroke={CYAN}
            strokeWidth={10}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#bolt-glow)"
            strokeDasharray={BOLT_LEN}
            strokeDashoffset={BOLT_LEN * (1 - strikeEased)}
          />
          {/* Main bolt — incandescent core */}
          <path
            d={polyD(BOLT)}
            stroke={WHITE}
            strokeWidth={3}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={BOLT_LEN}
            strokeDashoffset={BOLT_LEN * (1 - strikeEased)}
          />

          {/* Right-column annotation stack — resolves band-by-band */}
          {BANDS.map((b, i) => {
            const rev = bandReveal(b.y);
            if (rev <= 0.001) return null;

            // Band numbering: 01 atmosphere, 02 channel (callout), 03 wake, 04 rain
            const bandNum = i === 0 ? "01" : i === 1 ? "03" : "04";

            // Pick the x of the bolt at this y to seat a leader into the band
            let bx = BOLT[0].x;
            for (let k = 1; k < BOLT.length; k++) {
              const a = BOLT[k - 1];
              const c = BOLT[k];
              if (
                (a.y <= b.y && c.y >= b.y) ||
                (a.y >= b.y && c.y <= b.y)
              ) {
                const f = (b.y - a.y) / (c.y - a.y || 1);
                bx = a.x + (c.x - a.x) * f;
                break;
              }
            }
            const LX = 640; // annotation column x in map coords
            const LY = b.y;

            return (
              <g key={`band-${i}`} opacity={rev}>
                {/* Leader line from bolt to band label */}
                <line
                  x1={bx + 8}
                  y1={LY}
                  x2={LX - 10}
                  y2={LY}
                  stroke={VIOLET}
                  strokeOpacity={0.55}
                  strokeWidth={1}
                  strokeDasharray="2 4"
                />
                {/* Vertex marker on bolt */}
                <circle cx={bx} cy={LY} r={3.5} fill={WHITE} />
                <circle
                  cx={bx}
                  cy={LY}
                  r={9}
                  fill="none"
                  stroke={CYAN}
                  strokeOpacity={0.6}
                  strokeWidth={1}
                />

                {/* Band label block */}
                <text
                  x={LX}
                  y={LY - 10}
                  fill={CYAN}
                  fontFamily={inter}
                  fontSize={12}
                  letterSpacing={3.4}
                  fontWeight={600}
                >
                  {`${bandNum} · ${b.label}`}
                </text>
                <text
                  x={LX}
                  y={LY + 14}
                  fill="#E6E8EF"
                  fontFamily={inter}
                  fontSize={18}
                  letterSpacing={0.2}
                  fontWeight={500}
                >
                  {b.unit}
                </text>

                {/* Underline rule */}
                <line
                  x1={LX}
                  y1={LY + 28}
                  x2={LX + 330}
                  y2={LY + 28}
                  stroke={DIM}
                  strokeWidth={1}
                />
              </g>
            );
          })}

          {/* 02 · CHANNEL — the hook as a hero callout */}
          {(() => {
            const rev = bandReveal(CHANNEL_Y);
            if (rev <= 0.001) return null;
            // Leader to bolt vertex at channel y
            let bx = BOLT[0].x;
            for (let k = 1; k < BOLT.length; k++) {
              const a = BOLT[k - 1];
              const c = BOLT[k];
              if (
                (a.y <= CHANNEL_Y && c.y >= CHANNEL_Y) ||
                (a.y >= CHANNEL_Y && c.y <= CHANNEL_Y)
              ) {
                const f = (CHANNEL_Y - a.y) / (c.y - a.y || 1);
                bx = a.x + (c.x - a.x) * f;
                break;
              }
            }
            const LX = 640;
            return (
              <g opacity={rev}>
                <line
                  x1={bx + 8}
                  y1={CHANNEL_Y}
                  x2={LX - 10}
                  y2={CHANNEL_Y}
                  stroke={VIOLET}
                  strokeOpacity={0.55}
                  strokeWidth={1}
                  strokeDasharray="2 4"
                />
                <circle cx={bx} cy={CHANNEL_Y} r={3.5} fill={WHITE} />
                <circle
                  cx={bx}
                  cy={CHANNEL_Y}
                  r={9}
                  fill="none"
                  stroke={CYAN}
                  strokeOpacity={0.6}
                  strokeWidth={1}
                />

                {/* Section label */}
                <text
                  x={LX}
                  y={CHANNEL_Y - 10}
                  fill={CYAN}
                  fontFamily={inter}
                  fontSize={12}
                  letterSpacing={3.4}
                  fontWeight={600}
                >
                  02 · CHANNEL
                </text>

                {/* Hero number */}
                <text
                  x={LX}
                  y={CHANNEL_Y + 68}
                  fill={WHITE}
                  fontFamily={playfair}
                  fontStyle="italic"
                  fontSize={82}
                  fontWeight={500}
                  letterSpacing={-1}
                >
                  30,000
                  <tspan
                    fill={VIOLET}
                    fontFamily={inter}
                    fontStyle="normal"
                    fontSize={30}
                    dx={10}
                    fontWeight={500}
                  >
                    K
                  </tspan>
                </text>

                {/* Supporting line + rule */}
                <text
                  x={LX}
                  y={CHANNEL_Y + 92}
                  fill={GRAY}
                  fontFamily={inter}
                  fontSize={11}
                  letterSpacing={3}
                  fontWeight={500}
                >
                  ≈ 5 × SUN&apos;S SURFACE · N≡N CLEAVED
                </text>
                <line
                  x1={LX}
                  y1={CHANNEL_Y + 108}
                  x2={LX + 330}
                  y2={CHANNEL_Y + 108}
                  stroke={DIM}
                  strokeWidth={1}
                />
              </g>
            );
          })()}

          {/* Molecule chips at channel band (bond cleavage) */}
          <g opacity={bandReveal(CHANNEL_Y)}>
            {/* Intact N₂ (upper-left of channel) */}
            <g transform="translate(165, 240)">
              <circle cx={-15} cy={0} r={15} fill={BOARD} stroke={VIOLET} strokeWidth={1.5} />
              <circle cx={15} cy={0} r={15} fill={BOARD} stroke={VIOLET} strokeWidth={1.5} />
              {/* Triple bond — three parallel lines */}
              <line x1={-2} y1={-5} x2={2} y2={-5} stroke={VIOLET} strokeWidth={1.6} />
              <line x1={-2} y1={0} x2={2} y2={0} stroke={VIOLET} strokeWidth={1.6} />
              <line x1={-2} y1={5} x2={2} y2={5} stroke={VIOLET} strokeWidth={1.6} />
              <text
                x={-15}
                y={4}
                textAnchor="middle"
                fill={VIOLET}
                fontFamily={inter}
                fontSize={13}
                fontWeight={600}
              >
                N
              </text>
              <text
                x={15}
                y={4}
                textAnchor="middle"
                fill={VIOLET}
                fontFamily={inter}
                fontSize={13}
                fontWeight={600}
              >
                N
              </text>
              <text
                x={0}
                y={38}
                textAnchor="middle"
                fill={VIOLET}
                fontFamily={inter}
                fontSize={10}
                letterSpacing={2.2}
                fontWeight={600}
              >
                N₂ · 945 kJ/mol
              </text>
            </g>

            {/* Cleaved radicals — just left of the channel vertex (y≈400) */}
            <g transform="translate(190, 410)">
              {/* Jagged mini-strike between the two radicals */}
              <path
                d="M -42 -2 L -34 4 L -40 10 L -32 16"
                stroke={CYAN}
                strokeWidth={1.4}
                fill="none"
                strokeLinecap="round"
              />
              <circle cx={-20} cy={0} r={15} fill={BOARD} stroke={CYAN} strokeWidth={1.5} />
              <circle cx={30} cy={10} r={15} fill={BOARD} stroke={CYAN} strokeWidth={1.5} />
              <text
                x={-20}
                y={4}
                textAnchor="middle"
                fill={CYAN}
                fontFamily={inter}
                fontSize={13}
                fontWeight={600}
              >
                N·
              </text>
              <text
                x={30}
                y={14}
                textAnchor="middle"
                fill={CYAN}
                fontFamily={inter}
                fontSize={13}
                fontWeight={600}
              >
                N·
              </text>
              <text
                x={5}
                y={38}
                textAnchor="middle"
                fill={CYAN}
                fontFamily={inter}
                fontSize={10}
                letterSpacing={2.2}
                fontWeight={600}
              >
                RADICALS
              </text>
            </g>
          </g>

          {/* Falling nitrate drop into soil */}
          {dropFall > 0 && (() => {
            const startX = BOLT[BOLT.length - 1].x;
            const startY = 640;
            const endY = GROUND_Y + 42;
            const y = startY + (endY - startY) * dropFall;
            return (
              <g opacity={Math.min(1, dropFall * 1.2)}>
                {/* Trail (fading dots) */}
                {[0.3, 0.55, 0.8].map((f, idx) => {
                  const ty = startY + (y - startY) * f;
                  return (
                    <circle
                      key={`trail-${idx}`}
                      cx={startX}
                      cy={ty}
                      r={2 + idx * 0.6}
                      fill={NITRATE}
                      opacity={0.25 + idx * 0.12}
                    />
                  );
                })}
                {/* The drop */}
                <path
                  d={`M ${startX} ${y - 16}
                      q 10 14 0 28
                      q -10 -14 0 -28 z`}
                  fill={NITRATE}
                  opacity={0.98}
                />
                <circle
                  cx={startX - 2}
                  cy={y - 4}
                  r={2.5}
                  fill={WHITE}
                  opacity={0.75}
                />
                <text
                  x={startX + 24}
                  y={y + 2}
                  fill={NITRATE}
                  fontFamily={inter}
                  fontSize={14}
                  letterSpacing={2.6}
                  fontWeight={600}
                >
                  NO₃⁻ · TO ROOTS
                </text>
              </g>
            );
          })()}
        </g>

        {/* Caption strip just below the field frame */}
        <g
          transform={`translate(${FRAME.x}, ${FRAME.y + FRAME.h + 22})`}
          fill={GRAY}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
        >
          <text>FIG. 1 · ONE STROKE FIXES ~7 KG OF ATMOSPHERIC N</text>
          <text
            x={FRAME.w}
            textAnchor="end"
            fill={CYAN}
            opacity={0.9}
          >
            GLOBAL YIELD · 5 Tg N / YR
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
            Fertilizer Chemist
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
          The sky-born
          <br />
          chemist.
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
          For a few microseconds, a lightning channel reaches{" "}
          <span style={{ color: CYAN, fontWeight: 600 }}>~30,000 K</span> —
          five times the surface of the Sun — enough to shatter the triple
          bond of N₂ and forge roughly{" "}
          <span style={{ color: NITRATE, fontWeight: 600 }}>
            5 Tg of plant-ready nitrate
          </span>{" "}
          every year, delivered to the Earth&apos;s soils in rain.
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
        <span>Schumann &amp; Huntrieser · Atmos. Chem. Phys. 7 (2007) 3823</span>
        <span>
          <span style={{ color: NITRATE }}>●</span> NO₃⁻ · Rain → Soil
        </span>
      </div>
    </AbsoluteFill>
  );
};
