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
const INK = "#0E1216";
const BOARD = "#17221C";
const BOARD_HI = "#1D2C24";
const CHALK = "#EDE4C7";
const CHALK_DIM = "#7C8478";
const AMBER = "#C97B34";
const AMBER_HI = "#E4A24C";
const EYE_RED = "#B72B22";
const GRAY = "#8A8F99";

const PRIMES = new Set<number>([2, 3, 5, 7, 11, 13, 17]);

// ── Layout constants (portrait 1080 × 1350) ──────────────────────────────
const FRAME = { x: 60, y: 260, w: 960, h: 770 };
// A cartouche strip inside the plate at its bottom, hiding the dial's
// southern quadrant and holding the equation. Height in px.
const CARTOUCHE_H = 108;
const CARTOUCHE_Y = FRAME.y + FRAME.h - CARTOUCHE_H; // 922
const DIAL_CX = 540;
const DIAL_CY = FRAME.y + 340; // 600
const DIAL_R_OUTER = 288;
const DIAL_R_INNER = 254;
const DIAL_R_LABEL = 316;

// Dial ticks: 17 positions arranged around the circle. Position 0 sits at the
// top (12 o'clock). Angle for tick n (1-indexed) is:
const tickAngle = (n: number): number => (-Math.PI / 2) + ((n - 1) * (2 * Math.PI) / 17);

// ─── Cicada silhouette ───────────────────────────────────────────────────
// Dorsal view. Head at top, abdomen at bottom, wings folded roof-like over
// the abdomen. All coordinates are relative to a local origin (0, 0) at the
// centroid of the body; group is translated & scaled into the dial center.
const CicadaSilhouette: React.FC<{
  amberOpacity: number;
  eyeOpacity: number;
  wingOpacity: number;
}> = ({ amberOpacity, eyeOpacity, wingOpacity }) => {
  // Wing outline — one side, mirrored via <use transform="scale(-1,1)">
  const wingPath =
    "M 6 -46 C 44 -40 92 -12 106 44 C 118 96 92 152 32 168 C 22 170 14 168 8 158 L 6 -46 Z";

  // Wing venation strokes (right wing local coords). Each vein starts near
  // the wing base and fans out.
  const veins = [
    "M 8 -30 C 30 -18 60 12 78 58",
    "M 8 -14 C 34 -2 70 24 88 74",
    "M 8 4 C 34 16 74 44 88 96",
    "M 8 22 C 30 34 62 56 74 118",
    "M 8 44 C 24 58 40 82 46 140",
    "M 8 62 C 18 72 26 92 26 156",
  ];
  const cross = [
    "M 30 8 C 46 6 62 4 78 6",
    "M 40 40 C 54 38 68 40 82 46",
    "M 46 74 C 58 74 70 78 82 84",
  ];

  // Body outline (dorsal): head, pronotum, mesonotum, abdomen segments
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      {/* Wings: filled amber tint (very translucent) */}
      <g opacity={wingOpacity}>
        <path d={wingPath} fill={AMBER} fillOpacity={0.06} stroke="none" />
        <g transform="scale(-1,1)">
          <path d={wingPath} fill={AMBER} fillOpacity={0.06} stroke="none" />
        </g>
        {/* Wing outline stroke */}
        <path
          d={wingPath}
          stroke={AMBER}
          strokeOpacity={0.55}
          strokeWidth={1.4}
        />
        <g transform="scale(-1,1)">
          <path
            d={wingPath}
            stroke={AMBER}
            strokeOpacity={0.55}
            strokeWidth={1.4}
          />
        </g>
        {/* Venation - primary veins (right wing) */}
        <g stroke={AMBER} strokeWidth={1.1} strokeOpacity={0.85}>
          {veins.map((d, i) => (
            <path key={`vr${i}`} d={d} />
          ))}
        </g>
        {/* Venation - primary veins (mirrored left wing) */}
        <g
          stroke={AMBER}
          strokeWidth={1.1}
          strokeOpacity={0.85}
          transform="scale(-1,1)"
        >
          {veins.map((d, i) => (
            <path key={`vl${i}`} d={d} />
          ))}
        </g>
        {/* Cross veins */}
        <g stroke={AMBER_HI} strokeWidth={0.8} strokeOpacity={0.65}>
          {cross.map((d, i) => (
            <path key={`cr${i}`} d={d} />
          ))}
          <g transform="scale(-1,1)">
            {cross.map((d, i) => (
              <path key={`cl${i}`} d={d} />
            ))}
          </g>
        </g>
      </g>

      {/* Body — solid ink filled */}
      <g opacity={amberOpacity}>
        {/* Head */}
        <ellipse cx={0} cy={-72} rx={22} ry={16} fill={INK} stroke={CHALK} strokeOpacity={0.15} strokeWidth={0.8} />

        {/* Eyes (compound) */}
        <circle
          cx={-16}
          cy={-72}
          r={7}
          fill={EYE_RED}
          opacity={eyeOpacity}
        />
        <circle
          cx={16}
          cy={-72}
          r={7}
          fill={EYE_RED}
          opacity={eyeOpacity}
        />
        <circle cx={-14} cy={-74} r={1.4} fill={CHALK} opacity={eyeOpacity} />
        <circle cx={18} cy={-74} r={1.4} fill={CHALK} opacity={eyeOpacity} />

        {/* Ocelli (three small dots on top of head) */}
        <circle cx={0} cy={-80} r={1.4} fill={CHALK} opacity={0.6} />
        <circle cx={-4} cy={-76} r={1.1} fill={CHALK} opacity={0.5} />
        <circle cx={4} cy={-76} r={1.1} fill={CHALK} opacity={0.5} />

        {/* Pronotum + mesonotum (thoracic plates) */}
        <path
          d="M -34 -58 C -30 -50 -30 -44 -32 -34 L 32 -34 C 30 -44 30 -50 34 -58 C 22 -66 -22 -66 -34 -58 Z"
          fill={INK}
          stroke={AMBER}
          strokeOpacity={0.55}
          strokeWidth={1.1}
        />
        <path
          d="M -32 -34 C -38 -18 -40 -2 -34 14 L 34 14 C 40 -2 38 -18 32 -34 Z"
          fill={INK}
          stroke={AMBER}
          strokeOpacity={0.55}
          strokeWidth={1.1}
        />
        {/* Scutellum (triangular plate) */}
        <path
          d="M -14 4 L 14 4 L 0 26 Z"
          fill={INK}
          stroke={AMBER_HI}
          strokeOpacity={0.9}
          strokeWidth={1.2}
        />

        {/* Abdomen — segmented pill */}
        <path
          d="M -30 14 C -32 60 -22 130 -6 160 C 0 168 0 168 6 160 C 22 130 32 60 30 14 Z"
          fill={INK}
          stroke={CHALK}
          strokeOpacity={0.22}
          strokeWidth={0.9}
        />
        {/* Segment lines */}
        {[36, 60, 84, 106, 126, 144].map((y) => (
          <path
            key={`seg-${y}`}
            d={`M ${-30 + (y - 14) * 0.02} ${y} Q 0 ${y + 3} ${30 - (y - 14) * 0.02} ${y}`}
            stroke={CHALK}
            strokeOpacity={0.18}
            strokeWidth={0.8}
          />
        ))}

        {/* Legs (front pair + hind pair, minimal) */}
        <g stroke={CHALK} strokeOpacity={0.35} strokeWidth={1}>
          <path d="M -30 -20 L -58 -6 L -62 14" />
          <path d="M 30 -20 L 58 -6 L 62 14" />
          <path d="M -28 6 L -60 22 L -66 42" />
          <path d="M 28 6 L 60 22 L 66 42" />
        </g>
      </g>
    </g>
  );
};

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Timing (all in seconds -> frames)
  const F = (s: number) => s * fps;

  // Plate / board reveal (0.0 → 0.7)
  const plateT = interpolate(frame, [F(0.0), F(0.7)], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Dial ring appears (0.4 → 1.2)
  const dialT = interpolate(frame, [F(0.4), F(1.2)], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Cicada silhouette appears alongside the dial
  const cicadaAppear = interpolate(frame, [F(0.7), F(1.5)], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Pointer sweep (1.4s → 3.6s): year 1 → year 17
  const sweepStart = F(1.4);
  const sweepEnd = F(3.6);
  const sweepRaw = interpolate(frame, [sweepStart, sweepEnd], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  // Step-eased sweep — snaps through 17 discrete positions
  const currentYear = Math.min(17, Math.max(1, Math.floor(1 + sweepRaw * 17)));

  // A tiny "settle" bounce on landing
  const landSpring = spring({
    frame: frame - sweepEnd,
    fps,
    config: { damping: 12, mass: 0.6, stiffness: 140 },
  });

  // Red flash at 17 (peaks right after landing, then fades slightly)
  const flash = interpolate(
    frame,
    [sweepEnd - F(0.05), sweepEnd + F(0.35), sweepEnd + F(1.2)],
    [0, 1, 0.55],
    {
      easing: Easing.out(Easing.cubic),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  // Cicada eye lights up on landing
  const eyeGlow = interpolate(
    frame,
    [sweepEnd - F(0.1), sweepEnd + F(0.4)],
    [0.35, 1],
    {
      easing: Easing.out(Easing.cubic),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  // Text lockup timings
  const roleT = spring({
    frame: frame - F(0.6),
    fps,
    config: { damping: 200, mass: 0.8 },
  });
  const titleT = spring({
    frame: frame - F(0.9),
    fps,
    config: { damping: 200, mass: 0.9 },
  });
  const hookT = interpolate(frame, [F(3.8), F(4.6)], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Pointer's angular position (continuous, so it sweeps smoothly through
  // then settles onto the discrete tick with the spring bounce).
  const pointerAngleContinuous =
    tickAngle(1) + sweepRaw * (tickAngle(17) - tickAngle(1));
  const pointerAngleDiscrete = tickAngle(currentYear);
  const pointerBlend = frame < sweepEnd ? 0 : 1;
  const pointerAngle =
    pointerAngleContinuous * (1 - pointerBlend) +
    pointerAngleDiscrete * pointerBlend +
    (landSpring - 1) * 0.008;

  // Marker sits on the tick ring, halfway between inner and outer radii.
  const markerR = (DIAL_R_INNER + DIAL_R_OUTER) / 2;
  const markerX = DIAL_CX + Math.cos(pointerAngle) * markerR;
  const markerY = DIAL_CY + Math.sin(pointerAngle) * markerR;

  return (
    <AbsoluteFill style={{ backgroundColor: INK, fontFamily: inter }}>
      <style>{fontCss}</style>

      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          <radialGradient id="board-vignette" cx="50%" cy="46%" r="70%">
            <stop offset="0%" stopColor={BOARD_HI} stopOpacity={1} />
            <stop offset="100%" stopColor={BOARD} stopOpacity={1} />
          </radialGradient>
          <radialGradient id="dial-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={AMBER} stopOpacity={0.22} />
            <stop offset="100%" stopColor={AMBER} stopOpacity={0} />
          </radialGradient>
          <radialGradient id="red-flash" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={EYE_RED} stopOpacity={0.55} />
            <stop offset="100%" stopColor={EYE_RED} stopOpacity={0} />
          </radialGradient>
          {/* Chalk-texture noise pattern via SVG turbulence — very subtle */}
          <filter id="chalk-noise" x="0%" y="0%" width="100%" height="100%">
            <feTurbulence baseFrequency="0.9" numOctaves="2" seed="7" />
            <feColorMatrix
              values="0 0 0 0 0.93
                      0 0 0 0 0.89
                      0 0 0 0 0.78
                      0 0 0 0.06 0"
            />
          </filter>
        </defs>

        {/* Top metadata band */}
        <g opacity={Math.min(1, plateT * 2)}>
          <text
            x={80}
            y={82}
            fill={GRAY}
            fontFamily={inter}
            fontSize={13}
            letterSpacing={4.5}
            fontWeight={500}
          >
            EVERYDAY MOTIVATION · NO. 003
          </text>
          <text
            x={1000}
            y={82}
            textAnchor="end"
            fill={AMBER}
            fontFamily={inter}
            fontSize={13}
            letterSpacing={4.5}
            fontWeight={500}
          >
            2026 · 09 · 20
          </text>
        </g>

        {/* Role + Title lockup (upper) */}
        <g
          opacity={Math.max(0, roleT)}
          transform={`translate(0, ${(1 - Math.max(0, roleT)) * 8})`}
        >
          <text
            x={80}
            y={140}
            fill={AMBER}
            fontFamily={inter}
            fontSize={13}
            letterSpacing={6}
            fontWeight={600}
          >
            ROLE
          </text>
          <text
            x={131}
            y={140}
            fill={GRAY}
            fontFamily={inter}
            fontSize={13}
            letterSpacing={6}
            fontWeight={600}
          >
            /
          </text>
          <text
            x={148}
            y={140}
            fill="#EDEDEF"
            fontFamily={inter}
            fontSize={13}
            letterSpacing={5}
            fontWeight={600}
          >
            NUMBER THEORIST
          </text>
        </g>

        <g
          opacity={Math.max(0, titleT)}
          transform={`translate(0, ${(1 - Math.max(0, titleT)) * 14})`}
        >
          <text
            x={80}
            y={218}
            fill="#F4F0DE"
            fontFamily={playfair}
            fontStyle="italic"
            fontWeight={500}
            fontSize={86}
            letterSpacing={-1.2}
          >
            The 17-year proof.
          </text>
        </g>

        {/* Chalkboard plate */}
        <g opacity={plateT}>
          <rect
            x={FRAME.x}
            y={FRAME.y}
            width={FRAME.w}
            height={FRAME.h}
            fill="url(#board-vignette)"
          />
          {/* Very subtle chalk noise overlay */}
          <rect
            x={FRAME.x}
            y={FRAME.y}
            width={FRAME.w}
            height={FRAME.h}
            fill="url(#chalk-noise)"
            filter="url(#chalk-noise)"
            opacity={0.35}
          />
          {/* Inner border */}
          <rect
            x={FRAME.x + 0.5}
            y={FRAME.y + 0.5}
            width={FRAME.w - 1}
            height={FRAME.h - 1}
            fill="none"
            stroke="#2A3831"
            strokeWidth={1}
          />
          {/* Corner amber ticks */}
          {(
            [
              [FRAME.x, FRAME.y, 1, 1],
              [FRAME.x + FRAME.w, FRAME.y, -1, 1],
              [FRAME.x, FRAME.y + FRAME.h, 1, -1],
              [FRAME.x + FRAME.w, FRAME.y + FRAME.h, -1, -1],
            ] as const
          ).map(([cx, cy, sx, sy], i) => (
            <g key={i} stroke={AMBER} strokeWidth={1.4} fill="none">
              <line x1={cx} y1={cy} x2={cx + sx * 24} y2={cy} />
              <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 24} />
            </g>
          ))}

          {/* Plate caption (top-left inside plate) */}
          <text
            x={FRAME.x + 24}
            y={FRAME.y + 34}
            fill={CHALK_DIM}
            fontFamily={inter}
            fontSize={11}
            letterSpacing={3}
            fontWeight={500}
          >
            PLATE III · MAGICICADA SEPTENDECIM
          </text>
          <text
            x={FRAME.x + FRAME.w - 24}
            y={FRAME.y + 34}
            fill={CHALK_DIM}
            fontFamily={inter}
            fontSize={11}
            letterSpacing={3}
            fontWeight={500}
            textAnchor="end"
          >
            PERIOD · 17 A
          </text>
        </g>

        {/* Ambient dial glow (behind everything) */}
        <g opacity={dialT * 0.85}>
          <circle
            cx={DIAL_CX}
            cy={DIAL_CY}
            r={DIAL_R_OUTER + 24}
            fill="url(#dial-glow)"
          />
        </g>

        {/* Red flash halo when landing on 17 */}
        <g opacity={flash * dialT}>
          <circle
            cx={DIAL_CX}
            cy={DIAL_CY}
            r={DIAL_R_OUTER + 80}
            fill="url(#red-flash)"
          />
        </g>

        {/* Cicada silhouette — sits inside the dial */}
        <g
          transform={`translate(${DIAL_CX}, ${DIAL_CY - 40}) scale(1.32)`}
          opacity={cicadaAppear}
        >
          <CicadaSilhouette
            amberOpacity={cicadaAppear}
            eyeOpacity={eyeGlow}
            wingOpacity={cicadaAppear * 0.95}
          />
        </g>

        {/* Dial: outer + inner rings */}
        <g opacity={dialT}>
          <circle
            cx={DIAL_CX}
            cy={DIAL_CY}
            r={DIAL_R_OUTER}
            fill="none"
            stroke={CHALK}
            strokeOpacity={0.4}
            strokeWidth={1}
          />
          <circle
            cx={DIAL_CX}
            cy={DIAL_CY}
            r={DIAL_R_INNER}
            fill="none"
            stroke={CHALK}
            strokeOpacity={0.22}
            strokeWidth={1}
          />
          {/* Tiny center dot for pointer pivot */}
          <circle cx={DIAL_CX} cy={DIAL_CY} r={3} fill={CHALK} opacity={0.4} />
        </g>

        {/* Ticks and year numerals — skip any that fall inside the cartouche */}
        <g opacity={dialT}>
          {Array.from({ length: 17 }, (_, i) => i + 1).map((n) => {
            const a = tickAngle(n);
            const isPrime = PRIMES.has(n);
            const is17 = n === 17;
            const reached = n <= currentYear;
            const primeLit = isPrime && reached;

            const tickInner = DIAL_R_INNER + 2;
            const tickOuter = DIAL_R_OUTER - 2;
            const x1 = DIAL_CX + Math.cos(a) * tickInner;
            const y1 = DIAL_CY + Math.sin(a) * tickInner;
            const x2 = DIAL_CX + Math.cos(a) * tickOuter;
            const y2 = DIAL_CY + Math.sin(a) * tickOuter;

            const lx = DIAL_CX + Math.cos(a) * DIAL_R_LABEL;
            const ly = DIAL_CY + Math.sin(a) * DIAL_R_LABEL + 5;

            // Hide the label (not the tick mark itself) for composite years
            // whose numeral would crowd the cartouche or the marker path.
            // 11 (a prime) is kept even at the same height.
            const hideLabel = !isPrime && ly > 830;

            const tickColor = is17
              ? EYE_RED
              : primeLit
                ? AMBER_HI
                : isPrime
                  ? AMBER
                  : reached
                    ? CHALK
                    : CHALK_DIM;
            const tickWidth = is17 ? 4 : isPrime ? 2.8 : 1.5;
            const tickOp = reached ? 1 : 0.55;

            const labelColor = is17
              ? EYE_RED
              : isPrime
                ? AMBER_HI
                : CHALK_DIM;
            const labelWeight = isPrime ? 600 : 500;
            const labelSize = is17 ? 30 : isPrime ? 18 : 15;
            const labelFamily = is17 ? playfair : inter;

            return (
              <g key={`tick-${n}`}>
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={tickColor}
                  strokeWidth={tickWidth}
                  strokeOpacity={tickOp}
                  strokeLinecap="round"
                />
                {hideLabel ? null : (
                  <text
                    x={lx}
                    y={ly}
                    textAnchor="middle"
                    fill={labelColor}
                    fontFamily={labelFamily}
                    fontStyle={is17 ? "italic" : "normal"}
                    fontWeight={labelWeight}
                    fontSize={labelSize}
                    letterSpacing={is17 ? 0 : 1.2}
                    opacity={reached ? 1 : 0.65}
                  >
                    {n}
                  </text>
                )}
              </g>
            );
          })}
        </g>

        {/* Marker on the ring — no central arm, so the cicada stays clean */}
        <g
          opacity={interpolate(
            frame,
            [sweepStart - F(0.2), sweepStart],
            [0, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
          )}
        >
          <circle
            cx={markerX}
            cy={markerY}
            r={30}
            fill={frame >= sweepEnd ? EYE_RED : AMBER_HI}
            opacity={0.2}
          />
          <circle
            cx={markerX}
            cy={markerY}
            r={12}
            fill={frame >= sweepEnd ? EYE_RED : AMBER_HI}
          />
          <circle
            cx={markerX}
            cy={markerY}
            r={4}
            fill={CHALK}
            opacity={0.9}
          />
        </g>

        {/* Cartouche strip at the bottom of the plate — hosts the equation
            and occludes the southern quadrant of the dial. */}
        <g opacity={plateT}>
          <rect
            x={FRAME.x}
            y={CARTOUCHE_Y}
            width={FRAME.w}
            height={CARTOUCHE_H}
            fill={INK}
          />
          <line
            x1={FRAME.x + 24}
            y1={CARTOUCHE_Y}
            x2={FRAME.x + FRAME.w - 24}
            y2={CARTOUCHE_Y}
            stroke={AMBER}
            strokeOpacity={0.55}
            strokeWidth={1}
          />
          <line
            x1={FRAME.x + 24}
            y1={CARTOUCHE_Y + 2}
            x2={FRAME.x + FRAME.w - 24}
            y2={CARTOUCHE_Y + 2}
            stroke={AMBER}
            strokeOpacity={0.18}
            strokeWidth={1}
          />
        </g>

        {/* Equation inside the cartouche */}
        <g
          opacity={interpolate(frame, [F(2.6), F(3.6)], [0, 1], {
            easing: Easing.out(Easing.cubic),
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })}
        >
          <text
            x={540}
            y={CARTOUCHE_Y + 54}
            textAnchor="middle"
            fill={CHALK}
            fontFamily={playfair}
            fontStyle="italic"
            fontSize={30}
            letterSpacing={0.4}
          >
            <tspan fill={AMBER_HI} fontWeight={600}>
              lcm
            </tspan>
            <tspan>(17, </tspan>
            <tspan>p</tspan>
            <tspan>) = 17</tspan>
            <tspan>p</tspan>
            <tspan fill={CHALK_DIM}>{"    for every "}</tspan>
            <tspan>p</tspan>
            <tspan fill={CHALK_DIM}> ∈ {"{"}2, …, 16{"}"}</tspan>
          </text>
          <text
            x={540}
            y={CARTOUCHE_Y + 86}
            textAnchor="middle"
            fill={CHALK_DIM}
            fontFamily={inter}
            fontSize={11}
            letterSpacing={3.6}
            fontWeight={500}
          >
            NO PREDATOR CYCLE SHORTER THAN 17 DIVIDES IN
          </text>
        </g>

        {/* Bottom caption strip */}
        <g opacity={plateT}>
          <text
            x={80}
            y={1068}
            fill={CHALK_DIM}
            fontFamily={inter}
            fontSize={11}
            letterSpacing={3}
            fontWeight={500}
          >
            FIG. 1 · 17-TICK DIAL WITH PRIMES 2 · 3 · 5 · 7 · 11 · 13 · 17
          </text>
          <text
            x={1000}
            y={1068}
            textAnchor="end"
            fill={AMBER}
            fontFamily={inter}
            fontSize={11}
            letterSpacing={3}
            fontWeight={500}
            opacity={0.9}
          >
            THE ONLY PRIME LANDING IS THE EMERGENCE
          </text>
        </g>
      </svg>

      {/* Hook prose */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 1120,
          opacity: hookT,
          transform: `translateY(${interpolate(hookT, [0, 1], [10, 0])}px)`,
          color: "#D8D2BE",
          fontFamily: inter,
          fontSize: 20,
          lineHeight: 1.4,
          fontWeight: 400,
          maxWidth: 940,
        }}
      >
        <span style={{ fontFamily: playfair, fontStyle: "italic", color: CHALK }}>
          Magicicada septendecim
        </span>{" "}
        spends exactly{" "}
        <span style={{ color: EYE_RED, fontWeight: 600 }}>17 years</span>{" "}
        underground before a brief above-ground emergence. 17 is prime, so any
        predator with a cycle{" "}
        <span style={{ fontStyle: "italic" }}>p</span> {"<"} 17 next meets the
        brood only every{" "}
        <span style={{ color: AMBER_HI, fontWeight: 600 }}>17p</span> years —
        the longest stagger a shorter cycle can hold.
      </div>

      {/* Footer */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          bottom: 44,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          color: GRAY,
          fontFamily: inter,
          fontSize: 11,
          letterSpacing: 3,
          textTransform: "uppercase",
          fontWeight: 500,
          opacity: plateT,
        }}
      >
        <span>Yoshimura · Am. Nat. 149 (1997) 112–124</span>
        <span>
          <span style={{ color: EYE_RED }}>●</span> Prime = Emergence
        </span>
      </div>
    </AbsoluteFill>
  );
};
