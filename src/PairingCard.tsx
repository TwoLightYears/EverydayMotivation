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
const INK = "#0B0E09";
const PLATE = "#1A2114";
const OCHRE = "#C89B3C";
const SPORE = "#E8D28F";
const MOSS = "#5A6B2E";
const CHITIN = "#3D2B1A";
const GRID = "#1F2A19";
const GRID_MAJOR = "#28351F";
const GRAY = "#8C9078";

// ── Plate coordinate system ─────────────────────────────────────────────
// Root canvas: 1080 × 1350 portrait
// Metadata band : 0..110
// Field plate   : 130..841  (h 711, w 960)  → scale factor = 960/1080
// Type lockup   : 880..
// Footer        : 1290..
const FRAME = { x: 60, y: 130, w: 960, h: 711 };
const PLATE_W = 1080;
const PLATE_H = 800;
const SCALE = FRAME.w / PLATE_W; // = FRAME.h / PLATE_H

// Ant anchor in plate coords (facing right, clamped on leaf vein)
// Ant scaled ~2.2x from iter1; body length now spans ~430 px.
const ANT = {
  gasterX: 260, // back of abdomen
  thoraxX: 470,
  headX: 665,
  centerY: 610,
};

// Leaf vein — horizontal line the ant is clamped onto
// Moved down so ant clearly sits on it and text above doesn't collide.
const VEIN_Y = 640;
const VEIN_X1 = 130;
const VEIN_X2 = 970;

// Fungal stroma root: back of ant's head — anatomically where Ophiocordyceps
// erupts. Emerges at the head–pronotum boundary, curving up and slightly left.
const STROMA_ROOT = { x: 645, y: 552 };
const STROMA_TOP = { x: 590, y: 190 };

// Puppet-string anchor points on the ant (mandibles, forelegs, thorax)
type StringAnchor = { x: number; y: number; delay: number };
const STRINGS: StringAnchor[] = [
  { x: 738, y: 596, delay: 0.0 },  // upper mandible tip
  { x: 738, y: 640, delay: 0.06 }, // lower mandible tip
  { x: 610, y: 700, delay: 0.12 }, // front leg tip
  { x: 500, y: 715, delay: 0.16 }, // mid leg tip
  { x: 385, y: 700, delay: 0.2 },  // hind leg tip
];

const hashSeed = (s: string): number => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h = (h ^ s.charCodeAt(i)) * 16777619;
  }
  return ((h >>> 0) % 1000) / 1000;
};

// ── Deterministic hyphal network inside the ant body ───────────────────
type Hypha = { d: string; delay: number };
const buildHyphae = (): Hypha[] => {
  const out: Hypha[] = [];
  // Roots feeding into the ant body from the stroma base
  const root = { x: STROMA_ROOT.x, y: STROMA_ROOT.y };
  // Target endpoints spread through head, thorax, mandibles, gaster
  const targets: { x: number; y: number; delay: number }[] = [
    // Head / mandible cluster (right side, x ~665..720)
    { x: 700, y: 600, delay: 0.02 },
    { x: 720, y: 615, delay: 0.06 },
    { x: 705, y: 630, delay: 0.1 },
    { x: 685, y: 585, delay: 0.04 },
    { x: 720, y: 625, delay: 0.08 },
    // Prothorax / neck (x ~630..660)
    { x: 640, y: 600, delay: 0.05 },
    { x: 625, y: 620, delay: 0.09 },
    // Mesothorax (x ~500..560)
    { x: 540, y: 615, delay: 0.11 },
    { x: 505, y: 600, delay: 0.13 },
    { x: 520, y: 635, delay: 0.15 },
    // Metathorax → gaster (x ~250..430)
    { x: 445, y: 610, delay: 0.17 },
    { x: 400, y: 600, delay: 0.19 },
    { x: 350, y: 620, delay: 0.21 },
    { x: 310, y: 605, delay: 0.23 },
    { x: 270, y: 595, delay: 0.25 },
    // Legs — hyphae reaching the ends of the legs
    { x: 610, y: 700, delay: 0.22 },
    { x: 500, y: 715, delay: 0.24 },
    { x: 385, y: 700, delay: 0.26 },
  ];
  for (const t of targets) {
    const seed = hashSeed(`${t.x}|${t.y}`);
    const bendX = (seed - 0.5) * 70;
    const bendY = (seed - 0.5) * 40;
    const mx = (root.x + t.x) / 2 + bendX;
    const my = (root.y + t.y) / 2 + bendY;
    out.push({
      d: `M ${root.x} ${root.y} Q ${mx} ${my} ${t.x} ${t.y}`,
      delay: t.delay,
    });
  }
  return out;
};

const HYPHAE = buildHyphae();

// ── Perithecia dots on the fungal stroma ─────────────────────────────────
// The fruiting body sits at the very top of the stroma as a distinct swelling.
// Restrict perithecia to the top ~28% (a fatter club-head shape).
const buildPerithecia = () => {
  const dots: { x: number; y: number; r: number }[] = [];
  const seed = (i: number) => hashSeed(`p${i}`);
  const stromaVec = {
    x: STROMA_ROOT.x - STROMA_TOP.x,
    y: STROMA_ROOT.y - STROMA_TOP.y,
  };
  for (let i = 0; i < 90; i++) {
    // Along-axis in the top club (0..0.32 of stroma length)
    const along = 0.02 + (i / 90) * 0.30;
    const y = STROMA_TOP.y + along * stromaVec.y;
    const axisX = STROMA_TOP.x + along * stromaVec.x;
    // Club width: fattens then tapers
    const shape = Math.sin(Math.PI * (along / 0.32));
    const clubW = 26 * shape + 4;
    const s1 = seed(i * 2);
    const s2 = seed(i * 2 + 1);
    const ang = s1 * Math.PI * 2;
    const rx = (0.3 + s2 * 0.9) * clubW;
    const cx = axisX + Math.cos(ang) * rx;
    const cy = y + Math.sin(ang) * 4;
    dots.push({ x: cx, y: cy, r: 2.2 + s2 * 1.6 });
  }
  return dots;
};

const PERITHECIA = buildPerithecia();

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ── Phase timings ────────────────────────────────────────────────────
  // 0.0 – 1.6 s : hyphae extend into the ant
  // 1.6 – 3.0 s : puppet strings drop and go taut
  // 3.0 – 5.0 s : mandibles clench, spore pulse
  const tHyphae = interpolate(frame, [0, fps * 1.6], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const tStringsRaw = interpolate(frame, [fps * 1.4, fps * 2.9], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const tStrings = Easing.out(Easing.cubic)(tStringsRaw);

  const clenchSpring = spring({
    frame: frame - fps * 2.8,
    fps,
    config: { damping: 12, stiffness: 90, mass: 0.9 },
  });
  const clench = interpolate(clenchSpring, [0, 1], [0, 1]); // 0 → 1

  const sporePulse =
    0.5 + 0.5 * Math.sin(((frame - fps * 3.0) / fps) * Math.PI * 0.9);

  const titleSpring = spring({
    frame: frame - fps * 0.35,
    fps,
    config: { damping: 200, mass: 0.9 },
  });

  const hookOpacity = interpolate(frame, [fps * 1.1, fps * 2.1], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Small parallax on the whole plate scene at start
  const plateIn = spring({
    frame,
    fps,
    config: { damping: 200, mass: 1 },
  });

  return (
    <AbsoluteFill style={{ backgroundColor: INK, fontFamily: inter }}>
      <style>{fontCss}</style>

      {/* ── Metadata band ────────────────────────────────────────────── */}
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
        <span style={{ color: OCHRE }}>2026 · 08 · 20</span>
      </div>

      {/* ── Field plate ─────────────────────────────────────────────── */}
      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          {/* Plate grid */}
          <pattern
            id="grid"
            x={FRAME.x}
            y={FRAME.y}
            width={48 * SCALE}
            height={48 * SCALE}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M ${48 * SCALE} 0 L 0 0 0 ${48 * SCALE}`}
              fill="none"
              stroke={GRID}
              strokeWidth={1}
            />
          </pattern>
          <pattern
            id="grid-major"
            x={FRAME.x}
            y={FRAME.y}
            width={192 * SCALE}
            height={192 * SCALE}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M ${192 * SCALE} 0 L 0 0 0 ${192 * SCALE}`}
              fill="none"
              stroke={GRID_MAJOR}
              strokeWidth={1}
            />
          </pattern>

          <radialGradient id="plate-vignette" cx="50%" cy="40%" r="72%">
            <stop offset="0%" stopColor="#1E2617" stopOpacity={1} />
            <stop offset="100%" stopColor={PLATE} stopOpacity={1} />
          </radialGradient>

          <linearGradient id="stroma-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={SPORE} />
            <stop offset="35%" stopColor={OCHRE} />
            <stop offset="100%" stopColor="#7A5D22" />
          </linearGradient>

          <radialGradient id="spore-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={SPORE} stopOpacity={0.9} />
            <stop offset="100%" stopColor={SPORE} stopOpacity={0} />
          </radialGradient>

          <filter id="hypha-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Plate ground */}
        <rect
          x={FRAME.x}
          y={FRAME.y}
          width={FRAME.w}
          height={FRAME.h}
          fill="url(#plate-vignette)"
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

        {/* Inner border */}
        <rect
          x={FRAME.x + 0.5}
          y={FRAME.y + 0.5}
          width={FRAME.w - 1}
          height={FRAME.h - 1}
          fill="none"
          stroke="#2C3A22"
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
          <g key={i} stroke={OCHRE} strokeWidth={1.5} fill="none">
            <line x1={cx} y1={cy} x2={cx + sx * 26} y2={cy} />
            <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 26} />
          </g>
        ))}

        {/* Plate label — top-left */}
        <g
          transform={`translate(${FRAME.x + 26}, ${FRAME.y + 32})`}
          fill={GRAY}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3.4}
          fontWeight={600}
        >
          <text>PLATE III · MYCOLOGY</text>
        </g>

        {/* Scale bar — altitude reference: 25 cm mark */}
        <g
          transform={`translate(${FRAME.x + FRAME.w - 172}, ${
            FRAME.y + FRAME.h - 28
          })`}
          stroke={GRAY}
          fill={GRAY}
          fontFamily={inter}
          fontSize={10}
          letterSpacing={3}
          fontWeight={500}
        >
          <line x1={0} y1={0} x2={110} y2={0} strokeWidth={1.2} />
          <line x1={0} y1={-5} x2={0} y2={5} strokeWidth={1.2} />
          <line x1={55} y1={-3} x2={55} y2={3} strokeWidth={1.2} />
          <line x1={110} y1={-5} x2={110} y2={5} strokeWidth={1.2} />
          <text x={120} y={4} stroke="none">
            25 CM
          </text>
        </g>

        {/* ── Scene: scale plate coords into frame ──────────────────── */}
        <g
          transform={`translate(${FRAME.x}, ${FRAME.y}) scale(${SCALE}) translate(0, ${interpolate(
            plateIn,
            [0, 1],
            [12, 0],
          )})`}
          opacity={plateIn}
        >
          {/* Leaf vein (the substrate the ant is clamped to) */}
          <line
            x1={VEIN_X1}
            y1={VEIN_Y}
            x2={VEIN_X2}
            y2={VEIN_Y}
            stroke={MOSS}
            strokeOpacity={0.65}
            strokeWidth={6}
            strokeLinecap="round"
          />
          <line
            x1={VEIN_X1}
            y1={VEIN_Y}
            x2={VEIN_X2}
            y2={VEIN_Y}
            stroke={SPORE}
            strokeOpacity={0.22}
            strokeWidth={1.2}
            strokeLinecap="round"
          />
          {/* Leaf-vein tick marks */}
          {[VEIN_X1, VEIN_X1 + 170, VEIN_X1 + 340, VEIN_X2 - 340, VEIN_X2 - 170, VEIN_X2].map(
            (x, i) => (
              <line
                key={`tick-${i}`}
                x1={x}
                y1={VEIN_Y - 8}
                x2={x}
                y2={VEIN_Y + 8}
                stroke={MOSS}
                strokeWidth={1.1}
                strokeOpacity={0.55}
              />
            ),
          )}
          {/* Altitude annotation — placed well below the tarsal terminals so nothing collides */}
          <g
            fontFamily={inter}
            fontSize={12}
            letterSpacing={4.5}
            fill={GRAY}
            fontWeight={500}
          >
            <text x={VEIN_X2} y={760} textAnchor="end">
              LEAF VEIN · ~25 CM ABOVE FOREST FLOOR
            </text>
          </g>

          {/* ── Ant body silhouette (profile, facing right) ──────── */}
          {/*
            Camponotus carpenter ant, ~2.2× iter1 scale.
            Layout: gaster 240..380, petiole 380..410 (visible taper),
                    mesosoma 410..600, head 600..730, mandibles 730..788.
            Vein at y=640; mandibles clamp on it.
          */}
          <g>
            {/* Far-side legs (drawn behind body, dimmer) */}
            <g stroke={CHITIN} strokeWidth={5} strokeLinecap="round" fill="none" opacity={0.55}>
              <path d={`M 645 618 L 655 660 L 670 685`} />
              <path d={`M 505 620 L 515 665 L 530 690`} />
              <path d={`M 435 620 L 440 665 L 455 685`} />
            </g>

            {/* Gaster (abdomen) — teardrop, wider at back, narrowing to petiole */}
            <path
              d={`M 240 600
                  Q 232 555 275 545
                  Q 340 540 375 570
                  Q 385 595 375 615
                  Q 340 655 275 650
                  Q 232 645 240 600 Z`}
              fill={CHITIN}
              stroke="#180F06"
              strokeWidth={2}
            />
            {/* Gaster segmentation */}
            <g stroke="#0E0A05" strokeOpacity={0.4} strokeWidth={1.1} fill="none">
              <path d="M 310 552 Q 310 595 315 640" />
              <path d="M 340 550 Q 340 595 348 638" />
            </g>

            {/* Petiole (waist) — one clear conical connector, no gap */}
            <path
              d={`M 375 585
                  Q 395 578 415 588
                  L 415 610
                  Q 395 618 375 610 Z`}
              fill={CHITIN}
              stroke="#180F06"
              strokeWidth={1.6}
            />
            {/* Small dorsal petiole node (Camponotus signature) */}
            <path
              d={`M 388 570 Q 398 555 408 570 L 405 585 L 391 585 Z`}
              fill={CHITIN}
              stroke="#180F06"
              strokeWidth={1.4}
            />

            {/* Mesosoma / thorax — humped dorsally where ant carries stroma */}
            <path
              d={`M 410 610
                  Q 410 555 460 545
                  Q 540 535 590 555
                  Q 610 575 600 610
                  Q 570 638 480 640
                  Q 420 640 410 610 Z`}
              fill={CHITIN}
              stroke="#180F06"
              strokeWidth={2}
            />
            {/* Pronotum highlight (dorsal ridge) */}
            <path
              d={`M 500 548 Q 550 540 585 555`}
              fill="none"
              stroke="#5A3E22"
              strokeOpacity={0.75}
              strokeWidth={1.4}
            />

            {/* Neck — dark suture between thorax and head */}
            <path
              d={`M 605 590 Q 612 600 615 620`}
              stroke="#0E0A05"
              strokeOpacity={0.7}
              strokeWidth={1.2}
              fill="none"
            />

            {/* Head — trapezoidal, larger toward the front (Camponotus) */}
            <path
              d={`M 610 600
                  Q 605 555 655 548
                  Q 715 545 728 585
                  Q 736 626 700 645
                  Q 645 652 620 638
                  Q 605 622 610 600 Z`}
              fill={CHITIN}
              stroke="#180F06"
              strokeWidth={2}
            />
            {/* Compound eye */}
            <ellipse cx={682} cy={585} rx={7.5} ry={5.5} fill="#0E0A05" />
            <circle cx={680} cy={584} r={1.6} fill={SPORE} opacity={0.55} />

            {/* Mandibles — hinge inside the front of the head (720, 610) */}
            <g
              transform={`translate(720, 610) rotate(${interpolate(
                clench,
                [0, 1],
                [-16, -4],
              )})`}
            >
              <path
                d={`M 0 -4 Q 40 -18 62 -8 L 66 -4 Q 46 -10 0 0 Z`}
                fill={CHITIN}
                stroke="#180F06"
                strokeWidth={1.6}
              />
            </g>
            <g
              transform={`translate(720, 610) rotate(${interpolate(
                clench,
                [0, 1],
                [16, 4],
              )})`}
            >
              <path
                d={`M 0 4 Q 40 18 62 8 L 66 4 Q 46 10 0 0 Z`}
                fill={CHITIN}
                stroke="#180F06"
                strokeWidth={1.6}
              />
            </g>

            {/* Antennae — drooping (post death-grip), routed OUTWARD from head-top */}
            <path
              d={`M 668 555 Q 700 525 748 528`}
              stroke={CHITIN}
              strokeWidth={3}
              fill="none"
              strokeLinecap="round"
            />
            <path
              d={`M 660 552 Q 692 515 738 508`}
              stroke={CHITIN}
              strokeWidth={2.6}
              fill="none"
              strokeLinecap="round"
              opacity={0.6}
            />

            {/* Near-side legs (drawn on top, sharper) */}
            <g stroke={CHITIN} strokeWidth={6} strokeLinecap="round" fill="none">
              {/* Front leg (from thorax → tarsus) */}
              <path d={`M 615 632 Q 615 665 610 700`} />
              {/* Middle leg */}
              <path d={`M 505 638 Q 500 680 500 715`} />
              {/* Hind leg */}
              <path d={`M 435 636 Q 415 670 385 700`} />
              {/* Tarsal terminals */}
              <circle cx={610} cy={700} r={2.2} fill={CHITIN} />
              <circle cx={500} cy={715} r={2.2} fill={CHITIN} />
              <circle cx={385} cy={700} r={2.2} fill={CHITIN} />
            </g>
          </g>

          {/* ── Mycelium: hyphae growing into the ant ─────────────── */}
          {HYPHAE.map((h, i) => {
            const localT = Math.max(0, (tHyphae - h.delay) / (1 - h.delay + 0.01));
            const grow = Math.min(1, localT);
            const eased = 1 - Math.pow(1 - grow, 2.2);
            // Approx length for dash animation
            const L = 220;
            return (
              <path
                key={`hy-${i}`}
                d={h.d}
                stroke={SPORE}
                strokeOpacity={0.55}
                strokeWidth={1.2}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={L}
                strokeDashoffset={L * (1 - eased)}
                filter="url(#hypha-glow)"
              />
            );
          })}

          {/* ── Fungal stroma (fruiting body) rising from head ──── */}
          {(() => {
            // Curved stalk from root to top
            const cx = (STROMA_ROOT.x + STROMA_TOP.x) / 2 - 34;
            const cy = (STROMA_ROOT.y + STROMA_TOP.y) / 2 + 20;
            const stalkPath = `M ${STROMA_ROOT.x} ${STROMA_ROOT.y} Q ${cx} ${cy} ${STROMA_TOP.x} ${STROMA_TOP.y}`;
            const stromaGrow = Math.min(1, tHyphae * 1.15);
            const stalkL = 420;
            return (
              <>
                {/* Stalk stroke: darker outer, ochre core (thinner than iter1 — reads as fibrous stem) */}
                <path
                  d={stalkPath}
                  stroke="#3A2A12"
                  strokeWidth={16}
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={stalkL}
                  strokeDashoffset={stalkL * (1 - stromaGrow)}
                  opacity={0.9}
                />
                <path
                  d={stalkPath}
                  stroke="url(#stroma-grad)"
                  strokeWidth={10}
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={stalkL}
                  strokeDashoffset={stalkL * (1 - stromaGrow)}
                />
                {/* Thin core highlight */}
                <path
                  d={stalkPath}
                  stroke={SPORE}
                  strokeOpacity={0.55}
                  strokeWidth={1.6}
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={stalkL}
                  strokeDashoffset={stalkL * (1 - stromaGrow)}
                />
                {/* Halo behind fruiting head — behind perithecia so club reads */}
                <ellipse
                  cx={STROMA_TOP.x + 8}
                  cy={STROMA_TOP.y + 62}
                  rx={70}
                  ry={90}
                  fill="url(#spore-glow)"
                  opacity={0.28 * Math.max(0, stromaGrow - 0.3) * (0.6 + 0.4 * sporePulse)}
                />
                {/* Perithecial swelling — club-shaped, dense */}
                {PERITHECIA.map((p, i) => (
                  <circle
                    key={`per-${i}`}
                    cx={p.x}
                    cy={p.y}
                    r={p.r}
                    fill={OCHRE}
                    opacity={
                      Math.min(1, Math.max(0, (stromaGrow - 0.3) * 1.7)) *
                      (0.75 + 0.25 * sporePulse)
                    }
                  />
                ))}
                {/* Terminal spike above perithecia */}
                <path
                  d={`M ${STROMA_TOP.x} ${STROMA_TOP.y + 4} Q ${STROMA_TOP.x - 6} ${
                    STROMA_TOP.y - 24
                  } ${STROMA_TOP.x + 4} ${STROMA_TOP.y - 46}`}
                  stroke={OCHRE}
                  strokeWidth={3.2}
                  fill="none"
                  strokeLinecap="round"
                  opacity={Math.min(1, Math.max(0, stromaGrow - 0.55) * 2.5)}
                />
              </>
            );
          })()}

          {/* ── Puppeteer strings — arc from stroma crown down to anchors ── */}
          {STRINGS.map((s, i) => {
            const t = Math.max(0, (tStrings - s.delay) / (1 - s.delay + 0.01));
            const g = Math.min(1, t);
            // Strings all originate from a "puppet-crossbar" point just above
            // the terminal spike of the stroma — one visible fulcrum, dramatic.
            const sx = STROMA_TOP.x + (i - 2) * 8;
            const sy = STROMA_TOP.y - 58;
            const L = Math.hypot(s.x - sx, s.y - sy);
            // Slight slack that tightens as clench progresses
            const slack = interpolate(clench, [0, 1], [40, 8]);
            // Arc mid-point pushed outward per string so they fan
            const midX = (sx + s.x) / 2 + (i - 2) * 22;
            const midY = (sy + s.y) / 2 + slack;
            const d = `M ${sx} ${sy} Q ${midX} ${midY} ${s.x} ${s.y}`;
            return (
              <g key={`str-${i}`}>
                <path
                  d={d}
                  stroke={SPORE}
                  strokeOpacity={0.85 * g}
                  strokeWidth={1.2}
                  fill="none"
                  strokeDasharray={L}
                  strokeDashoffset={L * (1 - g)}
                />
                {/* Terminal knot on the ant */}
                {g > 0.85 && (
                  <circle cx={s.x} cy={s.y} r={2.4} fill={SPORE} opacity={g} />
                )}
              </g>
            );
          })}
          {/* Puppet-crossbar dot at the fulcrum, so the strings read as tied to one point */}
          <circle
            cx={STROMA_TOP.x}
            cy={STROMA_TOP.y - 58}
            r={3.5}
            fill={SPORE}
            opacity={Math.min(1, tStrings * 1.4)}
          />

          {/* Fine spore drift — a few particles */}
          {tHyphae > 0.6 &&
            [...Array(6)].map((_, i) => {
              const seed = hashSeed(`spore${i}`);
              const drift = (frame + i * 40) / (fps * 3);
              const y = STROMA_TOP.y + 20 - (drift * 90) % 220;
              const x = STROMA_TOP.x - 40 + seed * 80;
              const op = 0.4 * (1 - ((drift * 90) % 220) / 220);
              return (
                <circle
                  key={`sp-${i}`}
                  cx={x}
                  cy={y}
                  r={1.4 + seed * 0.8}
                  fill={SPORE}
                  opacity={op}
                />
              );
            })}

          {/* Callout to fungal stroma head — "STROMA · PERITHECIA" */}
          <g
            fontFamily={inter}
            fontSize={13}
            letterSpacing={3.5}
            fontWeight={600}
            fill={OCHRE}
            opacity={Math.min(1, Math.max(0, tHyphae - 0.4) * 2)}
          >
            <line
              x1={STROMA_TOP.x + 34}
              y1={STROMA_TOP.y + 40}
              x2={STROMA_TOP.x + 160}
              y2={STROMA_TOP.y + 8}
              stroke={OCHRE}
              strokeWidth={1}
            />
            <text x={STROMA_TOP.x + 172} y={STROMA_TOP.y + 12}>
              STROMA · PERITHECIA
            </text>
          </g>

          {/* Callout to internal hyphae — routed above the gaster so it doesn't cross the ant */}
          <g
            fontFamily={inter}
            fontSize={13}
            letterSpacing={3.5}
            fontWeight={600}
            fill={SPORE}
            opacity={Math.min(1, Math.max(0, tHyphae - 0.75) * 2)}
          >
            <line
              x1={310}
              y1={555}
              x2={220}
              y2={470}
              stroke={SPORE}
              strokeWidth={1}
              strokeOpacity={0.8}
            />
            <text x={90} y={462}>
              HYPHAE ∴ MUSCLE FIBRES
            </text>
          </g>

          {/* Callout to death-grip mandibles — "DEATH GRIP" */}
          <g
            fontFamily={inter}
            fontSize={13}
            letterSpacing={3.5}
            fontWeight={600}
            fill={SPORE}
            opacity={clench}
          >
            <line
              x1={790}
              y1={618}
              x2={880}
              y2={545}
              stroke={SPORE}
              strokeWidth={1}
              strokeOpacity={0.8}
            />
            <text x={790} y={534} textAnchor="start">
              DEATH GRIP
            </text>
          </g>
        </g>

        {/* ── Caption strip below plate ─────────────────────────── */}
        <g
          transform={`translate(${FRAME.x}, ${FRAME.y + FRAME.h + 22})`}
          fill={GRAY}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
        >
          <text>FIG. 1 · SUMMIT DEATH-GRIP, DAY 3–7 POST-INFECTION</text>
          <text
            x={FRAME.w}
            textAnchor="end"
            fill={OCHRE}
            opacity={0.9}
          >
            OPHIOCORDYCEPS UNILATERALIS s.l.
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
            color: OCHRE,
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
            color: "#F4F4F0",
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 84,
            lineHeight: 0.96,
            letterSpacing: -1.4,
            fontStyle: "italic",
          }}
        >
          The muscle-fibre
          <br />
          puppeteer.
        </div>

        <div
          style={{
            marginTop: 30,
            color: "#C8CDBB",
            fontFamily: inter,
            fontSize: 19,
            lineHeight: 1.4,
            fontWeight: 400,
            maxWidth: 880,
            opacity: hookOpacity,
          }}
        >
          Confocal microscopy shows{" "}
          <span style={{ color: OCHRE, fontWeight: 600 }}>
            Ophiocordyceps unilateralis
          </span>{" "}
          never touches the ant's brain — its mycelium fills ~40% of the body
          cavity and physically clamps mandibular muscle fibres, pulling the
          jaws shut on a leaf vein at the exact altitude its spores need to
          fruit.
        </div>
      </div>

      {/* ── Footer ────────────────────────────────────────────────── */}
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
        <span>Fredericksen et al. · PNAS 114:47 (2017) 12590–12595</span>
        <span>
          <span style={{ color: OCHRE }}>●</span> Stroma · Hyphae · Host
        </span>
      </div>
    </AbsoluteFill>
  );
};
