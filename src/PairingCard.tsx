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

// Palette — from Alcedo atthis plumage
const INK = "#0B1424";
const BOARD = "#0E1A2E";
const COBALT = "#1F3B70";
const TURQUOISE = "#3FBEC9";
const RUST = "#E86A2C";
const CREAM = "#F0EAD6";
const GRAY = "#8A8F99";
const GRID = "#132139";
const GRID_MAJOR = "#1A2A46";

// ── Composition constants ─────────────────────────────────────────
// Canvas 1080 × 1350 portrait
// Drafting frame occupies upper ~57% of canvas
const FRAME = { x: 60, y: 110, w: 960, h: 680 };

// Shared PROFILE CURVE (in SVG userspace):
// Both the bird's beak upper-edge AND the train's nose upper-edge trace
// this same Bezier. It's drawn twice — once for the bird panel, once
// for the train panel — vertically offset, and highlighted in cyan
// to make the equivalence the visual argument of the piece.

// Anchor: (x0, y0) → (x1, y1) with a control point set so the curve
// starts nearly horizontal and gently descends, then flattens toward
// the tip — the ballistic curve of a splash-less entry.
const PROFILE = {
  // width & height in the local panel
  w: 400,
  h: 90,
  // The Bezier control points (relative to panel origin)
  p0: { x: 0, y: 0 },
  c1: { x: 220, y: 8 },
  c2: { x: 320, y: 46 },
  p1: { x: 400, y: 90 },
};
const profilePath = (dx: number, dy: number) =>
  `M ${dx + PROFILE.p0.x} ${dy + PROFILE.p0.y}
   C ${dx + PROFILE.c1.x} ${dy + PROFILE.c1.y},
     ${dx + PROFILE.c2.x} ${dy + PROFILE.c2.y},
     ${dx + PROFILE.p1.x} ${dy + PROFILE.p1.y}`;

const PROFILE_LEN = 460;

// ── Panel origins ────────────────────────────────────────────────
// Bird head panel: the beak upper-edge starts at (BIRD_BEAK_X, BIRD_BEAK_Y)
// Train nose panel: the nose upper-edge starts at (TRAIN_NOSE_X, TRAIN_NOSE_Y)
// Both tips are aligned to the SAME vertical axis to make the equivalence
// unmistakable.
const TIP_X = FRAME.x + FRAME.w - 130; // right-aligned tips
const BIRD_BEAK_TOP = { x: TIP_X - PROFILE.w, y: FRAME.y + 90 };
const TRAIN_NOSE_TOP = { x: TIP_X - PROFILE.w, y: FRAME.y + 430 };
// Beak/nose tips (right ends of the profile curve)
const BIRD_TIP = { x: TIP_X, y: BIRD_BEAK_TOP.y + PROFILE.h };
const TRAIN_TIP = { x: TIP_X, y: TRAIN_NOSE_TOP.y + PROFILE.h };

// ── Kingfisher head (side profile, facing right) ─────────────────
const KingfisherHead: React.FC<{ opacity: number }> = ({ opacity }) => {
  // Head anchored so the beak base ATTACHES to the shared profile.
  // Head extends LEFT from the beak base.
  const bx = BIRD_BEAK_TOP.x; // beak base X (upper attach)
  const by = BIRD_BEAK_TOP.y; // beak base Y (upper attach)
  // Head centre roughly:
  const hcx = bx - 130;
  const hcy = by + 30;

  // Beak lower edge — a shallower curve from below the head to the tip,
  // giving the beak its dagger shape.
  const beakLowerStart = { x: bx - 12, y: by + 70 };
  const beakLowerCtrl1 = { x: bx + 180, y: by + 92 };
  const beakLowerCtrl2 = { x: bx + 300, y: by + 100 };
  const beakLower = `M ${beakLowerStart.x} ${beakLowerStart.y}
                     C ${beakLowerCtrl1.x} ${beakLowerCtrl1.y},
                       ${beakLowerCtrl2.x} ${beakLowerCtrl2.y},
                       ${BIRD_TIP.x} ${BIRD_TIP.y}`;
  const beakUpper = profilePath(bx, by);
  const beak = `${beakUpper} L ${BIRD_TIP.x} ${BIRD_TIP.y}
                ${beakLower.replace(/^M/, "L")}
                Z`;

  return (
    <g opacity={opacity}>
      {/* Nape / back — a rounded cobalt mass extending left */}
      <path
        d={`M ${hcx + 90} ${hcy - 60}
            C ${hcx + 40} ${hcy - 110}, ${hcx - 90} ${hcy - 90}, ${hcx - 140} ${hcy - 20}
            C ${hcx - 170} ${hcy + 30}, ${hcx - 160} ${hcy + 90}, ${hcx - 110} ${hcy + 110}
            C ${hcx - 40} ${hcy + 120}, ${hcx + 60} ${hcy + 100}, ${hcx + 110} ${hcy + 60}
            L ${hcx + 100} ${hcy + 30}
            L ${bx - 12} ${by + 70}
            L ${bx - 30} ${by + 20}
            L ${bx - 6} ${by - 6}
            C ${hcx + 90} ${hcy - 20}, ${hcx + 100} ${hcy - 50}, ${hcx + 90} ${hcy - 60} Z`}
        fill={COBALT}
      />
      {/* Turquoise dorsal stripe — the iridescent central patch running
          from crown down the back */}
      <path
        d={`M ${hcx - 100} ${hcy - 60}
            C ${hcx - 60} ${hcy - 90}, ${hcx + 40} ${hcy - 90}, ${hcx + 80} ${hcy - 50}
            C ${hcx + 30} ${hcy - 40}, ${hcx - 30} ${hcy - 30}, ${hcx - 90} ${hcy - 20}
            C ${hcx - 130} ${hcy - 10}, ${hcx - 130} ${hcy - 40}, ${hcx - 100} ${hcy - 60} Z`}
        fill={TURQUOISE}
        opacity={0.95}
      />
      {/* Turquoise flecks on cheek (small dots) */}
      {[
        [hcx - 30, hcy + 40, 4.5],
        [hcx + 0, hcy + 34, 3.8],
        [hcx + 26, hcy + 40, 3.8],
        [hcx - 60, hcy + 46, 3.4],
        [hcx + 10, hcy + 52, 3.2],
        [hcx - 40, hcy + 58, 3.0],
        [hcx + 40, hcy + 52, 3.0],
      ].map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill={TURQUOISE} opacity={0.9} />
      ))}
      {/* Rust cheek / breast panel */}
      <path
        d={`M ${hcx - 50} ${hcy + 30}
            C ${hcx - 30} ${hcy + 10}, ${hcx + 40} ${hcy + 12}, ${hcx + 80} ${hcy + 30}
            L ${hcx + 100} ${hcy + 60}
            C ${hcx + 40} ${hcy + 110}, ${hcx - 60} ${hcy + 120}, ${hcx - 100} ${hcy + 90}
            C ${hcx - 80} ${hcy + 60}, ${hcx - 60} ${hcy + 40}, ${hcx - 50} ${hcy + 30} Z`}
        fill={RUST}
        opacity={0.95}
      />
      {/* Cream throat — small stripe under chin */}
      <path
        d={`M ${hcx + 20} ${hcy + 42}
            C ${hcx + 50} ${hcy + 40}, ${hcx + 80} ${hcy + 46}, ${hcx + 100} ${hcy + 60}
            L ${hcx + 90} ${hcy + 76}
            C ${hcx + 60} ${hcy + 70}, ${hcx + 30} ${hcy + 66}, ${hcx + 10} ${hcy + 60}
            Z`}
        fill={CREAM}
        opacity={0.9}
      />
      {/* Beak — dark cobalt fill, upper edge highlighted separately (below) */}
      <path d={beak} fill={INK} stroke={COBALT} strokeWidth={1.2} />
      {/* Eye */}
      <circle cx={hcx + 10} cy={hcy - 10} r={6} fill={INK} />
      <circle cx={hcx + 12} cy={hcy - 12} r={1.6} fill={CREAM} opacity={0.9} />
      {/* Eye ring — subtle rust */}
      <circle
        cx={hcx + 10}
        cy={hcy - 10}
        r={9}
        fill="none"
        stroke={RUST}
        strokeWidth={1}
        opacity={0.6}
      />
    </g>
  );
};

// ── Shinkansen 500 nose + cab (side elevation, facing right) ─────
const ShinkansenNose: React.FC<{ opacity: number }> = ({ opacity }) => {
  const bx = TRAIN_NOSE_TOP.x; // nose upper-edge start
  const by = TRAIN_NOSE_TOP.y; // nose upper-edge start
  const tipX = TRAIN_TIP.x;
  const tipY = TRAIN_TIP.y;

  // Nose lower edge — a shallower matching curve so the whole nose
  // reads as a long tapered wedge.
  const noseLowerStart = { x: bx - 10, y: by + 128 };
  const noseLower = `M ${noseLowerStart.x} ${noseLowerStart.y}
                     C ${bx + 190} ${by + 138},
                       ${bx + 300} ${by + 130},
                       ${tipX} ${tipY}`;
  // Body extends LEFT from nose base
  const bodyLeftX = FRAME.x + 60;
  const bodyTopY = by - 10;
  const bodyBotY = by + 148;

  const noseShape = `${profilePath(bx, by)}
                     L ${tipX} ${tipY}
                     ${noseLower.replace(/^M/, "L")}
                     L ${bx - 10} ${by + 128}
                     L ${bx - 10} ${bodyTopY}
                     Z`;

  return (
    <g opacity={opacity}>
      {/* Rail line */}
      <line
        x1={FRAME.x + 30}
        y1={bodyBotY + 42}
        x2={FRAME.x + FRAME.w - 30}
        y2={bodyBotY + 42}
        stroke={GRAY}
        strokeWidth={0.8}
        strokeDasharray="4 6"
        opacity={0.55}
      />
      {/* Sleepers */}
      {Array.from({ length: 14 }).map((_, i) => {
        const x = FRAME.x + 40 + i * 65;
        return (
          <line
            key={i}
            x1={x}
            y1={bodyBotY + 40}
            x2={x}
            y2={bodyBotY + 46}
            stroke={GRAY}
            strokeWidth={0.8}
            opacity={0.45}
          />
        );
      })}
      {/* Body carriage (left of nose) */}
      <rect
        x={bodyLeftX}
        y={bodyTopY}
        width={bx - 10 - bodyLeftX}
        height={bodyBotY - bodyTopY}
        fill={COBALT}
      />
      {/* Cream underbelly strip */}
      <rect
        x={bodyLeftX}
        y={bodyBotY - 10}
        width={bx - 10 - bodyLeftX}
        height={6}
        fill={CREAM}
        opacity={0.35}
      />
      {/* Turquoise livery band along body midline */}
      <rect
        x={bodyLeftX}
        y={(bodyTopY + bodyBotY) / 2 - 8}
        width={bx - 10 - bodyLeftX}
        height={16}
        fill={TURQUOISE}
        opacity={0.85}
      />
      {/* Body windows */}
      {Array.from({ length: 4 }).map((_, i) => (
        <rect
          key={i}
          x={bodyLeftX + 30 + i * 105}
          y={bodyTopY + 22}
          width={72}
          height={26}
          rx={2}
          fill={INK}
          opacity={0.75}
        />
      ))}
      {/* Nose fill (cobalt) */}
      <path d={noseShape} fill={COBALT} />
      {/* Cab windshield — a dark trapezoid along the nose upper */}
      <path
        d={`M ${bx + 30} ${by + 12}
            L ${bx + 180} ${by + 46}
            L ${bx + 160} ${by + 72}
            L ${bx + 10} ${by + 40}
            Z`}
        fill={INK}
        opacity={0.85}
      />
      {/* Rust accent below nose (headlight strip) */}
      <rect
        x={bx + 200}
        y={by + 92}
        width={90}
        height={6}
        rx={2}
        fill={RUST}
        opacity={0.9}
      />
      {/* Wheel bogies */}
      {[0.15, 0.55, 0.9].map((f, i) => {
        const cx = bodyLeftX + (bx - 10 - bodyLeftX) * f;
        return (
          <g key={i} fill={INK} opacity={0.8}>
            <circle cx={cx - 16} cy={bodyBotY + 10} r={8} />
            <circle cx={cx + 16} cy={bodyBotY + 10} r={8} />
          </g>
        );
      })}
      {/* Cream nose-tip highlight small dot */}
      <circle cx={tipX} cy={tipY} r={3.5} fill={CREAM} opacity={0.9} />
    </g>
  );
};

// ── Blueprint frame + shared-profile highlight + annotations ─────
const Blueprint: React.FC<{
  curveDraw: number;
  frameFade: number;
}> = ({ curveDraw, frameFade }) => {
  const dashOffset = (1 - curveDraw) * PROFILE_LEN;

  return (
    <>
      {/* Board */}
      <rect
        x={FRAME.x}
        y={FRAME.y}
        width={FRAME.w}
        height={FRAME.h}
        fill={BOARD}
        opacity={frameFade}
      />
      {/* Grid */}
      <rect
        x={FRAME.x}
        y={FRAME.y}
        width={FRAME.w}
        height={FRAME.h}
        fill="url(#grid)"
        opacity={frameFade}
      />
      <rect
        x={FRAME.x}
        y={FRAME.y}
        width={FRAME.w}
        height={FRAME.h}
        fill="url(#grid-major)"
        opacity={frameFade}
      />
      {/* Inner border */}
      <rect
        x={FRAME.x + 0.5}
        y={FRAME.y + 0.5}
        width={FRAME.w - 1}
        height={FRAME.h - 1}
        fill="none"
        stroke="#22314F"
        strokeWidth={1}
        opacity={frameFade}
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
        <g
          key={i}
          stroke={TURQUOISE}
          strokeWidth={1.4}
          fill="none"
          opacity={frameFade * 0.9}
        >
          <line x1={cx} y1={cy} x2={cx + sx * 26} y2={cy} />
          <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 26} />
        </g>
      ))}

      {/* Vertical dashed axis at the shared tip alignment */}
      <line
        x1={TIP_X}
        y1={FRAME.y + 40}
        x2={TIP_X}
        y2={FRAME.y + FRAME.h - 40}
        stroke={GRAY}
        strokeWidth={0.8}
        strokeDasharray="3 7"
        opacity={frameFade * 0.55}
      />

      {/* Panel dividers — subtle horizontal rules separating bird / axis / train */}
      <line
        x1={FRAME.x + 40}
        y1={FRAME.y + 320}
        x2={FRAME.x + FRAME.w - 40}
        y2={FRAME.y + 320}
        stroke={GRID_MAJOR}
        strokeWidth={0.8}
        opacity={frameFade * 0.7}
        strokeDasharray="6 8"
      />

      {/* ── SHARED PROFILE — highlighted cyan on BOTH panels ─────── */}
      {/* Glow underlay bird */}
      <path
        d={profilePath(BIRD_BEAK_TOP.x, BIRD_BEAK_TOP.y)}
        stroke={TURQUOISE}
        strokeWidth={9}
        fill="none"
        strokeLinecap="round"
        strokeOpacity={0.22}
        strokeDasharray={PROFILE_LEN}
        strokeDashoffset={dashOffset}
        filter="url(#profile-glow)"
      />
      {/* Core bird */}
      <path
        d={profilePath(BIRD_BEAK_TOP.x, BIRD_BEAK_TOP.y)}
        stroke={TURQUOISE}
        strokeWidth={2.4}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={PROFILE_LEN}
        strokeDashoffset={dashOffset}
      />
      {/* Glow underlay train */}
      <path
        d={profilePath(TRAIN_NOSE_TOP.x, TRAIN_NOSE_TOP.y)}
        stroke={TURQUOISE}
        strokeWidth={9}
        fill="none"
        strokeLinecap="round"
        strokeOpacity={0.22}
        strokeDasharray={PROFILE_LEN}
        strokeDashoffset={dashOffset}
        filter="url(#profile-glow)"
      />
      {/* Core train */}
      <path
        d={profilePath(TRAIN_NOSE_TOP.x, TRAIN_NOSE_TOP.y)}
        stroke={TURQUOISE}
        strokeWidth={2.4}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={PROFILE_LEN}
        strokeDashoffset={dashOffset}
      />

      {/* Vertical congruence links — dashed cyan lines connecting the
          two identical curves at three sample x positions */}
      {[0.0, 0.5, 1.0].map((t, i) => {
        // Sample the cubic at parameter t
        const mt = 1 - t;
        const cx =
          mt * mt * mt * PROFILE.p0.x +
          3 * mt * mt * t * PROFILE.c1.x +
          3 * mt * t * t * PROFILE.c2.x +
          t * t * t * PROFILE.p1.x;
        const cy =
          mt * mt * mt * PROFILE.p0.y +
          3 * mt * mt * t * PROFILE.c1.y +
          3 * mt * t * t * PROFILE.c2.y +
          t * t * t * PROFILE.p1.y;
        const x = BIRD_BEAK_TOP.x + cx;
        const y1 = BIRD_BEAK_TOP.y + cy;
        const y2 = TRAIN_NOSE_TOP.y + cy;
        const linkOpacity =
          Math.min(1, Math.max(0, curveDraw - 0.6) * 3) * 0.7;
        return (
          <g key={i} opacity={linkOpacity}>
            <line
              x1={x}
              y1={y1 + 6}
              x2={x}
              y2={y2 - 6}
              stroke={TURQUOISE}
              strokeWidth={0.8}
              strokeDasharray="3 4"
            />
            <circle cx={x} cy={y1} r={3} fill={TURQUOISE} />
            <circle cx={x} cy={y2} r={3} fill={TURQUOISE} />
          </g>
        );
      })}

      {/* Callout: BEAK PROFILE — placed well above the bird, leader climbs from tip */}
      <g
        opacity={Math.min(1, Math.max(0, curveDraw - 0.4) * 2)}
        fill={GRAY}
        stroke={GRAY}
        fontFamily={inter}
        fontSize={12}
        fontWeight={600}
        letterSpacing={3.4}
      >
        <line
          x1={BIRD_TIP.x - 6}
          y1={BIRD_TIP.y - 12}
          x2={BIRD_TIP.x - 6}
          y2={FRAME.y + 42}
          strokeWidth={0.8}
        />
        <line
          x1={BIRD_TIP.x - 6}
          y1={FRAME.y + 42}
          x2={BIRD_TIP.x - 130}
          y2={FRAME.y + 42}
          strokeWidth={0.8}
        />
        <text
          x={BIRD_TIP.x - 12}
          y={FRAME.y + 32}
          stroke="none"
          textAnchor="end"
          fill={TURQUOISE}
        >
          BEAK PROFILE
        </text>
        <text
          x={BIRD_TIP.x - 12}
          y={FRAME.y + 58}
          stroke="none"
          fontSize={10}
          fontWeight={500}
          letterSpacing={2.5}
          textAnchor="end"
          fill={GRAY}
        >
          ALCEDO ATTHIS · ~40 MM
        </text>
      </g>

      {/* Callout: NOSE PROFILE — placed BELOW the train tip, anchored end-right */}
      <g
        opacity={Math.min(1, Math.max(0, curveDraw - 0.6) * 2)}
        fill={GRAY}
        stroke={GRAY}
        fontFamily={inter}
        fontSize={12}
        fontWeight={600}
        letterSpacing={3.4}
      >
        <line
          x1={TRAIN_TIP.x - 6}
          y1={TRAIN_TIP.y + 12}
          x2={TRAIN_TIP.x - 6}
          y2={TRAIN_TIP.y + 58}
          strokeWidth={0.8}
        />
        <line
          x1={TRAIN_TIP.x - 6}
          y1={TRAIN_TIP.y + 58}
          x2={TRAIN_TIP.x - 120}
          y2={TRAIN_TIP.y + 58}
          strokeWidth={0.8}
        />
        <text
          x={TRAIN_TIP.x - 12}
          y={TRAIN_TIP.y + 74}
          stroke="none"
          textAnchor="end"
          fill={TURQUOISE}
        >
          NOSE PROFILE
        </text>
        <text
          x={TRAIN_TIP.x - 12}
          y={TRAIN_TIP.y + 92}
          stroke="none"
          fontSize={10}
          fontWeight={500}
          letterSpacing={2.5}
          textAnchor="end"
          fill={GRAY}
        >
          SHINKANSEN 500 · ~15 M
        </text>
      </g>

      {/* SHARED PROFILE badge — small pill positioned between the two curves */}
      <g
        opacity={Math.min(1, Math.max(0, curveDraw - 0.85) * 3)}
        fontFamily={inter}
        fontSize={10}
        letterSpacing={3.5}
        fontWeight={600}
      >
        <rect
          x={FRAME.x + 40}
          y={(BIRD_TIP.y + TRAIN_TIP.y) / 2 - 14}
          width={200}
          height={28}
          rx={14}
          fill={INK}
          stroke={TURQUOISE}
          strokeWidth={1}
        />
        <text
          x={FRAME.x + 140}
          y={(BIRD_TIP.y + TRAIN_TIP.y) / 2 + 4}
          textAnchor="middle"
          fill={TURQUOISE}
        >
          A ≡ B · SHARED PROFILE
        </text>
      </g>

      {/* Panel index labels on far LEFT (small, subordinate) */}
      <g
        opacity={frameFade * 0.75}
        fill={GRAY}
        fontFamily={inter}
        fontSize={10}
        letterSpacing={3.5}
        fontWeight={600}
      >
        <text x={FRAME.x + 22} y={FRAME.y + 42}>
          A · AVES
        </text>
        <text x={FRAME.x + 22} y={FRAME.y + 382}>
          B · JR-WEST 500
        </text>
      </g>

      {/* FIG. 1 bottom-left of frame */}
      <g
        opacity={frameFade * 0.85}
        fill={GRAY}
        fontFamily={inter}
        fontSize={10}
        letterSpacing={3}
        fontWeight={500}
      >
        <text x={FRAME.x + 22} y={FRAME.y + FRAME.h - 22}>
          FIG. 1 · CONGRUENT LEADING‑EDGE PROFILE
        </text>
        <text
          x={FRAME.x + FRAME.w - 22}
          y={FRAME.y + FRAME.h - 22}
          textAnchor="end"
          fill={TURQUOISE}
          opacity={0.85}
        >
          BIOMIMETIC · 1997
        </text>
      </g>
    </>
  );
};

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ── Timing ────────────────────────────────────────────────────
  const frameFade = interpolate(frame, [0, fps * 0.35], [0, 1], {
    extrapolateRight: "clamp",
  });
  const curveDraw = interpolate(frame, [fps * 0.3, fps * 1.7], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const birdFade = interpolate(frame, [fps * 1.5, fps * 2.2], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const trainFade = interpolate(frame, [fps * 2.2, fps * 2.9], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
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

  return (
    <AbsoluteFill style={{ backgroundColor: INK, fontFamily: inter }}>
      <style>{fontCss}</style>

      {/* Top metadata band */}
      <div
        style={{
          position: "absolute",
          top: 46,
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
        <span style={{ color: TURQUOISE }}>2026 · 07 · 30</span>
      </div>

      {/* SVG drafting board */}
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
            width={40}
            height={40}
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke={GRID}
              strokeWidth={1}
            />
          </pattern>
          <pattern
            id="grid-major"
            x={FRAME.x}
            y={FRAME.y}
            width={160}
            height={160}
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 160 0 L 0 0 0 160"
              fill="none"
              stroke={GRID_MAJOR}
              strokeWidth={1}
            />
          </pattern>
          <filter
            id="profile-glow"
            x="-20%"
            y="-20%"
            width="140%"
            height="140%"
          >
            <feGaussianBlur stdDeviation="4" />
          </filter>
        </defs>

        <Blueprint curveDraw={curveDraw} frameFade={frameFade} />

        <KingfisherHead opacity={birdFade} />
        <ShinkansenNose opacity={trainFade} />
      </svg>

      {/* ── Type lockup ────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 860,
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
            color: TURQUOISE,
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
            Aerodynamic Engineer
          </span>
        </div>

        <div
          style={{
            color: "#F4F4F6",
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 76,
            lineHeight: 1.0,
            letterSpacing: -1.2,
            fontStyle: "italic",
          }}
        >
          The bird that
          <br />
          redesigned the
          <br />
          bullet train.
        </div>

        <div
          style={{
            marginTop: 26,
            color: "#C8CAD0",
            fontFamily: inter,
            fontSize: 18,
            lineHeight: 1.45,
            fontWeight: 400,
            maxWidth: 900,
            opacity: hookOpacity,
          }}
        >
          JR-West's Eiji Nakatsu reshaped the Shinkansen 500's 15-metre nose
          after the{" "}
          <span style={{ color: TURQUOISE, fontWeight: 600 }}>
            common kingfisher
          </span>
          's beak — killing the tunnel-boom pressure wave, cutting power use
          ~15%, and lifting top speed ~10%.
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          bottom: 40,
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
        <span>Nakatsu · JR-West · Shinkansen 500 · 1997</span>
        <span>
          <span style={{ color: TURQUOISE }}>●</span> Shared profile curve
        </span>
      </div>
    </AbsoluteFill>
  );
};
