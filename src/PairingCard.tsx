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

// Palette — from the concept's visual brief
const INK = "#0B0F0C";
const FOREST_DEEP = "#131A15";
const AMBER = "#C9884A";
const AMBER_GLOW = "#F0D48A";
const GRAY = "#8A8478";
const RULE = "#20291F";
const RULE_MAJOR = "#2E3B2D";

// ── Page ──────────────────────────────────────────────────────────────
const W = 1080;
const H = 1350;

// The specimen plate — bordered area
const PLATE = { x: 72, y: 132, w: 936, h: 720 };

// Vertical anatomy of the plate: forest floor at the bottom, marionette
// cross floating near the top, leaf midvein 25 cm above the floor.
const GROUND_Y = PLATE.y + PLATE.h - 46;
const LEAF_Y = PLATE.y + 260;
const CROSS_Y = PLATE.y + 60;

// The ant clamps upside-down onto the leaf midvein at this x. Slightly
// left of centre so there is room on the right for the muscle inset.
const CLAMP = { x: PLATE.x + 388, y: LEAF_Y };

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

// ── Ant (silhouette, viewed from below, hanging jaw-up from a leaf) ────
// Local coords: (0, 0) is the tip of the mandibles (i.e. on the leaf midvein).
// Positive y goes DOWN (into the plate, away from the leaf).
const Ant: React.FC<{ clampProgress: number }> = ({ clampProgress }) => {
  const openDeg = interpolate(clampProgress, [0, 1], [30, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const scale = 1.55;
  return (
    <g transform={`translate(${CLAMP.x}, ${CLAMP.y}) scale(${scale})`}>
      {/* Mandibles */}
      <g strokeLinecap="round" strokeLinejoin="round" stroke={AMBER} fill="none">
        <path
          d={`M 0 0 Q -5 9 -12 18`}
          strokeWidth={2.2}
          transform={`rotate(${-openDeg} 0 0)`}
        />
        <path
          d={`M 0 0 Q 5 9 12 18`}
          strokeWidth={2.2}
          transform={`rotate(${openDeg} 0 0)`}
        />
      </g>

      {/* Head — a rounded rectangle-ish ellipse */}
      <ellipse cx={0} cy={26} rx={17} ry={19} fill="#181F19" stroke={AMBER} strokeWidth={1.4} />

      {/* Antennae — thin, elbowed */}
      <g fill="none" stroke={AMBER} strokeWidth={1.1} strokeLinecap="round">
        <path d={`M -8 16 Q -24 12 -34 22 Q -40 30 -42 40`} />
        <path d={`M 8 16 Q 24 12 34 22 Q 40 30 42 40`} />
      </g>

      {/* Petiole (neck) */}
      <path
        d={`M -4 44 Q 0 47 4 44 L 4 52 Q 0 55 -4 52 Z`}
        fill="#181F19"
        stroke={AMBER}
        strokeWidth={1.2}
      />

      {/* Mesosoma / thorax */}
      <ellipse cx={0} cy={72} rx={15} ry={22} fill="#181F19" stroke={AMBER} strokeWidth={1.4} />

      {/* Waist nodes */}
      <circle cx={0} cy={99} r={4.5} fill="#181F19" stroke={AMBER} strokeWidth={1.2} />
      <circle cx={0} cy={109} r={4} fill="#181F19" stroke={AMBER} strokeWidth={1.2} />

      {/* Gaster (abdomen) */}
      <ellipse cx={0} cy={144} rx={22} ry={30} fill="#181F19" stroke={AMBER} strokeWidth={1.5} />
      {/* Faint gaster segments */}
      <g stroke={AMBER} strokeOpacity={0.28} strokeWidth={0.8} fill="none">
        <path d={`M -21 132 Q 0 138 21 132`} />
        <path d={`M -22 148 Q 0 154 22 148`} />
        <path d={`M -20 162 Q 0 168 20 162`} />
      </g>

      {/* Six legs — three-jointed, spread wider so they read as a starburst */}
      <g fill="none" stroke={AMBER} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        {/* Left legs (front → mid → hind) — each fanned out at a distinct angle */}
        <path d={`M -13 60 Q -46 46 -68 34 Q -84 26 -92 18`} />
        <path d={`M -14 78 Q -48 78 -72 92 Q -88 108 -94 132`} />
        <path d={`M -12 96 Q -44 116 -60 148 Q -68 178 -60 198`} />
        {/* Right legs */}
        <path d={`M 13 60 Q 46 46 68 34 Q 84 26 92 18`} />
        <path d={`M 14 78 Q 48 78 72 92 Q 88 108 94 132`} />
        <path d={`M 12 96 Q 44 116 60 148 Q 68 178 60 198`} />
      </g>

      {/* A faint "brain" region inside the head (to be called-out separately) */}
      <ellipse cx={0} cy={20} rx={7} ry={5.5} fill="none" stroke={AMBER_GLOW} strokeWidth={0.8} opacity={0.65} strokeDasharray="2 2" />
    </g>
  );
};

// ── Fungal stroma erupting from the ant's head, curving up past the leaf,
//    ending in a bulbous perithecial club well within the plate ─────────
const Stroma: React.FC<{ progress: number }> = ({ progress }) => {
  // Base at top-back of ant head; tip up-left, well above leaf but well
  // inside the plate. Bulb fits above the leaf.
  const scale = 1.55;
  // Anchor slightly BEHIND the ant's head (i.e. deeper into the head volume,
  // between the head and the leaf midvein) so the stroma reads as erupting
  // through the head + puncturing the leaf, not as a mandible.
  const baseX = CLAMP.x - 6 * scale;
  const baseY = CLAMP.y + 14; // just below the leaf midvein, in head territory
  const tipX = CLAMP.x - 96;
  const tipY = PLATE.y + 108;

  const bulbR = interpolate(progress, [0.55, 1], [0, 18], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const LEN = 320;
  const offset = LEN * (1 - clamp01(progress / 0.9));

  // Control points — graceful curve rising up-left, crossing the leaf plane
  const c1x = CLAMP.x - 12;
  const c1y = CLAMP.y - 60;
  const c2x = CLAMP.x - 70;
  const c2y = CLAMP.y - 150;

  return (
    <g>
      {/* Ambient glow */}
      <path
        d={`M ${baseX} ${baseY} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${tipX} ${tipY}`}
        stroke={AMBER}
        strokeWidth={12}
        strokeOpacity={0.14}
        strokeLinecap="round"
        fill="none"
        strokeDasharray={LEN}
        strokeDashoffset={offset}
      />
      {/* Body */}
      <path
        d={`M ${baseX} ${baseY} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${tipX} ${tipY}`}
        stroke={AMBER}
        strokeWidth={3.4}
        strokeLinecap="round"
        fill="none"
        strokeDasharray={LEN}
        strokeDashoffset={offset}
      />
      {/* Inner highlight */}
      <path
        d={`M ${baseX} ${baseY} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${tipX} ${tipY}`}
        stroke={AMBER_GLOW}
        strokeWidth={1.1}
        strokeOpacity={0.75}
        strokeLinecap="round"
        fill="none"
        strokeDasharray={LEN}
        strokeDashoffset={offset}
      />
      {/* Perithecial club */}
      {bulbR > 0.5 && (
        <g>
          <ellipse cx={tipX} cy={tipY} rx={bulbR + 12} ry={bulbR * 1.4 + 12} fill={AMBER} opacity={0.16} />
          <ellipse
            cx={tipX}
            cy={tipY}
            rx={bulbR}
            ry={bulbR * 1.3}
            fill="#3A2B18"
            stroke={AMBER}
            strokeWidth={1.6}
          />
          {/* Perithecial ostioles (little pores dotting the club) */}
          {Array.from({ length: 14 }).map((_, i) => {
            const a = (i / 14) * Math.PI * 2;
            const rr = bulbR * 0.6;
            return (
              <circle
                key={i}
                cx={tipX + Math.cos(a) * rr}
                cy={tipY + Math.sin(a) * rr * 1.25}
                r={1.7}
                fill={AMBER_GLOW}
                opacity={0.85}
              />
            );
          })}
          {/* Callout label to the right of the club */}
          <line
            x1={tipX + bulbR + 6}
            y1={tipY}
            x2={tipX + bulbR + 40}
            y2={tipY}
            stroke={GRAY}
            strokeOpacity={0.75}
            strokeWidth={0.9}
          />
          <text
            x={tipX + bulbR + 46}
            y={tipY - 4}
            fontFamily={inter}
            fontSize={10}
            letterSpacing={2.4}
            fontWeight={600}
            fill={AMBER}
          >
            PERITHECIAL
          </text>
          <text
            x={tipX + bulbR + 46}
            y={tipY + 10}
            fontFamily={inter}
            fontSize={10}
            letterSpacing={2.4}
            fontWeight={500}
            fill={GRAY}
          >
            CLUB
          </text>
        </g>
      )}

      {/* A tiny "puncture" mark where the stroma crosses the leaf plane */}
      {progress > 0.3 && (
        <g>
          <ellipse
            cx={CLAMP.x - 32}
            cy={LEAF_Y}
            rx={7}
            ry={2.2}
            fill={INK}
            stroke={AMBER}
            strokeOpacity={0.7}
            strokeWidth={0.9}
          />
        </g>
      )}
    </g>
  );
};

// ── Marionette control cross + strings that descend into the ant ───────
const Marionette: React.FC<{ progress: number; sway: number }> = ({ progress, sway }) => {
  const scale = 1.55;
  const cx = CLAMP.x + 30;
  const cy = CROSS_Y;

  // Targets on the ant body — head, thorax, mid-leg tips (in absolute coords).
  // Deliberately land on body segments (not near the mandible tips) so the
  // strings do not tangle with the antennae and clamped jaws.
  const targets = [
    { x: CLAMP.x - 22, y: CLAMP.y + 46 * scale }, // left head side
    { x: CLAMP.x + 22, y: CLAMP.y + 46 * scale }, // right head side
    { x: CLAMP.x - 20, y: CLAMP.y + 96 * scale }, // thorax left
    { x: CLAMP.x + 20, y: CLAMP.y + 96 * scale }, // thorax right
    { x: CLAMP.x - 94 * scale, y: CLAMP.y + 132 * scale }, // outer-left mid-leg tip
    { x: CLAMP.x + 94 * scale, y: CLAMP.y + 132 * scale }, // outer-right mid-leg tip
  ];

  // Anchor points along the cross
  const anchors = [
    { x: cx - 68, y: cy + 6 },
    { x: cx - 40, y: cy + 6 },
    { x: cx - 16, y: cy + 6 },
    { x: cx + 16, y: cy + 6 },
    { x: cx + 40, y: cy + 6 },
    { x: cx + 68, y: cy + 6 },
  ];

  const stringOpacity = interpolate(progress, [0, 0.6, 1], [0, 0.6, 0.75], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <g>
      {/* Puppeteer control-cross */}
      <g transform={`translate(${cx}, ${cy})`} stroke={AMBER} strokeLinecap="round" fill="none">
        <line x1={-80} y1={0} x2={80} y2={0} strokeWidth={2.6} />
        <line x1={0} y1={-24} x2={0} y2={12} strokeWidth={2.6} />
        <circle cx={0} cy={-30} r={4.5} strokeWidth={1.8} />
        {/* End caps */}
        <circle cx={-80} cy={0} r={2.4} fill={AMBER} />
        <circle cx={80} cy={0} r={2.4} fill={AMBER} />
      </g>
      {/* Cross label */}
      <text
        x={cx + 100}
        y={cy - 2}
        fontFamily={inter}
        fontSize={10}
        letterSpacing={2.6}
        fontWeight={600}
        fill={AMBER}
      >
        CONTROL
      </text>
      <text
        x={cx + 100}
        y={cy + 12}
        fontFamily={inter}
        fontSize={10}
        letterSpacing={2}
        fontWeight={500}
        fill={GRAY}
      >
        (the fungus)
      </text>

      {/* Strings — curved, hair-thin, tinted amber */}
      {targets.map((t, i) => {
        const a = anchors[i];
        const wob = Math.sin(sway + i * 0.9) * 1.2;
        const midX = (a.x + t.x) / 2 + wob;
        const midY = (a.y + t.y) / 2 - 12;
        return (
          <path
            key={i}
            d={`M ${a.x} ${a.y} Q ${midX} ${midY} ${t.x} ${t.y}`}
            stroke={AMBER_GLOW}
            strokeOpacity={stringOpacity}
            strokeWidth={0.9}
            fill="none"
            strokeLinecap="round"
          />
        );
      })}

      {/* Anchor dots */}
      {anchors.map((a, i) => (
        <circle
          key={`a${i}`}
          cx={a.x}
          cy={a.y}
          r={1.6}
          fill={AMBER}
          opacity={stringOpacity + 0.2}
        />
      ))}
    </g>
  );
};

// ── Leaf: a horizontal blade with midvein ──────────────────────────────
const Leaf: React.FC = () => {
  const y = LEAF_Y;
  const x0 = PLATE.x + 90;
  const x1 = PLATE.x + PLATE.w - 90;
  const mx = (x0 + x1) / 2;
  const top = `M ${x0} ${y} Q ${mx} ${y - 40}, ${x1} ${y}`;
  const bot = `M ${x0} ${y} Q ${mx} ${y + 34}, ${x1} ${y}`;
  return (
    <g>
      {/* Fill */}
      <path
        d={`${top} L ${x1} ${y} ${bot.replace("M ", "L ")} Z`}
        fill="#182115"
        stroke="none"
      />
      {/* Outline */}
      <path d={top} stroke={GRAY} strokeWidth={1.1} fill="none" opacity={0.7} />
      <path d={bot} stroke={GRAY} strokeWidth={1.1} fill="none" opacity={0.7} />
      {/* Midvein */}
      <line x1={x0} y1={y} x2={x1} y2={y} stroke={GRAY} strokeWidth={1.3} opacity={0.85} />
      {/* Lateral veins */}
      {[-0.32, -0.16, 0.16, 0.32].map((f, i) => {
        const cx = mx + (x1 - x0) * 0.5 * f;
        const dir = f < 0 ? -1 : 1;
        return (
          <g key={i} stroke={GRAY} strokeOpacity={0.32} strokeWidth={0.8} fill="none">
            <path d={`M ${cx} ${y} Q ${cx + dir * 40} ${y - 16} ${cx + dir * 96} ${y - 30}`} />
            <path d={`M ${cx} ${y} Q ${cx + dir * 40} ${y + 14} ${cx + dir * 96} ${y + 26}`} />
          </g>
        );
      })}
      {/* Petiole leading off the right */}
      <path
        d={`M ${x1} ${y} Q ${x1 + 30} ${y - 4} ${x1 + 60} ${y - 14}`}
        stroke={GRAY}
        strokeWidth={1.1}
        fill="none"
        opacity={0.55}
      />
    </g>
  );
};

// ── "Brain — not invaded" callout on the ant's head ────────────────────
const BrainCallout: React.FC<{ appear: number }> = ({ appear }) => {
  const scale = 1.55;
  const brainX = CLAMP.x;
  const brainY = CLAMP.y + 20 * scale;
  const anchorX = PLATE.x + PLATE.w - 300;
  const anchorY = LEAF_Y - 90;
  return (
    <g opacity={appear}>
      {/* Ring around the "brain" */}
      <ellipse
        cx={brainX}
        cy={brainY}
        rx={13}
        ry={10}
        fill="none"
        stroke={AMBER_GLOW}
        strokeWidth={1.1}
        strokeDasharray="2 2"
      />
      {/* Leader */}
      <path
        d={`M ${brainX + 12} ${brainY - 4}
            Q ${brainX + 80} ${brainY - 40}
              ${anchorX} ${anchorY}`}
        stroke={GRAY}
        strokeOpacity={0.7}
        strokeWidth={0.9}
        fill="none"
      />
      <circle cx={anchorX} cy={anchorY} r={2} fill={AMBER} />
      {/* Label block */}
      <g
        transform={`translate(${anchorX + 6}, ${anchorY - 6})`}
        fontFamily={inter}
        fill={GRAY}
      >
        <text
          fontSize={10}
          fontWeight={600}
          letterSpacing={2.4}
          fill={AMBER}
        >
          BRAIN
        </text>
        <text
          y={16}
          fontSize={10}
          fontWeight={500}
          letterSpacing={1.8}
        >
          not invaded (Fredericksen et al.)
        </text>
      </g>
    </g>
  );
};

// ── Inset diagram: muscle cross-section threaded with fungus ───────────
const MuscleInset: React.FC<{ appear: number }> = ({ appear }) => {
  const w = 240;
  const h = 216;
  const x = PLATE.x + PLATE.w - w - 30;
  const y = PLATE.y + PLATE.h - h - 90;
  const cx = x + w / 2;
  const cy = y + h / 2 + 20;
  const R = 76;
  const clipId = "muscle-clip-2";
  return (
    <g opacity={appear}>
      {/* Panel */}
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        fill={INK}
        stroke={GRAY}
        strokeOpacity={0.55}
        strokeWidth={1}
      />
      {/* Title — split across two lines to avoid overlap */}
      <text
        x={x + 12}
        y={y + 18}
        fill={GRAY}
        fontFamily={inter}
        fontSize={10}
        fontWeight={600}
        letterSpacing={2.4}
      >
        FIG. 2
      </text>
      <text
        x={x + w - 12}
        y={y + 18}
        textAnchor="end"
        fill={AMBER}
        fontFamily={inter}
        fontSize={10}
        fontWeight={600}
        letterSpacing={2.4}
      >
        ×400
      </text>
      <text
        x={x + 12}
        y={y + 34}
        fill={GRAY}
        fontFamily={inter}
        fontSize={10}
        fontWeight={500}
        letterSpacing={2}
        opacity={0.85}
      >
        MANDIBULAR MUSCLE
      </text>

      <defs>
        <clipPath id={clipId}>
          <circle cx={cx} cy={cy} r={R - 1} />
        </clipPath>
      </defs>

      {/* The microscope field */}
      <circle cx={cx} cy={cy} r={R} fill="#0F1611" stroke={GRAY} strokeOpacity={0.7} strokeWidth={0.8} />

      <g clipPath={`url(#${clipId})`}>
        {/* Muscle fibres — parallel wavy strands */}
        {Array.from({ length: 11 }).map((_, i) => {
          const yy = cy - R + (i * (R * 2)) / 10;
          return (
            <path
              key={`fib-${i}`}
              d={`M ${cx - R - 4} ${yy} Q ${cx} ${yy - 4} ${cx + R + 4} ${yy}`}
              stroke={GRAY}
              strokeOpacity={0.42}
              strokeWidth={2.8}
              fill="none"
            />
          );
        })}
        {/* Fungal network — connective mesh between fibres */}
        {Array.from({ length: 42 }).map((_, i) => {
          const a = (i / 42) * Math.PI * 2 + (i % 3) * 0.3;
          const rr = 12 + (i % 5) * 12;
          const px = cx + Math.cos(a) * rr;
          const py = cy + Math.sin(a) * rr * 0.9;
          const px2 = cx + Math.cos(a + 0.6) * (rr + 6);
          const py2 = cy + Math.sin(a + 0.6) * (rr + 6) * 0.9;
          return (
            <line
              key={`net-${i}`}
              x1={px}
              y1={py}
              x2={px2}
              y2={py2}
              stroke={AMBER}
              strokeOpacity={0.7}
              strokeWidth={1}
            />
          );
        })}
        {Array.from({ length: 50 }).map((_, i) => {
          const a = (i / 50) * Math.PI * 2 * 3;
          const rr = 6 + ((i * 7) % 60);
          const px = cx + Math.cos(a) * rr;
          const py = cy + Math.sin(a) * rr * 0.85;
          return (
            <circle
              key={`cell-${i}`}
              cx={px}
              cy={py}
              r={1.6}
              fill={AMBER_GLOW}
              opacity={0.9}
            />
          );
        })}
      </g>

      {/* Legend */}
      <g fontFamily={inter} fontSize={9.5} letterSpacing={1.6} fill={GRAY}>
        <line
          x1={x + 12}
          y1={y + h - 26}
          x2={x + 32}
          y2={y + h - 26}
          stroke={GRAY}
          strokeWidth={2.4}
          strokeOpacity={0.6}
        />
        <text x={x + 40} y={y + h - 22}>MUSCLE FIBRE</text>
        <circle cx={x + 22} cy={y + h - 10} r={2} fill={AMBER} />
        <text x={x + 40} y={y + h - 6}>FUNGAL CELL NETWORK</text>
      </g>
    </g>
  );
};

// ── Ground line and forest-floor hatch at the plate bottom ─────────────
const Ground: React.FC = () => {
  const y = GROUND_Y;
  const x0 = PLATE.x + 30;
  const x1 = PLATE.x + PLATE.w - 30;
  return (
    <g>
      <line x1={x0} y1={y} x2={x1} y2={y} stroke={GRAY} strokeWidth={1.2} opacity={0.85} />
      {/* Tiny hatch marks below the ground line */}
      {Array.from({ length: 40 }).map((_, i) => {
        const px = x0 + (i * (x1 - x0)) / 40;
        return (
          <line
            key={i}
            x1={px}
            y1={y}
            x2={px - 6}
            y2={y + 10}
            stroke={GRAY}
            strokeOpacity={0.4}
            strokeWidth={0.9}
          />
        );
      })}
      <text
        x={x0 + 4}
        y={y + 24}
        fontFamily={inter}
        fontSize={10}
        letterSpacing={2.4}
        fontWeight={600}
        fill={GRAY}
        opacity={0.75}
      >
        FOREST FLOOR
      </text>
    </g>
  );
};

// ── Height rule down the left side (ground → leaf) ─────────────────────
const HeightRule: React.FC = () => {
  const x = PLATE.x + 40;
  const top = LEAF_Y;
  const bot = GROUND_Y;
  const ticks = 4;
  return (
    <g stroke={GRAY} strokeWidth={1} fill={GRAY} fontFamily={inter}>
      {/* Vertical bar */}
      <line x1={x} y1={top} x2={x} y2={bot} strokeOpacity={0.75} />
      {/* End caps */}
      <line x1={x - 6} y1={top} x2={x + 6} y2={top} strokeOpacity={0.95} />
      <line x1={x - 6} y1={bot} x2={x + 6} y2={bot} strokeOpacity={0.95} />
      {/* Intermediate ticks */}
      {Array.from({ length: ticks }).map((_, i) => {
        const yy = top + ((bot - top) * (i + 1)) / (ticks + 1);
        return <line key={i} x1={x - 3} y1={yy} x2={x + 3} y2={yy} strokeOpacity={0.45} />;
      })}
      {/* Top label — 25 cm (positioned to avoid the leaf's lateral vein) */}
      <text
        x={x + 12}
        y={top - 16}
        fontSize={11}
        letterSpacing={2.4}
        fontWeight={700}
        stroke="none"
        fill={AMBER}
      >
        ~25 CM
      </text>
      <text
        x={x + 12}
        y={top - 4}
        fontSize={9.5}
        letterSpacing={1.8}
        fontWeight={500}
        stroke="none"
        opacity={0.72}
      >
        death-grip height
      </text>
      {/* Bottom label — 0 cm */}
      <text
        x={x + 12}
        y={bot - 4}
        fontSize={11}
        letterSpacing={2.4}
        fontWeight={700}
        stroke="none"
      >
        0 CM
      </text>
    </g>
  );
};

// ── Drifting spores near the perithecial tip ───────────────────────────
const Spores: React.FC<{ t: number }> = ({ t }) => {
  if (t < 0.7) return null;
  const tipX = CLAMP.x - 74;
  const tipY = PLATE.y + 118;
  const localT = (t - 0.7) / 0.3;
  return (
    <g opacity={0.7}>
      {Array.from({ length: 16 }).map((_, i) => {
        const seed = (i * 47.3) % 100;
        const rise = ((localT * 55) + i * 6.5) % 80;
        const drift = Math.sin(seed) * 18;
        const px = tipX + drift * 0.5 + (i % 2 === 0 ? -6 : 6);
        const py = tipY - rise - 20;
        const op = Math.max(0, 1 - rise / 75);
        return (
          <circle
            key={i}
            cx={px}
            cy={py}
            r={1.4}
            fill={AMBER_GLOW}
            opacity={op * 0.7}
          />
        );
      })}
    </g>
  );
};

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const growSpan = fps * 3.6;
  const t = clamp01(Math.max(0, frame) / growSpan);

  const clampProgress = interpolate(frame, [4, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const titleSpring = spring({
    frame: frame - fps * 0.5,
    fps,
    config: { damping: 200, mass: 0.85 },
  });

  const hookOpacity = interpolate(frame, [fps * 1.1, fps * 2.0], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const insetAppear = interpolate(frame, [fps * 1.6, fps * 2.4], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const brainAppear = interpolate(frame, [fps * 1.2, fps * 1.9], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const marionetteProgress = interpolate(frame, [fps * 0.6, fps * 2.0], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const sway = (frame / fps) * 1.2;

  return (
    <AbsoluteFill style={{ backgroundColor: INK, fontFamily: inter }}>
      <style>{fontCss}</style>

      {/* Page vignette */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 50% 34%, rgba(30,42,32,0.32), rgba(11,15,12,1) 78%)",
        }}
      />

      {/* Top metadata band */}
      <div
        style={{
          position: "absolute",
          top: 60,
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
        <span style={{ color: AMBER }}>2026 · 09 · 06</span>
      </div>

      {/* Main SVG plate */}
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          <pattern
            id="plate-grid"
            x={PLATE.x}
            y={PLATE.y}
            width={48}
            height={48}
            patternUnits="userSpaceOnUse"
          >
            <path d={`M 48 0 L 0 0 0 48`} fill="none" stroke={RULE} strokeWidth={1} />
          </pattern>
          <pattern
            id="plate-grid-major"
            x={PLATE.x}
            y={PLATE.y}
            width={192}
            height={192}
            patternUnits="userSpaceOnUse"
          >
            <path d={`M 192 0 L 0 0 0 192`} fill="none" stroke={RULE_MAJOR} strokeWidth={1} />
          </pattern>
          <radialGradient id="plate-fill" cx="50%" cy="40%" r="70%">
            <stop offset="0%" stopColor="#1A241D" stopOpacity={1} />
            <stop offset="100%" stopColor={FOREST_DEEP} stopOpacity={1} />
          </radialGradient>
        </defs>

        {/* Plate */}
        <rect x={PLATE.x} y={PLATE.y} width={PLATE.w} height={PLATE.h} fill="url(#plate-fill)" />
        <rect x={PLATE.x} y={PLATE.y} width={PLATE.w} height={PLATE.h} fill="url(#plate-grid)" />
        <rect x={PLATE.x} y={PLATE.y} width={PLATE.w} height={PLATE.h} fill="url(#plate-grid-major)" />
        <rect
          x={PLATE.x + 0.5}
          y={PLATE.y + 0.5}
          width={PLATE.w - 1}
          height={PLATE.h - 1}
          fill="none"
          stroke="#38443A"
          strokeWidth={1}
        />

        {/* Crop marks */}
        {(
          [
            [PLATE.x, PLATE.y, 1, 1],
            [PLATE.x + PLATE.w, PLATE.y, -1, 1],
            [PLATE.x, PLATE.y + PLATE.h, 1, -1],
            [PLATE.x + PLATE.w, PLATE.y + PLATE.h, -1, -1],
          ] as const
        ).map(([cx, cy, sx, sy], i) => (
          <g key={i} stroke={AMBER} strokeWidth={1.5} fill="none">
            <line x1={cx} y1={cy} x2={cx + sx * 24} y2={cy} />
            <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 24} />
          </g>
        ))}

        {/* Height rule */}
        <HeightRule />

        {/* Ground line */}
        <Ground />

        {/* Marionette (behind everything except plate) */}
        <Marionette progress={marionetteProgress} sway={sway} />

        {/* Leaf sits above the ant so we render it first so ant hangs "under" it */}
        <Leaf />

        {/* Ant */}
        <Ant clampProgress={clampProgress} />

        {/* Fungal stroma */}
        <Stroma progress={t} />

        {/* Drifting spores */}
        <Spores t={t} />

        {/* Brain callout */}
        <BrainCallout appear={brainAppear} />

        {/* Inset diagram (bottom-right of the plate) */}
        <MuscleInset appear={insetAppear} />

        {/* Caption below plate */}
        <g
          transform={`translate(${PLATE.x}, ${PLATE.y + PLATE.h + 24})`}
          fill={GRAY}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
        >
          <text>FIG. 1 · O. UNILATERALIS ON CAMPONOTUS SP. · DEATH-GRIP POSTURE</text>
          <text x={PLATE.w} textAnchor="end" fill={AMBER} opacity={0.9}>
            FUNGAL BIOMASS ≈ 40% OF HEAD INTERIOR
          </text>
        </g>
      </svg>

      {/* ── Type lockup ────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 908,
          opacity: titleSpring,
          transform: `translateY(${interpolate(titleSpring, [0, 1], [16, 0])}px)`,
        }}
      >
        <div
          style={{
            color: AMBER,
            fontFamily: inter,
            fontSize: 13,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 18,
            fontWeight: 600,
          }}
        >
          Role <span style={{ color: GRAY, margin: "0 4px" }}>/</span>
          <span style={{ color: "#EDEDEF", letterSpacing: 5 }}>Puppeteer</span>
        </div>

        <div
          style={{
            color: "#F4F4F6",
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 80,
            lineHeight: 0.98,
            letterSpacing: -1.3,
            fontStyle: "italic",
          }}
        >
          The puppeteer
          <br />
          with no brain to read.
        </div>

        <div
          style={{
            marginTop: 26,
            color: "#C8CAC0",
            fontFamily: inter,
            fontSize: 19,
            lineHeight: 1.42,
            fontWeight: 400,
            maxWidth: 900,
            opacity: hookOpacity,
          }}
        >
          <span style={{ color: AMBER, fontWeight: 600 }}>
            Ophiocordyceps unilateralis
          </span>{" "}
          threads a physical network of fungal cells through a carpenter ant's
          jaw muscles — never touching its brain — and steers it to bite the
          underside of a leaf ~25 cm above the forest floor before killing it.
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          bottom: 46,
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
        <span>Fredericksen et al. · PNAS 114 (2017) 12590–12595</span>
        <span>
          <span style={{ color: AMBER }}>●</span> Fungal cell
        </span>
      </div>
    </AbsoluteFill>
  );
};
